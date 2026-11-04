// End-to-end checks against a running server and a real MongoDB.
//
//   npm run build && npm start        (in one terminal)
//   npm run e2e                        (in another)
//
// Environment: BASE_URL (default http://localhost:3000), MONGODB_URI (or .env.local).
// It creates throwaway users, exercises accounts, rate limits, password reset, track locks, every gate,
// the capstone and certificates, then deletes everything it created. It reads the course structure
// from the content files, so it keeps working as tracks are added.
import { createHash, randomBytes } from "node:crypto";
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

// ---- the course, read from the content files ----
const tracksDir = join(root, "src/content/tracks");
const tracks = readdirSync(tracksDir)
  .map((slug) => {
    const dir = join(tracksDir, slug);
    const index = readFileSync(join(dir, "index.ts"), "utf8");
    const lessons = readdirSync(join(dir, "lessons"))
      .sort()
      .map((f) => {
        const s = readFileSync(join(dir, "lessons", f), "utf8");
        return {
          slug: s.match(/^ {2}slug: "([^"]+)"/m)[1],
          ids: [...new Set([...s.matchAll(/id: "(\w+-\d+-(?:quiz|bug|code))"/g)].map((m) => m[1]))],
        };
      });
    return {
      slug,
      order: Number(index.match(/^ {2}order: (\d+)/m)[1]),
      gate: index.match(/id: "(\w+-gate)"/)[1],
      gateQuestions: (index.match(/id: "g\d+"/g) || []).length,
      lessons,
    };
  })
  .sort((a, b) => a.order - b.order);
const capstoneSource = readFileSync(join(root, "src/content/capstone.ts"), "utf8");
const capstoneQuestions = (capstoneSource.match(/id: "c\d+"/g) || []).length;

// ---- helpers ----
const run = randomBytes(3).toString("hex");
const fakeIp = `203.0.113.${1 + (parseInt(run, 16) % 250)}`; // the run's own rate-limit bucket
const sha = (s) => createHash("sha256").update(s).digest("hex");
const emailHash = (e) => sha(e.trim().toLowerCase()).slice(0, 24);
const created = { emails: [], ipKeys: [fakeIp] };

async function call(path, body, cookie) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": fakeIp, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  let json = {};
  try { json = await res.json(); } catch {}
  const setCookie = res.headers.getSetCookie?.().map((c) => c.split(";")[0]).join("; ") || "";
  return { status: res.status, body: json, cookie: setCookie, headers: res.headers };
}

async function main() {
  await mongoose.connect(mongoUri());
  const db = mongoose.connection.db;
  const PASSWORD = "E2e-Passw0rd-" + run;

  // ---------- accounts ----------
  const email = `e2e-${run}@example.com`;
  created.emails.push(email);
  let r = await call("/api/auth/signup", { name: "E2E Test", email, password: "short" });
  ok(r.status === 400, "signup rejects a short password (" + r.status + ")");
  r = await call("/api/auth/signup", { name: "E2E Test", email, password: PASSWORD });
  ok(r.status === 200 && r.cookie.includes("aiem_session"), "signup creates an account and a session");
  r = await call("/api/auth/signup", { name: "E2E Test", email, password: PASSWORD });
  ok(r.status === 409, "a duplicate signup is refused (" + r.status + ")");
  r = await call("/api/auth/login", { email, password: "wrong-password-1" });
  ok(r.status === 401, "a wrong password is refused");
  r = await call("/api/auth/login", { email, password: PASSWORD });
  ok(r.status === 200, "the right password signs in");
  const oldCookie = r.cookie;
  const user = await db.collection("users").findOne({ email });

  // ---------- rate limiting ----------
  const rlEmail = `e2e-rl-${run}@example.com`;
  created.emails.push(rlEmail);
  await call("/api/auth/signup", { name: "Rate Limit", email: rlEmail, password: PASSWORD });
  let statuses = [];
  for (let i = 0; i < 8; i++) statuses.push((await call("/api/auth/login", { email: rlEmail, password: "nope-nope-1" })).status);
  ok(statuses.every((s) => s === 401), "the first 8 wrong logins are answered normally");
  r = await call("/api/auth/login", { email: rlEmail, password: "nope-nope-1" });
  ok(r.status === 429 && Number(r.headers.get("retry-after")) > 0, "the 9th attempt is rate limited with Retry-After (" + r.status + ")");
  r = await call("/api/auth/login", { email: rlEmail, password: PASSWORD });
  ok(r.status === 429, "even the right password is held back while the limit applies");

  // ---------- password reset ----------
  r = await call("/api/auth/forgot", { email: `nobody-${run}@example.com` });
  ok(r.status === 200 && r.body.ok === true, "forgot answers the same for an unknown address");
  ok((await db.collection("passwordresets").countDocuments({})) >= 0, "(reset store reachable)");
  r = await call("/api/auth/forgot", { email });
  ok(r.status === 200 && r.body.ok === true, "forgot answers for a real address");
  ok((await db.collection("passwordresets").countDocuments({ userId: user._id })) === 1, "a reset record exists for the user, and only one");
  const stored = await db.collection("passwordresets").findOne({ userId: user._id });
  ok(!!stored && /^[0-9a-f]{64}$/.test(stored.tokenHash), "only a hash of the token is stored");
  await call("/api/auth/forgot", { email });
  await call("/api/auth/forgot", { email });
  r = await call("/api/auth/forgot", { email });
  ok(r.status === 429, "a 4th reset request for one address within the hour is limited (" + r.status + ")");
  ok((await db.collection("passwordresets").countDocuments({ userId: user._id })) === 1, "requesting again replaces the old link instead of adding one");

  // the token itself only ever travels by email, so plant a known one directly
  const token = randomBytes(32).toString("hex");
  await db.collection("passwordresets").deleteMany({ userId: user._id });
  await db.collection("passwordresets").insertOne({ userId: user._id, tokenHash: sha(token), expiresAt: new Date(Date.now() + 3600_000), createdAt: new Date() });

  r = await call("/api/auth/reset", { token, password: "short" });
  ok(r.status === 400, "reset rejects a short new password");
  ok((await db.collection("passwordresets").countDocuments({ userId: user._id })) === 1, "a rejected attempt does not spend the link");
  r = await call("/api/auth/reset", { token: randomBytes(32).toString("hex"), password: PASSWORD + "-new" });
  ok(r.status === 400, "an unknown token is refused");
  await new Promise((res) => setTimeout(res, 1100)); // so the new session is issued after the change
  r = await call("/api/auth/reset", { token, password: PASSWORD + "-new" });
  ok(r.status === 200, "a valid token sets the new password");
  r = await call("/api/auth/reset", { token, password: PASSWORD + "-other" });
  ok(r.status === 400, "the same link cannot be used twice");
  r = await call("/api/auth/login", { email, password: PASSWORD });
  ok(r.status === 401, "the old password no longer works");
  r = await call("/api/auth/login", { email, password: PASSWORD + "-new" });
  ok(r.status === 200, "the new password works");
  const newCookie = r.cookie;
  r = await call("/api/challenges/submit", { challengeId: "no-such-challenge", answer: 1 }, oldCookie);
  ok(r.status === 401, "a session from before the reset is signed out (" + r.status + ")");
  r = await call("/api/challenges/submit", { challengeId: "no-such-challenge", answer: 1 }, newCookie);
  ok(r.status === 404, "a session from after the reset still works (" + r.status + ")");
  const expired = randomBytes(32).toString("hex");
  await db.collection("passwordresets").insertOne({ userId: user._id, tokenHash: sha(expired), expiresAt: new Date(Date.now() - 1000), createdAt: new Date() });
  r = await call("/api/auth/reset", { token: expired, password: PASSWORD + "-late" });
  ok(r.status === 400, "an expired token is refused");

  // ---------- course flow ----------
  const cookie = newCookie;
  const last = tracks[tracks.length - 1];
  const post = (id, answer) => call("/api/challenges/submit", { challengeId: id, answer }, cookie);
  const passQuiz = async (id, n) => {
    const first = await post(id, Array(n).fill(null));
    if (first.status !== 200) return first;
    return post(id, first.body.feedback.results.map((x) => x.correctIndex));
  };
  const seed = async (t) => {
    for (const l of t.lessons) {
      for (const id of l.ids) {
        await db.collection("submissions").insertOne({
          userId: user._id, challengeId: id, trackSlug: t.slug, lessonSlug: l.slug,
          kind: id.endsWith("quiz") ? "quiz" : id.endsWith("bug") ? "spot-the-bug" : "code",
          score: 1, maxScore: 1, passed: true, attempt: 1, xpAwarded: 0, answer: null, createdAt: new Date(), updatedAt: new Date(),
        });
      }
      await db.collection("progresses").updateOne(
        { userId: user._id, lessonSlug: l.slug },
        { $set: { trackSlug: t.slug, status: "completed", completedAt: new Date() } },
        { upsert: true }
      );
    }
  };

  r = await post(last.gate, Array(last.gateQuestions).fill(0));
  ok(r.status === 403, "the last track's gate is locked at the start");
  r = await post("capstone-exam", Array(capstoneQuestions).fill(0));
  ok(r.status === 403, "the capstone is locked at the start (" + (r.body.error ?? "") + ")");
  r = await post(tracks[0].gate, Array(tracks[0].gateQuestions).fill(0));
  ok(r.status === 403, "a gate is closed until its lessons are done");
  r = await post("nope", 1);
  ok(r.status === 404, "an unknown challenge is a 404");

  for (const t of tracks) {
    await seed(t);
    const wrong = await post(t.gate, Array(t.gateQuestions).fill(null));
    ok(wrong.status === 200 && wrong.body.passed === false, `${t.slug}: blank answers fail the gate`);
    const pass = await passQuiz(t.gate, t.gateQuestions);
    ok(pass.body.passed === true && pass.body.trackCompleted === true, `${t.slug}: correct answers pass the gate`);
    if (t !== last) {
      r = await post("capstone-exam", Array(capstoneQuestions).fill(0));
      ok(r.status === 403, `   capstone still locked after ${t.slug}`);
    }
  }
  const blank = await post("capstone-exam", Array(capstoneQuestions).fill(null));
  ok(blank.status === 200 && blank.body.passed === false, `the capstone opens after all ${tracks.length} gates (blank answers fail)`);
  const cap = await passQuiz("capstone-exam", capstoneQuestions);
  ok(cap.body.passed === true && cap.body.capstoneCompleted === true, "correct capstone answers pass it");
  const again = await post("capstone-exam", Array(capstoneQuestions).fill(null));
  ok(again.body.xpAwarded === 0, "no extra XP on a repeat attempt");

  const certs = await db.collection("certificates").find({ userId: user._id }).toArray();
  ok(certs.length === tracks.length + 1, `${tracks.length + 1} certificates exist (${certs.length})`);
  const course = certs.find((c) => c.kind === "course");
  ok(course && course.finalScore === 100, "the course certificate carries the capstone score");
  if (course) {
    const v = await fetch(`${BASE}/verify/${course.certId}`);
    ok(v.status === 200 && (await v.text()).includes(course.certId), "the public verify page shows the course certificate");
    const pdf = await fetch(`${BASE}/api/certificates/${course.certId}/pdf`);
    const buf = Buffer.from(await pdf.arrayBuffer());
    ok(pdf.status === 200 && buf.subarray(0, 5).toString() === "%PDF-", "the PDF is served");
  }
}

async function cleanup() {
  try {
    const db = mongoose.connection.db;
    const users = await db.collection("users").find({ email: { $in: created.emails } }).toArray();
    for (const u of users) {
      for (const c of ["submissions", "progresses", "certificates", "passwordresets"]) await db.collection(c).deleteMany({ userId: u._id });
      await db.collection("users").deleteOne({ _id: u._id });
    }
    const keyParts = [...created.emails.map(emailHash), ...created.ipKeys].map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    await db.collection("ratelimits").deleteMany({ key: { $regex: `:(${keyParts.join("|")}):` } });
    console.log(`cleaned up ${users.length} test users`);
  } catch (err) {
    console.log("cleanup problem:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

try {
  await main();
} catch (err) {
  failed++;
  console.log("FAIL the run stopped with an error: " + err.message);
}
await cleanup();
console.log(failed ? `${failed} FAILING` : "all end-to-end checks passed");
process.exitCode = failed ? 1 : 0;
