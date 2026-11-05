// One-off authoring tool: asks Claude to rate every interview question easy (1), medium (2) or hard (3), and writes
// src/content/interview-difficulty.ts for a person to review. Needs ANTHROPIC_API_KEY. Costs well under a dollar.
// Run: node --env-file=.env.local scripts/tag-interview-difficulty.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const root = fileURLToPath(new URL("..", import.meta.url));
const ts = createRequire(join(root, "package.json"))("typescript");
const load = (p) => {
  const js = ts.transpileModule(readFileSync(p, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  vm.runInNewContext(js, { module: m, exports: m.exports, require: () => ({}) });
  return m.exports;
};

const Ratings = z.object({ ratings: z.array(z.object({ id: z.string(), difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]) })) });
const client = new Anthropic();
const result = {};

for (const track of readdirSync(join(root, "src/content/tracks")).sort()) {
  const level = readFileSync(join(root, "src/content/tracks", track, "index.ts"), "utf8").match(/level: "(\w+)"/)[1];
  const dir = join(root, "src/content/tracks", track, "lessons");
  const questions = readdirSync(dir).sort().flatMap((f) => {
    const { lesson } = load(join(dir, f));
    return lesson.interview.map((q, i) => ({ id: `${lesson.slug}:${i}`, lesson: lesson.title, question: q.question, answer: q.answer }));
  });
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Ratings) },
    messages: [{
      role: "user",
      content: `Rate how hard each AI engineering interview question is to answer well out loud, judged by the strong answer it expects.
1 = easy: a definition or single idea a junior engineer should know.
2 = medium: needs a mechanism, a trade-off or practical experience; typical for a mid-level engineer.
3 = hard: needs several connected ideas, production judgement or a design under constraints; typical for a senior engineer.
The track is labelled "${level}", but rate each question on its own. Return every id exactly once.

${JSON.stringify(questions)}`,
    }],
  });
  const ratings = response.parsed_output?.ratings ?? [];
  const missing = questions.filter((q) => !ratings.some((r) => r.id === q.id));
  if (missing.length) throw new Error(`${track}: no rating for ${missing.map((q) => q.id).join(", ")}`);
  for (const r of ratings) if (questions.some((q) => q.id === r.id)) result[r.id] = r.difficulty;
  console.log(track, level, ratings.map((r) => r.difficulty).join(""), response.usage.input_tokens, response.usage.output_tokens);
}

const lines = Object.entries(result).map(([id, d]) => `  ${JSON.stringify(id)}: ${d},`).join("\n");
writeFileSync(
  join(root, "src/content/interview-difficulty.ts"),
  `/**\n * How hard each interview question is: 1 easy, 2 medium, 3 hard. Keyed by "<lesson slug>:<index in the lesson's interview>".\n * First drafted by scripts/tag-interview-difficulty.mjs, then open to correction by hand. The live interview picks\n * questions by this level. A question missing here counts as medium.\n */\nexport const interviewDifficulty: Record<string, 1 | 2 | 3> = {\n${lines}\n};\n`
);
console.log("wrote", Object.keys(result).length);
