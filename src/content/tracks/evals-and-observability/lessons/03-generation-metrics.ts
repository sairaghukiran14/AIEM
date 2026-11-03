import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "generation-metrics",
  order: 3,
  title: "Metrics for Generated Text",
  summary:
    "Exact match, F1, BLEU, ROUGE, embedding similarity and pass@k each measure something specific. Pick the one that matches what \"good\" means for your task.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "Scoring generated text is hard because many different outputs can be equally correct. A metric is a **proxy** for quality, and every proxy fails somewhere. The skill is knowing what each one rewards, what it misses, and when a different kind of evaluation (running code, a judge, a person) is the honest choice.",
    },
    {
      type: "table",
      headers: ["Metric", "What it measures", "Good for", "Blind spot"],
      rows: [
        ["**Exact match**", "output equals the reference", "short closed answers, labels, IDs", "punishes harmless rewording"],
        ["**Token F1**", "overlap of words with the reference (precision and recall)", "extractive QA, short answers", "ignores meaning and word order"],
        ["**BLEU / ROUGE**", "n-gram overlap with reference text", "translation, summarisation (as a rough signal)", "weak on open-ended text; rewards copying"],
        ["**Embedding similarity**", "closeness of meaning in vector space", "paraphrase-tolerant comparison", "cannot catch a single wrong fact"],
        ["**Execution / pass@k**", "do generated programs pass tests?", "code generation", "needs tests; only covers code"],
        ["**Judge or human**", "rubric-based quality", "open-ended quality, faithfulness", "cost, bias, calibration (lesson 2)"],
      ],
    },
    {
      type: "sorter",
      title: "Pick the metric",
      prompt: "Choose the metric that best fits each task.",
      categories: ["Exact match / F1", "Execute tests (pass@k)", "Judge / human"],
      items: [
        { text: "Closed-book factual questions with short answers like \"1969\"", answer: 0, why: "Short, checkable answers. Normalise text and compare, or use token F1." },
        { text: "Generate a function that must pass a unit-test suite", answer: 1, why: "Run the code. Overlap with a reference implementation proves nothing." },
        { text: "Rate a free-form customer-service reply for helpfulness and tone", answer: 2, why: "Open-ended and subjective: needs a rubric, a judge or people." },
        { text: "Extract the invoice number from a document", answer: 0, why: "A single value. Exact match after normalisation." },
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Overlap metrics can mislead",
      text: "BLEU and ROUGE score how many words match a reference. A correct paraphrase can score low, and a fluent answer that copies the reference's wording but gets the key fact wrong can score high. Use them as rough trend signals at most, never as proof of quality.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Token F1 in detail" },
    {
      type: "p",
      text: "Normalise both texts (lowercase, strip punctuation, split into words), count the words they share, then combine **precision** (share of the prediction's words that are in the reference) and **recall** (share of the reference's words that are in the prediction) into their harmonic mean. Counting is **per word with multiplicity**: if the prediction repeats a word more times than the reference has it, the extras do not count.",
    },
    {
      type: "code",
      language: "text",
      code: `prediction: "the cat sat"      reference: "the cat"
shared words = 2 (the, cat)
precision = 2 / 3 = 0.67        recall = 2 / 2 = 1.00
F1 = 2 x P x R / (P + R) = 0.80`,
    },
    { type: "h", text: "pass@k for code" },
    {
      type: "p",
      text: "A model sampled several times may solve a problem on one attempt but not another. **pass@k** answers: if I sample k solutions, what is the chance **at least one** passes the tests? Estimating it by drawing exactly k samples is noisy. The standard approach draws **n ≥ k** samples, counts the **c** that are correct, and uses an unbiased estimator: `pass@k = 1 − C(n−c, k) / C(n, k)`.",
    },
    {
      type: "calculator",
      title: "pass@k from n samples",
      inputs: [
        { key: "n", label: "Samples drawn (n)", min: 1, max: 100, step: 1, value: 20 },
        { key: "c", label: "Samples that passed (c)", min: 0, max: 100, step: 1, value: 4 },
        { key: "k", label: "k (attempts you allow)", min: 1, max: 20, step: 1, value: 5 },
      ],
      outputs: [
        { label: "pass@1 (a single try)", formula: "(() => { const cc = Math.min(c, n); return cc / n; })()", format: "pct" },
        { label: "pass@k", formula: "(() => { const cc = Math.min(c, n); const kk = Math.min(k, n); if (n - cc < kk) return 1; let p = 1; for (let i = n - cc + 1; i <= n; i++) p *= 1 - kk / i; return 1 - p; })()", format: "pct" },
      ],
      note: "A task can have a low pass@1 and a high pass@10. Whether that is useful depends on whether you can verify candidates automatically (for example with tests) and pick the one that passes.",
    },
    { type: "h", text: "Practical guidance" },
    {
      type: "ul",
      items: [
        "**Start from the decision.** What will you do differently if the score changes? Choose the metric that tracks that.",
        "**Normalise before comparing**: case, whitespace, punctuation, number formats and units, or you measure formatting noise.",
        "**Use several metrics**: an exact or programmatic check where possible plus a judged quality score, and look at disagreements.",
        "**Validate a proxy against people** on a sample before relying on it (lesson 2): a metric that does not track human judgement is not measuring quality.",
        "**Track cost and latency** beside quality. A better score that doubles cost may not be better.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That every metric is a proxy with blind spots, that execution-based checks beat overlap for code, that overlap metrics are weak for open-ended text, that pass@k uses an unbiased estimator over n samples, and that any proxy is validated against human judgement.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Normalised token F1 and the unbiased pass@k estimator.",
    code: `import re
from collections import Counter
from math import comb

def tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())          # normalise: case and punctuation


def token_f1(prediction: str, reference: str) -> float:
    p, r = Counter(tokens(prediction)), Counter(tokens(reference))
    if not p and not r:
        return 1.0
    if not p or not r:
        return 0.0
    overlap = sum((p & r).values())                        # min count per word
    if overlap == 0:
        return 0.0
    precision, recall = overlap / sum(p.values()), overlap / sum(r.values())
    return 2 * precision * recall / (precision + recall)


def pass_at_k(n: int, c: int, k: int) -> float:
    """Unbiased estimate of P(at least one of k samples passes), from n samples with c correct."""
    if n - c < k:
        return 1.0
    return 1.0 - comb(n - c, k) / comb(n, k)


print(round(token_f1("the cat sat", "the cat"), 2))        # 0.8
print(round(pass_at_k(n=20, c=4, k=5), 2))                 # 0.72`,
  },

  interview: [
    {
      question: "Why is BLEU or ROUGE a poor measure of quality for open-ended generation?",
      answer:
        "They count overlapping n-grams with a reference, so a correct paraphrase scores low and a fluent answer that copies the reference's wording but states a wrong fact can score high. They have some use as coarse signals for translation or summarisation trends, but for open-ended tasks I use rubric-based judging or human review, validated against people.",
      weakAnswer:
        "They are outdated. — Not an argument; it does not say what they measure or miss.",
    },
    {
      question: "How would you evaluate a code generation model?",
      answer:
        "By execution: run the generated code against a test suite and measure the pass rate, reporting pass@1 and pass@k from n samples with the unbiased estimator. I sandbox execution, include edge-case tests, and also look at cost and latency. Textual similarity to a reference solution is not a valid measure since many correct programs differ.",
      followUp: "Why use n greater than k?",
    },
    {
      question: "What is token-level F1 and when would you use it?",
      answer:
        "The harmonic mean of precision and recall of the words shared by the prediction and the reference, counted with multiplicity after normalising case and punctuation. It suits short extractive answers where wording varies slightly, such as question answering spans. It ignores meaning and order, so it can miss a single wrong digit or negation.",
    },
    {
      question: "How do you choose a metric for a new task?",
      answer:
        "I start from the decision the score will drive and from how a correct answer can be verified. If code can check it, I use that. For short closed answers, normalised exact match or F1. For open-ended quality, a rubric judge plus human review. I validate any proxy against human judgement on a sample and track cost and latency next to quality.",
    },
    {
      question: "Explain pass@k and why drawing exactly k samples is a poor estimate.",
      answer:
        "pass@k is the probability that at least one of k sampled solutions passes. Drawing exactly k samples gives a very noisy estimate. Drawing n at least k samples and counting c passes, then computing one minus the combinations of failures over all combinations, gives an unbiased and lower-variance estimate of the same quantity.",
    },
  ],

  challenges: [
    {
      id: "ev-3-quiz",
      kind: "quiz",
      title: "Checkpoint: generation metrics",
      blurb: "Five questions on what each metric rewards.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which is the most reliable way to evaluate generated code?",
          options: [
            "ROUGE against a reference solution",
            "Running it against tests",
            "Counting lines",
            "Asking the model if it is correct",
          ],
          correctIndex: 1,
          explanation:
            "Execution decides correctness. Many correct programs look nothing like a reference.",
        },
        {
          id: "q2",
          prompt: "A correct answer is a paraphrase of the reference. Which metric is most likely to score it poorly?",
          options: ["Exact match and n-gram overlap metrics", "Human review", "Unit tests", "A calibrated judge"],
          correctIndex: 0,
          explanation:
            "Overlap metrics reward matching words, not matching meaning.",
        },
        {
          id: "q3",
          prompt: "Prediction 'the cat sat' versus reference 'the cat'. What is the token F1?",
          options: ["0.5", "0.67", "0.80", "1.0"],
          correctIndex: 2,
          explanation:
            "Precision 2/3, recall 2/2, F1 = 2 x 0.67 x 1 / 1.67 = 0.80.",
        },
        {
          id: "q4",
          prompt: "A task has pass@1 of 20% and pass@10 of 85%. When is that useful?",
          options: [
            "Never, 20% is too low",
            "When candidates can be verified automatically, such as with tests, so you can pick the one that passes",
            "Only when temperature is 0",
            "When the answers are subjective",
          ],
          correctIndex: 1,
          explanation:
            "If you can check candidates cheaply, sampling many and keeping a passing one turns diversity into success.",
        },
        {
          id: "q5",
          prompt: "Before relying on a proxy metric, what should you do?",
          options: [
            "Nothing, published metrics are standard",
            "Check that it correlates with human judgement on a sample from your task",
            "Raise its threshold",
            "Remove normalisation",
          ],
          correctIndex: 1,
          explanation:
            "A metric that does not track human judgement is measuring something else.",
        },
      ],
    },
    {
      id: "ev-3-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: estimating pass@k",
      blurb: "The reported pass@5 jumps around wildly between runs. Find the line.",
      language: "python",
      lines: [
        "def pass_at_k(results, k):          # results: list of n booleans, one per sample",
        "    return any(results[:k])",
      ],
      buggyLine: 2,
      reasons: [
        "`any` should be `all`",
        "it looks at only the first k samples and returns a yes/no, which is a high-variance estimate; draw n >= k samples and use the unbiased 1 - C(n-c, k)/C(n, k) estimator",
        "the slice should start at 1",
        "k must be a float",
      ],
      correctReasonIndex: 1,
      explanation:
        "A single batch of k samples either contains a pass or it does not, so the estimate flips between 0 and 1. Using all n samples with the combinatorial estimator removes that variance.",
      fix: "return 1.0 if n - c < k else 1.0 - comb(n - c, k) / comb(n, k)",
      xp: 40,
    },
    {
      id: "ev-3-code",
      kind: "code",
      title: "Code challenge: token-level F1",
      blurb: "Score a prediction against a reference by word overlap.",
      functionName: "tokenF1",
      starter: `/**
 * Token-level F1 between a prediction and a reference.
 *
 * Normalise: lowercase, then take runs of letters and digits as tokens
 * (so punctuation and spacing are ignored).
 * Overlap counts each word up to the smaller of its two counts.
 *   precision = overlap / (number of prediction tokens)
 *   recall    = overlap / (number of reference tokens)
 *   F1        = 2 * precision * recall / (precision + recall)
 *
 * Both empty -> 1. Exactly one empty, or no overlap -> 0.
 * Round to 2 decimals.
 */
function tokenF1(prediction, reference) {
  // your code here
}`,
      tests: [
        { name: "extra words in the prediction", args: ["the cat sat", "the cat"], expected: 0.8 },
        { name: "identical", args: ["the cat", "the cat"], expected: 1 },
        { name: "no overlap", args: ["dog", "cat"], expected: 0 },
        { name: "repeated words only count up to the reference count", args: ["a a b", "a b b"], expected: 0.67 },
        { name: "case and punctuation are ignored", args: ["Paris!", "paris"], expected: 1 },
        { name: "both empty", args: ["", ""], expected: 1 },
        { name: "one side empty", args: ["", "cat"], expected: 0 },
      ],
      hints: [
        "Turn each string into an array of words with toLowerCase and match(/[a-z0-9]+/g), using an empty array if there is no match.",
        "Count the words in each side with a Map. Overlap is the sum over words of the smaller count.",
        "Handle the empty cases first, then compute precision, recall and F1, and round with Math.round(x * 100) / 100.",
      ],
      solution: `function tokenF1(prediction, reference) {
  const toks = (s) => s.toLowerCase().match(/[a-z0-9]+/g) || [];
  const count = (arr) => {
    const m = new Map();
    for (const t of arr) m.set(t, (m.get(t) || 0) + 1);
    return m;
  };

  const p = toks(prediction);
  const r = toks(reference);
  if (p.length === 0 && r.length === 0) return 1;
  if (p.length === 0 || r.length === 0) return 0;

  const cp = count(p);
  const cr = count(r);
  let overlap = 0;
  for (const [word, n] of cp) overlap += Math.min(n, cr.get(word) || 0);
  if (overlap === 0) return 0;

  const precision = overlap / p.length;
  const recall = overlap / r.length;
  return Math.round(((2 * precision * recall) / (precision + recall)) * 100) / 100;
}`,
      xp: 70,
    },
  ],
};
