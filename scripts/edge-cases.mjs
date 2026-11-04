// Edge-case checks against a running server and a real MongoDB. Safe to point at production:
// every account uses Resend's test recipient (delivered+label@resend.dev), so no real mail is sent,
// and everything it creates is deleted afterwards.
//
//   BASE_URL=https://your-site.vercel.app EXPECT_MAIL=1 npm run edge
//
// Environment: BASE_URL (default http://localhost:3000), MONGODB_URI (or .env.local),
// EXPECT_MAIL=1 to require that the deployment reports email as configured.
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const mongoose = require("mongoose");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const HTTPS = BASE.startsWith("https://");
function mongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const file = join(root, ".env.local");
  if (existsSync(file)) {
    const m = readFileSync(file, "utf8").match(/^MONGODB_URI="?([^"\n]+)/m);
    if (m) return m[1];
  }
  throw new Error("Set MONGODB_URI or create .env.local");
}

let failed = 0, infos = 0, passed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "PASS " : "FAIL ") + msg);
  if (cond) passed++;
  else failed++;
};
const info = (msg) => { console.log("INFO " + msg); infos++; };
const section = (t) => console.log(`\n== ${t}`);

const run = randomBytes(3).toString("hex");
let counter = 0;
const newEmail = (label = "u") => `delivered+edge-${run}-${label}${++counter}@resend.dev`;
const sha = (s) => createHash("sha256").update(s).digest("hex");
const createdEmails = [];
const PASSWORD = "Pw-" + randomBytes(9).toString("hex");

let db;
async function clearIpLimits() {
  await db.collection("ratelimits").deleteMany({ key: { $regex: "^(login|signup|forgot|reset)-ip:" } });
}

async function http(method, path, { body, raw, cookie, ip, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: {
      ...(body !== undefined || raw !== undefined ? { "content-type": "application/json" } : {}),
      ...(ip ? { "x-forwarded-for": ip } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  const cookies = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, json, text, headers: res.headers, setCookie: cookies, cookie: cookies.map((c) => c.split(";")[0]).join("; ") };
}
const post = (path, body, o = {}) => http("POST", path, { body, ...o });

async function signup(email, name = "Edge Test", password = PASSWORD, ip = "198.51.100.1") {
  createdEmails.push(email.toLowerCase());
  return post("/api/auth/signup", { name, email, password }, { ip });
}

// ---- course data read from the content files ----
const track1Dir = join(root, "src/content/tracks/llm-foundations");
const track1 = {
  gate: readFileSync(join(track1Dir, "index.ts"), "utf8").match(/id: "(\w+-gate)"/)[1],
  gateQuestions: (readFileSync(join(track1Dir, "index.ts"), "utf8").match(/id: "g\d+"/g) || []).length,
  lessons: readdirSync(join(track1Dir, "lessons")).sort().map((f) => {
    const s = readFileSync(join(track1Dir, "lessons", f), "utf8");
    return { slug: s.match(/^ {2}slug: "([^"]+)"/m)[1], ids: [...new Set([...s.matchAll(/id: "(\w+-\d+-(?:quiz|bug|code))"/g)].map((m) => m[1]))] };
  }),
};
const allTracks = readdirSync(join(root, "src/content/tracks"));
const lessonPages = allTracks.flatMap((t) =>
  readdirSync(join(root, "src/content/tracks", t, "lessons")).sort().map((f) => {
    const s = readFileSync(join(root, "src/content/tracks", t, "lessons", f), "utf8");
    return `/learn/${t}/${s.match(/^ {2}slug: "([^"]+)"/m)[1]}`;
  })
);

async function main() {
  await mongoose.connect(mongoUri());
  db = mongoose.connection.db;
  await clearIpLimits();

  // ======================================================== health
  section("Deployment health");
  let r = await http("GET", "/api/health");
  ok(r.status === 200 && r.json.ok === true, `/api/health is ok (${r.status}) ${r.status === 200 ? "" : JSON.stringify(r.json)}`);
  ok(r.json.database === true && r.json.authSecretSet === true, "database reachable and AUTH_SECRET set");
  if (process.env.EXPECT_MAIL === "1") {
    ok(r.json.mailConfigured === true, "email is configured (RESEND_API_KEY and MAIL_FROM)");
    ok(r.json.siteUrlSet === true, "SITE_URL is set");
  } else info(`mailConfigured=${r.json.mailConfigured} siteUrlSet=${r.json.siteUrlSet} (set EXPECT_MAIL=1 to require them)`);
  ok(!/re_[A-Za-z0-9]{10,}|mongodb/i.test(r.text), "the health response contains no secret values");

  // ======================================================== input handling
  section("Malformed and hostile input");
  r = await http("GET", "/api/auth/login");
  ok(r.status === 405, `GET on a POST-only route is 405 (${r.status})`);
  r = await http("POST", "/api/auth/login", { raw: "{not json", ip: "198.51.100.2" });
  ok(r.status === 400, `invalid JSON is a 400 (${r.status})`);
  r = await http("POST", "/api/auth/login", { raw: "", ip: "198.51.100.2" });
  ok(r.status === 400, `an empty body is a 400 (${r.status})`);
  r = await post("/api/auth/login", { email: { $ne: "" }, password: { $ne: "" } }, { ip: "198.51.100.2" });
  ok(r.status === 400, `a NoSQL operator object instead of a string is rejected (${r.status})`);
  r = await post("/api/auth/login", { email: "a@example.com", password: 12345 }, { ip: "198.51.100.2" });
  ok(r.status === 400, `a numeric password is rejected (${r.status})`);
  r = await post("/api/auth/login", { email: "not-an-email", password: "x" }, { ip: "198.51.100.2" });
  ok(r.status === 400, `a malformed email is rejected (${r.status})`);
  r = await post("/api/auth/login", ["array"], { ip: "198.51.100.2" });
  ok(r.status === 400, `a JSON array body is rejected (${r.status})`);

  const t0 = Date.now();
  r = await http("POST", "/api/auth/login", { raw: JSON.stringify({ email: "a@example.com", password: "x".repeat(2_000_000) }), ip: "198.51.100.2" });
  ok(r.status < 500, `a 2 MB body does not crash the server (${r.status}, ${Date.now() - t0} ms)`);

  r = await signup(newEmail(), "A");
  ok(r.status === 400, `a 1-character name is rejected (${r.status})`);
  r = await signup(newEmail(), "   ");
  ok(r.status === 400, `a whitespace-only name is rejected (${r.status})`);
  r = await signup(newEmail(), "x".repeat(81));
  ok(r.status === 400, `an 81-character name is rejected (${r.status})`);
  r = await signup(newEmail(), "x".repeat(80));
  ok(r.status === 200, `an 80-character name is accepted (${r.status})`);
  r = await signup(newEmail(), "Edge", "1234567");
  ok(r.status === 400, `a 7-character password is rejected (${r.status})`);
  r = await signup("nobody@", "Edge");
  ok(r.status === 400, `an email without a domain is rejected (${r.status})`);
  r = await signup(`${"a".repeat(300)}@example.com`, "Edge");
  ok(r.status === 400, `a 300-character email is rejected (${r.status})`);

  // ---- passwords longer than bcrypt's 72-byte limit
  const longEmail = newEmail("long");
  const longPw = "L0ng-" + "x".repeat(95);
  r = await signup(longEmail, "Long Password", longPw);
  info(`signup with a ${longPw.length}-character password -> ${r.status}`);
  if (r.status === 200) {
    r = await post("/api/auth/login", { email: longEmail, password: longPw.slice(0, 72) }, { ip: "198.51.100.3" });
    ok(r.status === 401, `only the first 72 characters of a long password must NOT also log in (${r.status})`);
  } else ok(r.status === 400, "an over-long password is refused with a clear 400");

  // ---- email case and plus-addressing
  const mixed = `delivered+Edge-${run}-CaSe@resend.dev`;
  r = await signup(mixed, "Case Test");
  ok(r.status === 200, `signup with a mixed-case email (${r.status})`);
  r = await post("/api/auth/login", { email: mixed.toLowerCase(), password: PASSWORD }, { ip: "198.51.100.4" });
  ok(r.status === 200, `login with the lower-case form of the same email (${r.status})`);
  r = await signup(mixed.toUpperCase().replace("RESEND.DEV", "resend.dev"), "Case Test");
  ok(r.status === 409, `a duplicate that differs only in case is refused (${r.status})`);

  // ---- unicode and script injection in names
  const uniEmail = newEmail("uni");
  r = await signup(uniEmail, "Zoë 賽拉 🎉 Müller-O'Brien");
  ok(r.status === 200, `a unicode name is accepted (${r.status})`);

  // ======================================================== concurrency
  section("Concurrency");
  await clearIpLimits();
  const raceEmail = newEmail("race");
  createdEmails.push(raceEmail);
  const signups = await Promise.all(Array.from({ length: 6 }, () => post("/api/auth/signup", { name: "Race Test", email: raceEmail, password: PASSWORD }, { ip: "198.51.100.5" })));
  const codes = signups.map((x) => x.status).sort();
  ok(codes.filter((c) => c === 200).length === 1, `6 simultaneous signups for one address create exactly one account (${codes.join(",")})`);
  ok(codes.every((c) => c === 200 || c === 409), `the losers get a 409, never a 500 (${codes.join(",")})`);
  ok((await db.collection("users").countDocuments({ email: raceEmail })) === 1, "the database holds exactly one such user");

  await clearIpLimits();
  const burstEmail = newEmail("burst");
  await signup(burstEmail);
  const burst = await Promise.all(Array.from({ length: 14 }, (_, i) => post("/api/auth/login", { email: burstEmail, password: "Bad-" + randomBytes(6).toString("hex") }, { ip: `198.51.100.${10 + i}` })));
  const b401 = burst.filter((x) => x.status === 401).length, b429 = burst.filter((x) => x.status === 429).length;
  ok(b401 === 8 && b429 === 6, `14 simultaneous wrong logins: exactly 8 answered, 6 limited, even from 14 different addresses (${b401}/${b429})`);

  // ======================================================== sessions
  section("Sessions");
  await clearIpLimits();
  const sessEmail = newEmail("sess");
  await signup(sessEmail);
  r = await post("/api/auth/login", { email: sessEmail, password: PASSWORD }, { ip: "198.51.100.30" });
  ok(r.status === 200, "login works");
  const cookie = r.cookie;
  const flags = r.setCookie.join(" ; ");
  ok(/HttpOnly/i.test(flags), "the session cookie is HttpOnly");
  ok(/SameSite=Lax/i.test(flags), "the session cookie is SameSite=Lax");
  if (HTTPS) ok(/Secure/i.test(flags), "the session cookie is Secure over https");
  else info("Secure flag not checked (plain http)");
  const probe = (c) => post("/api/challenges/submit", { challengeId: "no-such-challenge", answer: 1 }, { cookie: c });
  r = await probe(cookie);
  ok(r.status === 404, `a valid session reaches the API (${r.status})`);
  r = await probe("");
  ok(r.status === 401, `no cookie is a 401 (${r.status})`);
  const tampered = cookie.slice(0, -3) + (cookie.endsWith("abc") ? "xyz" : "abc");
  r = await probe(tampered);
  ok(r.status === 401, `a tampered cookie is a 401 (${r.status})`);
  r = await probe("aiem_session=not.a.jwt");
  ok(r.status === 401, `a garbage token is a 401 (${r.status})`);
  r = await probe("aiem_session=eyJhbGciOiJub25lIn0.eyJ1aWQiOiIxMjMifQ.");
  ok(r.status === 401, `an unsigned 'alg: none' token is a 401 (${r.status})`);
  r = await http("GET", "/dashboard", { cookie: tampered });
  ok(r.status === 307 || r.status === 308, `a tampered cookie cannot open /dashboard (${r.status})`);
  r = await http("GET", "/dashboard");
  ok((r.status === 307 || r.status === 308) && (r.headers.get("location") || "").includes("/login"), "a signed-out visit to /dashboard redirects to /login");
  const lo = await post("/api/auth/logout", {}, { cookie });
  ok(lo.status === 200 && /aiem_session=;|Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(lo.setCookie.join(";")), `logout clears the cookie (${lo.status})`);
  r = await probe(cookie);
  info(`an old cookie replayed after logout -> ${r.status} (sessions are stateless tokens; logout clears the browser's cookie but does not revoke the token server-side)`);

  // A cookie that outlives its account must never cause a redirect loop between /login and /dashboard.
  async function hops(path, cookieHeader, max = 8) {
    let url = path, count = 0, status = 0;
    while (count <= max) {
      const res = await fetch(BASE + url, { redirect: "manual", headers: { cookie: cookieHeader } });
      status = res.status;
      const loc = res.headers.get("location");
      if (status >= 300 && status < 400 && loc) { url = new URL(loc, BASE).pathname + new URL(loc, BASE).search; count++; } else break;
    }
    return { status, count, url };
  }
  const ghostEmail = newEmail("ghost");
  await signup(ghostEmail);
  const ghostLogin = await post("/api/auth/login", { email: ghostEmail, password: PASSWORD }, { ip: "198.51.100.34" });
  await db.collection("users").deleteOne({ email: ghostEmail });
  for (const path of ["/certificates", "/dashboard", "/login", "/signup"]) {
    const h = await hops(path, ghostLogin.cookie);
    ok(h.status === 200 && h.count <= 2, `a cookie for a deleted account does not loop on ${path} (ends ${h.status} after ${h.count} redirects)`);
  }
  // the same after a password reset signs older sessions out
  const staleEmail = newEmail("stale");
  await signup(staleEmail);
  const staleLogin = await post("/api/auth/login", { email: staleEmail, password: PASSWORD }, { ip: "198.51.100.35" });
  const staleUser = await db.collection("users").findOne({ email: staleEmail });
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await db.collection("users").updateOne({ _id: staleUser._id }, { $set: { passwordChangedAt: new Date() } });
  for (const path of ["/certificates", "/login"]) {
    const h = await hops(path, staleLogin.cookie);
    ok(h.status === 200 && h.count <= 2, `a session signed out by a password reset does not loop on ${path} (ends ${h.status} after ${h.count} redirects)`);
  }
  const live = await hops("/login", cookie);
  ok(live.count === 1 && live.url === "/dashboard", `a valid session on /login still goes to /dashboard (${live.url})`);

  // open redirect
  for (const next of ["//evil.example", "https://evil.example", "/\\evil.example"]) {
    r = await http("GET", `/login?next=${encodeURIComponent(next)}`);
    // The framework echoes the URL in its own payload; what matters is the value passed to the form.
    const carried = r.text.match(/login\\",\\"next\\":\\"([^"\\]*)/)?.[1];
    ok(r.status === 200 && carried === "/dashboard", `login ?next=${next} falls back to /dashboard (form receives ${carried})`);
  }

  // ======================================================== challenge API
  section("Challenge submissions");
  await clearIpLimits();
  const chEmail = newEmail("chal");
  await signup(chEmail);
  r = await post("/api/auth/login", { email: chEmail, password: PASSWORD }, { ip: "198.51.100.31" });
  const ck = r.cookie;
  const user = await db.collection("users").findOne({ email: chEmail });
  const sub = (id, answer, c = ck) => post("/api/challenges/submit", { challengeId: id, answer }, { cookie: c });
  const quizId = track1.lessons[0].ids.find((i) => i.endsWith("quiz"));
  const bugId = track1.lessons[0].ids.find((i) => i.endsWith("bug"));
  const codeId = track1.lessons[0].ids.find((i) => i.endsWith("code"));

  r = await post("/api/challenges/submit", { challengeId: quizId, answer: [0, 0, 0, 0, 0] });
  ok(r.status === 401, `submitting while signed out is a 401 (${r.status})`);
  r = await sub("", [0]);
  ok(r.status === 400, `an empty challenge id is a 400 (${r.status})`);
  r = await post("/api/challenges/submit", { answer: [0] }, { cookie: ck });
  ok(r.status === 400, `a missing challenge id is a 400 (${r.status})`);
  r = await sub(quizId, [0, 0, 0]);
  ok(r.status === 400, `a quiz answer of the wrong length is a 400 (${r.status})`);
  r = await sub(quizId, ["a", "b", "c", "d", "e"]);
  ok(r.status === 400, `quiz answers that are strings are a 400 (${r.status})`);
  r = await sub(quizId, [1.5, 0, 0, 0, 0]);
  ok(r.status === 400, `a fractional answer index is a 400 (${r.status})`);
  r = await sub(quizId, [99, 99, 99, 99, 99]);
  ok(r.status === 200 && r.json.passed === false && r.json.score === 0, `out-of-range indexes just score zero (${r.status}, ${r.json.score}/${r.json.maxScore})`);
  r = await sub(quizId, [-1, -1, -1, -1, -1]);
  ok(r.status === 200 && r.json.score === 0, `negative indexes just score zero (${r.status})`);
  r = await sub(quizId, [null, null, null, null, null]);
  ok(r.status === 200 && r.json.score === 0 && Array.isArray(r.json.feedback?.results), `blank answers score zero with feedback (${r.status})`);
  r = await sub(bugId, { line: 999, reason: 99 });
  ok(r.status === 200 && r.json.passed === false, `a bug answer with nonsense values is graded, not a crash (${r.status})`);
  r = await sub(bugId, { line: 1 });
  ok(r.status === 400, `a bug answer missing its reason is a 400 (${r.status})`);
  r = await sub(bugId, "line 3");
  ok(r.status === 400, `a bug answer that is a string is a 400 (${r.status})`);
  r = await sub(codeId, { passedTests: 99, totalTests: 3 });
  ok(r.status === 400, `more passes than tests is a 400 (${r.status})`);
  r = await sub(codeId, { passedTests: -1, totalTests: 5 });
  ok(r.status === 400, `negative passes is a 400 (${r.status})`);
  r = await sub(codeId, { passedTests: 1.5, totalTests: 5 });
  ok(r.status === 400, `fractional passes is a 400 (${r.status})`);
  r = await sub(codeId, { passedTests: 1, totalTests: 1 });
  ok(r.status === 400, `the wrong number of total tests is a 400 (${r.status})`);
  r = await sub(codeId, { passedTests: "5", totalTests: "5" });
  ok(r.status === 400, `string numbers are a 400 (${r.status})`);
  r = await sub("rag-gate", Array(10).fill(0));
  ok(r.status === 403, `a gate in a locked track is a 403 (${r.status})`);
  r = await sub(track1.gate, Array(track1.gateQuestions).fill(0));
  ok(r.status === 403, `a gate before its lessons are done is a 403 (${r.status})`);
  r = await sub("capstone-exam", Array(36).fill(0));
  ok(r.status === 403, `the capstone before the gates is a 403 (${r.status})`);

  // XP must be awarded once even when the same pass arrives many times at once
  const fb = await sub(quizId, [null, null, null, null, null]);
  const correct = fb.json.feedback.results.map((x) => x.correctIndex);
  const xpBefore = (await db.collection("users").findOne({ _id: user._id })).xp ?? 0;
  const many = await Promise.all(Array.from({ length: 8 }, () => sub(quizId, correct)));
  const awarded = many.reduce((n, x) => n + (x.json.xpAwarded || 0), 0);
  const xpAfter = (await db.collection("users").findOne({ _id: user._id })).xp ?? 0;
  ok(many.every((x) => x.status === 200), "8 simultaneous passing submissions all succeed");
  ok(awarded <= 50 && xpAfter - xpBefore === awarded, `XP for one challenge is awarded once, not once per request (awarded ${awarded}, user gained ${xpAfter - xpBefore})`);
  const passRows = await db.collection("submissions").countDocuments({ userId: user._id, challengeId: quizId, passed: true });
  info(`${passRows} passing submission rows were stored for that burst`);

  // ======================================================== certificates, names and XSS
  section("Certificates and hostile names");
  await clearIpLimits();
  const xssEmail = newEmail("xss");
  const xssName = "<img src=x onerror=alert(1)>";
  await signup(xssEmail, xssName);
  r = await post("/api/auth/login", { email: xssEmail, password: PASSWORD }, { ip: "198.51.100.32" });
  const xk = r.cookie;
  const xuser = await db.collection("users").findOne({ email: xssEmail });
  const verifyToken = randomBytes(32).toString("hex");
  await db.collection("emailverifications").insertOne({ userId: xuser._id, tokenHash: sha(verifyToken), expiresAt: new Date(Date.now() + 3600_000), createdAt: new Date() });
  r = await post("/api/auth/verify-email", { token: verifyToken }, { ip: "198.51.100.33" });
  ok(r.status === 200, "the hostile-name account confirms its email");
  for (const l of track1.lessons) {
    for (const id of l.ids) {
      await db.collection("submissions").insertOne({ userId: xuser._id, challengeId: id, trackSlug: "llm-foundations", lessonSlug: l.slug, kind: id.endsWith("quiz") ? "quiz" : id.endsWith("bug") ? "spot-the-bug" : "code", score: 1, maxScore: 1, passed: true, attempt: 1, xpAwarded: 0, answer: null, createdAt: new Date(), updatedAt: new Date() });
    }
    await db.collection("progresses").updateOne({ userId: xuser._id, lessonSlug: l.slug }, { $set: { trackSlug: "llm-foundations", status: "completed", completedAt: new Date() } }, { upsert: true });
  }
  const first = await post("/api/challenges/submit", { challengeId: track1.gate, answer: Array(track1.gateQuestions).fill(null) }, { cookie: xk });
  const gate = await post("/api/challenges/submit", { challengeId: track1.gate, answer: first.json.feedback.results.map((x) => x.correctIndex) }, { cookie: xk });
  ok(gate.json.passed === true, "a track gate can be passed by an account with a hostile name");
  const cert = await db.collection("certificates").findOne({ userId: xuser._id });
  ok(!!cert, "a certificate was issued");
  if (cert) {
    r = await http("GET", `/verify/${cert.certId}`);
    ok(r.status === 200 && r.text.includes(cert.certId), "the public verify page loads");
    ok(!r.text.includes("<img src=x onerror") && r.text.includes("&lt;img"), "a script-like name is escaped on the verify page");
    r = await http("GET", `/verify/${cert.certId.toLowerCase()}`);
    info(`verify page with the certificate id in lower case -> ${r.status}`);
    r = await http("GET", `/api/certificates/${cert.certId}/pdf`);
    ok(r.status === 200 && r.text.startsWith("%PDF-"), "the PDF builds for a hostile name");
    r = await http("GET", "/certificates", { cookie: xk });
    ok(r.status === 200 && !r.text.includes("<img src=x onerror"), "the certificates page does not render the name as markup");
    r = await http("GET", "/dashboard", { cookie: xk });
    ok(r.status === 200 && !r.text.includes("<img src=x onerror"), "the dashboard escapes the name");
  }
  for (const bad of ["AIEM-XXXX", "'; DROP TABLE certificates;--", "a".repeat(500), "%E2%98%83%E2%98%83", "..%2F..%2Fetc%2Fpasswd", "AIEM-ZZZZ-ZZZZ-ZZZZ", "%00"]) {
    r = await http("GET", `/verify/${bad}`);
    ok(r.status < 500, `/verify/${decodeURIComponent(bad).slice(0, 24)} does not crash (${r.status})`);
    r = await http("GET", `/api/certificates/${bad}/pdf`);
    ok(r.status === 404 || r.status === 400, `its PDF route answers 404 or 400 (${r.status})`);
  }

  // ======================================================== password reset races
  section("Password reset edge cases");
  await clearIpLimits();
  const rsEmail = newEmail("reset");
  await signup(rsEmail);
  const ruser = await db.collection("users").findOne({ email: rsEmail });
  const mk = async (offset = 3600_000) => {
    const token = randomBytes(32).toString("hex");
    await db.collection("passwordresets").insertOne({ userId: ruser._id, tokenHash: sha(token), expiresAt: new Date(Date.now() + offset), createdAt: new Date() });
    return token;
  };
  let token = await mk();
  const racers = await Promise.all(Array.from({ length: 5 }, (_, i) => post("/api/auth/reset", { token, password: `Racer-Passw0rd-${i}` }, { ip: "198.51.100.40" })));
  ok(racers.filter((x) => x.status === 200).length === 1, `5 simultaneous uses of one reset link: exactly one succeeds (${racers.map((x) => x.status).join(",")})`);
  r = await post("/api/auth/reset", { token: "short", password: PASSWORD }, { ip: "198.51.100.40" });
  ok(r.status === 400, `a too-short token is a 400 (${r.status})`);
  r = await post("/api/auth/reset", { token: "x".repeat(500), password: PASSWORD }, { ip: "198.51.100.40" });
  ok(r.status === 400, `an over-long token is a 400 (${r.status})`);
  r = await post("/api/auth/reset", { token: { $ne: "" }, password: PASSWORD }, { ip: "198.51.100.40" });
  ok(r.status === 400, `a NoSQL operator as the token is a 400 (${r.status})`);
  token = await mk();
  r = await post("/api/auth/reset", { token, password: "x".repeat(100) }, { ip: "198.51.100.40" });
  info(`reset with a 100-character password -> ${r.status}`);
  await clearIpLimits();
  r = await post("/api/auth/forgot", { email: "no-at-sign" }, { ip: "198.51.100.41" });
  ok(r.status === 400, `forgot with a malformed email is a 400 (${r.status})`);
  r = await post("/api/auth/forgot", { email: { $ne: "" } }, { ip: "198.51.100.41" });
  ok(r.status === 400, `forgot with an operator object is a 400 (${r.status})`);
  r = await post("/api/auth/forgot", { email: rsEmail.toUpperCase().replace("RESEND.DEV", "resend.dev") }, { ip: "198.51.100.41" });
  ok(r.status === 200, `forgot ignores email case (${r.status})`);
  ok((await db.collection("passwordresets").countDocuments({ userId: ruser._id })) >= 1, "a reset record was created for the upper-case form of the address");

  // ======================================================== email verification edge cases
  section("Email verification edge cases");
  await clearIpLimits();
  r = await post("/api/auth/verify-email", { token: { $ne: "" } }, { ip: "198.51.100.50" });
  ok(r.status === 400, `an operator object as the token is a 400 (${r.status})`);
  r = await post("/api/auth/verify-email", { token: "x".repeat(500) }, { ip: "198.51.100.50" });
  ok(r.status === 400, `an over-long token is a 400 (${r.status})`);
  r = await post("/api/auth/verify-email", ["token"], { ip: "198.51.100.50" });
  ok(r.status === 400, `an array body is a 400 (${r.status})`);
  r = await http("POST", "/api/auth/verify-email", { raw: "{not json", ip: "198.51.100.50" });
  ok(r.status === 400, `invalid JSON is a 400 (${r.status})`);
  r = await post("/api/auth/resend-verification", {}, { ip: "198.51.100.50" });
  ok(r.status === 401, `resend without a session is a 401 (${r.status})`);
  r = await http("GET", "/api/auth/verify-email");
  ok(r.status === 405, `GET on the confirm endpoint is a 405 (${r.status})`);
  r = await http("GET", "/verify-email");
  ok(r.status === 200 && /not valid/i.test(r.text), "the confirmation page without a token says the link is not valid");
  const unv = newEmail("unv");
  await signup(unv);
  const unvLogin = await post("/api/auth/login", { email: unv, password: PASSWORD }, { ip: "198.51.100.51" });
  const sends = [];
  for (let i = 0; i < 4; i++) sends.push((await post("/api/auth/resend-verification", {}, { cookie: unvLogin.cookie, ip: `198.51.100.${60 + i}` })).status);
  ok(sends.slice(0, 3).every((s) => s === 200 || s === 502) && sends[3] === 429, `resend is limited to 3 an hour per account, even from different addresses (${sends.join(",")})`);
  const unvUser = await db.collection("users").findOne({ email: unv });
  ok((await db.collection("emailverifications").countDocuments({ userId: unvUser._id })) === 1, "repeated resends leave exactly one valid link");

  // ======================================================== pages and content
  section("Pages, routes and answer keys");
  await clearIpLimits();
  const pages = ["/", "/tracks", "/cheatsheets", "/capstone", "/assess", "/interview", "/verify", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", ...allTracks.map((t) => `/tracks/${t}`), ...allTracks.map((t) => `/cheatsheets/${t}`)];
  let leaks = [], badPages = [];
  for (const p of [...pages, ...lessonPages]) {
    const x = await http("GET", p);
    if (x.status !== 200) badPages.push(`${p} ${x.status}`);
    if (/"correctIndex"|"correctReasonIndex"|"buggyLine"|"solution":/.test(x.text) && !p.startsWith("/assess")) leaks.push(p);
  }
  ok(badPages.length === 0, `all ${pages.length + lessonPages.length} pages return 200 ${badPages.slice(0, 4).join(" ")}`);
  ok(leaks.length === 0, `no answer keys or solutions in any page's HTML ${leaks.slice(0, 3).join(" ")}`);
  for (const p of ["/nope", "/tracks/zzz", "/learn/llm-foundations/zzz", "/learn/zzz/zzz", "/cheatsheets/zzz", "/api/nope"]) {
    const x = await http("GET", p);
    ok(x.status === 404, `${p} is a 404 (${x.status})`);
  }
  const x404 = await http("GET", "/nope");
  ok(/not found|404/i.test(x404.text), "the 404 page says so in words");
  r = await http("GET", "/tracks/rag-systems", { cookie: ck });
  ok(r.status === 200 && /locked/i.test(r.text), "a locked track shows the lock screen to a new learner");
  r = await http("GET", "/learn/rag-systems/the-rag-pipeline", { cookie: ck });
  info(`a lesson page in a locked track, opened directly -> ${r.status}, ${/locked/i.test(r.text) ? "shows a lock screen" : "shows the lesson"}`);
  r = await http("GET", "/capstone", { cookie: ck });
  ok(r.status === 200 && !/Submit \(/.test(r.text) && !r.text.includes("fieldset"), "the capstone page shows no exam to a learner who has not passed the gates");

  // ======================================================== security headers
  section("Security headers");
  r = await http("GET", "/");
  const hs = r.headers;
  const want = [
    ["x-content-type-options", /nosniff/i],
    ["referrer-policy", /./],
    ["x-frame-options", /deny|sameorigin/i],
    ["permissions-policy", /./],
  ];
  for (const [name, re] of want) ok(re.test(hs.get(name) || ""), `${name} header is set (${hs.get(name) ?? "missing"})`);
  if (HTTPS) ok(/max-age=/.test(hs.get("strict-transport-security") || ""), "Strict-Transport-Security is set over https");
  ok(!hs.get("x-powered-by"), `the X-Powered-By header is not sent (${hs.get("x-powered-by") ?? "absent"})`);
}

async function cleanup() {
  try {
    const users = await db.collection("users").find({ email: { $regex: `^delivered\\+edge-${run}-`, $options: "i" } }).toArray();
    for (const u of users) {
      for (const c of ["submissions", "progresses", "certificates", "passwordresets", "emailverifications"]) await db.collection(c).deleteMany({ userId: u._id });
      await db.collection("users").deleteOne({ _id: u._id });
    }
    await db.collection("ratelimits").deleteMany({ key: { $regex: "^(login|signup|forgot|reset)-ip:" } });
    await db.collection("ratelimits").deleteMany({ key: { $regex: "^(login|forgot)-email:" } });
    console.log(`\ncleaned up ${users.length} test users`);
  } catch (err) {
    console.log("cleanup problem:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

try { await main(); } catch (err) { failed++; console.log("FAIL the run stopped with an error: " + err.stack); }
await cleanup();
console.log(`${passed} passed, ${failed} failed, ${infos} notes`);
process.exitCode = failed ? 1 : 0;
