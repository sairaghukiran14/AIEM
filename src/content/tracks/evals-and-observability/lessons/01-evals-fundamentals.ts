import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "evals-fundamentals",
  order: 1,
  title: "Evals Fundamentals",
  summary:
    "An eval turns \"it seems better\" into a number you can trust. Learn what to measure, how to build the set, and how much a number can be believed.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "Model outputs are variable and open-ended, so ordinary unit tests are not enough and eyeballing a few examples is misleading. An **eval** is a repeatable measurement of how well your LLM system does its job: a **dataset** of inputs, a **way to score** each output, and a **summary** you can compare over time. In Tracks 2 and 4 you built small versions. This track is about doing it rigorously.",
    },
    {
      type: "stepper",
      title: "The eval-driven development loop",
      steps: [
        { label: "Define success", detail: "Write down what a good output is for this task, in terms you can check: correct, grounded, in the right format, safe, fast enough, affordable.", items: ["accuracy", "format validity", "refusal behaviour", "latency, cost"], mark: [0, 1] },
        { label: "Build a dataset", detail: "Collect real inputs, add edge and adversarial cases, and label expected outputs or criteria. Start small: 50 good cases beat 5,000 careless ones.", items: ["production samples", "edge cases", "adversarial cases"], mark: [0, 1, 2] },
        { label: "Measure a baseline", detail: "Run the current system and record the score, per case as well as overall. Without a baseline, no change can be called an improvement.", items: ["baseline: 72%"], mark: [0] },
        { label: "Change one thing", detail: "A prompt edit, a retriever tweak or a model swap (Track 2: one change at a time), then run the same set.", items: ["v2: add rule for refunds"], mark: [0] },
        { label: "Compare per case", detail: "Look at fixes and regressions, not just the average, and judge whether the difference is bigger than the noise.", items: ["+6 fixed", "-2 regressed"], mark: [0, 1] },
        { label: "Ship and monitor", detail: "Release, watch real traffic (lesson 6), and add every new failure to the dataset so it never returns.", items: ["new failures -> dataset"], mark: [0] },
      ],
      caption: "The dataset grows from your failures. That is where most of its value comes from.",
    },
    { type: "h", text: "Three ways to score an output" },
    {
      type: "sorter",
      title: "Which scorer fits?",
      prompt: "Choose the cheapest scorer that can actually decide each case.",
      categories: ["Code assertion", "LLM judge", "Human review"],
      items: [
        { text: "The reply is valid JSON containing the required keys", answer: 0, why: "Fully checkable by code: cheap, exact and deterministic." },
        { text: "Does the reply sound polite and on-brand?", answer: 1, why: "Subjective but describable in a rubric, so a judge model can approximate it (lesson 2)." },
        { text: "Is this medical advice safe to show a patient?", answer: 2, why: "High stakes and nuanced. Experts must decide, and their labels also calibrate judges." },
        { text: "The generated SQL returns the same rows as the reference query", answer: 0, why: "Run both and compare results. Execution beats any opinion." },
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "Prefer code, then judges, then people",
      text: "Use deterministic checks wherever the answer can be checked by code, a judge model for what cannot, and human review for ground truth and calibration. Each step costs more and decides more subtle things.",
    },
  ],

  underTheHood: [
    { type: "h", text: "What kinds of evals exist" },
    {
      type: "table",
      headers: ["Kind", "Runs on", "Answers", "Cost"],
      rows: [
        ["**Offline**", "a fixed dataset, before release", "is this version better than the last?", "low, repeatable"],
        ["**Online**", "live traffic, after release", "is it working for real users now?", "real, noisy (lesson 6)"],
        ["**Component**", "one stage (retriever, classifier)", "which part is at fault?", "cheap, targeted"],
        ["**End-to-end**", "the whole system", "does the user get what they need?", "higher, closer to reality"],
      ],
    },
    { type: "h", text: "How much can a pass rate be trusted?" },
    {
      type: "p",
      text: "A pass rate from a finite set is an **estimate**. With 20 cases, 70% could easily be a true 50% or 85%. The uncertainty shrinks with the square root of the number of cases, so quadrupling the dataset only halves the error. The **Wilson interval** is a good way to put an honest range around a pass rate, especially for small sets and rates near 0% or 100%.",
    },
    {
      type: "calculator",
      title: "How wide is the uncertainty?",
      inputs: [
        { key: "rate", label: "Observed pass rate", min: 5, max: 95, step: 1, value: 80, unit: "%" },
        { key: "n", label: "Number of test cases", min: 10, max: 2000, step: 10, value: 100 },
      ],
      outputs: [
        { label: "Approximate 95% margin (plus or minus)", formula: "1.96 * Math.sqrt(rate / 100 * (1 - rate / 100) / n)", format: "pct" },
        { label: "Plausible range, low", formula: "rate / 100 - 1.96 * Math.sqrt(rate / 100 * (1 - rate / 100) / n)", format: "pct" },
        { label: "Plausible range, high", formula: "rate / 100 + 1.96 * Math.sqrt(rate / 100 * (1 - rate / 100) / n)", format: "pct" },
      ],
      note: "Simple normal approximation. If the margin is larger than the improvement you are trying to detect, add cases before drawing a conclusion.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Common traps",
      text: "Tuning on the same cases you report on (overfitting to the eval), tiny sets, only easy cases, labels written by the system's own model, a single run of a non-deterministic system, and celebrating an average while a key case regressed.",
    },
    { type: "h", text: "Where datasets come from" },
    {
      type: "ul",
      items: [
        "**Production logs**: the most realistic inputs. Sample, anonymise and label them.",
        "**Subject experts**: write hard and edge cases and define what correct means.",
        "**Synthetic generation**: a model drafts variations to add volume. Review them, since they skew easy and similar (Track 4).",
        "**Failures**: every bug report and bad answer becomes a permanent test.",
        "**Adversarial sets**: injection attempts, unsafe requests, malformed input (Track 2).",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That an eval is a dataset plus a scorer plus a summary, that you prefer code checks over judges over humans, that you compare per case and quantify uncertainty before believing a small difference, and that the dataset grows from production failures.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A minimal eval harness: a dataset, a scorer, and a Wilson interval around the result.",
    code: `import math

def wilson(passes: int, total: int, z: float = 1.96) -> tuple[float, float, float]:
    """Pass rate with a 95% Wilson score interval (good for small n and extreme rates)."""
    if total == 0:
        return 0.0, 0.0, 1.0
    p = passes / total
    denom = 1 + z * z / total
    center = (p + z * z / (2 * total)) / denom
    half = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / denom
    return p, max(0.0, center - half), min(1.0, center + half)


def run_eval(system, cases) -> dict:
    results = []
    for case in cases:
        output = system(case["input"])
        results.append({"id": case["id"], "passed": case["check"](output)})   # code check first
    passes = sum(r["passed"] for r in results)
    rate, low, high = wilson(passes, len(results))
    return {"rate": round(rate, 2), "low": round(low, 2), "high": round(high, 2),
            "failures": [r["id"] for r in results if not r["passed"]]}`,
  },

  interview: [
    {
      question: "What is an eval for an LLM application?",
      answer:
        "A repeatable measurement: a dataset of inputs with labels or criteria, a scorer for each output, and a summary I can compare across versions. It turns subjective impressions into numbers, supports regression testing, and tells me whether a change helped. I score with code where possible, a judge model where not, and humans for ground truth and calibration.",
      weakAnswer:
        "Testing the model on some examples. — Misses the dataset, scorer and comparison discipline.",
    },
    {
      question: "How many test cases do you need?",
      answer:
        "Enough that the uncertainty is smaller than the differences I care about. With 100 cases and an 80% pass rate the 95% margin is about plus or minus 8 points, so I could not detect a 3-point change. I start with a few dozen good cases to find big problems, grow the set from production failures, and use confidence intervals and per-case diffs before believing small differences.",
      followUp: "How would you detect a 2-point improvement?",
    },
    {
      question: "What is the difference between offline and online evaluation?",
      answer:
        "Offline evals run a fixed dataset before release, giving repeatable comparisons between versions. Online evals observe live traffic after release through user feedback, sampled reviews and experiments, which reflect real use but are noisy. They complement each other: offline gates releases, online catches what the dataset missed, and failures flow back into the offline set.",
    },
    {
      question: "How do you build an eval dataset from nothing?",
      answer:
        "Start with real inputs from logs or stakeholders, even a few dozen, and label the expected output or criteria with a domain expert. Add known edge cases and adversarial inputs, generate synthetic variations for volume but review them, hold out a slice I never tune on, and then add every production failure as a permanent case.",
    },
    {
      question: "Name some common mistakes in LLM evaluation.",
      answer:
        "Evaluating on the cases I tuned the prompt on, sets too small to mean anything, only easy cases, reporting an average while a critical case regressed, a single run of a non-deterministic system, labels produced by the model being evaluated, and trusting a judge that was never calibrated against human labels.",
    },
  ],

  challenges: [
    {
      id: "ev-1-quiz",
      kind: "quiz",
      title: "Checkpoint: evals fundamentals",
      blurb: "Five questions on what an eval is and how far to trust it.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which scorer should you prefer when the answer can be checked by code?",
          options: [
            "An LLM judge, because it is flexible",
            "A deterministic code check, because it is cheap, exact and repeatable",
            "A human reviewer for every case",
            "No scorer",
          ],
          correctIndex: 1,
          explanation:
            "Use code where it can decide, a judge where it cannot, and humans for ground truth and calibration.",
        },
        {
          id: "q2",
          prompt: "A prompt change raises the pass rate from 70% to 75% on a 20-case set. What is the right conclusion?",
          options: [
            "It definitely improved",
            "It is one case, well within noise, so more cases and a per-case diff are needed",
            "It definitely got worse",
            "The set is perfect",
          ],
          correctIndex: 1,
          explanation:
            "5 points on 20 cases is one case. The uncertainty is far larger than the difference.",
        },
        {
          id: "q3",
          prompt: "If you quadruple the number of test cases, what happens to the statistical margin of error?",
          options: [
            "It is cut to a quarter",
            "It is halved",
            "It does not change",
            "It doubles",
          ],
          correctIndex: 1,
          explanation:
            "Error shrinks with the square root of n, so 4x the cases halves it.",
        },
        {
          id: "q4",
          prompt: "Which is the best source of new eval cases over time?",
          options: [
            "Cases the system already passes",
            "Real production failures and bug reports",
            "Randomly generated nonsense",
            "Copies of the existing cases",
          ],
          correctIndex: 1,
          explanation:
            "Failures show where the system is weak, and a permanent case stops them returning.",
        },
        {
          id: "q5",
          prompt: "What does an offline eval give you that an online signal does not?",
          options: [
            "Real user behaviour",
            "A repeatable comparison of versions on a fixed dataset before release",
            "Free user feedback",
            "Continuous monitoring",
          ],
          correctIndex: 1,
          explanation:
            "A fixed dataset lets you compare versions like for like. Online signals reflect real use but vary with traffic.",
        },
      ],
    },
    {
      id: "ev-1-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: shipping a prompt change",
      blurb: "The team shipped a 'better' prompt and quality did not improve. Find the line.",
      language: "python",
      lines: [
        "old = pass_rate(prompt_v1, cases)      # 20 cases -> 0.70",
        "new = pass_rate(prompt_v2, cases)      # 20 cases -> 0.75",
        "if new > old:",
        "    ship(prompt_v2)",
      ],
      buggyLine: 3,
      reasons: [
        "`>` should be `>=`",
        "it ships on a one-case difference with no estimate of uncertainty or per-case comparison, which is well within noise",
        "ship must be called before pass_rate",
        "the cases list should be shuffled",
      ],
      correctReasonIndex: 1,
      explanation:
        "On 20 cases, 70% versus 75% is a single case, and a 20-case pass rate carries a margin of around 20 points. Quantify uncertainty, compare per case, and grow the set before acting on small differences.",
      fix: "if significantly_better(new_results, old_results):   # intervals + per-case diff",
      xp: 40,
    },
    {
      id: "ev-1-code",
      kind: "code",
      title: "Code challenge: a Wilson interval",
      blurb: "Put an honest range around a pass rate, especially for small test sets.",
      functionName: "wilsonInterval",
      starter: `/**
 * Wilson score interval for a pass rate, z = 1.96 (95%).
 *
 *   p      = passes / total
 *   denom  = 1 + z^2 / total
 *   center = (p + z^2 / (2 * total)) / denom
 *   half   = z * sqrt(p * (1 - p) / total + z^2 / (4 * total^2)) / denom
 *   low = center - half,  high = center + half   (clamp to [0, 1])
 *
 * Return { rate, low, high }, each rounded to 2 decimals.
 * If total is 0 return { rate: 0, low: 0, high: 1 }.
 */
function wilsonInterval(passes, total) {
  // your code here
}`,
      tests: [
        { name: "half passing out of 100", args: [50, 100], expected: { rate: 0.5, low: 0.4, high: 0.6 } },
        { name: "none passing out of 10", args: [0, 10], expected: { rate: 0, low: 0, high: 0.28 } },
        { name: "all passing out of 10", args: [10, 10], expected: { rate: 1, low: 0.72, high: 1 } },
        { name: "no data at all", args: [0, 0], expected: { rate: 0, low: 0, high: 1 } },
        { name: "a high pass rate on a larger set", args: [90, 100], expected: { rate: 0.9, low: 0.83, high: 0.94 } },
        { name: "a tiny set is very uncertain", args: [3, 4], expected: { rate: 0.75, low: 0.3, high: 0.95 } },
      ],
      hints: [
        "Compute p = passes / total, then the three formulas in order: denom, center, half.",
        "z is 1.96. Use Math.sqrt for the square root.",
        "Clamp low to at least 0 and high to at most 1, then round each value with Math.round(x * 100) / 100. Handle total = 0 first.",
      ],
      solution: `function wilsonInterval(passes, total) {
  if (total === 0) return { rate: 0, low: 0, high: 1 };

  const z = 1.96;
  const p = passes / total;
  const denom = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denom;
  const half =
    (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denom;

  const round = (x) => Math.round(x * 100) / 100;
  return {
    rate: round(p),
    low: round(Math.max(0, center - half)),
    high: round(Math.min(1, center + half)),
  };
}`,
      xp: 70,
    },
  ],
};
