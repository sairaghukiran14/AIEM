// End-to-end checks of the quiz against a running server and a real MongoDB.
//   npm run build && npm start     then     npm run test:quiz-api
// Environment: BASE_URL (default http://localhost:3000), MONGODB_URI (or .env.local). Deletes everything it creates.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const mongoose = require("mongoose");
const ts = require("typescript");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const cache = new Map();
function load(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const js = ts.transpileModule(readFileSync(join(root, rel), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  const req = (p) => (p.startsWith("@/") ? load("src/" + p.slice(2) + ".ts") : p.startsWith("./") ? load(join(rel, "..", p.slice(2) + ".ts")) : {});
  vm.runInNewContext(js, { module: m, exports: m.exports, require: req, Math, JSON, Map, Set, Object, Array, Number, String });
  cache.set(rel, m.exports);
  return m.exports;
}
const core = load("src/lib/quiz-core.ts");
const bank = load("src/content/quiz/index.ts").quizBank;
const byId = new Map(bank.map((q) => [q.id, q]));

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
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) failed++; };

const run = randomBytes(3).toString("hex");
const ip = `192.0.2.${1 + (parseInt(run, 16) % 250)}`;
async function post(path, body, cookie) {
  const res = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json, cookie: res.headers.getSetCookie?.().map((c) => c.split(";")[0]).join("; ") || "" };
}
const get = (path, cookie) => fetch(BASE + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });

async function main() {
  await mongoose.connect(mongoUri());
  const db = mongoose.connection.db;
  const password = "Pw-" + randomBytes(9).toString("hex");
  const emails = [`quiz-a-${run}@example.com`, `quiz-b-${run}@example.com`];
  try {
    let r = await post("/api/quiz/start", { category: "all", difficulty: "mixed", kind: "all", count: 10 });
    ok(r.status === 401, "starting while signed out is a 401");
    r = await post("/api/quiz/answer", { attemptId: "0".repeat(24), index: 0, choice: 0 });
    ok(r.status === 401, "answering while signed out is a 401");
    ok((await get("/quiz")).status === 200, "the quiz page loads while signed out");
    ok((await get("/quiz/attempt/" + "0".repeat(24))).status === 307, "a result page asks you to sign in");

    const a = await post("/api/auth/signup", { name: "Quiz A", email: emails[0], password });
    const b = await post("/api/auth/signup", { name: "Quiz B", email: emails[1], password });
    ok(a.status === 200 && b.status === 200, "two test accounts were created");

    for (const [label, body] of [
      ["an unknown topic", { category: "nope", difficulty: "mixed", kind: "all", count: 10 }],
      ["a count that is not offered", { category: "all", difficulty: "mixed", kind: "all", count: 7 }],
      ["an invalid difficulty", { category: "all", difficulty: "9", kind: "all", count: 10 }],
      ["an invalid type", { category: "all", difficulty: "mixed", kind: "x", count: 10 }],
      ["a string count", { category: "all", difficulty: "mixed", kind: "all", count: "10" }],
      ["an operator object as the topic", { category: { $ne: "" }, difficulty: "mixed", kind: "all", count: 10 }],
    ]) ok((await post("/api/quiz/start", body, a.cookie)).status === 400, `start rejects ${label}`);

    r = await post("/api/quiz/start", { category: "all", difficulty: "mixed", kind: "all", count: 10 }, a.cookie);
    ok(r.status === 200 && r.body.attempt?.questions?.length === 10, "start returns ten questions");
    const attempt = r.body.attempt;
    const raw = JSON.stringify(r.body);
    ok(attempt.questions.every((q) => q.explanation === null && q.correctDisplay === null && q.correct === null && q.answered === false), "no answer, result or explanation is sent before a question is answered");
    ok(!/correctIndex/.test(raw), "the start response has no answer key");
    const doc = await db.collection("quizattempts").findOne({ _id: new mongoose.Types.ObjectId(attempt.id) });
    const qs = doc.items.map((i) => byId.get(i.questionId));
    ok(attempt.questions.every((q, i) => q.prompt === qs[i].prompt && q.options.length === qs[i].options.length), "the questions shown are the ones stored");
    ok(attempt.questions.every((q, i) => q.options.every((o, p) => o === qs[i].options[doc.items[i].order[p]])), "options are shown in the stored shuffled order");
    const lv = attempt.questions.map((q) => q.difficulty);
    ok(lv.every((l, i) => i === 0 || l >= lv[i - 1]), "a mixed quiz runs from easy to hard");

    const correctPos = (i) => doc.items[i].order.indexOf(qs[i].correctIndex);
    const wrongPos = (i) => [0, 1, 2, 3].filter((p) => p < doc.items[i].order.length && p !== correctPos(i))[0];

    // wrong answer on question 0
    r = await post("/api/quiz/answer", { attemptId: attempt.id, index: 0, choice: wrongPos(0) }, a.cookie);
    ok(r.status === 200 && r.body.correct === false && r.body.correctDisplay === correctPos(0) && r.body.explanation === qs[0].explanation, "a wrong answer is graded, with the right answer and the reason");
    r = await post("/api/quiz/answer", { attemptId: attempt.id, index: 0, choice: correctPos(0) }, a.cookie);
    ok(r.status === 409, "a question cannot be answered twice");
    ok((await db.collection("quizattempts").findOne({ _id: doc._id })).items[0].correct === false, "the first answer stands");

    for (const [label, body, want] of [
      ["an index past the end", { attemptId: attempt.id, index: 50, choice: 0 }, 400],
      ["a negative index", { attemptId: attempt.id, index: -1, choice: 0 }, 400],
      ["a choice of 4", { attemptId: attempt.id, index: 1, choice: 4 }, 400],
      ["a fractional choice", { attemptId: attempt.id, index: 1, choice: 0.5 }, 400],
      ["a string choice", { attemptId: attempt.id, index: 1, choice: "1" }, 400],
      ["a malformed attempt id", { attemptId: "zz", index: 1, choice: 0 }, 400],
      ["an unknown attempt", { attemptId: "f".repeat(24), index: 1, choice: 0 }, 404],
    ]) ok((await post("/api/quiz/answer", body, a.cookie)).status === want, `answer rejects ${label} (${want})`);
    ok((await post("/api/quiz/answer", { attemptId: attempt.id, index: 1, choice: 0 }, b.cookie)).status === 404, "another account cannot answer your quiz");
    ok((await get(`/quiz/attempt/${attempt.id}`, b.cookie)).status === 404, "another account cannot open your result");
    ok((await get(`/quiz/attempt/${attempt.id}`, a.cookie)).status === 307, "an unfinished quiz sends you back to the quiz page");

    // the page for an unfinished quiz must not leak answers for unanswered questions
    const page = await (await get("/quiz", a.cookie)).text();
    ok(page.includes("You have a quiz in progress"), "the quiz page offers to continue");
    ok(qs.slice(1).every((q) => !page.includes(q.explanation.slice(0, 40))), "the resume data holds no explanation for unanswered questions");

    // two simultaneous answers to one question: exactly one is recorded
    const race = await Promise.all([1, 2, 3, 4].map((p) => post("/api/quiz/answer", { attemptId: attempt.id, index: 1, choice: p % doc.items[1].order.length }, a.cookie)));
    ok(race.filter((x) => x.status === 200).length === 1 && race.filter((x) => x.status === 409).length === 3, `4 simultaneous answers: one recorded (${race.map((x) => x.status).join(",")})`);

    // question 2 skipped, the rest answered correctly
    r = await post("/api/quiz/answer", { attemptId: attempt.id, index: 2, choice: null }, a.cookie);
    ok(r.status === 200 && r.body.correct === false, "a skip is accepted and scores nothing");
    let last = r;
    for (let i = 3; i < 10; i++) last = await post("/api/quiz/answer", { attemptId: attempt.id, index: i, choice: correctPos(i) }, a.cookie);
    ok(last.body.finished === true && last.body.result, "answering the last question finishes the quiz and returns the result");

    const after = await db.collection("quizattempts").findOne({ _id: doc._id });
    const stored = after.items;
    const want = core.summarise(stored.map((it) => ({ difficulty: it.difficulty, kind: it.kind, category: it.category, correct: it.correct, answered: it.answered, skipped: it.answered && it.chosen === null })));
    ok(after.status === "done" && after.score === want.score && after.maxScore === want.maxScore && after.percent === want.percent, `the stored score matches the rules (${after.score}/${after.maxScore} = ${after.percent}%)`);
    const pts = stored.reduce((n, it) => n + (it.correct ? [0, 1, 2, 3][it.difficulty] : 0), 0);
    ok(after.score === pts, "points are 1, 2 and 3 for easy, medium and hard");
    ok(stored[0].correct === false && stored[1].answered && stored[2].chosen === null, "the wrong answer, the raced answer and the skip are recorded as such");
    ok(last.body.result.summary.skipped === 1, "the result counts the skipped question");
    ok((await post("/api/quiz/answer", { attemptId: attempt.id, index: 3, choice: 0 }, a.cookie)).status === 404, "a finished quiz accepts no more answers");

    const res = await get(`/quiz/attempt/${attempt.id}`, a.cookie);
    const html = await res.text();
    ok(res.status === 200 && html.includes("Your score") && new RegExp(`${after.percent}(<!-- -->)?%`).test(html), "the result page shows the score");
    ok(html.includes("Correct answer") && html.includes(qs[0].explanation.slice(0, 30)), "the result page reviews each question with its explanation");
    const list = await (await get("/quiz", a.cookie)).text();
    ok(list.includes("Recent quizzes") && new RegExp(`${after.percent}(<!-- -->)?%`).test(list), "the quiz page lists the finished quiz");

    // a new quiz replaces an unfinished one, and avoids questions just seen
    const q1 = await post("/api/quiz/start", { category: "all", difficulty: "mixed", kind: "all", count: 10 }, a.cookie);
    const q2 = await post("/api/quiz/start", { category: "decisions".replace("decisions", "decisions"), difficulty: "2", kind: "decision", count: 20 }, a.cookie);
    ok(q2.status === 200 && q2.body.attempt.questions.length === 20, "a filtered quiz can be started");
    ok(q2.body.attempt.questions.every((q) => q.difficulty === 2 && q.kind === "decision"), "filters on type and difficulty are honoured");
    ok((await db.collection("quizattempts").countDocuments({ userId: doc.userId, status: "open" })) === 1, "starting a new quiz replaces the unfinished one");
    const seenIds = new Set(stored.map((i) => i.questionId));
    const q3 = await post("/api/quiz/start", { category: "all", difficulty: "mixed", kind: "all", count: 20 }, a.cookie);
    const q3ids = (await db.collection("quizattempts").findOne({ _id: new mongoose.Types.ObjectId(q3.body.attempt.id) })).items.map((i) => i.questionId);
    ok(q3ids.every((id) => !seenIds.has(id)), "a new quiz avoids questions from the last one");
    ok(q1.status === 200, "(the replaced quiz had started fine)");

    // rate limit on starting
    const burst = [];
    for (let i = 0; i < 32; i++) burst.push((await post("/api/quiz/start", { category: "all", difficulty: "mixed", kind: "all", count: 10 }, b.cookie)).status);
    ok(burst.slice(0, 30).every((s) => s === 200) && burst.slice(30).every((s) => s === 429), `starting is limited to 30 an hour (${burst.slice(28).join(",")})`);
  } finally {
    const users = await db.collection("users").find({ email: { $in: emails } }).toArray();
    for (const u of users) {
      await db.collection("quizattempts").deleteMany({ userId: u._id });
      await db.collection("users").deleteOne({ _id: u._id });
    }
    await mongoose.disconnect();
  }
  console.log(`\n${failed ? "FAILED" : "all passed"} (${failed} failed)`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
