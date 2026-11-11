// Owner tools: numbers and moderation, from your own computer (nothing is shown on the website).
//   npm run owner -- stats [--remote]            members, logins, downloads, paid books, top countries
//   npm run owner -- members [--remote]          member list as CSV (redirect to a file with > members.csv)
//   npm run owner -- reports [--remote]          Parents' corner posts that members reported
//   npm run owner -- hide post|reply ID [--remote]      remove a post or reply for everyone
//   npm run owner -- dismiss post|reply ID [--remote]   keep it and clear its reports
// Add --remote to use the LIVE database. Without it you get the local test database.
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2), remote = args.includes("--remote");
const [cmd, kind, idArg] = args.filter((a) => !a.startsWith("--"));

function sql(q) {
  const r = spawnSync("npx", ["wrangler", "d1", "execute", "hog-accounts", remote ? "--remote" : "--local", "--json", "--command", q], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) { console.error((r.stderr || r.stdout || "wrangler failed").trim()); process.exit(1); }
  const out = r.stdout.slice(r.stdout.indexOf("["));
  return JSON.parse(out).flatMap((x) => x.results || []);
}
const one = (q) => sql(q)[0] || {};
const DAY = 86400000, now = Date.now();
const NOT_OWNER = "user_id NOT IN (SELECT id FROM users WHERE is_admin = 1)";

if (cmd === "stats") {
  const m = one(`SELECT COUNT(*) total, SUM(created_at > ${now - 7 * DAY}) d7, SUM(created_at > ${now - 30 * DAY}) d30, SUM(marketing = 1) news FROM users WHERE is_admin = 0`);
  const ev = (t) => one(`SELECT COUNT(*) n, SUM(created_at > ${now - 7 * DAY}) d7 FROM events WHERE type = '${t}' AND ${NOT_OWNER}`);
  const l = ev("login"), v = ev("visit");
  const d = one(`SELECT COUNT(*) n, SUM(created_at > ${now - 7 * DAY}) d7 FROM downloads WHERE ${NOT_OWNER}`);
  let o = { n: 0, cents: 0, cur: "usd" };
  try { o = one(`SELECT COUNT(*) n, COALESCE(SUM(amount_cents),0) cents, COALESCE(MAX(currency),'usd') cur FROM orders WHERE status = 'paid' AND ${NOT_OWNER}`); } catch { /* orders table not created yet */ }
  let c = { posts: 0, replies: 0 };
  try { c = { posts: one("SELECT COUNT(*) n FROM posts WHERE hidden = 0").n, replies: one("SELECT COUNT(*) n FROM replies WHERE hidden = 0").n }; } catch { /* community tables not created yet */ }
  const top = sql("SELECT country, COUNT(*) n FROM users WHERE is_admin = 0 GROUP BY country ORDER BY n DESC LIMIT 10");
  const n = (x) => Number(x || 0);
  console.log(`Members:            ${n(m.total)}  (new in 7 days: ${n(m.d7)}, in 30 days: ${n(m.d30)}, agreed to updates: ${n(m.news)})`);
  console.log(`Logins:             ${n(l.n)}  (last 7 days: ${n(l.d7)})`);
  console.log(`Return visits:      ${n(v.n)}  (last 7 days: ${n(v.d7)})`);
  console.log(`PDF downloads:      ${n(d.n)}  (last 7 days: ${n(d.d7)})`);
  console.log(`Paid books:         ${n(o.n)}  (revenue: ${(n(o.cents) / 100).toFixed(2)} ${String(o.cur).toUpperCase()})`);
  console.log(`Parents' corner:    ${n(c.posts)} posts, ${n(c.replies)} replies`);
  console.log("Top countries:      " + (top.map((t) => `${t.country} ${t.n}`).join(", ") || "none yet"));
  console.log("\nVisitors and page views: Cloudflare dashboard > Analytics & Logs > Web Analytics.");
} else if (cmd === "members") {
  const q = (s) => { s = String(s ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  const iso = (t) => (t ? new Date(t).toISOString() : "");
  console.log("email,country,agreed_to_updates,joined,last_login");
  sql("SELECT email, country, marketing, created_at, last_login_at FROM users WHERE is_admin = 0 ORDER BY created_at DESC").forEach((u) => console.log([u.email, u.country, u.marketing ? "yes" : "no", iso(u.created_at), iso(u.last_login_at)].map(q).join(",")));
} else if (cmd === "reports") {
  const rows = sql("SELECT kind, target_id, COUNT(*) n FROM reports WHERE handled = 0 GROUP BY kind, target_id ORDER BY MIN(created_at)");
  if (!rows.length) console.log("No reports waiting. All clear.");
  for (const r of rows) {
    const t = r.kind === "post"
      ? one(`SELECT p.id post_id, p.title, p.body, p.hidden, COALESCE(pr.nickname,'Member') nick FROM posts p LEFT JOIN profiles pr ON pr.user_id = p.user_id WHERE p.id = ${Number(r.target_id)}`)
      : one(`SELECT r.post_id, '' title, r.body, r.hidden, COALESCE(pr.nickname,'Member') nick FROM replies r LEFT JOIN profiles pr ON pr.user_id = r.user_id WHERE r.id = ${Number(r.target_id)}`);
    console.log(`\n[${r.kind} #${r.target_id}] ${r.n} report(s)${t.hidden ? " (already hidden)" : ""}  by ${t.nick || "?"}${t.title ? "\n  Title: " + t.title : ""}\n  ${String(t.body || "(removed)").slice(0, 400).replace(/\n/g, "\n  ")}`);
    console.log(`  -> npm run owner -- hide ${r.kind} ${r.target_id} ${remote ? "--remote" : ""}\n  -> npm run owner -- dismiss ${r.kind} ${r.target_id} ${remote ? "--remote" : ""}`);
  }
} else if ((cmd === "hide" || cmd === "dismiss") && ["post", "reply"].includes(kind) && /^\d+$/.test(idArg || "")) {
  const id = Number(idArg), table = kind === "post" ? "posts" : "replies";
  if (cmd === "hide") sql(`UPDATE ${table} SET hidden = 1 WHERE id = ${id}`);
  sql(`UPDATE reports SET handled = 1 WHERE kind = '${kind}' AND target_id = ${id}`);
  console.log(cmd === "hide" ? `Removed ${kind} #${id} for everyone.` : `Kept ${kind} #${id}; its reports are cleared.`);
} else {
  console.log("Usage:\n  npm run owner -- stats [--remote]\n  npm run owner -- members [--remote]\n  npm run owner -- reports [--remote]\n  npm run owner -- hide post|reply ID [--remote]\n  npm run owner -- dismiss post|reply ID [--remote]");
  process.exit(1);
}
