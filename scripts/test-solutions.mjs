// Runs every code challenge's reference solution against its own tests through the SAME sandbox the server grades with
// (and confirms the starter code does not already pass).
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

// The real server grader: QuickJS compiled to WebAssembly, not Node's vm.
const graderJs = ts.transpileModule(readFileSync(join(root, "src/lib/code-grader.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const graderModule = { exports: {} };
new Function("module", "exports", "require", graderJs)(graderModule, graderModule.exports, require);
const { gradeCodeInSandbox } = graderModule.exports;

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
      const solution = await gradeCodeInSandbox(c.solution, c.functionName, c.tests);
      const starter = await gradeCodeInSandbox(c.starter, c.functionName, c.tests);
      // the starter must NOT already pass (otherwise the challenge is trivially solved)
      const starterPasses = starter.passed === starter.total && !starter.fatal;
      const solved = solution.passed === solution.total && !solution.fatal;

      if (!solved || starterPasses) {
        failures++;
        console.log(`FAIL ${c.id}${starterPasses ? " (starter already passes!)" : ""}${solution.fatal ? ` (solution: ${solution.fatal})` : ""}`);
        for (const o of solution.outcomes.filter((x) => !x.passed)) console.log("   -", o.name, o.error ?? "");
      } else {
        console.log(`ok   ${c.id}  (${c.tests.length} tests)`);
      }
    }
  }
}
console.log(`\n${checked} code challenges checked, ${failures} failing`);
process.exit(failures ? 1 : 0);
