// Runs every code challenge's reference solution against its own tests (and confirms the starter code does not already pass).
// Run with: node scripts/test-solutions.mjs
// Verifies that every code challenge's reference solution passes its own tests,
// by transpiling each lesson file with the TypeScript compiler and running the
// solution in a vm sandbox (the same deepEqual-by-JSON rule the in-browser runner uses).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");

let failures = 0;
let checked = 0;

for (const track of readdirSync(join(root, "src/content/tracks"))) {
  const dir = join(root, "src/content/tracks", track, "lessons");
  for (const file of readdirSync(dir).sort()) {
    const src = readFileSync(join(dir, file), "utf8");
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const mod = { exports: {} };
    vm.runInNewContext(js, { module: mod, exports: mod.exports, require: () => ({}) });
    const lesson = mod.exports.lesson;

    for (const c of lesson.challenges) {
      if (c.kind !== "code") continue;
      checked++;
      let fn;
      try {
        fn = vm.runInNewContext("(function(){\n" + c.solution + "\n;return " + c.functionName + ";})()");
      } catch (e) {
        failures++;
        console.log(`FAIL ${c.id}: solution does not compile: ${e.message}`);
        continue;
      }
      const bad = [];
      for (const t of c.tests) {
        let got;
        try { got = fn(...JSON.parse(JSON.stringify(t.args))); } catch (e) { got = "THROW " + e.message; }
        if (JSON.stringify(got) !== JSON.stringify(t.expected)) bad.push({ name: t.name, got, expected: t.expected });
      }
      // the starter must NOT already pass (otherwise the challenge is trivially solved)
      let starterPasses = false;
      try {
        const starterFn = vm.runInNewContext("(function(){\n" + c.starter + "\n;return " + c.functionName + ";})()");
        starterPasses = c.tests.every((t) => JSON.stringify(starterFn(...JSON.parse(JSON.stringify(t.args)))) === JSON.stringify(t.expected));
      } catch { /* a starter that throws is fine */ }

      if (bad.length || starterPasses) {
        failures++;
        console.log(`FAIL ${c.id}${starterPasses ? " (starter already passes!)" : ""}`);
        for (const b of bad) console.log("   -", b.name, "\n     got     ", JSON.stringify(b.got), "\n     expected", JSON.stringify(b.expected));
      } else {
        console.log(`ok   ${c.id}  (${c.tests.length} tests)`);
      }
    }
  }
}
console.log(`\n${checked} code challenges checked, ${failures} failing`);
process.exit(failures ? 1 : 0);
