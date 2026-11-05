// Lists questions whose correct option is the longest, so they can be tightened. Usage: node scripts/quiz-longest.mjs <category>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const ts = createRequire(join(root, "package.json"))("typescript");
const cat = process.argv[2];
const dsl = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(join(root, "src/content/quiz/dsl.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: dsl, exports: dsl.exports });
const m = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(join(root, `src/content/quiz/${cat}.ts`), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: m, exports: m.exports, require: () => dsl.exports });
const qs = Object.values(m.exports)[0];
qs.forEach((q, i) => {
  if (q.kind === "yesno") return;
  const w = Math.max(...q.options.slice(1).map((o) => o.length));
  if (q.options[0].length > w) console.log(`${i + 1}\t${q.options[0].length}>${w}\t${q.options[0]}`);
});
