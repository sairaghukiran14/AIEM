// Builds certificate PDFs from awkward names and re-opens them to prove they are valid.
// Run with: node scripts/test-certificate-pdf.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");
const { PDFDocument } = require("pdf-lib");

// Load the two real source files, resolving the "@/lib/certificate-core" import to the real file.
const loaded = {};
function load(rel) {
  if (loaded[rel]) return loaded[rel];
  const src = readFileSync(join(root, rel), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  const req = (id) => id === "@/lib/certificate-core" ? load("src/lib/certificate-core.ts") : require(id);
  new Function("module", "exports", "require", js)(m, m.exports, req);   // same realm as pdf-lib
  return (loaded[rel] = m.exports);
}
const { buildCertificatePdf } = load("src/lib/certificate-pdf.ts");

const cases = {
  track10: { holderName: "Ada Lovelace", title: "Serving, Self-Hosting & Multimodal AI", subtitle: "Track 10 of 10 · gate score 80%", badge: { kind: "track", number: 10, level: "advanced" } },
  track1: { holderName: "Ada Lovelace", title: "LLM Foundations", subtitle: "Track 1 of 10 · gate score 100%", badge: { kind: "track", number: 1, level: "beginner" } },
  courseBadge: { holderName: "Ada Lovelace", title: "AI Engineering Mastery: Complete Course", subtitle: "All 10 tracks and the capstone passed · capstone score 88%", badge: { kind: "course" } },
  longUrl: { holderName: "Ada Lovelace", title: "RAG Systems", subtitle: "Track 4 of 10 · gate score 90%", badge: { kind: "track", number: 4, level: "intermediate" }, verifyUrl: "https://example.com/verify/" + "x".repeat(3500) },
  normal: { holderName: "Ada Lovelace", title: "LLM Foundations", subtitle: "Track 1 of 8 · gate score 90%" },
  course: { holderName: "Ada Lovelace", title: "AI Engineering Mastery: Complete Course", subtitle: "All 8 tracks passed · average gate score 87%" },
  nonLatin: { holderName: "Sai Raghu Kiran 賽拉", title: "Prompt Engineering & Structured Output", subtitle: "Track 2 of 8 · gate score 100%" },
  emoji: { holderName: "Zoë 🚀 Müller-O'Brien", title: "RAG Systems", subtitle: "Track 4 of 8 · gate score 70%" },
  veryLong: { holderName: "Bartholomew Maximilian Montgomery-Fitzgerald-Worthington the Third of Westminster Abbey", title: "Fine-tuning & Model Adaptation", subtitle: "Track 7 of 8 · gate score 80%" },
  noSpaces: { holderName: "A".repeat(200), title: "RAG Systems", subtitle: "Track 4 of 8" },
  empty: { holderName: "   ", title: "Production AI", subtitle: "" },
};
const outDir = join(tmpdir(), "aiem-certificate-pdfs");
mkdirSync(outDir, { recursive: true });
let ok = 0;
for (const [name, c] of Object.entries(cases)) {
  const bytes = await buildCertificatePdf({ certId: "AIEM-7K3Q-ZB2M-X9HD", issuedAt: "2026-11-04T10:00:00.000Z", verifyUrl: "http://localhost:3000/verify/AIEM-7K3Q-ZB2M-X9HD", ...c });
  const header = Buffer.from(bytes.slice(0, 5)).toString();
  const reopened = await PDFDocument.load(bytes);
  const pages = reopened.getPageCount();
  const { width, height } = reopened.getPage(0).getSize();
  console.log(name.padEnd(9), "header", header, "| pages", pages, "| size", Math.round(width) + "x" + Math.round(height), "| bytes", bytes.length, "| title:", reopened.getTitle());
  if (header !== "%PDF-" || pages !== 1) throw new Error("bad pdf for " + name);
  if (bytes.length > 400_000) throw new Error(name + " is unexpectedly large: " + bytes.length + " bytes");
  writeFileSync(join(outDir, name + ".pdf"), bytes);
  ok++;
}
console.log(ok + "/" + Object.keys(cases).length + " PDFs built and re-opened (written to " + outDir + ")");
