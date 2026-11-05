// Unit tests for the quiz rules (src/lib/quiz-core.ts) and structural checks on how the bank is used.
// Run with: node scripts/test-quiz.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const ts = createRequire(join(root, "package.json"))("typescript");
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
const bankMod = load("src/content/quiz/index.ts");
const bank = bankMod.quizBank;

let failed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok ? "ok   " : "FAIL ") + name + (ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`));
  if (!ok) failed++;
};
const truthy = (name, v) => eq(name, Boolean(v), true);

// a small deterministic random source
let seed = 12345;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

truthy("the bank has at least 1000 questions", bank.length >= 1000);
eq("ids are unique", new Set(bank.map((q) => q.id)).size, bank.length);
eq("every category in the list has questions", bankMod.quizCategories.every((c) => bank.some((q) => q.category === c.slug)), true);

const filters = (o = {}) => ({ category: "all", difficulty: "mixed", kind: "all", count: 20, ...o });
const byId = new Map(bank.map((q) => [q.id, q]));

let ids = core.pickQuestionIds(bank, filters(), new Set(), rand);
eq("picks the number asked for", ids.length, 20);
eq("picks are unique", new Set(ids).size, 20);
const levels = ids.map((id) => byId.get(id).difficulty);
eq("mixed runs from easy to hard", levels.every((l, i) => i === 0 || l >= levels[i - 1]), true);
truthy("mixed contains all three levels", [1, 2, 3].every((l) => levels.includes(l)));

for (const cat of bankMod.quizCategories) {
  ids = core.pickQuestionIds(bank, filters({ category: cat.slug, count: 10 }), new Set(), rand);
  eq(`${cat.slug}: only that topic`, ids.every((id) => byId.get(id).category === cat.slug), true);
}
for (const kind of ["concept", "decision", "debug", "yesno"]) {
  ids = core.pickQuestionIds(bank, filters({ kind, count: 30 }), new Set(), rand);
  eq(`kind ${kind}: only that type, 30 of them`, ids.length === 30 && ids.every((id) => byId.get(id).kind === kind), true);
}
for (const d of ["1", "2", "3"]) {
  ids = core.pickQuestionIds(bank, filters({ difficulty: d, count: 30 }), new Set(), rand);
  eq(`difficulty ${d}: only that level`, ids.every((id) => String(byId.get(id).difficulty) === d), true);
}
ids = core.pickQuestionIds(bank, filters({ category: "fundamentals", kind: "yesno", difficulty: "3", count: 50 }), new Set(), rand);
truthy("asking for more than exist returns what exists, never more", ids.length > 0 && ids.length <= 50);
eq("an impossible filter returns nothing", core.pickQuestionIds([], filters(), new Set(), rand), []);

const first = core.pickQuestionIds(bank, filters({ count: 50 }), new Set(), rand);
const seen = new Set(first);
const second = core.pickQuestionIds(bank, filters({ count: 50 }), seen, rand);
eq("questions seen recently are avoided while unseen ones remain", second.filter((id) => seen.has(id)).length, 0);
const tiny = bank.filter((q) => q.category === "fundamentals" && q.kind === "yesno");
const seenAll = new Set(tiny.map((q) => q.id));
eq("when everything was seen, it still fills the quiz", core.pickQuestionIds(tiny, filters({ count: 10 }), seenAll, rand).length, 10);

// shuffling
const sample = core.pickQuestionIds(bank, filters({ count: 50 }), new Set(), rand).map((id) => byId.get(id));
const orders = core.displayOrders(sample, "abc123");
eq("one order per question", orders.length, sample.length);
eq("every order is a permutation", orders.every((o, i) => [...o].sort().join() === (sample[i].kind === "yesno" ? "0,1" : "0,1,2,3")), true);
eq("yes/no keeps Yes first", orders.filter((_, i) => sample[i].kind === "yesno").every((o) => o[0] === 0 && o[1] === 1), true);
eq("the same seed gives the same order", JSON.stringify(core.displayOrders(sample, "abc123")), JSON.stringify(orders));
truthy("a different seed gives a different order", JSON.stringify(core.displayOrders(sample, "zzz999")) !== JSON.stringify(orders));
const pos = [0, 0, 0, 0];
const mc = sample.filter((q) => q.kind !== "yesno");
core.displayOrders(mc, "spread").forEach((o, i) => pos[o.indexOf(mc[i].correctIndex)]++);
eq("the right answer is spread over the positions", Math.max(...pos) - Math.min(...pos) <= 1, true);

// grading
const order = [2, 0, 3, 1];
eq("correct pick", core.gradeChoice(order, 0, 1), { correct: true, correctDisplay: 1 });
eq("wrong pick", core.gradeChoice(order, 0, 0), { correct: false, correctDisplay: 1 });
eq("skip is wrong", core.gradeChoice(order, 0, null), { correct: false, correctDisplay: 1 });
eq("out-of-range pick is wrong", core.gradeChoice(order, 0, 9).correct, false);
eq("negative pick is wrong", core.gradeChoice(order, 0, -1).correct, false);
eq("fractional pick is wrong", core.gradeChoice(order, 0, 0.5).correct, false);

// scoring
const item = (difficulty, correct, extra = {}) => ({ difficulty, kind: "concept", category: "a", correct, answered: true, ...extra });
let s = core.summarise([item(1, true), item(2, true), item(3, false), item(3, true)]);
eq("points: 1 + 2 + 3 of 9", [s.score, s.maxScore, s.percent], [6, 9, 67]);
eq("counts", [s.correct, s.total, s.skipped], [3, 4, 0]);
eq("by level", [s.byLevel[1], s.byLevel[3]], [{ total: 1, correct: 1 }, { total: 2, correct: 1 }]);
s = core.summarise([item(2, false, { skipped: true }), item(1, false)]);
eq("skipped questions are counted and score nothing", [s.skipped, s.score, s.percent], [1, 0, 0]);
eq("an empty quiz is 0%, not NaN", core.summarise([]).percent, 0);
eq("a perfect quiz is 100%", core.summarise([item(3, true), item(2, true)]).percent, 100);
eq("rating bands", [95, 80, 65, 45, 10].map((p) => core.rating(p).label), ["Expert", "Strong", "Competent", "Developing", "Early stage"]);

console.log(failed ? `\n${failed} FAILED` : "\nall quiz tests passed");
process.exit(failed ? 1 : 0);
