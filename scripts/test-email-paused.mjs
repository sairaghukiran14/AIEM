// Checks the default deployment, where email features are paused: plain signup and login, no email
// endpoints or pages, and a certificate issued the moment a track is passed.
//
//   npm run build && npm start           (without ENABLE_EMAIL_FEATURES)
//   npm run test:paused
//
// Environment: BASE_URL (default http://localhost:3000), MONGODB_URI (or .env.local).
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const mongoose = require("mongoose");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

function mongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const file = join(root, ".env.local");
  if (existsSync(file)) {
    const m = readFileSync(file, "utf8").match(/^MONGODB_URI="?([^"\n]+)/m);
    if (m) return m[1];
  }
  throw new Error("Set MONGODB_URI or create .env.local");
}

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "PASS " : "FAIL ") + msg);
  if (!cond) failed++;
};

const run = randomBytes(3).toString("hex");
const fakeIp = `198.51.100.${1 + (parseInt(run, 16) % 250)}`;
async function call(path, body, cookie) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": fakeIp, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  let json = {};
  try { json = await res.json(); } catch {}
  const cookieOut = res.headers.getSetCookie?.().map((c) => c.split(";")[0]).join("; ") || "";
  return { status: res.status, body: json, cookie: cookieOut };
}

// first track: its gate id and the challenge ids of every lesson
const tdir = join(root, "src/content/tracks");
const slug = readdirSync(tdir).find((s) => /^\s*order: 1,/m.test(readFileSync(join(tdir, s, "index.ts"), "utf8")));
const index = readFileSync(join(tdir, slug, "index.ts"), "utf8");
const gate = index.match(/id: "(\w+-gate)"/)[1];
const gateQuestions = (index.match(/id: "g\d+"/g) || []).length;
const lessons = readdirSync(join(tdir, slug, "lessons")).sort().map((f) => {
  const s = readFileSync(join(tdir, slug, "lessons", f), "utf8");
  return { slug: s.match(/^ {2}slug: "([^"]+)"/m)[1], ids: [...new Set([...s.matchAll(/id: "(\w+-\d+-(?:quiz|bug|code))"/g)].map((m) => m[1]))] };
});

async function main() {
  await mongoose.connect(mongoUri());
  const db = mongoose.connection.db;
  const email = `paused-${run}@example.com`;
  const password = "Pw-" + randomBytes(9).toString("hex");
  try {
    const health = await (await fetch(BASE + "/api/health")).json();
    ok(health.emailFeaturesEnabled === false && health.emailVerificationRequired === false, "email features are paused on this server");

    for (const [path, body] of [
      ["/api/auth/forgot", { email }],
      ["/api/auth/reset", { token: "x".repeat(40), password }],
      ["/api/auth/verify-email", { token: "x".repeat(40) }],
      ["/api/auth/resend-verification", {}],
      ["/api/account/change-email", { newEmail: "a@b.co", password }],
      ["/api/account/confirm-email-change", { token: "x".repeat(40) }],
    ]) ok((await call(path, body)).status === 404, `${path} answers 404`);

    for (const p of ["/forgot-password", "/reset-password?token=abc", "/verify-email?token=abc", "/confirm-email?token=abc"]) {
      ok((await fetch(BASE + p)).status === 404, `${p} is a 404 page`);
    }
    const loginHtml = await (await fetch(BASE + "/login")).text();
    ok(!/forgot password/i.test(loginHtml), "the login page has no Forgot password link");

    let r = await call("/api/auth/signup", { name: "Paused Test", email, password });
    ok(r.status === 200 && r.cookie.includes("aiem_session"), "signup works and signs you in");
    const user = await db.collection("users").findOne({ email });
    ok((await db.collection("emailverifications").countDocuments({ userId: user._id })) === 0, "signup creates no verification record");
    r = await call("/api/auth/login", { email, password });
    ok(r.status === 200, "login works");
    const cookie = r.cookie;

    for (const p of ["/dashboard", "/account", "/certificates"]) {
      const res = await fetch(BASE + p, { headers: { cookie } });
      const html = await res.text();
      ok(res.status === 200 && !/Confirm your email|Not confirmed|Change your email/i.test(html), `${p} loads with no email prompts`);
    }

    // finish track 1 (lessons seeded directly), pass its gate through the API
    for (const l of lessons) {
      for (const id of l.ids) {
        await db.collection("submissions").insertOne({ userId: user._id, challengeId: id, trackSlug: slug, lessonSlug: l.slug, kind: id.endsWith("quiz") ? "quiz" : id.endsWith("bug") ? "spot-the-bug" : "code", score: 1, maxScore: 1, passed: true, attempt: 1, xpAwarded: 0, answer: null, createdAt: new Date(), updatedAt: new Date() });
      }
      await db.collection("progresses").updateOne({ userId: user._id, lessonSlug: l.slug }, { $set: { trackSlug: slug, status: "completed", completedAt: new Date() } }, { upsert: true });
    }
    const first = await call("/api/challenges/submit", { challengeId: gate, answer: Array(gateQuestions).fill(null) }, cookie);
    const pass = await call("/api/challenges/submit", { challengeId: gate, answer: first.body.feedback.results.map((x) => x.correctIndex) }, cookie);
    ok(pass.body.passed === true && !pass.body.certificatesHeld, "passing the gate is not held back");
    ok((pass.body.certificates ?? []).length === 1, "the track certificate is issued straight away");
    const page = await (await fetch(BASE + "/certificates", { headers: { cookie } })).text();
    ok(page.includes("Sample") === false && (await db.collection("certificates").countDocuments({ userId: user._id })) === 1, "the certificates page lists it");
  } finally {
    const u = await db.collection("users").findOne({ email });
    if (u) {
      for (const c of ["submissions", "progresses", "certificates", "emailverifications", "passwordresets", "revokedsessions"]) {
        await db.collection(c).deleteMany({ userId: u._id });
      }
      await db.collection("users").deleteOne({ _id: u._id });
    }
    await mongoose.disconnect();
  }
  console.log(`\n${failed ? "FAILED" : "all passed"} (${failed} failed)`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
