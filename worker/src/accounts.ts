/* Sign-up, login and the owner dashboard for hogthehedgehog.com.
   Stored in Cloudflare D1. Passwords are salted PBKDF2 hashes, login tokens are random and only their hash is stored. */

interface D1Stmt {
  bind(...v: unknown[]): D1Stmt;
  first<T = any>(col?: string): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { last_row_id: number; changes: number } }>;
}
interface D1 { prepare(q: string): D1Stmt; batch(s: D1Stmt[]): Promise<{ results: any[] }[]> }

export interface AccountsEnv {
  DB: D1;
  COOKIE_DOMAIN?: string;
  COOKIE_SECURE?: string;
  CONTACT_EMAIL?: string;
  PBKDF2_ITERATIONS?: string;
}
type Cors = Record<string, string>;

const COUNTRY_CODES = new Set(("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ " +
  "NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ " +
  "UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW").split(" "));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COOKIE = "hog_session";
const SESSION_DAYS = 30;
const DAY = 86400000;

/* ---------------- small helpers ---------------- */
function json(body: unknown, status: number, headers: Cors, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
const fail = (status: number, error: string, cors: Cors) => json({ error }, status, cors);

async function readJson(request: Request, max = 4000): Promise<any | null> {
  if (!/^application\/json\b/i.test(request.headers.get("Content-Type") || "")) return null;
  try { const raw = await request.text(); return raw.length > max ? null : JSON.parse(raw); } catch { return null; }
}

const enc = new TextEncoder();
const toHex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b as ArrayBuffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) => new Uint8Array((h.match(/.{2}/g) || []).map((x) => parseInt(x, 16)));
async function sha256Hex(s: string): Promise<string> { return toHex(await crypto.subtle.digest("SHA-256", enc.encode(s))); }

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}
function iterationsFor(env: AccountsEnv): number {
  const n = parseInt(env.PBKDF2_ITERATIONS || "100000", 10);
  return Math.min(100000, Math.max(10000, n || 100000)); // Cloudflare Workers allows at most 100,000
}
async function hashPassword(pw: string, env: AccountsEnv): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16)), it = iterationsFor(env);
  return `pbkdf2$${it}$${toHex(salt)}$${toHex(await pbkdf2(pw, salt, it))}`;
}
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
const DUMMY_SALT = new Uint8Array(16);
async function verifyPassword(pw: string, stored: string | null, env: AccountsEnv): Promise<boolean> {
  if (!stored) { await pbkdf2(pw, DUMMY_SALT, iterationsFor(env)); return false; } // same work whether or not the email exists
  const [kind, it, saltHex, hashHex] = stored.split("$");
  if (kind !== "pbkdf2") return false;
  return sameBytes(await pbkdf2(pw, fromHex(saltHex), parseInt(it, 10)), fromHex(hashHex));
}

function cookieAttrs(env: AccountsEnv, maxAge: number): string {
  let a = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
  if (env.COOKIE_SECURE !== "false") a += "; Secure";
  if (env.COOKIE_DOMAIN) a += `; Domain=${env.COOKIE_DOMAIN}`;
  return a;
}
function getToken(request: Request): string {
  const m = (request.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : "";
}

/* Limits repeated tries (shared across all Worker copies because it lives in D1). */
async function tooMany(db: D1, key: string, max: number, windowSec: number): Promise<boolean> {
  const now = Date.now(), reset = now + windowSec * 1000;
  const row = await db.prepare(
    `INSERT INTO rate_limits (key, n, reset_at) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET n = CASE WHEN reset_at < ? THEN 1 ELSE n + 1 END,
                                    reset_at = CASE WHEN reset_at < ? THEN ? ELSE reset_at END
     RETURNING n`).bind(key, reset, now, now, reset).first<{ n: number }>();
  if (Math.random() < 0.02) await db.prepare("DELETE FROM rate_limits WHERE reset_at < ?").bind(now - DAY).run();
  return (row?.n || 0) > max;
}

interface UserRow { id: number; email: string; pass_hash: string; country: string; marketing: number; is_admin: number }
const publicUser = (u: UserRow) => ({ email: u.email, country: u.country, admin: !!u.is_admin });

async function currentUser(request: Request, db: D1): Promise<UserRow | null> {
  const t = getToken(request);
  if (!t) return null;
  return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(await sha256Hex(t), Date.now()).first<UserRow>();
}
async function startSession(db: D1, userId: number, env: AccountsEnv): Promise<string> {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32))), now = Date.now();
  await db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256Hex(token), userId, now, now + SESSION_DAYS * DAY).run();
  return `${COOKIE}=${token}; ${cookieAttrs(env, SESSION_DAYS * 86400)}`;
}

/* ---------------- owner numbers ---------------- */
async function stats(db: D1) {
  const now = Date.now(), D7 = now - 7 * DAY, D30 = now - 30 * DAY;
  const q = (sql: string, ...a: unknown[]) => db.prepare(sql).bind(...a);
  const r = await db.batch([
    q("SELECT COUNT(*) c FROM users"),
    q("SELECT COUNT(*) c FROM users WHERE created_at > ?", D7),
    q("SELECT COUNT(*) c FROM users WHERE created_at > ?", D30),
    q("SELECT COUNT(*) c FROM users WHERE marketing = 1"),
    q("SELECT COUNT(*) c FROM events WHERE type = 'login'"),
    q("SELECT COUNT(*) c FROM events WHERE type = 'login' AND created_at > ?", D7),
    q("SELECT COUNT(DISTINCT user_id) c FROM events WHERE type = 'login' AND created_at > ?", D30),
    q("SELECT COUNT(*) c FROM events WHERE type = 'visit'"),
    q("SELECT COUNT(*) c FROM events WHERE type = 'visit' AND created_at > ?", D7),
    q("SELECT COUNT(DISTINCT user_id) c FROM events WHERE created_at > ?", D30),
    q("SELECT COUNT(*) c FROM downloads"),
    q("SELECT COUNT(*) c FROM downloads WHERE created_at > ?", D7),
    q("SELECT letter, COUNT(*) n FROM downloads WHERE letter IS NOT NULL GROUP BY letter ORDER BY n DESC, letter LIMIT 5"),
    q("SELECT country, COUNT(*) n FROM users GROUP BY country ORDER BY n DESC, country LIMIT 10"),
    q("SELECT date(created_at/1000,'unixepoch') d, type, COUNT(*) n FROM events WHERE created_at > ? GROUP BY d, type", D30),
    q("SELECT date(created_at/1000,'unixepoch') d, COUNT(*) n FROM downloads WHERE created_at > ? GROUP BY d", D30),
  ]);
  const c = (i: number): number => r[i].results[0]?.c || 0;
  const byDay: Record<string, { signups: number; logins: number; visits: number; downloads: number }> = {};
  const bump = (d: string, k: "signups" | "logins" | "visits" | "downloads", n: number) => { (byDay[d] = byDay[d] || { signups: 0, logins: 0, visits: 0, downloads: 0 })[k] += n; };
  r[14].results.forEach((x: any) => bump(x.d, x.type === "signup" ? "signups" : x.type === "login" ? "logins" : "visits", x.n));
  r[15].results.forEach((x: any) => bump(x.d, "downloads", x.n));
  const daily = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now - i * DAY).toISOString().slice(0, 10);
    daily.push({ day, ...(byDay[day] || { signups: 0, logins: 0, visits: 0, downloads: 0 }) });
  }
  return {
    members_total: c(0), members_7d: c(1), members_30d: c(2), members_marketing: c(3),
    logins_total: c(4), logins_7d: c(5), login_members_30d: c(6),
    visits_total: c(7), visits_7d: c(8), active_30d: c(9),
    downloads_total: c(10), downloads_7d: c(11),
    top_letters: r[12].results, top_countries: r[13].results, daily,
  };
}
async function members(db: D1) {
  const { results } = await db.prepare(
    `SELECT email, country, marketing, is_admin, created_at, last_login_at, last_seen_at FROM users ORDER BY created_at DESC LIMIT 50000`).all();
  const iso = (t: number | null) => (t ? new Date(t).toISOString() : "");
  return results.map((u: any) => ({ email: u.email, country: u.country, marketing_opt_in: !!u.marketing, is_admin: !!u.is_admin,
    created_at: iso(u.created_at), last_login_at: iso(u.last_login_at), last_seen_at: iso(u.last_seen_at) }));
}

/* ---------------- routes ---------------- */
export async function handleAccounts(request: Request, env: AccountsEnv, path: string, cors: Cors): Promise<Response> {
  const db = env.DB;
  if (!db) return fail(503, "Accounts are not set up yet.", cors);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const route = request.method + " " + path;

  try {
    if (route === "GET /account/me") {
      const u = await currentUser(request, db);
      const base = { contactEmail: env.CONTACT_EMAIL || "" };
      if (!u) return json({ user: null, ...base }, 200, cors);
      const now = Date.now();
      const last = (await db.prepare("SELECT MAX(created_at) t FROM events WHERE user_id = ?").bind(u.id).first<{ t: number | null }>())?.t || 0;
      const writes = [db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").bind(now, u.id)];
      if (now - last > 12 * 3600 * 1000) writes.push(db.prepare("INSERT INTO events (user_id, type, created_at) VALUES (?, 'visit', ?)").bind(u.id, now)); // a return visit
      await db.batch(writes);
      return json({ user: publicUser(u), ...base }, 200, cors);
    }

    if (route === "POST /account/signup") {
      if (await tooMany(db, "signup:" + ip, 20, 3600)) return fail(429, "Too many sign-ups from this connection. Please try again later.", cors);
      const b = await readJson(request);
      if (!b) return fail(400, "Bad request.", cors);
      const email = String(b.email || "").trim().toLowerCase(), pw = String(b.password || ""), country = String(b.country || "").toUpperCase();
      if (!EMAIL_RE.test(email) || email.length > 254) return fail(400, "Please enter a valid email address.", cors);
      if (pw.length < 8 || pw.length > 128) return fail(400, "Please use a password with 8 to 128 characters.", cors);
      if (!COUNTRY_CODES.has(country)) return fail(400, "Please choose your country.", cors);
      if (b.consent !== true) return fail(400, "Please tick the box to confirm you are a parent or guardian.", cors);
      if (await db.prepare("SELECT 1 x FROM users WHERE email = ?").bind(email).first()) return fail(409, "That email already has an account. Please log in instead.", cors);
      const now = Date.now();
      let id: number;
      try {
        id = (await db.prepare("INSERT INTO users (email, pass_hash, country, marketing, is_admin, created_at, last_login_at, last_seen_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)")
          .bind(email, await hashPassword(pw, env), country, b.marketing === true ? 1 : 0, now, now, now).run()).meta.last_row_id;
      } catch { return fail(409, "That email already has an account. Please log in instead.", cors); }
      await db.prepare("INSERT INTO events (user_id, type, created_at) VALUES (?, 'signup', ?)").bind(id, now).run();
      const cookie = await startSession(db, id, env);
      return json({ user: { email, country, admin: false } }, 201, cors, { "Set-Cookie": cookie });
    }

    if (route === "POST /account/login") {
      if (await tooMany(db, "login-ip:" + ip, 30, 600)) return fail(429, "Too many tries. Please wait a few minutes and try again.", cors);
      const b = await readJson(request);
      if (!b) return fail(400, "Bad request.", cors);
      const email = String(b.email || "").trim().toLowerCase(), pw = String(b.password || "").slice(0, 128);
      if (await tooMany(db, "login-email:" + email, 8, 900)) return fail(429, "Too many tries for this email. Please wait 15 minutes and try again.", cors);
      const u = EMAIL_RE.test(email) ? await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>() : null;
      if (!(await verifyPassword(pw, u ? u.pass_hash : null, env)) || !u) return fail(401, "Wrong email or password.", cors);
      const now = Date.now();
      await db.batch([
        db.prepare("INSERT INTO events (user_id, type, created_at) VALUES (?, 'login', ?)").bind(u.id, now),
        db.prepare("UPDATE users SET last_login_at = ?, last_seen_at = ? WHERE id = ?").bind(now, now, u.id),
      ]);
      return json({ user: publicUser(u) }, 200, cors, { "Set-Cookie": await startSession(db, u.id, env) });
    }

    if (route === "POST /account/logout") {
      const t = getToken(request);
      if (t) await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(t)).run();
      return json({ ok: true }, 200, cors, { "Set-Cookie": `${COOKIE}=; ${cookieAttrs(env, 0)}` });
    }

    // everything below needs a logged-in member
    const u = await currentUser(request, db);
    if (!u) return fail(401, "Please log in.", cors);

    if (route === "POST /account/download") {
      const b = await readJson(request);
      if (!b) return fail(400, "Bad request.", cors);
      const kind = String(b.kind || "").slice(0, 40), file = b.file ? String(b.file).slice(0, 200) : null;
      const letter = /^[A-Za-z]$/.test(b.letter || "") ? String(b.letter).toUpperCase() : null;
      if (!kind) return fail(400, "Missing kind.", cors);
      await db.prepare("INSERT INTO downloads (user_id, kind, letter, file, created_at) VALUES (?, ?, ?, ?, ?)").bind(u.id, kind, letter, file, Date.now()).run();
      return json({ ok: true }, 200, cors);
    }

    if (path.startsWith("/account/admin/")) {
      if (!u.is_admin) return fail(403, "This account is not an admin.", cors);
      if (route === "GET /account/admin/stats") return json(await stats(db), 200, cors);
      if (route === "GET /account/admin/members") return json(await members(db), 200, cors);
    }
  } catch (e) {
    console.error("accounts error", e);
    return fail(500, "Something went wrong. Please try again.", cors);
  }
  return fail(404, "Not found.", cors);
}
