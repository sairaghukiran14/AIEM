// Reports where the correct answer lands after the server-side shuffle, for every quiz and gate.
// Run with: node scripts/report-answer-balance.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");
const tr = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const load = (p) => { const m = { exports: {} }; vm.runInNewContext(tr(readFileSync(p, "utf8")), { module: m, exports: m.exports, require: () => ({}), Math }); return m.exports; };
const { balancedOrders } = load(join(root, "src/lib/shuffle.ts"));

const quizDist = [0,0,0,0]; const bugDist = [0,0,0,0];
const gates = {};
const quiz = (c) => {
  const orders = balancedOrders(c.questions.map(q => q.correctIndex), c.questions.map(q => q.options.length), c.id);
  const pos = c.questions.map((q, i) => orders[i].indexOf(q.correctIndex));
  // sanity: each order is a permutation
  orders.forEach(o => { if ([...o].sort().join() !== "0,1,2,3") throw new Error("not a permutation in " + c.id); });
  return pos;
};
for (const track of readdirSync(join(root, "src/content/tracks"))) {
  const dir = join(root, "src/content/tracks", track, "lessons");
  for (const f of readdirSync(dir).sort()) {
    const { lesson } = load(join(dir, f));
    for (const c of lesson.challenges) {
      if (c.kind === "quiz") quiz(c).forEach(p => quizDist[p]++);
      if (c.kind === "spot-the-bug") { const o = balancedOrders([c.correctReasonIndex], [c.reasons.length], c.id)[0]; bugDist[o.indexOf(c.correctReasonIndex)]++; }
    }
  }
  const src = readFileSync(join(root, "src/content/tracks", track, "index.ts"), "utf8");
  const start = src.indexOf("const gate: Quiz = ") + "const gate: Quiz = ".length;
  const m = { exports: {} }; vm.runInNewContext(tr("module.exports = " + src.slice(start, src.indexOf("};\n", start) + 1)), { module: m });
  const g = [0,0,0,0]; quiz(m.exports).forEach(p => g[p]++); gates[m.exports.id] = g;
}
console.log("lesson-quiz correct position [A,B,C,D]:", quizDist);
console.log("bug-reason correct position [A,B,C,D]:", bugDist);
console.log("gates:", gates);
