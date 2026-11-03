// Checks every calculator formula, step-through highlight, sorter answer and visual key across all lessons.
// Run with: node scripts/check-blocks.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");
const load = (p) => { const js = ts.transpileModule(readFileSync(p, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; const m = { exports: {} }; vm.runInNewContext(js, { module: m, exports: m.exports, require: () => ({}), Math }); return m.exports; };

const VISUALS = new Set(["next-token-predictor","tokenizer","context-window","sampling-dial","attention-grid","model-picker","prompt-anatomy","few-shot-builder","cot-cost","schema-validator","trust-boundary","regression-matrix","embedding-space","rag-pipeline","agent-loop"]);
let problems = 0, calcs = 0, steppers = 0, sorters = 0, visuals = 0, lessons = 0;
const bad = (where, msg) => { problems++; console.log("PROBLEM", where, "-", msg); };

for (const track of readdirSync(join(root, "src/content/tracks"))) {
  const dir = join(root, "src/content/tracks", track, "lessons");
  for (const f of readdirSync(dir).sort()) {
    const { lesson } = load(join(dir, f)); lessons++;
    const where = `${track}/${f}`;
    const blocks = [...lesson.concept, ...lesson.underTheHood];
    let interactive = 0;
    for (const b of blocks) {
      if (b.type === "visual") { visuals++; interactive++; if (!VISUALS.has(b.key)) bad(where, "unknown visual " + b.key); }
      if (b.type === "stepper") { steppers++; interactive++;
        b.steps.forEach((s, i) => { (s.mark || []).forEach(m => { if (!s.items || m >= s.items.length) bad(where, `stepper "${b.title}" step ${i+1} mark ${m} out of range`); }); });
      }
      if (b.type === "sorter") { sorters++; interactive++;
        b.items.forEach((it, i) => { if (it.answer < 0 || it.answer >= b.categories.length) bad(where, `sorter "${b.title}" item ${i} answer out of range`); });
      }
      if (b.type === "calculator") { calcs++; interactive++;
        const keys = b.inputs.map(i => i.key); const vals = b.inputs.map(i => i.value);
        b.inputs.forEach(i => { if (i.value < i.min || i.value > i.max) bad(where, `calculator "${b.title}" default of ${i.key} outside its range`); });
        b.outputs.forEach(o => {
          try {
            const v = new Function(...keys, "Math", `"use strict"; return (${o.formula});`)(...vals, Math);
            if (typeof v !== "number" || Number.isNaN(v)) bad(where, `calculator "${b.title}" / "${o.label}" gave ${v}`);
          } catch (e) { bad(where, `calculator "${b.title}" / "${o.label}" threw: ${e.message}`); }
        });
      }
    }
    if (interactive === 0) bad(where, "lesson has no interactive element");
    if (lesson.interview.length < 5) bad(where, "fewer than 5 interview questions");
    if (lesson.challenges.length !== 3) bad(where, "expected 3 challenges");
  }
}
console.log(`${lessons} lessons | ${visuals} visuals, ${steppers} step-throughs, ${calcs} calculators, ${sorters} sorting exercises | ${problems} problems`);
if (problems) process.exitCode = 1;
