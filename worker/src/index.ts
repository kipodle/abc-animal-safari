import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

interface Env {
  ANTHROPIC_API_KEY: string;
  MODEL?: string;
  ALLOWED_ORIGINS?: string;
  ANTHROPIC_BASE_URL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_API_BASE?: string;
  SITE_URL?: string;
  PRICE_CENTS?: string;
  CURRENCY?: string;
}

// Must match the themes in /stories/story.js
const THEMES: Record<string, { label: string; place: string; palFull: string; pal: string; letter: string; items: string[] }> = {
  dinosaurs: { label: "dinosaurs", place: "Dino Valley", palFull: "Benny the Brachiosaurus", pal: "Benny", letter: "B", items: ["a bone", "a banana", "a butterfly", "a bird", "a balloon"] },
  space: { label: "space", place: "Space", palFull: "Milo the Martian", pal: "Milo", letter: "M", items: ["the moon", "Mars", "a meteor", "the Milky Way", "a map"] },
  ocean: { label: "the ocean", place: "the Blue Sea", palFull: "Sammy the Seahorse", pal: "Sammy", letter: "S", items: ["a shell", "a starfish", "some seaweed", "a shark", "a sailboat"] },
  safari: { label: "safari animals", place: "the Sunny Safari", palFull: "Leo the Lion", pal: "Leo", letter: "L", items: ["a leaf", "a ladybug", "a lizard", "a lake", "a log"] },
  robots: { label: "robots", place: "Robot City", palFull: "Rusty the Robot", pal: "Rusty", letter: "R", items: ["a radio", "a rabbit", "a rainbow", "a rocket", "a ruler"] },
  fairy: { label: "fairy tales", place: "Fairy Kingdom", palFull: "Poppy the Pixie", pal: "Poppy", letter: "P", items: ["a pumpkin", "a petal", "a pie", "a pony", "a present"] },
};

const LEVEL_RULES = [
  "Beginner reader: exactly ONE very short sentence per page, at most 8 words, using only simple, common words.",
  "Growing reader: 2 or 3 short sentences per page, at most 30 words in total, simple vocabulary.",
  "Confident reader: 3 or 4 sentences per page, at most 55 words in total, with a few fun describing words.",
];

const NAME_RE = /^[A-Za-zÀ-ɏ֐-׿؀-ۿ' \-]{1,14}$/;
const STRUGGLES = ["reading", "letters", "writing", "focus"];

const RequestSchema = z.object({
  name: z.string().regex(NAME_RE),
  age: z.number().int().min(3).max(12),
  level: z.number().int().min(0).max(2),
  theme: z.string().refine((t) => t in THEMES),
  theme2: z.string().refine((t) => t in THEMES).optional(),
  struggles: z.array(z.string().refine((s) => STRUGGLES.includes(s))).max(4).default([]),
});

const StorySchema = z.object({
  page1: z.string(),
  page2: z.string(),
  page3: z.string(),
  page4: z.string(),
  page5: z.string(),
  page6: z.string(),
});

const SYSTEM = `You write short, warm, gentle picture-book stories for young children (ages 3 to 12) who are learning to read.
Rules:
- Safe and kind only: no violence, danger, fear, sadness, scary creatures, romance, brands, or real people.
- The child is the hero and is always called by the exact name given. Never use pronouns for the child; repeat the name instead.
- Follow the reading-level rule exactly. Short, concrete, easy-to-read sentences. Fun sound words are welcome.
- Write plain text only: no emojis, no markdown, no page numbers or headings.
- Output exactly six pages in the requested JSON fields.`;

function buildPrompt(r: z.infer<typeof RequestSchema>): string {
  const t = THEMES[r.theme];
  const t2 = r.theme2 ? THEMES[r.theme2] : null;
  const focus = r.struggles.length
    ? `The child is working on: ${r.struggles.join(", ")}. Repeat key words naturally to help practice.`
    : "";
  return `Write a six-page story.

Child's name: ${r.name}
Child's age: ${r.age}
Reading level: ${LEVEL_RULES[r.level]}
Favorite thing: ${t.label}
Setting: ${t.place}
Friendly sidekick: ${t.palFull} (call the sidekick ${t.pal} after first meeting)
${t2 ? `Cameo: on the last page, ${t2.palFull} waves hello from far away.` : ""}
${focus}

Story plan:
Page 1: ${r.name} arrives in ${t.place}.
Page 2: ${r.name} meets ${t.palFull}, who needs help.
Page 3: ${t.pal} asks ${r.name} to find 5 things that start with the letter ${t.letter}, like ${t.pal}'s name.
Page 4: ${r.name} finds ${t.items[0]}, ${t.items[1]}, and ${t.items[2]}.
Page 5: ${r.name} finds ${t.items[3]} and ${t.items[4]}, and counts to five.
Page 6: A happy ending for ${r.name} and ${t.pal}.
Mention every item by the exact name given.`;
}

function clean(s: string): string {
  return s.replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim();
}

// Best-effort limiter (per Worker instance). Add a Cloudflare rate-limiting rule too.
const hits = new Map<string, number[]>();
function limited(ip: string, bucket: string, max: number): boolean {
  const key = bucket + ":" + ip;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS || "https://hogthehedgehog.com,https://www.hogthehedgehog.com").split(",").map((s) => s.trim());
}

function corsHeaders(origin: string, env: Env): Record<string, string> {
  const allowed = allowedOrigins(env);
  const ok = allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

async function readJson(request: Request, max = 2000): Promise<unknown | null> {
  try {
    const raw = await request.text();
    if (raw.length > max) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ---------------- Story writer (optional, not used by the site right now) ---------------- */
async function handleStory(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const body = await readJson(request);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "bad_request" }, 400, cors);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "unavailable" }, 503, cors);
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL || undefined, maxRetries: 1, timeout: 45_000 });
    const response = await client.messages.parse({
      model: env.MODEL || "claude-opus-5-5",
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(parsed.data) }],
      output_config: { effort: "low", format: zodOutputFormat(StorySchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return json({ error: "unavailable" }, 502, cors);
    const p = response.parsed_output;
    const pages = [p.page1, p.page2, p.page3, p.page4, p.page5, p.page6].map((x) => clean(x).slice(0, 420));
    if (pages.some((x) => x.length < 3)) return json({ error: "unavailable" }, 502, cors);
    return json({ pages }, 200, cors);
  } catch {
    return json({ error: "unavailable" }, 502, cors);
  }
}

/* ---------------- Payments (Stripe Checkout, one PDF download per payment) ---------------- */
const PRODUCT_TAG = "hog_pdf_download";
const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

async function stripe(env: Env, path: string, method: "GET" | "POST", params?: URLSearchParams): Promise<any> {
  const base = env.STRIPE_API_BASE || "https://api.stripe.com";
  const r = await fetch(base + path, {
    method,
    headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY, "Content-Type": "application/x-www-form-urlencoded" },
    body: params ? params.toString() : undefined,
  });
  const data: any = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "stripe_error");
  return data;
}

async function handleCheckout(env: Env, cors: Record<string, string>): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "unavailable" }, 503, cors);
  const site = (env.SITE_URL || "https://hogthehedgehog.com").replace(/\/$/, "");
  const cents = Math.max(50, parseInt(env.PRICE_CENTS || "199", 10) || 199);
  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("success_url", site + "/stories/?session_id={CHECKOUT_SESSION_ID}");
  p.set("cancel_url", site + "/stories/?canceled=1");
  p.set("line_items[0][quantity]", "1");
  p.set("line_items[0][price_data][currency]", (env.CURRENCY || "usd").toLowerCase());
  p.set("line_items[0][price_data][unit_amount]", String(cents));
  p.set("line_items[0][price_data][product_data][name]", "Letter adventure book - 1 PDF download");
  p.set("payment_intent_data[metadata][product]", PRODUCT_TAG);
  try {
    const session = await stripe(env, "/v1/checkout/sessions", "POST", p);
    if (!session?.url) return json({ error: "unavailable" }, 502, cors);
    return json({ url: session.url }, 200, cors);
  } catch {
    return json({ error: "unavailable" }, 502, cors);
  }
}

async function handleRedeem(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "unavailable" }, 503, cors);
  const body = (await readJson(request)) as { session_id?: string } | null;
  const id = body && typeof body.session_id === "string" ? body.session_id : "";
  if (!SESSION_RE.test(id)) return json({ error: "bad_request" }, 400, cors);
  try {
    const s = await stripe(env, "/v1/checkout/sessions/" + id + "?expand[]=payment_intent", "GET");
    const pi = s?.payment_intent;
    if (s?.payment_status !== "paid" || !pi || typeof pi !== "object") return json({ error: "not_paid" }, 402, cors);
    if (pi.metadata?.product !== PRODUCT_TAG) return json({ error: "forbidden" }, 403, cors);
    if (pi.metadata?.redeemed === "1") return json({ error: "already_used" }, 409, cors);
    await stripe(env, "/v1/payment_intents/" + pi.id, "POST", new URLSearchParams({ "metadata[redeemed]": "1" }));
    return json({ ok: true, credits: 1 }, 200, cors);
  } catch {
    return json({ error: "unavailable" }, 502, cors);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    const path = new URL(request.url).pathname;

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST" || !["/story", "/checkout", "/redeem"].includes(path)) return json({ error: "not_found" }, 404, cors);
    if (!allowedOrigins(env).includes(origin)) return json({ error: "forbidden" }, 403, cors);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const max = path === "/story" ? 6 : 20;
    if (limited(ip, path, max)) return json({ error: "rate_limited" }, 429, cors);

    if (path === "/story") return handleStory(request, env, cors);
    if (path === "/checkout") return handleCheckout(env, cors);
    return handleRedeem(request, env, cors);
  },
};
