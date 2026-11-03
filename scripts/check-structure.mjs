// Structural checks on every lesson: unique ids and slugs, answer and line indices in range.
// Run with: node scripts/check-structure.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");
const load = (p) => { const js = ts.transpileModule(readFileSync(p, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; const m = { exports: {} }; vm.runInNewContext(js, { module: m, exports: m.exports, require: () => ({}) }); return m.exports; };

const dist = {}; const ids = new Set(); const slugs = new Set(); let problems = 0;
const bump = (track, i) => { dist[track] ??= [0,0,0,0]; dist[track][i]++; };
const bad = (m) => { problems++; console.log("PROBLEM:", m); };

for (const track of readdirSync(join(root, "src/content/tracks"))) {
  const dir = join(root, "src/content/tracks", track, "lessons");
  for (const f of readdirSync(dir).sort()) {
    const { lesson } = load(join(dir, f));
    if (slugs.has(lesson.slug)) bad("duplicate lesson slug " + lesson.slug); slugs.add(lesson.slug);
    for (const c of lesson.challenges) {
      if (ids.has(c.id)) bad("duplicate id " + c.id); ids.add(c.id);
      if (c.kind === "quiz") for (const q of c.questions) { if (q.correctIndex >= q.options.length) bad(c.id + " " + q.id); bump(track, q.correctIndex); }
      if (c.kind === "spot-the-bug") {
        if (c.buggyLine < 1 || c.buggyLine > c.lines.length) bad(c.id + " buggyLine out of range");
        if (c.correctReasonIndex >= c.reasons.length) bad(c.id + " reason index");
        bump(track + " (bug reasons)", c.correctReasonIndex);
      }
    }
  }
}
console.log("correct-answer position distribution [A,B,C,D]:"); console.log(dist);
console.log(problems ? problems + " structural problems" : "structure ok");
if (problems) process.exitCode = 1;
