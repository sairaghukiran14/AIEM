// Correct answers for the gates and the capstone, as display positions. A failed attempt no longer
// reveals them, so tests work them out from the source the same way the server does.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const ts = createRequire(join(root, "package.json"))("typescript");

function load(path) {
  const js = ts.transpileModule(readFileSync(join(root, path), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const m = { exports: {} };
  vm.runInNewContext(js, { module: m, exports: m.exports, require: () => ({}) });
  return m.exports;
}

const { balancedOrders } = load("src/lib/shuffle.ts");

function keyOf(quiz) {
  const orders = balancedOrders(
    quiz.questions.map((q) => q.correctIndex),
    quiz.questions.map((q) => q.options.length),
    quiz.id
  );
  return quiz.questions.map((q, i) => orders[i].indexOf(q.correctIndex));
}

export const gateKey = (trackSlug) => keyOf(Object.values(load(`src/content/tracks/${trackSlug}/index.ts`))[0].gate);
export const capstoneKey = () => keyOf(load("src/content/capstone.ts").capstone);
