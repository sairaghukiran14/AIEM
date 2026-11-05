/** JavaScript versions of this track's lesson code examples, keyed by lesson slug. */
export const llmFoundations: Record<string, string> = {
  "what-llms-do": `const VOCAB = ["the", "cat", "sat", "on", "mat", "<eos>"];

/** Pretend model: returns one logit per vocabulary token. */
function forward(tokens) {
  // ...
}

function softmax(logits) {
  const m = Math.max(...logits);             // subtract the max for stability
  const exps = logits.map((l) => Math.exp(l - m));
  const total = exps.reduce((sum, e) => sum + e, 0);
  return exps.map((e) => e / total);
}

function generate(prompt, maxTokens = 20) {
  const tokens = [...prompt];
  for (let i = 0; i < maxTokens; i++) {
    const logits = forward(tokens);          // 1. one forward pass
    const probs = softmax(logits);           // 2. logits -> distribution
    const best = probs.indexOf(Math.max(...probs));   // 3. greedy
    const token = VOCAB[best];
    if (token === "<eos>") break;            // 4. stop condition
    tokens.push(token);                      // 5. append and loop
  }
  return tokens;
}

// The same thing against a real model — the loop lives on the server:
//
//   import Anthropic from "@anthropic-ai/sdk";
//   const client = new Anthropic();
//   const msg = await client.messages.create({
//     model: "claude-sonnet-5-5",
//     max_tokens: 256,
//     messages: [{ role: "user", content: "Explain softmax in one line." }],
//   });
//   console.log(msg.content[0].text, msg.stop_reason);`,

  "tokens-and-tokenization": `// Provider-side counting is authoritative — no local tokenizer to keep in sync.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function countTokens(text, model = "claude-sonnet-5-5") {
  const result = await client.messages.countTokens({
    model,
    messages: [{ role: "user", content: text }],
  });
  return result.input_tokens;
}

// Local, offline alternative for OpenAI-family models:
//   import { encoding_for_model } from "tiktoken";
//   const enc = encoding_for_model("gpt-4o");
//   enc.encode(text).length;

/** Use real counts, not text.length / 4. */
async function fitsInBudget(text, budget) {
  return (await countTokens(text)) <= budget;
}

// The estimate is fine for logging, dangerous for limits:
function roughTokens(text) {
  return Math.floor(text.length / 4);    // ±30% on English, far worse elsewhere
}`,

  "context-windows-and-memory": `const MODEL_WINDOW = 200_000;
const MAX_OUTPUT = 4_000;
const SAFETY = 1_000;           // headroom for template overhead

/** Keep the newest turns that fit; never drop the system prompt. */
function trimHistory(system, history, question) {
  const budget = MODEL_WINDOW - MAX_OUTPUT - SAFETY - countTokens(system) - countTokens(question);
  if (budget <= 0) throw new Error("system prompt and question alone exceed the window");

  const kept = [];
  let total = 0;

  // Walk backwards: recent turns matter most.
  for (const message of [...history].reverse()) {
    const cost = countTokens(message.content);
    if (total + cost > budget) break;   // stop at the first turn that doesn't fit
    kept.push(message);
    total += cost;
  }

  kept.reverse();

  // Don't start the window on an assistant reply with no question before it.
  if (kept[0]?.role === "assistant") kept.shift();

  return kept;
}

function buildMessages(system, history, question) {
  return {
    system,                                  // stable prefix -> cacheable
    messages: [
      ...trimHistory(system, history, question),
      { role: "user", content: question },   // question last
    ],
    max_tokens: MAX_OUTPUT,
  };
}`,

  "sampling-and-temperature": `function applyTemperature(logits, t) {
  if (t <= 0) {                                // greedy: all mass on the argmax
    const best = logits.indexOf(Math.max(...logits));
    return logits.map((_, i) => (i === best ? 1 : 0));
  }

  const scaled = logits.map((l) => l / t);     // divide BEFORE softmax
  const m = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - m));
  const total = exps.reduce((sum, e) => sum + e, 0);
  return exps.map((e) => e / total);
}

/** Indices of the smallest set whose probability mass reaches p. */
function nucleus(probs, p) {
  const order = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a]);

  const kept = [];
  let running = 0;
  for (const i of order) {
    kept.push(i);
    running += probs[i];
    if (running >= p) break;                   // stop as soon as we reach p
  }
  return kept;
}

function sample(logits, temperature = 0.7, topP = 0.95) {
  const probs = applyTemperature(logits, temperature);
  const pool = nucleus(probs, topP);

  // Renormalise over the nucleus by drawing within its total mass.
  let r = Math.random() * pool.reduce((sum, i) => sum + probs[i], 0);
  for (const i of pool) {
    r -= probs[i];
    if (r <= 0) return i;
  }
  return pool.at(-1);
}

// In practice the provider does this for you:
//
//   await client.messages.create({
//     model: "claude-sonnet-5-5",   // pin the version for reproducibility
//     max_tokens: 1024,
//     temperature: 0,               // extraction -> deterministic decoding
//     messages: [...],
//   });`,

  "transformer-intuition": `// Small matrix helpers: Python has NumPy for these.
const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));
const matMul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((sum, x, k) => sum + x * B[k][j], 0)));

function softmax(row) {
  const m = Math.max(...row.filter(Number.isFinite));   // stability
  const exps = row.map((x) => Math.exp(x - m));
  const total = exps.reduce((sum, e) => sum + e, 0);
  return exps.map((e) => e / total);
}

/** 0 where attention is allowed, -Infinity where it is forbidden. */
function causalMask(n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (j <= i ? 0 : -Infinity)));   // lower triangle, incl. diagonal
}

function attention(Q, K, V) {
  const n = Q.length;
  const dK = Q[0].length;
  const mask = causalMask(n);

  const scores = matMul(Q, transpose(K))                 // (n, n)  <- quadratic
    .map((row, i) => row.map((s, j) => s / Math.sqrt(dK) + mask[i][j]));   // hide the future
  const weights = scores.map(softmax);                   // rows sum to 1

  return [matMul(weights, V), weights];
}

// Multi-head: project into h subspaces, attend in each, concatenate.
function multiHead(X, Wq, Wk, Wv, heads) {
  const dHead = Math.floor(X[0].length / heads);
  const columns = (W, h) => W.map((row) => row.slice(h * dHead, (h + 1) * dHead));

  const outputs = [];
  for (let h = 0; h < heads; h++) {
    const [out] = attention(matMul(X, columns(Wq, h)), matMul(X, columns(Wk, h)), matMul(X, columns(Wv, h)));
    outputs.push(out);
  }
  return X.map((_, i) => outputs.flatMap((out) => out[i]));   // (n, dModel)
}

const X = Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => Math.random() - 0.5));   // 5 tokens, dModel 8
const [, w] = attention(X, X, X);        // self-attention
console.table(w);                        // upper triangle is all zeros`,

  "choosing-a-model": `const CHEAP = "claude-haiku-5-5";
const STRONG = "claude-sonnet-5-5";

/** Try the cheap model; escalate only when its answer fails a check. */
async function answer(question, context) {
  const draft = await call(CHEAP, question, context, { temperature: 0 });

  if (isAcceptable(draft, context)) {
    return { answer: draft, model: CHEAP, escalated: false };
  }

  const strong = await call(STRONG, question, context, { temperature: 0 });
  return { answer: strong, model: STRONG, escalated: true };
}

/** Cheap, deterministic checks first. A judge model is a last resort. */
function isAcceptable(draft, context) {
  if (!draft.trim()) return false;
  if (draft.toLowerCase().includes("i don't know")) return false;
  if (!schemaValid(draft)) return false;   // structured output must parse
  return true;
}

// ---- the part people skip: measure before you choose -------------------

async function evaluate(model, cases) {
  const scores = [];
  for (const c of cases) {                 // 50-200 examples from real traffic
    const out = await call(model, c.question, c.context, { temperature: 0 });
    scores.push(score(out, c.expected));
  }

  return {
    model,
    passRate: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    n: scores.length,
  };
}

const cases = await loadGoldenSet();
for (const m of [CHEAP, STRONG]) {         // same cases, same scorer
  console.log(await evaluate(m, cases));
}`,

  "how-models-are-trained": `// Models are almost always trained in Python, so treat this as pseudocode:
// it is the same loop, with the framework calls left as helpers.

// model: maps (batch, seq) token ids -> (batch, seq, vocab) logits
// loader: yields (batch, seq) arrays of token ids
const optimizer = adamW(model.parameters(), { lr: 3e-4 });

let step = 0;
for await (const tokens of loader) {
  optimizer.zeroGrad();                     // 1. clear last step's gradients

  const logits = model(tokens.map((seq) => seq.slice(0, -1)));   // inputs: every token but the last
  const targets = tokens.map((seq) => seq.slice(1));             // targets: the same text, shifted by one

  const loss = crossEntropy(logits, targets);   // 2. how surprised was the model?

  loss.backward();                          // 3. gradients for every weight
  clipGradNorm(model.parameters(), 1.0);    // tame spikes
  optimizer.step();                         // 4. move the weights a little

  if (step % 100 === 0) console.log(\`step \${step}  loss \${loss.item().toFixed(3)}\`);
  step++;
}

// A loss of ln(vocabSize) means "guessing uniformly".
// Watch for: loss that stops falling, spikes (learning rate too high),
// or a training loss far below the validation loss (overfitting).`,
};
