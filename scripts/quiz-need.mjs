// Lists "index<TAB>prompt snippet<TAB>correct (len>maxWrong)" for questions where the correct option is the longest.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const ts = createRequire(join(root, "package.json"))("typescript");
const tr = (p) => ts.transpileModule(readFileSync(p, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const dsl = { exports: {} }; vm.runInNewContext(tr(join(root, "src/content/quiz/dsl.ts")), { module: dsl, exports: dsl.exports });
const m = { exports: {} }; vm.runInNewContext(tr(join(root, `src/content/quiz/${process.argv[2]}.ts`)), { module: m, exports: m.exports, require: () => dsl.exports });
Object.values(m.exports)[0].forEach((q, i) => {
  if (q.kind === "yesno") return;
  const w = Math.max(...q.options.slice(1).map((o) => o.length));
  if (q.options[0].length > w) console.log(`${i + 1}\t${q.prompt.slice(0, 70)}\t=> ${q.options[0].slice(0, 60)} (${q.options[0].length}>${w})`);
});
