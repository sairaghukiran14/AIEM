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
    const js = Object.values(load(join(root, "src/content/code-js", track + ".ts")))[0][lesson.slug];
    if (!js) bad("no JavaScript code example for " + lesson.slug);
    else {
      const parsed = ts.transpileModule(js, { fileName: "example.mjs", reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
      if (parsed.diagnostics?.some((d) => d.category === ts.DiagnosticCategory.Error)) bad("JavaScript code example does not parse: " + lesson.slug);
    }
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
// ---- the capstone exam ----
const { capstone } = load(join(root, "src/content/capstone.ts"));
if (ids.has(capstone.id)) bad("capstone id collides with another challenge: " + capstone.id);
if (capstone.kind !== "capstone") bad("capstone kind must be 'capstone'");
if (capstone.questions.length < 20) bad("capstone has too few questions: " + capstone.questions.length);
const qIds = new Set();
for (const q of capstone.questions) {
  if (qIds.has(q.id)) bad("capstone duplicate question id " + q.id); qIds.add(q.id);
  if (q.options.length !== 4) bad(`capstone ${q.id}: expected 4 options`);
  if (q.correctIndex < 0 || q.correctIndex >= q.options.length) bad(`capstone ${q.id}: correctIndex out of range`);
  if (!q.explanation || q.explanation.length < 20) bad(`capstone ${q.id}: missing explanation`);
  if (!q.scenario) bad(`capstone ${q.id}: missing scenario`);
  bump("capstone", q.correctIndex);
}

// ---- the placement assessment ----
const { placementQuestions } = load(join(root, "src/content/assessment.ts"));
const placementIds = new Set();
const perTrack = {};
for (const q of placementQuestions) {
  if (placementIds.has(q.id)) bad("placement duplicate id " + q.id); placementIds.add(q.id);
  if (q.options.length !== 4) bad(`placement ${q.id}: expected 4 options`);
  if (q.correctIndex < 0 || q.correctIndex >= q.options.length) bad(`placement ${q.id}: correctIndex out of range`);
  if (!q.explanation || q.explanation.length < 20) bad(`placement ${q.id}: missing explanation`);
  perTrack[q.track] = (perTrack[q.track] || 0) + 1;
}
for (const t of readdirSync(join(root, "src/content/tracks"))) {
  if (perTrack[t] !== 2) bad(`placement: track ${t} should have exactly 2 questions, has ${perTrack[t] || 0}`);
}
for (const t of Object.keys(perTrack)) if (!readdirSync(join(root, "src/content/tracks")).includes(t)) bad("placement: unknown track " + t);

// ---- portfolio project briefs must point at real tracks ----
const { projects } = load(join(root, "src/content/projects.ts"));
const trackDirs = new Set(readdirSync(join(root, "src/content/tracks")));
const projectIds = new Set();
for (const pr of projects) {
  if (projectIds.has(pr.id)) bad("duplicate project id " + pr.id); projectIds.add(pr.id);
  for (const t of pr.tracks) if (!trackDirs.has(t)) bad(`project ${pr.id} references unknown track ${t}`);
  if (pr.requirements.length < 4 || pr.probes.length < 2) bad(`project ${pr.id} is too thin`);
}

console.log("correct-answer position distribution [A,B,C,D]:"); console.log(dist);
console.log(problems ? problems + " structural problems" : "structure ok");
if (problems) process.exitCode = 1;
