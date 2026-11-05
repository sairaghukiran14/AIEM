/** JavaScript versions of this track's lesson code examples, keyed by lesson slug. */
export const evalsAndObservability: Record<string, string> = {
  "evals-fundamentals": `const round2 = (x) => Math.round(x * 100) / 100;

/** Pass rate with a 95% Wilson score interval (good for small n and extreme rates). */
function wilson(passes, total, z = 1.96) {
  if (total === 0) return [0, 0, 1];
  const p = passes / total;
  const denom = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denom;
  return [p, Math.max(0, center - half), Math.min(1, center + half)];
}

async function runEval(system, cases) {
  const results = [];
  for (const c of cases) {
    const output = await system(c.input);
    results.push({ id: c.id, passed: c.check(output) });   // code check first
  }
  const passes = results.filter((r) => r.passed).length;
  const [rate, low, high] = wilson(passes, results.length);
  return {
    rate: round2(rate), low: round2(low), high: round2(high),
    failures: results.filter((r) => !r.passed).map((r) => r.id),
  };
}`,

  "llm-as-judge": `const judgePrompt = (question, a, b) => \`You compare two answers to the same question.
Criteria: factual accuracy first, then clarity. Ignore length and formatting.
Reply as JSON: {"reason": "<one or two sentences>", "winner": "A" | "B" | "tie"}

<question>\${question}</question>
<answer_a>\${a}</answer_a>
<answer_b>\${b}</answer_b>\`;

async function judgeOnce(question, a, b) {
  const raw = await llm(judgePrompt(question, a, b), { temperature: 0, model: JUDGE_MODEL });
  return JSON.parse(raw).winner;
}

/** Judge both orders. A win counts only if it holds regardless of position. */
async function compare(question, newer, older) {
  const first = await judgeOnce(question, newer, older);    // newer is A
  const second = await judgeOnce(question, older, newer);   // newer is B
  if (first === "A" && second === "B") return "new";
  if (first === "B" && second === "A") return "old";
  return "tie";                                             // disagreement across orders = no clear winner
}`,

  "generation-metrics": `function counts(text) {
  // normalise: case and punctuation
  const tally = new Map();
  for (const t of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) tally.set(t, (tally.get(t) ?? 0) + 1);
  return tally;
}

const total = (tally) => [...tally.values()].reduce((sum, n) => sum + n, 0);

function tokenF1(prediction, reference) {
  const p = counts(prediction);
  const r = counts(reference);
  if (p.size === 0 && r.size === 0) return 1;
  if (p.size === 0 || r.size === 0) return 0;
  let overlap = 0;
  for (const [word, n] of p) overlap += Math.min(n, r.get(word) ?? 0);   // min count per word
  if (overlap === 0) return 0;
  const precision = overlap / total(p);
  const recall = overlap / total(r);
  return (2 * precision * recall) / (precision + recall);
}

function comb(n, k) {
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

/** Unbiased estimate of P(at least one of k samples passes), from n samples with c correct. */
function passAtK(n, c, k) {
  if (n - c < k) return 1;
  return 1 - comb(n - c, k) / comb(n, k);
}

console.log(tokenF1("the cat sat", "the cat").toFixed(2));   // 0.80
console.log(passAtK(20, 4, 5).toFixed(2));                   // 0.72`,

  "regression-testing-in-ci": `const rate = (results) =>
  results.length ? results.filter((r) => r.passed).length / results.length : 0;

function gate(prev, next, rules) {
  const was = new Map(prev.map((r) => [r.id, r.passed]));
  const regressions = next.filter((r) => was.get(r.id) && !r.passed).map((r) => r.id);

  const reasons = [];
  if (rate(next) < rules.minPassRate) reasons.push("below_min");                  // absolute floor
  if (rate(prev) - rate(next) > rules.maxDrop) reasons.push("dropped_too_much");  // sudden regression
  if (regressions.length > rules.maxRegressions) reasons.push("too_many_regressions");   // average can hide swaps

  return { ok: reasons.length === 0, reasons, regressions };
}

const verdict = gate(await loadBaseline(), await runSuite(), { minPassRate: 0.85, maxDrop: 0.02, maxRegressions: 1 });
console.log(verdict);
process.exit(verdict.ok ? 0 : 1);   // a non-zero exit blocks the merge
// NOTE: do not overwrite the baseline here. Raise it only in a reviewed change.`,

  "tracing-and-observability": `import { createHash, randomUUID } from "node:crypto";

const EMAIL = /[\\w.+-]+@[\\w-]+\\.[\\w.-]+/g;

function redact(text) {
  return text.replace(EMAIL, "[email]");       // extend with phone, card, ids, secrets
}

/** Nearest-rank percentile: the value at rank ceil(p/100 * n) of the sorted data. */
function percentile(values, p) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * ordered.length));   // rank 1 is the smallest value
  return ordered[Math.min(rank, ordered.length) - 1];
}

async function tracedLlm(traceId, userId, prompt, promptVersion) {
  const spanId = randomUUID().slice(0, 8);
  const start = performance.now();
  let status = "ok";
  try {
    return await llm(prompt);
  } catch (e) {
    status = \`error:\${e.name}\`;
    throw e;
  } finally {
    log.info("llm_span", {
      traceId, spanId,
      user: createHash("sha256").update(userId).digest("hex").slice(0, 12),   // hash, never the raw id
      promptVersion,
      latencyMs: Math.round(performance.now() - start),
      status,
      promptPreview: shouldSample(traceId) ? redact(prompt).slice(0, 500) : null,
    });
  }
}`,

  "online-evaluation": `import { createHash } from "node:crypto";

/** Map an id to a stable number from 0 to 99. */
function bucket(key, salt = "") {
  const digest = createHash("sha256").update(salt + key).digest("hex");
  return parseInt(digest.slice(0, 8), 16) % 100;
}

function variantFor(userId, experiment, treatmentPct = 50) {
  // Same user always gets the same variant; different experiments get independent splits.
  return bucket(userId, experiment) < treatmentPct ? "B" : "A";
}

function shouldReview(traceId, rate, flagged) {
  if (flagged) return true;                       // errors, escalations, low scores: always review
  return bucket(traceId, "review") < Math.round(rate * 100);   // reproducible random sample
}

// A/B sizing rule of thumb (80% power, 5% significance):
function usersPerArm(baseRate, minLift) {
  return Math.floor((16 * baseRate * (1 - baseRate)) / minLift ** 2) + 1;
}`,
};
