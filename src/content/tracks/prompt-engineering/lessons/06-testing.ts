import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "testing-and-versioning-prompts",
  order: 6,
  title: "Testing & Versioning Prompts",
  summary:
    "A prompt change is a behaviour change. Build a test set, diff results case by case, and ship prompts like code.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "Everything so far has been writing prompts. This lesson is the part that separates a demo from a product: **knowing whether a change made things better**. Without tests, prompt engineering is guessing with extra steps, and every edit risks quietly breaking a case that used to work.",
    },
    {
      type: "visual",
      key: "regression-matrix",
      caption:
        "Switch between three versions of the same prompt. The overall rate rises, but look at which individual cases flipped.",
    },
    { type: "h", text: "The golden set" },
    {
      type: "p",
      text: "A **golden set** (or eval set) is a list of real inputs, each with a way to check the output. It is the unit test suite for your prompt. Start with 30 to 100 cases and grow it every time production surprises you.",
    },
    {
      type: "ul",
      items: [
        "**Real inputs**, sampled from production or from users, not only ones you imagined.",
        "**The easy majority** so you notice if you break the common case.",
        "**Known edge cases**: empty input, very long input, other languages, ambiguous input.",
        "**Adversarial cases**, including injection attempts from lesson 5.",
        "**Every bug you ever fixed**, as a permanent regression test.",
      ],
    },
    { type: "h", text: "How to check an output" },
    {
      type: "table",
      headers: ["Method", "Use for", "Notes"],
      rows: [
        ["Exact or schema match", "classification, extraction, structured output", "cheapest and most reliable; use whenever possible"],
        ["Programmatic checks", "contains a field, within a range, valid URL", "deterministic and fast"],
        ["Another model as judge", "tone, helpfulness, faithfulness", "useful but biased; calibrate it (Track 6)"],
        ["Human review", "ground truth and judge calibration", "slow and costly; use on samples"],
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "One change at a time",
      text: "Change a single thing between runs: a rule, an example, a format line. If you change three things and the score moves, you do not know which one mattered.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "An average can hide a regression",
      text: "Version 3 may score higher than version 2 overall while failing a case that version 2 passed. Always diff **per case** and treat every newly failing case as a bug to explain.",
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "Model outputs are **noisy**. Even at temperature 0 there is residual non-determinism (Track 1), and at higher temperatures two runs of the same prompt can differ a lot. So a single run of a single case is weak evidence, and a 2-point change on 50 cases is well inside the noise.",
    },
    { type: "h", text: "Making comparisons trustworthy" },
    {
      type: "ol",
      items: [
        "**Pin everything except the one thing you are testing**: the model version, temperature, max tokens and the golden set itself.",
        "**Evaluate at the temperature you will ship**, usually 0 for deterministic tasks. If you ship above 0, run each case several times and score the average.",
        "**Compare per case**, listing fixes and regressions, rather than only the overall rate.",
        "**Judge significance.** With few cases, only large or consistent changes mean anything; grow the set before trusting small deltas.",
        "**Keep a held-out slice** you never tune on, to catch overfitting to the golden set.",
      ],
    },
    {
      type: "code",
      language: "text",
      code: `overall rate:  v2 = 75%   v3 = 88%     (looks like a win)
per case:      +2 fixed   -1 regressed      <- read this before shipping

a regression on a high-stakes case can outweigh two fixes on easy ones`,
    },
    { type: "h", text: "Versioning and release" },
    {
      type: "ul",
      items: [
        "**Store prompts in version control** next to the code, with a name and version in the file.",
        "**Log the prompt version** with every model call so you can tie a bad output to the exact prompt.",
        "**Run the golden set in CI** and block merges that regress, as you would for unit tests.",
        "**Roll out gradually**: shadow or A/B test the new version on a slice of traffic and compare online metrics before switching everything.",
        "**Keep rollback trivial.** The previous version should be one config change away.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "\"I would not ship until I could measure it.\" They build a golden set from real traffic, diff per case, control for noise, pin versions, run it in CI, and roll out gradually with a rollback. Describing only how to word a prompt is a junior answer.",
    },
    {
      type: "p",
      text: "Track 6 goes much deeper on evaluation: judges, rubrics, online metrics and tracing. Here the habit matters most: **no prompt change without a before and after on the same cases**.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Compare two prompt versions case by case, not just by the average.",
    code: `from dataclasses import dataclass

@dataclass
class Case:
    id: str
    input: str
    expected: str


def run_version(prompt_version: str, cases: list[Case]) -> dict[str, bool]:
    results = {}
    for case in cases:
        out = call(
            prompt=load_prompt(prompt_version),
            input=case.input,
            temperature=0,            # evaluate at the temperature you ship
        )
        results[case.id] = matches(out, case.expected)
    return results


def compare(prev: dict[str, bool], new: dict[str, bool]) -> dict:
    fixed = [i for i in new if new[i] and not prev.get(i, False) and i in prev]
    regressed = [i for i in new if not new[i] and prev.get(i, False)]
    rate = lambda r: sum(r.values()) / len(r) if r else 0.0
    return {
        "prev_rate": round(rate(prev), 2),
        "new_rate": round(rate(new), 2),
        "fixed": fixed,
        "regressed": regressed,       # block the release until each is explained
    }`,
  },

  interview: [
    {
      question: "How do you test a prompt?",
      answer:
        "With a golden set: 30 to 100 real inputs plus edge and adversarial cases, each with a deterministic check where possible (schema or exact match), and a model judge only where I have to. I run it at the temperature I will ship, change one thing at a time, and diff results per case so I see both fixes and regressions. It runs in CI and every production bug becomes a new case.",
      weakAnswer:
        "I try a few examples and see if the output looks good. — Anecdote, not evidence.",
    },
    {
      question: "The pass rate went from 80% to 88%. Do you ship?",
      answer:
        "Not on that number alone. I would diff per case: which cases were fixed and which regressed, since an average can hide a regression on an important case. I would also check the set size and noise, because on 50 cases an 8-point change is only four cases, and run on a held-out slice to make sure I did not overfit. If the regressions are explained and acceptable, I would roll out gradually with a rollback ready.",
      followUp: "How would you handle outputs that vary run to run?",
    },
    {
      question: "How do you handle the non-determinism of model outputs when evaluating?",
      answer:
        "Pin the model version and evaluate at the temperature I will ship, usually 0 for deterministic tasks. Where I ship above 0, I run each case several times and score the average or the pass fraction. I keep the golden set and settings fixed between comparisons and only trust differences that are large or consistent compared with the run-to-run variation.",
    },
    {
      question: "How should prompts be versioned and released?",
      answer:
        "Like code: in version control with a name and version, reviewed in pull requests, with the golden set running in CI to block regressions. I log the prompt version with every model call, release gradually through shadow or A/B traffic while watching online metrics, and keep rollback to a single config change.",
    },
    {
      question: "What goes in a golden set?",
      answer:
        "Real production-like inputs for the common case, known edge cases such as empty, long, multilingual and ambiguous inputs, adversarial and injection attempts, and a regression case for every bug ever fixed. I keep a held-out slice I never tune on, and I grow the set whenever production surprises me.",
    },
  ],

  challenges: [
    {
      id: "pe-6-quiz",
      kind: "quiz",
      title: "Checkpoint: testing and versioning",
      blurb: "Five questions on measuring prompt changes.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Why change only one thing between prompt versions?",
          options: [
            "It makes the prompt shorter",
            "So you can attribute a score change to a specific edit",
            "Providers limit edits per day",
            "It reduces cost",
          ],
          correctIndex: 1,
          explanation:
            "With several simultaneous changes you cannot tell which one helped or hurt.",
        },
        {
          id: "q2",
          prompt: "Version B beats version A overall. What must you still check?",
          options: [
            "Nothing, a higher average is enough",
            "Which individual cases regressed, since an average can hide failures on important cases",
            "Only the longest test case",
            "Whether B is shorter",
          ],
          correctIndex: 1,
          explanation:
            "Diff per case. A regression on a high-stakes case can outweigh several easy fixes.",
        },
        {
          id: "q3",
          prompt: "Which check is preferred for a classification task?",
          options: [
            "A model judge rating overall quality",
            "Exact or schema match against the expected label",
            "Manual review of every output",
            "Counting words",
          ],
          correctIndex: 1,
          explanation:
            "Deterministic checks are cheapest and most reliable. Use judges only when no programmatic check exists.",
        },
        {
          id: "q4",
          prompt: "You ship at temperature 0.7. How should you evaluate?",
          options: [
            "At temperature 0, since it is simpler",
            "At the shipped temperature, running each case several times and averaging",
            "At temperature 2 to stress test",
            "Evaluation is not possible above 0",
          ],
          correctIndex: 1,
          explanation:
            "Evaluate the configuration you ship, and average over repeated runs to reduce noise.",
        },
        {
          id: "q5",
          prompt: "What should be logged with every model call in production?",
          options: [
            "Only the model's reply",
            "The prompt version (and model version), so a bad output can be tied to the exact prompt",
            "Nothing, for privacy",
            "Only the user's name",
          ],
          correctIndex: 1,
          explanation:
            "Without the version you cannot reproduce a failure or know which release caused it.",
        },
      ],
    },
    {
      id: "pe-6-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: an evaluation function",
      blurb: "Scores for the same prompt swing by several points between runs. Find the line.",
      language: "python",
      lines: [
        "def evaluate(prompt_version, cases):",
        "    passed = 0",
        "    for case in cases:",
        "        out = call(prompt_version, case.input, temperature=0.7)",
        "        if matches(out, case.expected):",
        "            passed += 1",
        "    return passed / len(cases)",
      ],
      buggyLine: 4,
      reasons: [
        "the division on the last line should be by `passed`",
        "a single sample at temperature 0.7 per case makes the score noisy, so differences between versions may be luck",
        "`passed` must be a float",
        "`matches` must be an exact string comparison",
      ],
      correctReasonIndex: 1,
      explanation:
        "One random draw per case adds sampling noise to every score. Evaluate deterministic tasks at temperature 0, or run each case several times at the shipped temperature and average, so version-to-version differences mean something.",
      fix: "out = call(prompt_version, case.input, temperature=0)   # or run k times and average",
      xp: 40,
    },
    {
      id: "pe-6-code",
      kind: "code",
      title: "Code challenge: compare two prompt runs",
      blurb: "Report both pass rates and exactly which cases were fixed or regressed.",
      functionName: "compareRuns",
      starter: `/**
 * Compare two evaluation runs. Each run is an array of { id, passed }.
 *
 * Return { prevRate, nextRate, fixed, regressed }
 *  - prevRate / nextRate: passed / total for that run, rounded to 2 decimals
 *    (an empty run has rate 0)
 *  - fixed:     ids in \`next\` that passed there but FAILED in \`prev\`
 *  - regressed: ids in \`next\` that FAILED there but PASSED in \`prev\`
 *  Only compare ids that exist in both runs. List ids in \`next\` order.
 *
 * compareRuns(
 *   [{id:"a",passed:true},{id:"b",passed:false}],
 *   [{id:"a",passed:true},{id:"b",passed:true}]
 * ) -> { prevRate: 0.5, nextRate: 1, fixed: ["b"], regressed: [] }
 */
function compareRuns(prev, next) {
  // your code here
}`,
      tests: [
        {
          name: "a fix",
          args: [
            [{ id: "a", passed: true }, { id: "b", passed: false }],
            [{ id: "a", passed: true }, { id: "b", passed: true }],
          ],
          expected: { prevRate: 0.5, nextRate: 1, fixed: ["b"], regressed: [] },
        },
        {
          name: "a regression",
          args: [
            [{ id: "a", passed: true }, { id: "b", passed: true }],
            [{ id: "a", passed: true }, { id: "b", passed: false }],
          ],
          expected: { prevRate: 1, nextRate: 0.5, fixed: [], regressed: ["b"] },
        },
        {
          name: "same rate hides a swap",
          args: [
            [{ id: "a", passed: true }, { id: "b", passed: false }, { id: "c", passed: true }],
            [{ id: "a", passed: false }, { id: "b", passed: true }, { id: "c", passed: true }],
          ],
          expected: { prevRate: 0.67, nextRate: 0.67, fixed: ["b"], regressed: ["a"] },
        },
        { name: "two empty runs", args: [[], []], expected: { prevRate: 0, nextRate: 0, fixed: [], regressed: [] } },
        {
          name: "a case only in the new run is not a fix or regression",
          args: [
            [{ id: "a", passed: true }],
            [{ id: "a", passed: true }, { id: "b", passed: false }],
          ],
          expected: { prevRate: 1, nextRate: 0.5, fixed: [], regressed: [] },
        },
        {
          name: "ids are reported in the order of the new run",
          args: [
            [{ id: "x", passed: false }, { id: "y", passed: false }],
            [{ id: "y", passed: true }, { id: "x", passed: true }],
          ],
          expected: { prevRate: 0, nextRate: 1, fixed: ["y", "x"], regressed: [] },
        },
      ],
      hints: [
        "Build a Map from id to passed for the previous run so lookups are easy.",
        "Loop over `next`; skip any id that the previous map does not have.",
        "A rate is the number of passed items divided by the run length, guarded against an empty run, then rounded with Math.round(x * 100) / 100.",
      ],
      solution: `function compareRuns(prev, next) {
  const rate = (run) =>
    run.length === 0
      ? 0
      : Math.round((run.filter((c) => c.passed).length / run.length) * 100) / 100;

  const before = new Map(prev.map((c) => [c.id, c.passed]));
  const fixed = [];
  const regressed = [];

  for (const c of next) {
    if (!before.has(c.id)) continue;
    const was = before.get(c.id);
    if (c.passed && !was) fixed.push(c.id);
    if (!c.passed && was) regressed.push(c.id);
  }

  return { prevRate: rate(prev), nextRate: rate(next), fixed, regressed };
}`,
      xp: 70,
    },
  ],
};
