// Prints questions where two options are near-duplicates (word overlap), a side effect of mechanical edits.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const ts = createRequire(join(root, "package.json"))("typescript");
const dir = join(root, "src/content/quiz");
const tr = (p) => ts.transpileModule(readFileSync(p, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const dsl = { exports: {} }; vm.runInNewContext(tr(join(dir, "dsl.ts")), { module: dsl, exports: dsl.exports });
const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 2));
const jac = (a, b) => { const A = words(a), B = words(b); let i = 0; for (const w of A) if (B.has(w)) i++; return i / (A.size + B.size - i || 1); };
for (const f of readdirSync(dir).filter((f) => f.endsWith(".ts") && !["types.ts", "dsl.ts", "index.ts"].includes(f))) {
  const m = { exports: {} }; vm.runInNewContext(tr(join(dir, f)), { module: m, exports: m.exports, require: () => dsl.exports });
  Object.values(m.exports)[0].forEach((q, i) => {
    if (q.kind === "yesno") return;
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      const j = jac(q.options[a], q.options[b]);
      if (j >= 0.6) console.log(`${f.replace(".ts", "")}\t${i + 1}\t${j.toFixed(2)}\t${q.options[a]} || ${q.options[b]}`);
    }
  });
}
