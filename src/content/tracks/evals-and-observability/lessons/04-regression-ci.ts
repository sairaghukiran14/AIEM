import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "regression-testing-in-ci",
  order: 4,
  title: "Regression Testing in CI",
  summary:
    "Run your evals automatically on every change, decide what blocks a release, and keep the suite affordable and trustworthy.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "An eval you run by hand gets skipped when you are in a hurry, which is exactly when changes break things. **Regression testing in CI** runs your eval suite automatically on every prompt, model, retrieval or code change, and **blocks the merge** when quality drops. It is the same discipline as unit tests, adapted for outputs that are noisy and cost money.",
    },
    {
      type: "stepper",
      title: "An eval pipeline in CI",
      steps: [
        { label: "A change is proposed", detail: "A pull request edits a prompt, swaps a model, changes chunking or touches code the model depends on. All of these are behaviour changes (Track 2).", items: ["PR: edit refund prompt"], mark: [0] },
        { label: "Run the suite", detail: "CI runs the golden set against the candidate. For speed, pull requests run a smaller smoke subset and a nightly job runs everything.", items: ["PR: 60 core cases", "nightly: 600 cases"], mark: [0, 1] },
        { label: "Score and compare", detail: "Results are compared with the stored baseline per case, not just on average: which cases were fixed, which regressed.", items: ["fixed: 4", "regressed: 1"], mark: [1] },
        { label: "Apply the gates", detail: "Rules decide the outcome: an absolute floor, a maximum drop from baseline, a maximum number of regressions, and hard rules for critical cases.", items: ["floor 85%", "max drop 2 pts", "0 critical regressions"], mark: [0, 1, 2] },
        { label: "Report", detail: "Post a summary on the PR with the diff, the failing cases and their outputs, so a reviewer can judge instead of guessing.", items: ["PR comment with the diff"], mark: [0] },
        { label: "Update the baseline deliberately", detail: "Only raise the baseline after a reviewed improvement. Never let it drift down automatically.", items: ["baseline only moves up"], mark: [0] },
      ],
      caption: "The suite is a safety net. The gates and the baseline policy decide how strong it is.",
    },
    {
      type: "sorter",
      title: "Block the merge, warn, or ignore?",
      prompt: "Decide what each result should do to a pull request.",
      categories: ["Block the merge", "Warn", "Ignore"],
      items: [
        { text: "Pass rate on core cases fell from 91% to 79%", answer: 0, why: "A large, clear regression on the cases that matter most." },
        { text: "Median latency rose 4%", answer: 2, why: "Within normal variation, so do not spend attention on it." },
        { text: "A safety case that always passed now fails", answer: 0, why: "Critical cases get zero tolerance, whatever the average does." },
        { text: "Cost per request is up 30%", answer: 1, why: "Not a quality failure, but someone should consciously accept it." },
        { text: "Answer wording changed, but every check still passes", answer: 2, why: "Variation that your checks accept is not a regression." },
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "Designing gates that are fair" },
    {
      type: "table",
      headers: ["Gate", "Rule", "Why"],
      rows: [
        ["**Absolute floor**", "pass rate must be at least X", "stops slow decay below acceptable quality"],
        ["**Maximum drop**", "may not fall more than N points from the baseline", "catches sudden regressions"],
        ["**Regression count**", "at most M previously passing cases may now fail", "average-neutral swaps still fail someone"],
        ["**Critical cases**", "zero allowed failures for safety and key flows", "some failures are not tradeable for gains elsewhere"],
        ["**Significance**", "ignore differences smaller than the noise", "avoids blocking on randomness"],
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "The baseline ratchet trap",
      text: "If every merge that stays within 5 points of the baseline becomes the new baseline, quality can erode 5 points at a time without any single change failing. Keep a **fixed floor**, and only let the baseline move up.",
    },
    { type: "h", text: "Handling noise and cost" },
    {
      type: "ul",
      items: [
        "**Flaky cases**: run non-deterministic cases several times and use the majority or the average (Track 2). Quarantine cases that flip without any change, and fix or drop them.",
        "**Pin the model and settings** used by the eval so a difference comes from your change, not the environment.",
        "**Cache responses** keyed by a hash of the full request, so unchanged cases are not paid for again.",
        "**Tiered runs**: a fast subset on every pull request, the full set nightly or before release.",
        "**Cheap judges** for CI and a stronger one for periodic audits, always calibrated (lesson 2).",
        "**Version the dataset** with the code, so a baseline always refers to a known set of cases.",
      ],
    },
    {
      type: "calculator",
      title: "What does the eval suite cost?",
      inputs: [
        { key: "cases", label: "Cases in the suite", min: 10, max: 5000, step: 10, value: 300 },
        { key: "repeats", label: "Runs per case (noise control)", min: 1, max: 5, step: 1, value: 2 },
        { key: "tokens", label: "Tokens per case (all calls)", min: 500, max: 20000, step: 500, value: 4000 },
        { key: "price", label: "Blended price per 1M tokens", min: 0.1, max: 20, step: 0.1, value: 4, unit: "$" },
        { key: "runs", label: "Suite runs per day", min: 1, max: 100, step: 1, value: 15 },
      ],
      outputs: [
        { label: "Cost of one run", formula: "cases * repeats * tokens / 1e6 * price", format: "usd" },
        { label: "Cost per day", formula: "cases * repeats * tokens / 1e6 * price * runs", format: "usd" },
        { label: "Cost per day with a 20% smoke subset", formula: "0.2 * cases * repeats * tokens / 1e6 * price * runs", format: "usd" },
      ],
      note: "Response caching and a smoke subset on pull requests are the two biggest levers.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That evals run in CI like tests, with a fixed floor, a maximum drop, a regression count and zero tolerance on critical cases, that noise is handled by repeats and quarantine, that the baseline only moves up deliberately, and that cost is controlled with caching and tiered runs.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A CI gate with a floor, a maximum drop and a regression limit.",
    code: `import sys

def rate(results: list[dict]) -> float:
    return sum(r["passed"] for r in results) / len(results) if results else 0.0


def gate(prev: list[dict], new: list[dict], rules: dict) -> dict:
    was = {r["id"]: r["passed"] for r in prev}
    regressions = [r["id"] for r in new if r["id"] in was and was[r["id"]] and not r["passed"]]

    reasons = []
    if rate(new) < rules["min_pass_rate"]:
        reasons.append("below_min")                         # absolute floor
    if rate(prev) - rate(new) > rules["max_drop"]:
        reasons.append("dropped_too_much")                  # sudden regression
    if len(regressions) > rules["max_regressions"]:
        reasons.append("too_many_regressions")              # average can hide swaps

    return {"ok": not reasons, "reasons": reasons, "regressions": regressions}


if __name__ == "__main__":
    verdict = gate(load_baseline(), run_suite(), {"min_pass_rate": 0.85, "max_drop": 0.02, "max_regressions": 1})
    print(verdict)
    sys.exit(0 if verdict["ok"] else 1)       # a non-zero exit blocks the merge
    # NOTE: do not overwrite the baseline here. Raise it only in a reviewed change.`,
  },

  interview: [
    {
      question: "How do you set up regression testing for an LLM application?",
      answer:
        "A versioned golden dataset, an automated runner that scores outputs with code checks and calibrated judges, and a CI job that compares the candidate with a stored baseline per case. Gates combine an absolute floor, a maximum drop, a regression count and zero tolerance on critical cases. The report shows the failing cases so reviewers can judge, and the baseline only moves up through a reviewed change.",
      weakAnswer:
        "Run the evals before each release. — Too late and too manual; changes that break things merge unnoticed.",
    },
    {
      question: "How do you deal with flaky, non-deterministic eval cases?",
      answer:
        "Pin the model version and settings, run non-deterministic cases several times and use the average or majority, and quarantine cases that flip without any change so they stop blocking while I fix or remove them. I also set thresholds larger than the run-to-run noise, since blocking on randomness teaches people to ignore the gate.",
      followUp: "How do you decide how many repeats?",
    },
    {
      question: "Why can a baseline that follows the latest merge be dangerous?",
      answer:
        "If any change within a tolerance is accepted and then becomes the new baseline, quality can ratchet down in small steps, none of which fails the gate. I keep a fixed absolute floor and move the baseline only upward after a reviewed improvement, so slow erosion is caught.",
    },
    {
      question: "How do you keep CI eval costs under control?",
      answer:
        "Cache model responses keyed by a hash of the whole request so unchanged cases cost nothing, run a smaller smoke subset on pull requests and the full suite nightly, use a cheaper calibrated judge in CI with periodic audits by a stronger one, and only repeat the cases that are noisy. I track the suite's cost like any other infrastructure spend.",
    },
    {
      question: "An average pass rate stayed the same but the change is risky. Why?",
      answer:
        "Because fixes and regressions can cancel out: three cases improved and three others broke. Averages hide who got hurt, and a regression on a critical case can matter more than several gains elsewhere. I diff per case, cap the number of regressions, and give safety and key-flow cases zero tolerance.",
    },
  ],

  challenges: [
    {
      id: "ev-4-quiz",
      kind: "quiz",
      title: "Checkpoint: regression testing in CI",
      blurb: "Five questions on gates, noise and baselines.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which change should trigger the eval suite in CI?",
          options: [
            "Only code changes",
            "Any prompt, model, retrieval or code change that can alter behaviour",
            "Only releases",
            "Only changes to tests",
          ],
          correctIndex: 1,
          explanation:
            "All of these change outputs. A prompt edit is a behaviour change (Track 2).",
        },
        {
          id: "q2",
          prompt: "Why use a fixed absolute floor in addition to a maximum drop?",
          options: [
            "It is faster",
            "Without it, repeated small allowed drops can erode quality indefinitely",
            "It removes the need for tests",
            "It lowers cost",
          ],
          correctIndex: 1,
          explanation:
            "Each change within tolerance looks fine alone. The floor stops slow decay.",
        },
        {
          id: "q3",
          prompt: "Average pass rate is unchanged, but three cases fixed and three regressed. What should the gate consider?",
          options: [
            "Nothing, the average is the same",
            "Per-case regressions, especially on critical cases",
            "Only latency",
            "Only the cost",
          ],
          correctIndex: 1,
          explanation:
            "Swaps hide in averages. Count regressions and protect critical cases.",
        },
        {
          id: "q4",
          prompt: "What is the best use of response caching in eval CI?",
          options: [
            "To hide failures",
            "To avoid paying again for unchanged requests, keyed by a hash of the full request",
            "To raise the pass rate",
            "To skip scoring",
          ],
          correctIndex: 1,
          explanation:
            "Identical requests give reusable outputs, which cuts cost without changing results.",
        },
        {
          id: "q5",
          prompt: "A case flips pass and fail with no code change. What should you do?",
          options: [
            "Ignore it permanently",
            "Quarantine it so it stops blocking, then fix or remove it, and use repeats for noisy cases",
            "Delete the gate",
            "Raise the temperature",
          ],
          correctIndex: 1,
          explanation:
            "Flaky cases erode trust in the gate. Isolate and fix them rather than letting people learn to ignore failures.",
        },
      ],
    },
    {
      id: "ev-4-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: updating the baseline",
      blurb: "Over a month, answer quality fell noticeably, yet CI never failed. Find the line.",
      language: "python",
      lines: [
        "baseline = load_baseline()             # last merged pass rate",
        "new_rate = run_suite()",
        "if new_rate >= baseline - 0.05:        # allow small noise",
        "    save_baseline(new_rate)            # becomes the new baseline",
        "    merge()",
      ],
      buggyLine: 4,
      reasons: [
        "the baseline should be saved before the suite runs",
        "each allowed 5-point drop becomes the new baseline, so quality can ratchet down indefinitely; keep a fixed floor and only raise the baseline deliberately",
        "merge must be called first",
        "the threshold must be 0",
      ],
      correctReasonIndex: 1,
      explanation:
        "Accepting a drop and then promoting it to baseline lets the next change drop another 5 points. Over several merges quality collapses without one failing gate. Use an absolute floor and a baseline that only moves up through review.",
      fix: "if new_rate >= FLOOR and new_rate >= baseline - 0.02: merge()   # baseline updated only by a reviewed improvement",
      xp: 40,
    },
    {
      id: "ev-4-code",
      kind: "code",
      title: "Code challenge: an eval gate",
      blurb: "Decide whether a candidate may merge, and report which rules it broke.",
      functionName: "gate",
      starter: `/**
 * prev, next: arrays of { id, passed } for the baseline and the candidate.
 * rules: { minPassRate, maxDrop, maxRegressions }
 *
 *   rate = passed / total  (0 for an empty run), NOT rounded
 *   regression = an id present in both runs that passed in prev and failed in next
 *
 * Return { ok, reasons } where reasons lists, in this order, any that apply:
 *   "below_min"             rate(next) < minPassRate
 *   "dropped_too_much"      rate(prev) - rate(next) > maxDrop
 *   "too_many_regressions"  regression count > maxRegressions
 * ok is true only when reasons is empty.
 */
function gate(prev, next, rules) {
  // your code here
}`,
      tests: [
        {
          name: "a clean pass",
          args: [
            [{ id: "a", passed: true }, { id: "b", passed: true }],
            [{ id: "a", passed: true }, { id: "b", passed: true }],
            { minPassRate: 0.8, maxDrop: 0.1, maxRegressions: 0 },
          ],
          expected: { ok: true, reasons: [] },
        },
        {
          name: "below the floor",
          args: [
            [{ id: "a", passed: true }, { id: "b", passed: false }],
            [{ id: "a", passed: true }, { id: "b", passed: false }],
            { minPassRate: 0.8, maxDrop: 0.5, maxRegressions: 5 },
          ],
          expected: { ok: false, reasons: ["below_min"] },
        },
        {
          name: "a drop and a regression, in order",
          args: [
            [{ id: "a", passed: true }, { id: "b", passed: true }, { id: "c", passed: true }, { id: "d", passed: false }],
            [{ id: "a", passed: true }, { id: "b", passed: true }, { id: "c", passed: false }, { id: "d", passed: false }],
            { minPassRate: 0.4, maxDrop: 0.1, maxRegressions: 0 },
          ],
          expected: { ok: false, reasons: ["dropped_too_much", "too_many_regressions"] },
        },
        {
          name: "a swap keeps the average but still regresses",
          args: [
            [{ id: "a", passed: true }, { id: "b", passed: false }],
            [{ id: "a", passed: false }, { id: "b", passed: true }],
            { minPassRate: 0.4, maxDrop: 0.1, maxRegressions: 0 },
          ],
          expected: { ok: false, reasons: ["too_many_regressions"] },
        },
        {
          name: "regressions within the allowance are fine",
          args: [
            [{ id: "a", passed: true }, { id: "b", passed: false }],
            [{ id: "a", passed: false }, { id: "b", passed: true }],
            { minPassRate: 0.4, maxDrop: 0.1, maxRegressions: 1 },
          ],
          expected: { ok: true, reasons: [] },
        },
        {
          name: "a brand new case is not a regression",
          args: [
            [{ id: "a", passed: true }],
            [{ id: "a", passed: true }, { id: "b", passed: false }],
            { minPassRate: 0.4, maxDrop: 0.6, maxRegressions: 0 },
          ],
          expected: { ok: true, reasons: [] },
        },
        {
          name: "empty runs",
          args: [[], [], { minPassRate: 0, maxDrop: 0, maxRegressions: 0 }],
          expected: { ok: true, reasons: [] },
        },
      ],
      hints: [
        "Write a small helper rate(run) that returns 0 for an empty run and passed divided by total otherwise.",
        "Build a Map of id to passed for prev. A regression is an item in next that failed, whose id is in the map with true.",
        "Push the reason strings in the stated order and set ok to whether the list is empty.",
      ],
      solution: `function gate(prev, next, rules) {
  const rate = (run) =>
    run.length === 0 ? 0 : run.filter((c) => c.passed).length / run.length;

  const before = new Map(prev.map((c) => [c.id, c.passed]));
  const regressions = next.filter((c) => !c.passed && before.get(c.id) === true).length;

  const reasons = [];
  if (rate(next) < rules.minPassRate) reasons.push("below_min");
  if (rate(prev) - rate(next) > rules.maxDrop) reasons.push("dropped_too_much");
  if (regressions > rules.maxRegressions) reasons.push("too_many_regressions");

  return { ok: reasons.length === 0, reasons };
}`,
      xp: 70,
    },
  ],
};
