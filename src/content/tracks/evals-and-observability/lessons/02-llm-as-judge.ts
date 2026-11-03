import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "llm-as-judge",
  order: 2,
  title: "LLM-as-Judge",
  summary:
    "A model can grade outputs that code cannot. It is also biased, so it has to be designed carefully and checked against people.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "Many qualities have no deterministic check: helpfulness, tone, whether a summary is faithful, which of two answers is better. An **LLM judge** is a model prompted with a **rubric** that scores or compares outputs. It scales far beyond human review and is far cheaper, but it is a **measurement instrument** and, like any instrument, it needs calibration.",
    },
    {
      type: "table",
      headers: ["Style", "What the judge sees", "Output", "Use for"],
      rows: [
        ["**Pointwise**", "one answer plus a rubric", "a score or pass/fail per criterion", "absolute quality, regression tracking"],
        ["**Pairwise**", "two answers to the same input", "which is better (or tie)", "comparing two versions; usually more reliable than absolute scores"],
        ["**Reference-based**", "the answer plus a reference answer", "is it consistent with the reference?", "tasks with a known good answer"],
        ["**Context-based**", "the answer plus the sources it should rely on", "is every claim supported?", "RAG faithfulness (Track 4)"],
      ],
    },
    {
      type: "sorter",
      title: "Which judge bias is this?",
      prompt: "Match each symptom to the bias that most likely explains it.",
      categories: ["Position bias", "Length bias", "Self-preference"],
      items: [
        { text: "The judge picks answer A 70% of the time, whichever system wrote it", answer: 0, why: "Preference for the first (or last) slot regardless of content." },
        { text: "Longer, more elaborate answers keep winning even when a short one is correct", answer: 1, why: "Verbosity is mistaken for quality." },
        { text: "A judge from the same model family rates that family's outputs higher", answer: 2, why: "Models tend to prefer text that resembles their own style." },
        { text: "Swapping the order of the two answers flips the verdict", answer: 0, why: "A direct test for position bias: a reliable judge is stable under swapping." },
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "A judge is only as good as its agreement with humans",
      text: "Before you trust a judge, measure how often it agrees with careful human labels on a sample. If it does not agree, its scores are noise with a confident tone.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Designing a judge prompt that holds up" },
    {
      type: "ol",
      items: [
        "**One criterion per judge call**, or clearly separated criteria. \"Is it good?\" is too vague to be consistent.",
        "**A rubric with anchors**: define what each score means with short examples of a 1 and a 5, or pass versus fail.",
        "**Reasoning before the verdict**: ask for a brief justification, then the score, in structured output (Track 2). It improves consistency and gives you something to read when you disagree.",
        "**Show only what is needed**: for faithfulness, give the sources; for correctness, a reference; never leak which system produced the answer.",
        "**Randomise order** in pairwise comparisons and judge both orders, counting a win only if it holds in both.",
        "**Temperature 0**, a strong model, and a pinned version so scores are comparable over time (Track 2).",
      ],
    },
    { type: "h", text: "Calibrating against people" },
    {
      type: "stepper",
      title: "How to calibrate a judge",
      steps: [
        { label: "Label a sample by hand", detail: "Have a person who understands the task label 50 to 200 outputs against the same rubric. Disagreements between two humans are informative too.", items: ["100 human labels"], mark: [0] },
        { label: "Run the judge on the same items", detail: "Use the exact prompt, model and settings you intend to deploy.", items: ["100 judge labels"], mark: [0] },
        { label: "Measure agreement", detail: "Raw agreement can look high just because one label is common. Cohen's kappa corrects for chance agreement. Roughly, above 0.6 is substantial and above 0.8 is strong.", items: ["agreement 88%", "kappa 0.62"], mark: [1] },
        { label: "Read the disagreements", detail: "Look at the cases where judge and human differ. Patterns reveal an unclear rubric, a bias or a missing example.", items: ["judge too lenient on refunds", "misses subtle errors"], mark: [0, 1] },
        { label: "Refine, re-measure, then freeze", detail: "Adjust the rubric or examples, re-run, and when agreement is good enough freeze the judge version. Re-check periodically and when you change the model.", items: ["judge v2: kappa 0.78", "frozen + monitored"], mark: [0, 1] },
      ],
      caption: "The same loop as improving any model: measure, inspect errors, adjust.",
    },
    {
      type: "calculator",
      title: "Agreement and Cohen's kappa",
      inputs: [
        { key: "bothPass", label: "Judge pass, human pass", min: 0, max: 200, step: 1, value: 60 },
        { key: "bothFail", label: "Judge fail, human fail", min: 0, max: 200, step: 1, value: 15 },
        { key: "judgePass", label: "Judge pass, human fail", min: 0, max: 200, step: 1, value: 15 },
        { key: "judgeFail", label: "Judge fail, human pass", min: 0, max: 200, step: 1, value: 10 },
      ],
      outputs: [
        { label: "Raw agreement", formula: "(bothPass + bothFail) / Math.max(1, bothPass + bothFail + judgePass + judgeFail)", format: "pct" },
        { label: "Cohen's kappa", formula: "(() => { const n = Math.max(1, bothPass + bothFail + judgePass + judgeFail); const po = (bothPass + bothFail) / n; const jp = (bothPass + judgePass) / n; const hp = (bothPass + judgeFail) / n; const pe = jp * hp + (1 - jp) * (1 - hp); return pe === 1 ? 1 : (po - pe) / (1 - pe); })()", format: "fixed2" },
      ],
      note: "Try making 'pass' very common: raw agreement stays high while kappa drops, which is exactly the trap kappa is designed to expose.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Do not judge what code can check",
      text: "Do not ask a judge whether JSON is valid, a number matches, or a test passes. Judges are slower, costlier and noisier than the check you can write in a few lines. Keep them for the genuinely subjective.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That a judge needs a rubric with anchors, reasoning before the verdict, order randomisation for pairwise, a pinned model, and calibration against human labels using kappa, and that code checks come first.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A pairwise judge that defends against position bias by judging both orders.",
    code: `import json, random

JUDGE = """You compare two answers to the same question.
Criteria: factual accuracy first, then clarity. Ignore length and formatting.
Reply as JSON: {"reason": "<one or two sentences>", "winner": "A" | "B" | "tie"}

<question>{question}</question>
<answer_a>{a}</answer_a>
<answer_b>{b}</answer_b>"""


def judge_once(question: str, a: str, b: str) -> str:
    raw = llm(JUDGE.format(question=question, a=a, b=b), temperature=0, model=JUDGE_MODEL)
    return json.loads(raw)["winner"]


def compare(question: str, new: str, old: str) -> str:
    """Judge both orders. A win counts only if it holds regardless of position."""
    first = judge_once(question, new, old)          # new is A
    second = judge_once(question, old, new)         # new is B
    new_wins = (first == "A") + (second == "B")
    old_wins = (first == "B") + (second == "A")
    if new_wins == 2:
        return "new"
    if old_wins == 2:
        return "old"
    return "tie"                                    # disagreement across orders = no clear winner`,
  },

  interview: [
    {
      question: "What are the main biases of an LLM judge and how do you mitigate them?",
      answer:
        "Position bias, favouring an answer because of its slot; length bias, mistaking verbosity for quality; and self-preference, favouring text in its own style; plus sensitivity to formatting. I randomise and swap order and only count wins that hold in both, tell the judge to ignore length, use a different model family where possible, anchor a rubric with examples, and calibrate against human labels.",
      weakAnswer:
        "Judges can be wrong sometimes. — Not specific, so it suggests no mitigation.",
    },
    {
      question: "How do you validate an LLM judge?",
      answer:
        "Have people label a sample against the same rubric, run the judge with the exact prompt and model I will deploy, and measure agreement with Cohen's kappa rather than raw accuracy, because common labels inflate raw agreement. I read the disagreements to fix the rubric, re-measure, freeze the judge version, and re-check periodically and whenever the judge model changes.",
      followUp: "What kappa would you accept?",
    },
    {
      question: "Pairwise or pointwise judging: which would you use?",
      answer:
        "Pairwise to compare two versions, because relative judgements are usually more reliable than absolute scores, with both orders judged to cancel position bias. Pointwise with a clear rubric for tracking absolute quality over time or gating on a threshold. I pick by the decision I need to make.",
    },
    {
      question: "Why ask the judge for reasoning before the score?",
      answer:
        "Writing a short justification first tends to make verdicts more consistent and gives me text to inspect when I disagree, so I can improve the rubric. I request structured output so the final label is parsed reliably, and I keep the reasoning short to limit cost.",
    },
    {
      question: "When should you not use an LLM judge?",
      answer:
        "When code can decide: format validity, exact values, schema conformance, unit tests, SQL result equality. Those checks are cheaper, deterministic and exact. I also avoid relying on a judge alone for high-stakes safety decisions, where expert human review is needed.",
    },
  ],

  challenges: [
    {
      id: "ev-2-quiz",
      kind: "quiz",
      title: "Checkpoint: LLM-as-judge",
      blurb: "Five questions on judge design and calibration.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "A pairwise judge picks answer A in 75% of comparisons regardless of which system wrote it. What is this?",
          options: ["Length bias", "Position bias", "Temperature drift", "Overfitting"],
          correctIndex: 1,
          explanation:
            "A preference for the first slot is position bias. Judge both orders to cancel it.",
        },
        {
          id: "q2",
          prompt: "Why is Cohen's kappa preferred over raw agreement when validating a judge?",
          options: [
            "It is easier to compute",
            "It corrects for agreement expected by chance, which is high when one label dominates",
            "It ignores disagreements",
            "It works only for numbers",
          ],
          correctIndex: 1,
          explanation:
            "If 90% of cases pass, a lazy judge that always says pass agrees 90% of the time. Kappa exposes that.",
        },
        {
          id: "q3",
          prompt: "Which task should NOT be given to an LLM judge?",
          options: [
            "Rating tone and politeness",
            "Checking whether a reply is valid JSON with the required keys",
            "Comparing two summaries for faithfulness",
            "Judging helpfulness against a rubric",
          ],
          correctIndex: 1,
          explanation:
            "Code can decide that exactly, cheaper and deterministically.",
        },
        {
          id: "q4",
          prompt: "What is the benefit of asking the judge for a short reason before the verdict?",
          options: [
            "It lowers the cost",
            "It tends to improve consistency and gives you text to inspect when you disagree",
            "It removes bias entirely",
            "It makes the judge faster",
          ],
          correctIndex: 1,
          explanation:
            "A brief justification helps both the verdict and your ability to debug the rubric.",
        },
        {
          id: "q5",
          prompt: "You switch the judge to a newer model. What should you do?",
          options: [
            "Nothing, newer is always better",
            "Re-calibrate against human labels, since scores may shift and trends become incomparable",
            "Lower the temperature to 2",
            "Remove the rubric",
          ],
          correctIndex: 1,
          explanation:
            "A new judge is a new instrument. Re-measure agreement and treat scores before and after as not directly comparable.",
        },
      ],
    },
    {
      id: "ev-2-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: comparing two versions",
      blurb: "The new version 'wins' 65% of the time, but humans disagree. Find the line.",
      language: "python",
      lines: [
        "def pairwise(question, new_answer, old_answer):",
        "    prompt = f'Q: {question}\\nAnswer A: {new_answer}\\nAnswer B: {old_answer}\\nWhich is better? Reply A or B.'",
        "    return judge(prompt) == 'A'",
      ],
      buggyLine: 2,
      reasons: [
        "the question should come last",
        "the new answer is always shown first, so position bias inflates its win rate; the order must be randomised or both orders judged",
        "the judge must be called twice with the same prompt",
        "the reply should be a number",
      ],
      correctReasonIndex: 1,
      explanation:
        "If the judge slightly prefers the first slot, always placing the new answer there manufactures wins. Randomise the order, or judge both orders and count a win only if it holds in both.",
      fix: "first = judge(order=(new, old)); second = judge(order=(old, new))   # count only consistent wins",
      xp: 40,
    },
    {
      id: "ev-2-code",
      kind: "code",
      title: "Code challenge: Cohen's kappa",
      blurb: "Measure judge-versus-human agreement, corrected for chance.",
      functionName: "cohensKappa",
      starter: `/**
 * Cohen's kappa for two raters' labels over the same items.
 *
 *   p_o = share of items where the two labels are equal
 *   p_e = sum over each label L of  (share of A's labels equal to L) * (share of B's labels equal to L)
 *   kappa = (p_o - p_e) / (1 - p_e)
 *
 * Round to 2 decimals.
 * Special cases: empty input -> 0. If p_e is 1 (everyone always used one label) -> 1.
 *
 * cohensKappa(["y","y","y","n"], ["y","y","n","n"]) -> 0.5
 */
function cohensKappa(a, b) {
  // your code here
}`,
      tests: [
        { name: "perfect agreement", args: [["y", "y", "n", "n"], ["y", "y", "n", "n"]], expected: 1 },
        { name: "moderate agreement", args: [["y", "y", "y", "n"], ["y", "y", "n", "n"]], expected: 0.5 },
        { name: "complete disagreement", args: [["y", "n"], ["n", "y"]], expected: -1 },
        { name: "one label only", args: [["y", "y"], ["y", "y"]], expected: 1 },
        { name: "empty input", args: [[], []], expected: 0 },
        { name: "agreement that is no better than chance", args: [["y", "y", "n", "n"], ["y", "n", "y", "n"]], expected: 0 },
        { name: "three labels", args: [["a", "b", "c", "a"], ["a", "b", "c", "b"]], expected: 0.64 },
      ],
      hints: [
        "Count how many items have equal labels to get p_o.",
        "Count each label in A and in B. p_e is the sum over labels of (countA / n) x (countB / n).",
        "Guard n = 0 first and the case p_e = 1 (to avoid dividing by zero), then round with Math.round(x * 100) / 100.",
      ],
      solution: `function cohensKappa(a, b) {
  const n = a.length;
  if (n === 0) return 0;

  let agree = 0;
  const countA = new Map();
  const countB = new Map();
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agree += 1;
    countA.set(a[i], (countA.get(a[i]) || 0) + 1);
    countB.set(b[i], (countB.get(b[i]) || 0) + 1);
  }

  const po = agree / n;
  let pe = 0;
  for (const [label, ca] of countA) {
    pe += (ca / n) * ((countB.get(label) || 0) / n);
  }

  if (1 - pe === 0) return 1;
  return Math.round(((po - pe) / (1 - pe)) * 100) / 100;
}`,
      xp: 70,
    },
  ],
};
