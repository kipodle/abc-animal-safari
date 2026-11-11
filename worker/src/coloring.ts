/* Paid, personalized coloring book: each letter of the child's name is drawn as an animal.
   - A parent must be logged in, types the name, and pays through Stripe Checkout.
   - The letter drawings live only here in the Worker. They are handed out one by one, and only to the member
     who paid for that order, so there is no public file to download for free. */
import { LETTER_ART } from "./letter-art";
import { currentUser, fail, json, readJson, tooMany, type AccountsEnv, type Cors, type UserRow } from "./accounts";

export interface ColoringEnv extends AccountsEnv {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_API_BASE?: string;
  SITE_URL?: string;
  COLORING_PRICE_CENTS?: string;
  CURRENCY?: string;
}

const PRODUCT = "coloring-name";
const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
const ORDER_RE = /^o_[0-9a-f]{32}$/;
const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
const site = (env: ColoringEnv) => (env.SITE_URL || "https://hogthehedgehog.com").replace(/\/$/, "");
const priceCents = (env: ColoringEnv) => Math.max(100, parseInt(env.COLORING_PRICE_CENTS || "799", 10) || 799);
const currency = (env: ColoringEnv) => (env.CURRENCY || "usd").toLowerCase();

/** The name as typed (for the cover) and the A to Z letters that get an animal each. */
export function cleanName(raw: unknown): { name: string; letters: string } | null {
  const name = String(raw ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
  if (!name || name.length > 20 || !/^[\p{L}\p{M}' \-]+$/u.test(name)) return null;
  const letters = name.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase();
  const baseLetters = name.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}]/gu, "");
  if (letters.length < 1 || letters.length > 12 || baseLetters.length !== letters.length) return null; // 1 to 12 letters, all A to Z (accents are simplified)
  return { name, letters };
}

async function stripe(env: ColoringEnv, path: string, method: "GET" | "POST", params?: URLSearchParams): Promise<any> {
  const r = await fetch((env.STRIPE_API_BASE || "https://api.stripe.com") + path, {
    method,
    headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY, "Content-Type": "application/x-www-form-urlencoded" },
    body: params ? params.toString() : undefined,
  });
  const data: any = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "stripe_error");
  return data;
}

interface OrderRow { id: string; user_id: number; name: string; status: string; amount_cents: number; currency: string; stripe_session_id: string | null; paid_at: number | null; created_at: number }

/** Marks an order paid only if Stripe says the money arrived and it matches what we asked for. */
async function settle(env: ColoringEnv, order: OrderRow, session: any): Promise<boolean> {
  if (order.status === "paid") return true;
  if (!session || session.payment_status !== "paid") return false;
  if (session.client_reference_id !== order.id) return false;
  if (typeof session.amount_total === "number" && session.amount_total < order.amount_cents) return false;
  if (session.currency && String(session.currency).toLowerCase() !== order.currency) return false;
  await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ? AND status = 'pending'").bind(Date.now(), order.id).run();
  return true;
}

const view = (o: OrderRow) => ({ id: o.id, name: o.name, status: o.status, created_at: o.created_at, paid_at: o.paid_at });

export async function handleColoring(request: Request, env: ColoringEnv, path: string, cors: Cors): Promise<Response> {
  const db = env.DB;
  if (!db) return fail(503, "Accounts are not set up yet.", cors);
  const route = request.method + " " + path;
  try {
    if (route === "GET /account/coloring/config") {
      return json({ enabled: !!env.STRIPE_SECRET_KEY, price_cents: priceCents(env), currency: currency(env) }, 200, cors);
    }
    const u: UserRow | null = await currentUser(request, db);
    if (!u) return fail(401, "Please log in.", cors);

    if (route === "POST /account/coloring/checkout") {
      if (!env.STRIPE_SECRET_KEY) return fail(503, "Payments are not switched on yet. Please check back soon.", cors);
      if (await tooMany(db, "checkout:" + u.id, 12, 3600)) return fail(429, "Too many tries. Please wait a while and try again.", cors);
      const b = await readJson(request);
      const nm = b ? cleanName(b.name) : null;
      if (!nm) return fail(400, "Please type a first name with 1 to 12 letters (A to Z).", cors);
      const id = "o_" + toHex(crypto.getRandomValues(new Uint8Array(16)));
      const cents = priceCents(env), cur = currency(env), now = Date.now();
      await db.prepare("INSERT INTO orders (id, user_id, product, name, status, amount_cents, currency, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)")
        .bind(id, u.id, PRODUCT, nm.name, cents, cur, now).run();
      const p = new URLSearchParams();
      p.set("mode", "payment");
      p.set("success_url", `${site(env)}/coloring/personalized/?order=${id}`);
      p.set("cancel_url", `${site(env)}/coloring/personalized/?canceled=1`);
      p.set("client_reference_id", id);
      p.set("customer_email", u.email);
      p.set("metadata[order_id]", id);
      p.set("metadata[product]", PRODUCT);
      p.set("line_items[0][quantity]", "1");
      p.set("line_items[0][price_data][currency]", cur);
      p.set("line_items[0][price_data][unit_amount]", String(cents));
      p.set("line_items[0][price_data][product_data][name]", `Animal letters coloring book for ${nm.name}`);
      p.set("line_items[0][price_data][product_data][description]", "Personalized printable PDF: every letter of the name drawn as an animal to color in.");
      let session: any;
      try { session = await stripe(env, "/v1/checkout/sessions", "POST", p); }
      catch (e) { console.error("stripe checkout failed", e); return fail(502, "We could not reach the payment page. Please try again.", cors); }
      if (!session?.url || !session?.id) return fail(502, "We could not reach the payment page. Please try again.", cors);
      await db.prepare("UPDATE orders SET stripe_session_id = ? WHERE id = ?").bind(session.id, id).run();
      return json({ url: session.url, order: id }, 200, cors);
    }

    if (route === "GET /account/coloring/orders") {
      const { results } = await db.prepare("SELECT * FROM orders WHERE user_id = ? AND product = ? ORDER BY created_at DESC LIMIT 50").bind(u.id, PRODUCT).all<OrderRow>();
      return json({ orders: results.map(view) }, 200, cors);
    }

    if (route === "POST /account/coloring/confirm") {
      const b = await readJson(request);
      const id = b && typeof b.order === "string" ? b.order : "";
      if (!ORDER_RE.test(id)) return fail(400, "Bad request.", cors);
      const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").bind(id, u.id).first<OrderRow>();
      if (!order) return fail(404, "Order not found.", cors);
      if (order.status !== "paid" && env.STRIPE_SECRET_KEY && order.stripe_session_id && SESSION_RE.test(order.stripe_session_id)) {
        try { await settle(env, order, await stripe(env, "/v1/checkout/sessions/" + order.stripe_session_id, "GET")); }
        catch (e) { console.error("stripe confirm failed", e); return fail(502, "We could not check the payment just now. Please try again in a moment.", cors); }
      }
      const fresh = await db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").bind(id, u.id).first<OrderRow>();
      return json({ order: fresh ? view(fresh) : view(order) }, 200, cors);
    }

    if (route === "GET /account/coloring/art") {
      const q = new URL(request.url).searchParams;
      const id = q.get("order") || "", letter = (q.get("letter") || "").toUpperCase();
      if (!ORDER_RE.test(id) || !/^[A-Z]$/.test(letter)) return fail(400, "Bad request.", cors);
      const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'paid'").bind(id, u.id).first<OrderRow>();
      if (!order) return fail(403, "This book has not been paid for yet.", cors);
      const nm = cleanName(order.name);
      if (!nm || !nm.letters.includes(letter)) return fail(403, "That letter is not in this book.", cors);
      const art = LETTER_ART[letter];
      if (!art) return fail(404, "Not found.", cors);
      return new Response(art, { status: 200, headers: { ...cors, "Content-Type": "image/svg+xml", "Cache-Control": "private, no-store" } });
    }
  } catch (e) {
    console.error("coloring error", e);
    return fail(500, "Something went wrong. Please try again.", cors);
  }
  return fail(404, "Not found.", cors);
}

/* ---------------- Stripe webhook (backup in case the parent closes the page before coming back) ---------------- */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function verifyStripeSignature(raw: string, header: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): Promise<boolean> {
  const items = header.split(",").map((s) => s.trim().split("="));
  const t = items.find((i) => i[0] === "t")?.[1] || "";
  const sigs = items.filter((i) => i[0] === "v1").map((i) => i[1] || "");
  if (!t || !sigs.length || Math.abs(nowSec - parseInt(t, 10)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = toHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`))));
  return sigs.some((s) => sameString(s, mac));
}

export async function handleStripeWebhook(request: Request, env: ColoringEnv): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.DB) return new Response("not configured", { status: 503 });
  const raw = await request.text();
  if (raw.length > 200000 || !(await verifyStripeSignature(raw, request.headers.get("Stripe-Signature") || "", env.STRIPE_WEBHOOK_SECRET))) return new Response("bad signature", { status: 400 });
  try {
    const ev = JSON.parse(raw);
    if (ev?.type === "checkout.session.completed" || ev?.type === "checkout.session.async_payment_succeeded") {
      const s = ev.data?.object, id = s?.client_reference_id;
      if (typeof id === "string" && ORDER_RE.test(id) && s?.metadata?.product === PRODUCT) {
        const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first<OrderRow>();
        if (order) await settle(env, order, s);
      }
    }
  } catch (e) { console.error("webhook error", e); return new Response("error", { status: 500 }); }
  return new Response("ok", { status: 200 });
}
