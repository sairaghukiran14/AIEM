// Checks the quiz bank like data. Part of `npm run verify`.
//   - at least 1000 questions, spread over the categories, kinds and three difficulty levels
//   - every multiple-choice question has four different, non-empty options and no lazy "all of the above"
//   - the right answer is not the longest option too often (a classic giveaway)
//   - no duplicate prompts, every question has a real explanation
// Run with: node scripts/check-quiz.mjs   (add --report to print the per-category table only)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");
const dir = join(root, "src/content/quiz");
const transpile = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const m = { exports: {} };
  const req = (p) => (p === "./dsl" ? load("dsl.ts") : {});
  vm.runInNewContext(transpile(readFileSync(join(dir, file), "utf8")), { module: m, exports: m.exports, require: req });
  cache.set(file, m.exports);
  return m.exports;
}

const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !["types.ts", "dsl.ts", "index.ts"].includes(f)).sort();
const bank = [];
for (const f of files) {
  const slug = f.replace(/\.ts$/, "");
  const exported = Object.values(load(f))[0];
  exported.forEach((q, i) => bank.push({ ...q, category: slug, id: `${slug}-${i + 1}` }));
}

let failed = 0;
const fail = (msg) => { console.log("FAIL " + msg); failed++; };
const ok = (cond, msg) => { if (!cond) fail(msg); };

const KINDS = ["concept", "decision", "debug", "yesno"];
console.log("category".padEnd(22) + "total  concept decision debug yesno | easy med hard | correct is longest / shortest");
const longestShare = {}; const shortestShare = {};
const isShortest = (q) => q.options.slice(1).every((o) => q.options[0].length < o.length);
for (const f of files) {
  const slug = f.replace(/\.ts$/, "");
  const qs = bank.filter((q) => q.category === slug);
  const k = (x) => qs.filter((q) => q.kind === x).length;
  const dl = (n) => qs.filter((q) => q.difficulty === n).length;
  const mc = qs.filter((q) => q.kind !== "yesno");
  const longest = mc.filter((q) => q.options.slice(1).every((o) => q.options[0].length > o.length)).length;
  longestShare[slug] = mc.length ? longest / mc.length : 0;
  shortestShare[slug] = mc.length ? mc.filter(isShortest).length / mc.length : 0;
  console.log(slug.padEnd(22) + String(qs.length).padEnd(7) + String(k("concept")).padEnd(8) + String(k("decision")).padEnd(9) + String(k("debug")).padEnd(6) + String(k("yesno")).padEnd(6) + "| " + String(dl(1)).padEnd(5) + String(dl(2)).padEnd(4) + String(dl(3)).padEnd(5) + "| " + Math.round(longestShare[slug] * 100) + "% / " + Math.round(shortestShare[slug] * 100) + "%");
}
const mcAll = bank.filter((q) => q.kind !== "yesno");
const longestAll = mcAll.filter((q) => q.options.slice(1).every((o) => q.options[0].length > o.length)).length / mcAll.length;
console.log(`total ${bank.length}; correct option strictly longest in ${Math.round(longestAll * 100)}% of multiple-choice questions`);
if (process.argv.includes("--report")) process.exit(0);

ok(bank.length >= 1000, `at least 1000 questions (${bank.length})`);
ok(files.length >= 11, `at least 11 categories (${files.length})`);
for (const f of files) {
  const slug = f.replace(/\.ts$/, "");
  const qs = bank.filter((q) => q.category === slug);
  ok(qs.length >= 75, `${slug}: at least 75 questions (${qs.length})`);
  for (const kind of KINDS) ok(qs.filter((q) => q.kind === kind).length >= 10, `${slug}: at least 10 ${kind} questions`);
  for (const n of [1, 2, 3]) ok(qs.filter((q) => q.difficulty === n).length >= 15, `${slug}: at least 15 questions at level ${n}`);
  const yes = qs.filter((q) => q.kind === "yesno");
  const yesShare = yes.filter((q) => q.correctIndex === 0).length / (yes.length || 1);
  ok(yesShare >= 0.3 && yesShare <= 0.7, `${slug}: yes/no answers are balanced (${Math.round(yesShare * 100)}% yes)`);
  ok(shortestShare[slug] <= 0.45, `${slug}: the correct option is the shortest in ${Math.round(shortestShare[slug] * 100)}% of questions (max 45%)`);
  ok(longestShare[slug] <= 0.55, `${slug}: the correct option is the longest in ${Math.round(longestShare[slug] * 100)}% of questions (max 55%)`);
}
ok(longestAll <= 0.4, `overall the correct option is the longest too often (${Math.round(longestAll * 100)}%, max 40%)`);

const seen = new Map();
const LAZY = /\b(all|none) of the above\b|^both [a-d]\b|\bnone of these\b|\ball of these\b/i;
for (const q of bank) {
  const where = q.id;
  ok(Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 3, `${where}: difficulty must be 1, 2 or 3`);
  ok(KINDS.includes(q.kind), `${where}: unknown kind ${q.kind}`);
  ok(typeof q.prompt === "string" && q.prompt.trim().length >= 12, `${where}: prompt too short`);
  ok(typeof q.explanation === "string" && q.explanation.trim().length >= 25, `${where}: explanation too short`);
  const key = q.prompt.trim().toLowerCase();
  if (seen.has(key)) fail(`${where}: same prompt as ${seen.get(key)}`);
  seen.set(key, where);
  if (q.kind === "yesno") {
    ok(q.options.length === 2 && q.options[0] === "Yes" && q.options[1] === "No", `${where}: yes/no options`);
    ok(q.correctIndex === 0 || q.correctIndex === 1, `${where}: yes/no key`);
    ok(/[?]$|\.$/.test(q.prompt.trim()), `${where}: a yes/no prompt should end with ? or .`);
  } else {
    ok(q.options.length === 4, `${where}: needs four options`);
    ok(new Set(q.options.map((o) => o.trim().toLowerCase())).size === 4 && q.options.every((o) => o.trim().length > 0), `${where}: options must be different and non-empty`);
    ok(q.correctIndex === 0, `${where}: the correct option is written first`);
    ok(!q.options.some((o) => LAZY.test(o)), `${where}: avoid "all/none of the above"`);
    ok(q.options.every((o) => o.length <= 220), `${where}: an option is over 220 characters`);
  }
}
console.log(failed ? `\n${failed} problem(s)` : "\nquiz bank ok");
process.exit(failed ? 1 : 0);
