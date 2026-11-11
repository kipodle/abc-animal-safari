/* Parents' corner: members-only discussions about motherhood, fatherhood, skincare and everything parenthood.
   Everything needs a logged-in member. People are shown by a nickname, never by email. Posts are plain text. */
import { currentUser, fail, json, readJson, tooMany, type AccountsEnv, type Cors, type UserRow } from "./accounts";

export const CATEGORIES = ["motherhood", "fatherhood", "skincare", "babies", "school-years", "health", "anything"];
const RESERVED = /^(admin|administrator|moderator|mod|staff|team|support|owner|hog|hogthehedgehog|hog the hedgehog)$/i;
const NICK_RE = /^[A-Za-z0-9][A-Za-z0-9 _\-]{2,19}$/;
const PAGE = 20;

function clean(s: unknown, min: number, max: number): string | null {
  const t = String(s ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g, "").replace(/\n{4,}/g, "\n\n\n").trim();
  return t.length >= min && t.length <= max ? t : null;
}
const linkCount = (s: string) => (s.match(/https?:\/\/|www\./gi) || []).length;
const snippet = (s: string) => (s.length > 160 ? s.slice(0, 157).trimEnd() + "..." : s);

const FROM = `FROM posts p JOIN users u ON u.id = p.user_id LEFT JOIN profiles pr ON pr.user_id = p.user_id`;
const NAME = `COALESCE(pr.nickname, 'Member')`;
const RCOUNT = `(SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id AND r.hidden = 0)`;

export async function handleCommunity(request: Request, env: AccountsEnv, path: string, cors: Cors): Promise<Response> {
  const db = env.DB;
  if (!db) return fail(503, "Accounts are not set up yet.", cors);
  const route = request.method + " " + path;
  try {
    const u: UserRow | null = await currentUser(request, db);
    if (!u) return fail(401, "Please log in to join the Parents' corner.", cors);
    const url = new URL(request.url);

    if (route === "GET /account/community/me") {
      const p = await db.prepare("SELECT nickname FROM profiles WHERE user_id = ?").bind(u.id).first<{ nickname: string }>();
      return json({ nickname: p?.nickname || null, team: !!u.is_admin }, 200, cors);
    }

    if (route === "POST /account/community/nickname") {
      const b = await readJson(request);
      const nick = String(b?.nickname ?? "").trim().replace(/\s+/g, " ");
      if (!NICK_RE.test(nick) || nick.includes("@")) return fail(400, "Please choose a nickname with 3 to 20 letters, numbers, spaces, dashes or underscores.", cors);
      if (RESERVED.test(nick) && !u.is_admin) return fail(400, "That nickname is reserved. Please choose another.", cors);
      if (await db.prepare("SELECT 1 x FROM profiles WHERE user_id = ?").bind(u.id).first()) return fail(409, "You already have a nickname.", cors);
      if (await tooMany(db, "nick:" + u.id, 8, 3600)) return fail(429, "Too many tries. Please wait a while.", cors);
      try { await db.prepare("INSERT INTO profiles (user_id, nickname, created_at) VALUES (?, ?, ?)").bind(u.id, nick, Date.now()).run(); }
      catch { return fail(409, "That nickname is taken. Please choose another.", cors); }
      return json({ nickname: nick }, 201, cors);
    }

    // everything below needs a nickname (people are never shown by email)
    const me = await db.prepare("SELECT nickname FROM profiles WHERE user_id = ?").bind(u.id).first<{ nickname: string }>();
    if (!me) return fail(403, "Please choose a nickname first.", cors);

    if (route === "GET /account/community/posts") {
      const cat = url.searchParams.get("category") || "";
      const page = Math.max(0, Math.min(500, parseInt(url.searchParams.get("page") || "0", 10) || 0));
      const where = CATEGORIES.includes(cat) ? "p.hidden = 0 AND p.category = ?" : "p.hidden = 0";
      const args: unknown[] = CATEGORIES.includes(cat) ? [cat] : [];
      const { results } = await db.prepare(
        `SELECT p.id, p.category, p.title, p.body, p.created_at, p.last_reply_at, ${NAME} AS nickname, u.is_admin AS team, ${RCOUNT} AS replies
         ${FROM} WHERE ${where} ORDER BY p.last_reply_at DESC, p.id DESC LIMIT ? OFFSET ?`).bind(...args, PAGE + 1, page * PAGE).all<any>();
      return json({
        posts: results.slice(0, PAGE).map((p) => ({ id: p.id, category: p.category, title: p.title, snippet: snippet(p.body), nickname: p.nickname, team: !!p.team, created_at: p.created_at, last_reply_at: p.last_reply_at, replies: p.replies })),
        has_more: results.length > PAGE,
      }, 200, cors);
    }

    if (route === "GET /account/community/post") {
      const id = parseInt(url.searchParams.get("id") || "", 10);
      if (!Number.isInteger(id)) return fail(400, "Bad request.", cors);
      const p = await db.prepare(`SELECT p.id, p.user_id, p.category, p.title, p.body, p.created_at, ${NAME} AS nickname, u.is_admin AS team ${FROM} WHERE p.id = ? AND p.hidden = 0`).bind(id).first<any>();
      if (!p) return fail(404, "That discussion is not available.", cors);
      const { results } = await db.prepare(
        `SELECT r.id, r.user_id, r.body, r.created_at, COALESCE(pr.nickname, 'Member') AS nickname, u.is_admin AS team
         FROM replies r JOIN users u ON u.id = r.user_id LEFT JOIN profiles pr ON pr.user_id = r.user_id
         WHERE r.post_id = ? AND r.hidden = 0 ORDER BY r.created_at ASC, r.id ASC LIMIT 300`).bind(id).all<any>();
      return json({
        post: { id: p.id, category: p.category, title: p.title, body: p.body, nickname: p.nickname, team: !!p.team, created_at: p.created_at, mine: p.user_id === u.id },
        replies: results.map((r) => ({ id: r.id, body: r.body, nickname: r.nickname, team: !!r.team, created_at: r.created_at, mine: r.user_id === u.id })),
      }, 200, cors);
    }

    if (route === "POST /account/community/post") {
      const b = await readJson(request, 12000);
      const category = String(b?.category ?? ""), title = clean(b?.title, 5, 120), body = clean(b?.body, 10, 5000);
      if (!CATEGORIES.includes(category)) return fail(400, "Please choose a topic.", cors);
      if (!title) return fail(400, "Please write a title of 5 to 120 characters.", cors);
      if (!body) return fail(400, "Please write 10 to 5000 characters.", cors);
      if (linkCount(title + " " + body) > 1) return fail(400, "Please share at most one link in a discussion.", cors);
      if (await tooMany(db, "post:" + u.id, 6, 3600)) return fail(429, "You are posting very quickly. Please wait a little while.", cors);
      const now = Date.now();
      const id = (await db.prepare("INSERT INTO posts (user_id, category, title, body, created_at, last_reply_at) VALUES (?, ?, ?, ?, ?, ?)").bind(u.id, category, title, body, now, now).run()).meta.last_row_id;
      return json({ id }, 201, cors);
    }

    if (route === "POST /account/community/reply") {
      const b = await readJson(request, 8000);
      const postId = Number(b?.post), body = clean(b?.body, 2, 3000);
      if (!Number.isInteger(postId)) return fail(400, "Bad request.", cors);
      if (!body) return fail(400, "Please write 2 to 3000 characters.", cors);
      if (linkCount(body) > 1) return fail(400, "Please share at most one link in a reply.", cors);
      if (!(await db.prepare("SELECT 1 x FROM posts WHERE id = ? AND hidden = 0").bind(postId).first())) return fail(404, "That discussion is not available.", cors);
      if (await tooMany(db, "reply:" + u.id, 30, 3600)) return fail(429, "You are replying very quickly. Please wait a little while.", cors);
      const now = Date.now();
      const id = (await db.prepare("INSERT INTO replies (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)").bind(postId, u.id, body, now).run()).meta.last_row_id;
      await db.prepare("UPDATE posts SET last_reply_at = ? WHERE id = ?").bind(now, postId).run();
      return json({ id }, 201, cors);
    }

    if (route === "POST /account/community/report") {
      const b = await readJson(request);
      const kind = b?.kind === "reply" ? "reply" : b?.kind === "post" ? "post" : "", id = Number(b?.id);
      if (!kind || !Number.isInteger(id)) return fail(400, "Bad request.", cors);
      if (await tooMany(db, "report:" + u.id, 20, 86400)) return fail(429, "Thank you. You have sent a lot of reports today.", cors);
      await db.prepare("INSERT OR IGNORE INTO reports (kind, target_id, user_id, created_at) VALUES (?, ?, ?, ?)").bind(kind, id, u.id, Date.now()).run();
      return json({ ok: true }, 200, cors);
    }

    if (route === "POST /account/community/delete") {
      const b = await readJson(request);
      const kind = b?.kind === "reply" ? "reply" : b?.kind === "post" ? "post" : "", id = Number(b?.id);
      if (!kind || !Number.isInteger(id)) return fail(400, "Bad request.", cors);
      const table = kind === "post" ? "posts" : "replies";
      const row = await db.prepare(`SELECT user_id FROM ${table} WHERE id = ?`).bind(id).first<{ user_id: number }>();
      if (!row || (row.user_id !== u.id && !u.is_admin)) return fail(403, "You can only remove your own posts.", cors);
      await db.batch([
        db.prepare(`UPDATE ${table} SET hidden = 1 WHERE id = ?`).bind(id),
        db.prepare("UPDATE reports SET handled = 1 WHERE kind = ? AND target_id = ?").bind(kind, id),
      ]);
      return json({ ok: true }, 200, cors);
    }

  } catch (e) {
    console.error("community error", e);
    return fail(500, "Something went wrong. Please try again.", cors);
  }
  return fail(404, "Not found.", cors);
}
