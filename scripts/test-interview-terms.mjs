// Tests for the mock-interview key-term logic. Run with: node scripts/test-interview-terms.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");
const js = ts.transpileModule(readFileSync(join(root, "src/lib/interview-terms.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
vm.runInNewContext(js, { module: m, exports: m.exports, require: () => ({}), Set, Map, Math });
const { stem, keyTerms, coverage } = m.exports;

let failed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok ? "ok   " : "FAIL ") + name + (ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`));
  if (!ok) failed++;
};

eq("stem merges retries and retry", stem("retries") === stem("retry"), true);
eq("stem merges indexed and indexing", stem("indexed") === stem("indexing"), true);
eq("stem leaves short words alone", stem("gate"), "gate");

const strong = "I check the stages in order: ingestion, retrieval, assembly and generation. The first failing stage is the cause, so I fix retrieval before the prompt, then re-run the eval set.";
const terms = keyTerms(strong);
eq("short and filler words are excluded", terms.includes("first") || terms.includes("before") || terms.includes("order"), false);
eq("distinctive words are kept", ["ingestion", "retrieval", "assembly", "generation"].every((t) => terms.includes(t)), true);
eq("no more than the maximum", keyTerms(strong, 3).length, 3);
eq("a repeated word ranks first", keyTerms("retrieval retrieval retrieval caching reranking", 2)[0], "retrieval");
eq("empty answer gives no terms", keyTerms(""), []);

const c = coverage("First I would look at retrieval and the generation step.", ["ingestion", "retrieval", "generation", "assembly"]);
eq("used terms", c.used, ["retrieval", "generation"]);
eq("missed terms", c.missed, ["ingestion", "assembly"]);
eq("percent", c.percent, 50);
eq("stem-based matching", coverage("it retries with backoff", ["retry"]).used, ["retry"]);
eq("no terms means zero percent", coverage("anything", []).percent, 0);
eq("an empty answer covers nothing", coverage("", ["retrieval"]).percent, 0);

if (failed) { console.log(failed + " failing"); process.exitCode = 1; } else console.log("all interview-term tests passed");
