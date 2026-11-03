import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "sampling-and-temperature",
  order: 4,
  title: "Sampling, Temperature & Determinism",
  summary:
    "The model gives you a distribution. Decoding parameters decide how you draw from it — and whether your pipeline is reproducible.",
  minutes: 13,

  concept: [
    {
      type: "p",
      text: "Once softmax has produced a probability distribution, something has to pick a single token. That choice is **decoding**, and it is entirely outside the model. The same model, same prompt and same weights can give you a crisp factual answer or florid nonsense depending on these parameters.",
    },
    {
      type: "visual",
      key: "sampling-dial",
      caption:
        "Drag temperature and top-p and watch the distribution reshape. The bars are the candidate tokens; the shaded ones are those still eligible.",
    },
    { type: "h", text: "The three knobs that matter" },
    {
      type: "table",
      headers: ["Parameter", "What it does", "Typical range"],
      rows: [
        [
          "**temperature**",
          "divides the logits before softmax — flattens or sharpens the whole distribution",
          "0 – 1.0 (rarely above 1.2)",
        ],
        [
          "**top-p** (nucleus)",
          "keeps the smallest set of tokens whose probabilities sum to p, discards the rest",
          "0.9 – 1.0",
        ],
        [
          "**top-k**",
          "keeps only the k highest-probability tokens",
          "20 – 100, or off",
        ],
      ],
    },
    {
      type: "p",
      text: "Temperature **reshapes**; top-p and top-k **truncate**. That is the distinction interviewers look for. Low temperature makes the top token even more likely but never removes the tail; top-p cuts the tail off entirely, then renormalises what remains.",
    },
    {
      type: "callout",
      tone: "key",
      title: "Rule of thumb",
      text: "Pick one truncation method and leave the other at its neutral value. Stacking aggressive top-k, top-p and low temperature together makes behaviour hard to reason about and even harder to tune.",
    },
    { type: "h", text: "What to use when" },
    {
      type: "ul",
      items: [
        "**Extraction, classification, structured JSON, tool arguments** — temperature 0. You want the single most likely answer, every time.",
        "**Code generation** — 0 to 0.2. Slightly above zero can escape a degenerate loop, but correctness beats variety.",
        "**Summarisation, rewriting, chat** — 0.3 to 0.7. Enough variation to sound natural.",
        "**Brainstorming, creative writing, generating diverse eval cases** — 0.8 to 1.0, often with top-p around 0.95.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Temperature 0 is not a guarantee of determinism",
      text: "It makes decoding greedy, which removes sampling randomness. It does not remove floating-point non-determinism from batched GPU execution, nor does it protect you from the provider updating the model behind the same name. Pin model versions and test behaviour; do not assume byte-identical output.",
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "Temperature is applied to the **logits**, before softmax — not to the probabilities afterwards:",
    },
    {
      type: "code",
      language: "text",
      code: `p_i = exp(logit_i / T) / Σ_j exp(logit_j / T)

T -> 1.0    the distribution is unchanged
T < 1.0    logits grow apart   -> sharper, more confident, more repetitive
T > 1.0    logits compress     -> flatter, more surprising, more incoherent
T -> 0      argmax in the limit -> greedy decoding`,
      caption: "Dividing by T before exponentiating is what makes the effect multiplicative.",
    },
    {
      type: "p",
      text: "Because the division happens pre-softmax, temperature acts on the *ratios* between logits. Halving T squares the odds ratio between any two candidates — which is why small changes near 0.2 feel dramatic and changes near 1.0 feel mild.",
    },
    { type: "h", text: "Nucleus sampling, step by step" },
    {
      type: "ol",
      items: [
        "Sort tokens by probability, highest first.",
        "Walk down accumulating the probabilities.",
        "Stop as soon as the running total reaches **p**; that set is the *nucleus*.",
        "Discard everything else and renormalise the nucleus so it sums to 1.",
        "Sample from the renormalised set.",
      ],
    },
    {
      type: "p",
      text: "The point of top-p over top-k is that it is **adaptive**. When the model is confident, one or two tokens already cover 0.95, so the nucleus is tiny and output stays on-rails. When the model is genuinely uncertain, the nucleus widens to include many plausible continuations. A fixed k cannot do both.",
    },
    {
      type: "table",
      headers: ["Distribution", "top-k = 50 keeps", "top-p = 0.9 keeps"],
      rows: [
        ["confident: [0.97, 0.01, …]", "50 tokens, 49 of them junk", "1 token"],
        ["uncertain: [0.06, 0.05, 0.05, …]", "50 tokens", "~30 tokens, as needed"],
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "A question that separates candidates",
      text: "\"Your JSON extraction works 95% of the time and fails unpredictably.\" The expected first move is to check the temperature — not to add retries or a bigger model. Then: constrain the output format, validate with a schema, and retry on validation failure rather than on vibes.",
    },
    {
      type: "p",
      text: "One more parameter worth knowing: **repetition and frequency penalties** subtract from the logits of tokens that already appeared. They are a blunt fix for loops; a better fix is usually a clearer prompt or a stop sequence, because penalties also suppress legitimately repeated terms like a product name.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Decoding implemented by hand, then the same settings against a real API.",
    code: `import math, random


def apply_temperature(logits: list[float], t: float) -> list[float]:
    if t <= 0:                                  # greedy: all mass on the argmax
        best = max(range(len(logits)), key=lambda i: logits[i])
        return [1.0 if i == best else 0.0 for i in range(len(logits))]

    scaled = [l / t for l in logits]            # divide BEFORE softmax
    m = max(scaled)
    exps = [math.exp(s - m) for s in scaled]
    total = sum(exps)
    return [e / total for e in exps]


def nucleus(probs: list[float], p: float) -> list[int]:
    """Indices of the smallest set whose probability mass reaches p."""
    order = sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)

    kept, running = [], 0.0
    for i in order:
        kept.append(i)
        running += probs[i]
        if running >= p:
            break                               # stop as soon as we reach p
    return kept


def sample(logits, temperature=0.7, top_p=0.95) -> int:
    probs = apply_temperature(logits, temperature)
    pool = nucleus(probs, top_p)

    weights = [probs[i] for i in pool]          # renormalise over the nucleus
    return random.choices(pool, weights=weights, k=1)[0]


# In practice the provider does this for you:
#
#   client.messages.create(
#       model="claude-sonnet-5-5",   # pin the version for reproducibility
#       max_tokens=1024,
#       temperature=0,               # extraction -> deterministic decoding
#       messages=[...],
#   )`,
  },

  interview: [
    {
      question: "What is temperature, mechanically?",
      answer:
        "A divisor applied to the logits before softmax. Values below 1 spread the logits apart, sharpening the distribution toward the most likely token; values above 1 compress them, flattening it. As temperature approaches 0 it becomes greedy decoding — argmax. Crucially it reshapes the whole distribution rather than removing any candidate; nothing is truncated.",
      weakAnswer:
        "It controls creativity — higher is more creative. — Describes the vibe, not the mechanism, and misses that it never truncates.",
    },
    {
      question: "Temperature versus top-p — when would you use each?",
      answer:
        "Temperature rescales the distribution; top-p truncates it to the smallest set of tokens covering p of the mass, then renormalises. Top-p is adaptive: a confident step keeps one token, an uncertain step keeps many, which top-k cannot do with a fixed cut. In practice I tune one and leave the other neutral — temperature 0 for deterministic extraction, or temperature around 0.7 with top-p 0.95 for natural-sounding generation.",
    },
    {
      question:
        "Does temperature 0 guarantee identical output for identical input?",
      answer:
        "No. It removes sampling randomness by making decoding greedy, which is usually enough in practice, but it does not make the system deterministic. Floating-point reductions on GPUs vary with batching and kernel selection, so logits can differ in the last bits and flip a near-tie. More importantly, a model name is not a version — providers update models behind the same alias. For reproducibility, pin an explicit model version, set temperature 0, and verify behaviour with evals rather than assuming byte-equality.",
      followUp: "So how would you build a regression test for a prompt?",
    },
    {
      question:
        "A JSON extraction endpoint returns malformed output a few percent of the time. Walk me through your fix.",
      answer:
        "First, check decoding parameters — if temperature is above 0 for an extraction task, that alone explains it, and setting it to 0 is the cheapest fix. Second, constrain the format: use the provider's structured output or tool-calling mode so the shape is enforced rather than requested. Third, validate every response against a schema at the boundary and treat a failure as a typed error. Only then add a bounded retry that feeds the validation error back in. I would also log the failing outputs — a recurring malformation usually points at an ambiguous prompt or an under-specified schema.",
    },
    {
      question: "When would you deliberately raise the temperature?",
      answer:
        "When diversity is the goal rather than a side effect. Generating varied test cases or eval inputs, brainstorming where you'll filter afterwards, producing several candidates to rank with a judge or a verifier, or creative writing where sameness is the failure mode. It's also a reasonable escape hatch from a degenerate repetition loop, though a stop sequence or a clearer prompt is usually the better fix.",
    },
  ],

  challenges: [
    {
      id: "fnd-4-quiz",
      kind: "quiz",
      title: "Checkpoint: decoding parameters",
      blurb: "Five questions on temperature, nucleus sampling and determinism.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Where is temperature applied?",
          options: [
            "To the probabilities, after softmax",
            "To the logits, before softmax",
            "To the input embeddings",
            "To the sampled token, as a post-filter",
          ],
          correctIndex: 1,
          explanation:
            "Logits are divided by T, then softmaxed. Applying it after softmax would not produce the same multiplicative effect on the odds ratios.",
        },
        {
          id: "q2",
          prompt: "What is the key difference between temperature and top-p?",
          options: [
            "Temperature truncates candidates; top-p rescales them",
            "Temperature rescales the whole distribution; top-p truncates it to a cumulative mass",
            "They are two names for the same operation",
            "Top-p only works at temperature 0",
          ],
          correctIndex: 1,
          explanation:
            "Temperature reshapes without removing anything. Top-p discards the tail beyond cumulative probability p and renormalises what's left.",
        },
        {
          id: "q3",
          prompt:
            "Why is top-p usually preferred over a fixed top-k?",
          options: [
            "It is faster to compute",
            "It adapts: a confident step keeps few tokens, an uncertain step keeps many",
            "It guarantees deterministic output",
            "It prevents hallucination",
          ],
          correctIndex: 1,
          explanation:
            "A fixed k keeps 50 tokens whether the model is certain or not — dragging in junk when it is confident, and possibly cutting valid options when it is not.",
        },
        {
          id: "q4",
          prompt:
            "Which setting is most appropriate for extracting structured JSON from an invoice?",
          options: [
            "temperature 0.9, top-p 0.95",
            "temperature 0",
            "temperature 1.2 with a repetition penalty",
            "temperature 0.7, top-k 40",
          ],
          correctIndex: 1,
          explanation:
            "Extraction has one correct answer. Greedy decoding removes sampling variance; schema validation handles what remains.",
        },
        {
          id: "q5",
          prompt:
            "Your team claims temperature 0 makes the pipeline fully reproducible. The most accurate response is:",
          options: [
            "Correct — greedy decoding is bit-exact",
            "It removes sampling randomness, but GPU floating-point variation and silent model updates can still change output; pin the model version",
            "Incorrect — temperature 0 is random by definition",
            "Only true when max_tokens is also set",
          ],
          correctIndex: 1,
          explanation:
            "Greedy decoding is necessary but not sufficient. Near-ties can flip on floating-point differences, and an unpinned model alias can change underneath you.",
        },
      ],
    },
    {
      id: "fnd-4-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: temperature scaling",
      blurb:
        "Raising the temperature makes this output *less* varied, not more. Find the line.",
      language: "python",
      lines: [
        "def apply_temperature(logits, t):",
        "    m = max(logits)",
        "    exps = [math.exp(l - m) for l in logits]",
        "    total = sum(exps)",
        "    probs = [e / total for e in exps]",
        "",
        "    return [p / t for p in probs]",
      ],
      buggyLine: 7,
      reasons: [
        "`max` should be `min` for numerical stability",
        "temperature is applied to the probabilities after softmax instead of to the logits before it — so the result is not even a distribution",
        "`total` should be computed before exponentiating",
        "the function should return logits, not probabilities",
      ],
      correctReasonIndex: 1,
      explanation:
        "Dividing after softmax scales every probability by the same constant, so the *relative* ordering and ratios are untouched — and the values no longer sum to 1. Temperature only reshapes a distribution when the division happens before exponentiating.",
      fix: "scaled = [l / t for l in logits]      # divide the LOGITS\n    m = max(scaled)\n    exps = [math.exp(s - m) for s in scaled]\n    total = sum(exps)\n    return [e / total for e in exps]",
      xp: 40,
    },
    {
      id: "fnd-4-code",
      kind: "code",
      title: "Code challenge: nucleus (top-p) filtering",
      blurb:
        "Return the indices of the smallest set of tokens whose probabilities reach p.",
      functionName: "nucleusIndices",
      starter: `/**
 * Nucleus sampling: take tokens from most to least probable until the
 * running total reaches \`p\`, then stop. Return their original indices,
 * most probable first.
 *
 * The token that crosses the threshold IS included.
 * Ties: the lower index comes first.
 *
 * nucleusIndices([0.5, 0.3, 0.15, 0.05], 0.7)  ->  [0, 1]
 *   0.5 -> not yet 0.7; + 0.3 = 0.8 -> reached, stop.
 *
 * nucleusIndices([0.9, 0.05, 0.05], 0.9)  ->  [0]
 */
function nucleusIndices(probs, p) {
  // your code here
}`,
      tests: [
        { name: "stops once the mass is reached", args: [[0.5, 0.3, 0.15, 0.05], 0.7], expected: [0, 1] },
        { name: "a confident step keeps one token", args: [[0.9, 0.05, 0.05], 0.9], expected: [0] },
        { name: "an uncertain step keeps many", args: [[0.25, 0.25, 0.25, 0.25], 0.9], expected: [0, 1, 2, 3] },
        { name: "returns original indices, not sorted positions", args: [[0.1, 0.6, 0.3], 0.8], expected: [1, 2] },
        { name: "p of 1 keeps everything", args: [[0.4, 0.4, 0.2], 1], expected: [0, 1, 2] },
        { name: "ties break by lower index", args: [[0.3, 0.3, 0.4], 0.7], expected: [2, 0] },
        { name: "tiny p still keeps at least one token", args: [[0.6, 0.4], 0.01], expected: [0] },
      ],
      hints: [
        "Sort indices by probability descending before accumulating — and keep the original index with each value.",
        "Push the index first, then add to the running total, then test the threshold. That way the crossing token is included.",
        "For the tie-break, compare indices ascending when two probabilities are equal.",
      ],
      solution: `function nucleusIndices(probs, p) {
  const order = probs
    .map((value, index) => ({ value, index }))
    .sort((a, b) => (b.value - a.value) || (a.index - b.index));

  const kept = [];
  let running = 0;

  for (const { value, index } of order) {
    kept.push(index);
    running += value;
    if (running >= p) break;
  }

  return kept;
}`,
      xp: 70,
    },
  ],
};
