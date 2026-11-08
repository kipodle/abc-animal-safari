// Owner tools for the accounts database. Run from the worker folder:
//   npm run make-admin -- you@example.com            (add --remote to change the LIVE database)
//   npm run reset-password -- member@example.com     (add --remote for the LIVE database)
// Set HOG_PASSWORD in the environment to skip the password prompt.
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import readline from "node:readline";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const [cmd, emailArg] = args.filter((a) => !a.startsWith("--"));
if (!["make-admin", "reset-password"].includes(cmd) || !emailArg) {
  console.log("Usage:\n  npm run make-admin -- you@example.com [--remote]\n  npm run reset-password -- member@example.com [--remote]");
  process.exit(1);
}
const email = emailArg.trim().toLowerCase();
if (!/^[^\s@'"\;]+@[^\s@'"\;]+\.[^\s@'"\;]{2,}$/.test(email)) { console.error("That does not look like a valid email address."); process.exit(1); }

function ask(q, hidden) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => process.stdout.write(s.includes(q) ? s : "*");
    rl.question(q, (a) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(a); });
  });
}
let pw = process.env.HOG_PASSWORD;
if (!pw) {
  pw = await ask("New password (8+ characters): ", true);
  if (pw !== (await ask("Type it again: ", true))) { console.error("The passwords did not match. Nothing was changed."); process.exit(1); }
}
if (pw.length < 8 || pw.length > 128) { console.error("Please use 8 to 128 characters. Nothing was changed."); process.exit(1); }

const salt = randomBytes(16), IT = 100000;
const hash = `pbkdf2$${IT}$${salt.toString("hex")}$${pbkdf2Sync(pw, salt, IT, 32, "sha256").toString("hex")}`;
const now = Date.now();
const sql = cmd === "make-admin"
  ? `INSERT INTO users (email, pass_hash, country, marketing, is_admin, created_at) VALUES ('${email}', '${hash}', '${(process.env.HOG_COUNTRY || "IL").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2)}', 0, 1, ${now})
     ON CONFLICT(email) DO UPDATE SET pass_hash = excluded.pass_hash, is_admin = 1;
     DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = '${email}');`
  : `UPDATE users SET pass_hash = '${hash}' WHERE email = '${email}';
     DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = '${email}');`;

const r = spawnSync("npx", ["wrangler", "d1", "execute", "hog-accounts", remote ? "--remote" : "--local", "--command", sql], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status || 1);
console.log(cmd === "make-admin" ? `\nDone: ${email} is an admin (${remote ? "LIVE" : "local test"} database).` : `\nDone: new password set for ${email} (${remote ? "LIVE" : "local test"} database).`);
