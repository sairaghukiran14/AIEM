import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "choosing-a-model",
  order: 6,
  title: "Choosing a Model",
  summary:
    "Model choice is an engineering trade-off between quality, latency, cost and control — decided by your own evals, not a leaderboard.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "There is no best model, only a best model **for a task at a price at a latency**. The same product usually ends up using two or three: a small fast one for classification and routing, a strong one for reasoning, and perhaps a self-hosted one where data cannot leave.",
    },
    {
      type: "visual",
      key: "model-picker",
      caption:
        "Set your constraints and watch the viable set shrink. Most real decisions are made by two or three hard requirements, not by raw quality.",
    },
    { type: "h", text: "The five axes" },
    {
      type: "table",
      headers: ["Axis", "Question to ask", "Where it bites"],
      rows: [
        [
          "**Capability**",
          "can it do the task reliably at all?",
          "reasoning, long-horizon agents, code",
        ],
        [
          "**Latency**",
          "time-to-first-token and tokens/sec?",
          "anything interactive; voice is brutal",
        ],
        [
          "**Cost**",
          "price per million input *and* output tokens?",
          "high-volume classification, long contexts",
        ],
        [
          "**Context window**",
          "how much must fit in one call?",
          "document work, big agent transcripts",
        ],
        [
          "**Control & privacy**",
          "can the data leave? do you need to pin weights?",
          "regulated industries, on-prem, fine-tuning",
        ],
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "The frontier-model trap",
      text: "Starting with the strongest model is the right *prototyping* move — it tells you whether the task is possible at all. Shipping it everywhere is the wrong production move. Prove feasibility at the top, then walk down the ladder until quality breaks, and stop one rung above that.",
    },
    { type: "h", text: "Tiering, in practice" },
    {
      type: "ul",
      items: [
        "**Small / fast** — classification, routing, extraction, moderation, reranking. High volume, tight latency, trivially cheap.",
        "**Mid** — chat, summarisation, most RAG answering, straightforward code edits. The workhorse.",
        "**Frontier** — multi-step reasoning, agents that plan, hard debugging, anything where a wrong answer is expensive.",
        "**Open-weights, self-hosted** — data residency, offline, extreme volume where GPU amortisation wins, or when you need to fine-tune the weights themselves.",
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "Why public benchmarks mislead" },
    {
      type: "ul",
      items: [
        "**Contamination.** Popular benchmarks leak into training data, so scores drift upward without capability changing.",
        "**Distribution mismatch.** MMLU accuracy says nothing about whether a model reliably emits your JSON schema or follows your 400-token system prompt.",
        "**Averaging hides the failure you care about.** A model two points lower overall may be far better on your one task.",
        "**Harness sensitivity.** Prompt formatting, few-shot count and parsing rules move reported scores by several points.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "The only benchmark that counts",
      text: "A held-out set of 50–200 examples from your own traffic, with a scoring function you trust. Build it before you choose a model; it turns an argument into a measurement — and it is also your regression test when a provider ships an update.",
    },
    { type: "h", text: "Reading the real cost" },
    {
      type: "p",
      text: "Prices are quoted per million tokens, separately for input and output, and output typically costs several times input. So the cost of a feature depends on its **shape**, not just its volume:",
    },
    {
      type: "code",
      language: "text",
      code: `cost per call = (input_tokens  / 1e6) × input_price
             + (output_tokens / 1e6) × output_price

classification:  2,000 in,     5 out  -> input-dominated
chat turn:       8,000 in,   500 out  -> mixed
long report:     1,000 in, 4,000 out  -> output-dominated, and slow

levers, in order of effect:
  1. prompt caching on the stable prefix   (often 5-10x off input)
  2. a smaller model for the easy majority (cascade / router)
  3. shorter outputs: ask for structure, not prose
  4. batch APIs for anything not interactive`,
    },
    {
      type: "p",
      text: "A **cascade** exploits the fact that most requests are easy: run the cheap model first, and escalate only when a confidence signal, a validator or a judge says the answer is weak. A **router** instead classifies the request up front and sends it to the right tier. Both commonly cut spend by an order of magnitude; both need evals to prove quality held.",
    },
    { type: "h", text: "Versions, not names" },
    {
      type: "p",
      text: "A model alias is a moving target: providers update what sits behind it, deprecate snapshots on a schedule, and change defaults. Treat the model id as a pinned dependency — pin the dated version in config, keep your eval suite in CI, and re-run it on every version bump before you promote it. Build an abstraction layer at the call site so swapping a provider is a config change, not a refactor; keep it thin, because provider-specific features like caching and tool formats are exactly what you will want to reach for.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What interviewers are listening for",
      text: "A decision procedure, not a favourite. Name the constraints, say you'd build a small eval set from real traffic, prototype on the strongest model to establish the ceiling, then walk down the tiers measuring against that set — and mention pinning versions plus a fallback for provider outages.",
    },
  ],

  codeExample: {
    language: "python",
    caption:
      "A cascade with a validator and an eval harness — the shape most production systems converge on.",
    code: `from dataclasses import dataclass

CHEAP = "claude-haiku-5-5"
STRONG = "claude-sonnet-5-5"


@dataclass
class Result:
    answer: str
    model: str
    escalated: bool


def answer(question: str, context: str) -> Result:
    """Try the cheap model; escalate only when its answer fails a check."""
    draft = call(CHEAP, question, context, temperature=0)

    if is_acceptable(draft, context):
        return Result(draft, CHEAP, escalated=False)

    strong = call(STRONG, question, context, temperature=0)
    return Result(strong, STRONG, escalated=True)


def is_acceptable(draft: str, context: str) -> bool:
    """Cheap, deterministic checks first. A judge model is a last resort."""
    if not draft.strip():
        return False
    if "i don't know" in draft.lower():
        return False
    if not schema_valid(draft):          # structured output must parse
        return False
    return True


# ---- the part people skip: measure before you choose -------------------

def evaluate(model: str, cases: list[dict]) -> dict:
    scores = []
    for case in cases:                   # 50-200 examples from real traffic
        out = call(model, case["question"], case["context"], temperature=0)
        scores.append(score(out, case["expected"]))

    return {
        "model": model,
        "pass_rate": sum(scores) / len(scores),
        "n": len(scores),
    }


if __name__ == "__main__":
    cases = load_golden_set()
    for m in (CHEAP, STRONG):            # same cases, same scorer
        print(evaluate(m, cases))`,
  },

  interview: [
    {
      question: "How do you choose a model for a new feature?",
      answer:
        "I start by writing down the hard constraints — latency budget, cost ceiling, context size, and whether data may leave our infrastructure. Then I build a small eval set, 50 to 200 examples from real traffic with a scoring function. I prototype on the strongest available model to find out whether the task is solvable at all, which gives me a quality ceiling. Then I walk down the tiers against the same eval set and pick the cheapest model that stays within an acceptable margin of that ceiling. The model id goes in config, pinned to a dated version, with the eval suite in CI.",
      weakAnswer:
        "I check the leaderboards and pick the top model. — No constraints, no measurement, and it ignores that leaderboards don't test your task.",
    },
    {
      question: "Why not just use the most capable model everywhere?",
      answer:
        "Cost and latency, mostly. Frontier models can be an order of magnitude more expensive per token and noticeably slower, and for high-volume work like classification, routing or reranking that difference decides whether a feature is viable. There's also availability — concentrating everything on one model means one provider incident takes out your whole product. The pattern that works is tiering: cheap models for the easy majority, escalation for the hard remainder, measured against the same eval set.",
    },
    {
      question:
        "A new model tops every benchmark. How much should that change your plans?",
      answer:
        "It's a signal to run my own evals, not to migrate. Public benchmarks suffer from contamination, are sensitive to the prompting harness, and average over distributions that may not resemble my traffic — a model can lead MMLU and still be worse at emitting my JSON schema or following a long system prompt. So I'd run it against my golden set, compare quality, latency and cost per request, and only then decide. I'd also check the practical things: rate limits, context window, tool-calling and caching support, and the deprecation schedule.",
      followUp: "What would make you migrate immediately?",
    },
    {
      question: "Your inference bill tripled this month. Walk me through diagnosing it.",
      answer:
        "First, segment the spend — by feature, by model, and by input versus output tokens. That usually names the culprit immediately. The common causes are a prompt that grew, often from retrieved context or an expanding conversation history; a cache that stopped hitting because something made the prefix vary; retries looping on a validation failure; or traffic shifting to a locale whose language tokenizes less efficiently. The fixes, in order of effect: restore prompt caching on a stable prefix, move the easy majority to a cheaper tier behind a router or cascade, shorten outputs by requesting structure rather than prose, and use the batch API for anything that isn't interactive.",
    },
    {
      question: "When would you self-host an open-weights model?",
      answer:
        "Four situations. Data residency or regulatory constraints that forbid sending data to a third party. Extreme, steady volume where amortised GPU cost beats per-token pricing — the crossover is high, and you must count engineering time. A need to fine-tune the weights themselves, or to pin them permanently so behaviour never shifts underneath you. And genuinely offline or air-gapped deployment. Otherwise the hidden costs are real: serving infrastructure, autoscaling, evaluation, security patching and on-call for a system that an API provider otherwise runs for you.",
    },
  ],

  challenges: [
    {
      id: "fnd-6-quiz",
      kind: "quiz",
      title: "Checkpoint: model selection",
      blurb: "Five questions on trade-offs, benchmarks and cost.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt:
            "Which is the strongest evidence that a model fits your use case?",
          options: [
            "Its position on a public leaderboard",
            "Its parameter count",
            "Its pass rate on an eval set built from your own traffic",
            "Its context window size",
          ],
          correctIndex: 2,
          explanation:
            "Only your own distribution tests your own task. Everything else is a prior to be checked, not evidence.",
        },
        {
          id: "q2",
          prompt: "What is a model cascade?",
          options: [
            "Running several models in parallel and averaging the answers",
            "Trying a cheap model first and escalating to a stronger one only when the answer fails a check",
            "Fine-tuning a small model on a large model's outputs",
            "Splitting a prompt across several models by section",
          ],
          correctIndex: 1,
          explanation:
            "Cascades exploit the easy majority. Averaging parallel answers is ensembling; training a small model on a big one's output is distillation.",
        },
        {
          id: "q3",
          prompt:
            "A feature sends 1,000 input tokens and generates 4,000 output tokens per call. Which lever helps least?",
          options: [
            "Asking for structured output instead of prose to shorten the response",
            "Prompt caching on the system prefix",
            "Moving the easy majority of requests to a cheaper model",
            "Using the batch API if the work is not interactive",
          ],
          correctIndex: 1,
          explanation:
            "This workload is output-dominated, and caching only discounts input. It is the first thing to try on input-heavy workloads — and nearly useless here.",
        },
        {
          id: "q4",
          prompt:
            "Why should the model id be pinned to a dated version in config?",
          options: [
            "Pinned versions are cheaper",
            "Aliases change underneath you, so behaviour can shift without a deploy on your side",
            "It is required by most provider APIs",
            "It increases the context window",
          ],
          correctIndex: 1,
          explanation:
            "An alias is a moving target. Pinning plus an eval suite in CI turns a provider update into a deliberate, tested upgrade.",
        },
        {
          id: "q5",
          prompt:
            "Which requirement most strongly argues for self-hosting open weights?",
          options: [
            "You want the highest possible benchmark scores",
            "Your latency budget is 200ms",
            "Regulation forbids sending the data to a third party",
            "You have a small, bursty traffic pattern",
          ],
          correctIndex: 2,
          explanation:
            "Data residency is a hard constraint an API cannot satisfy. Small bursty traffic argues the opposite way — you'd pay for idle GPUs.",
        },
      ],
    },
    {
      id: "fnd-6-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a cost estimator",
      blurb:
        "This estimate is consistently far too low on report-generation workloads.",
      language: "python",
      lines: [
        "INPUT_PRICE = 3.00     # USD per 1M tokens",
        "OUTPUT_PRICE = 15.00   # USD per 1M tokens",
        "",
        "def estimate_cost(input_tokens: int, output_tokens: int) -> float:",
        "    total = input_tokens + output_tokens",
        "    return (total / 1_000_000) * INPUT_PRICE",
      ],
      buggyLine: 6,
      reasons: [
        "the division should be by 1,000 rather than 1,000,000",
        "input and output are summed and billed at the input price, ignoring that output costs 5x more",
        "`total` should be a float before dividing",
        "the prices are swapped",
      ],
      correctReasonIndex: 1,
      explanation:
        "Input and output are priced separately, and output is five times more expensive here. Collapsing them into one total at the input price understates any output-heavy workload — by nearly 5x for a long report, which is exactly where the budget matters most.",
      fix: "return (input_tokens / 1_000_000) * INPUT_PRICE \\\n         + (output_tokens / 1_000_000) * OUTPUT_PRICE",
      xp: 40,
    },
    {
      id: "fnd-6-code",
      kind: "code",
      title: "Code challenge: pick the cheapest viable model",
      blurb:
        "Filter by hard requirements first, then choose on price. This is the selection logic a router runs.",
      functionName: "pickModel",
      starter: `/**
 * Choose the cheapest model that satisfies every requirement.
 *
 * A model is viable when:
 *   - model.contextWindow >= req.minContext
 *   - if req.needsTools is true, model.tools must be true
 *
 * Among viable models, pick the lowest \`inputPrice\`.
 * Tie-break on lower \`outputPrice\`, then on name (A-Z).
 *
 * Return the winning model's name, or null when nothing is viable.
 */
function pickModel(models, req) {
  // your code here
}`,
        tests: [
        {
          name: "picks the cheapest viable model",
          args: [
            [
              { name: "big", contextWindow: 200000, inputPrice: 15, outputPrice: 75, tools: true },
              { name: "mid", contextWindow: 200000, inputPrice: 3, outputPrice: 15, tools: true },
              { name: "small", contextWindow: 200000, inputPrice: 1, outputPrice: 5, tools: true },
            ],
            { minContext: 8000, needsTools: false },
          ],
          expected: "small",
        },
        {
          name: "excludes models with too small a context window",
          args: [
            [
              { name: "small", contextWindow: 8000, inputPrice: 1, outputPrice: 5, tools: true },
              { name: "mid", contextWindow: 200000, inputPrice: 3, outputPrice: 15, tools: true },
            ],
            { minContext: 100000, needsTools: false },
          ],
          expected: "mid",
        },
        {
          name: "excludes models without tool support when tools are required",
          args: [
            [
              { name: "cheap-no-tools", contextWindow: 200000, inputPrice: 1, outputPrice: 5, tools: false },
              { name: "mid", contextWindow: 200000, inputPrice: 3, outputPrice: 15, tools: true },
            ],
            { minContext: 1000, needsTools: true },
          ],
          expected: "mid",
        },
        {
          name: "breaks an input-price tie on output price",
          args: [
            [
              { name: "a", contextWindow: 200000, inputPrice: 3, outputPrice: 30, tools: true },
              { name: "b", contextWindow: 200000, inputPrice: 3, outputPrice: 15, tools: true },
            ],
            { minContext: 1000, needsTools: false },
          ],
          expected: "b",
        },
        {
          name: "breaks a full tie alphabetically",
          args: [
            [
              { name: "zeta", contextWindow: 200000, inputPrice: 3, outputPrice: 15, tools: true },
              { name: "alpha", contextWindow: 200000, inputPrice: 3, outputPrice: 15, tools: true },
            ],
            { minContext: 1000, needsTools: false },
          ],
          expected: "alpha",
        },
        {
          name: "a context window exactly equal to the minimum is viable",
          args: [
            [{ name: "exact", contextWindow: 8000, inputPrice: 1, outputPrice: 5, tools: true }],
            { minContext: 8000, needsTools: false },
          ],
          expected: "exact",
        },
        {
          name: "returns null when nothing is viable",
          args: [
            [{ name: "small", contextWindow: 8000, inputPrice: 1, outputPrice: 5, tools: false }],
            { minContext: 8000, needsTools: true },
          ],
          expected: null,
        },
        {
          name: "returns null for an empty catalogue",
          args: [[], { minContext: 1000, needsTools: false }],
          expected: null,
        },
      ],
      hints: [
        "Filter first, then sort. Don't try to do both in one pass.",
        "`needsTools` only excludes models when it is true — a model with tools is still fine when they aren't needed.",
        "Chain the comparators: input price, then output price, then `a.name.localeCompare(b.name)`.",
        "Return null, not undefined, when the filtered list is empty.",
      ],
      solution: `function pickModel(models, req) {
  const viable = models.filter(
    (m) =>
      m.contextWindow >= req.minContext &&
      (!req.needsTools || m.tools)
  );

  if (viable.length === 0) return null;

  viable.sort(
    (a, b) =>
      a.inputPrice - b.inputPrice ||
      a.outputPrice - b.outputPrice ||
      a.name.localeCompare(b.name)
  );

  return viable[0].name;
}`,
      xp: 70,
    },
  ],
};
