/** JavaScript versions of this track's lesson code examples, keyed by lesson slug. */
export const fineTuning: Record<string, string> = {
  "when-to-fine-tune": `/** need: promptWorks (boolean), needsFacts (boolean), examples (count of good labelled examples) */
function chooseApproach(need) {
  if (need.promptWorks) return "prompt";         // measured and good enough: stop here
  if (need.needsFacts) return "rag";             // knowledge problem: retrieve, do not train
  if (need.examples < 20) return "prompt-iteration";   // not enough data, and cheap options remain
  if (need.examples < 500) return "few-shot";    // put the examples in the prompt first
  return "fine-tune";                            // behaviour gap, plenty of data, worth an eval
}

console.log(chooseApproach({ promptWorks: false, needsFacts: false, examples: 12000 }));   // fine-tune
console.log(chooseApproach({ promptWorks: false, needsFacts: true, examples: 12000 }));    // rag`,

  "fine-tuning-data": `import { writeFileSync } from "node:fs";

/** rows have \`group\` (the source: ticket id, document, customer). Whole groups go to one side. */
function splitByGroup(rows, valFraction) {
  const names = [...new Set(rows.map((row) => row.group))];   // first-seen order
  const nVal = Math.round(names.length * valFraction);
  const valGroups = new Set(names.slice(names.length - nVal));   // last nVal groups

  return [
    rows.filter((r) => !valGroups.has(r.group)),
    rows.filter((r) => valGroups.has(r.group)),
  ];
}

function validateExample(ex) {
  const errors = [];
  const msgs = ex.messages ?? [];
  if (msgs.length === 0 || msgs.at(-1).role !== "assistant") {
    errors.push("last message must be the assistant reply");
  }
  if (msgs.some((m) => !["system", "user", "assistant"].includes(m.role))) {
    errors.push("unknown role");
  }
  return errors;
}

const lines = trainExamples.map((ex) => {
  const errors = validateExample(ex);
  if (errors.length) throw new Error(errors.join(", "));
  return JSON.stringify(ex);                     // one example per line
});
writeFileSync("train.jsonl", lines.join("\\n") + "\\n");`,

  "lora-and-qlora": `// The shape of the idea, on plain arrays. Real training happens in a framework such as PyTorch.
const matMul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((sum, x, k) => sum + x * B[k][j], 0)));
const zeros = (rows, cols) => Array.from({ length: rows }, () => Array(cols).fill(0));
const smallRandom = (rows, cols) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() - 0.5) * 0.02));

class LoRALinear {
  constructor(W, r = 8, alpha = 16) {
    this.W = W;                                  // frozen
    this.A = smallRandom(r, W[0].length);        // trainable
    this.B = zeros(W.length, r);                 // trainable, starts at 0: model == base
    this.scale = alpha / r;
  }

  mergedWeight() {
    const delta = matMul(this.B, this.A);
    // keep alpha / r when merging
    return this.W.map((row, i) => row.map((w, j) => w + this.scale * delta[i][j]));
  }
}

function loraParams(dIn, dOut, r) {
  const full = dIn * dOut;
  const lora = r * (dIn + dOut);
  return { full, lora, percent: Math.round((lora / full) * 10000) / 100 };
}

console.log(loraParams(4096, 4096, 8));   // { full: 16777216, lora: 65536, percent: 0.39 }`,

  "preference-optimization": `/** Sum of token log-probabilities of \`reply\` given \`prompt\` under \`model\`. */
function sequenceLogprob(model, prompt, reply) {
  // ...
}

function dpoLoss(policy, reference, prompt, chosen, rejected, beta = 0.1) {
  const rW = sequenceLogprob(policy, prompt, chosen) - sequenceLogprob(reference, prompt, chosen);
  const rL = sequenceLogprob(policy, prompt, rejected) - sequenceLogprob(reference, prompt, rejected);
  const margin = beta * (rW - rL);
  return Math.log1p(Math.exp(-margin));   // = -log(sigmoid(margin)), stable for large margins
}

// Setup: the reference must be a FROZEN COPY, not the model being trained.
// Training itself runs in Python (PyTorch); in JavaScript this is only the logic.
const policy = loadModel("sft-checkpoint");
const reference = loadModel("sft-checkpoint");
reference.trainable = false;              // never updated`,

  "distillation-and-small-models": `/** examples: { input, label, confidence } produced by the teacher, in a stable order. */
function selectTrainingInputs(examples, minConf, maxPerLabel) {
  const seen = new Set();
  const perLabel = new Map();
  const kept = [];

  for (const ex of examples) {
    if (ex.confidence < minConf) continue;    // the teacher was unsure: skip
    if (seen.has(ex.input)) continue;         // duplicate input: keep the first only
    const count = perLabel.get(ex.label) ?? 0;
    if (count >= maxPerLabel) continue;       // cap common classes so rare ones are not drowned out
    seen.add(ex.input);
    perLabel.set(ex.label, count + 1);
    kept.push(ex.input);
  }
  return kept;
}

// Evaluate the student against HUMAN labels, never the teacher's:
function accuracy(student, humanLabelled) {
  return humanLabelled.filter((x) => student(x.input) === x.humanLabel).length / humanLabelled.length;
}`,

  "evaluating-and-deploying-fine-tunes": `/**
 * Return the 1-based epoch at which to stop, or null if training never stalls.
 * Training stops once validation loss has failed to beat the best seen for \`patience\` epochs in a row.
 */
function earlyStopEpoch(valLosses, patience) {
  let best = Infinity;
  let sinceBest = 0;
  for (const [i, loss] of valLosses.entries()) {
    if (loss < best) {
      best = loss;
      sinceBest = 0;                 // strict improvement resets the counter
    } else if (++sinceBest >= patience) {
      return i + 1;
    }
  }
  return null;
}

function bestEpoch(valLosses) {
  return valLosses.indexOf(Math.min(...valLosses)) + 1;   // earliest on ties
}

const losses = [1.0, 0.8, 0.7, 0.75, 0.8, 0.9];
console.log(earlyStopEpoch(losses, 2));   // 5
console.log(bestEpoch(losses));           // 3: deploy checkpoint 3, not the last one`,
};
