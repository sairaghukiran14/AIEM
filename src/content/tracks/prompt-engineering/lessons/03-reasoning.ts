import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "reasoning-and-chain-of-thought",
  order: 3,
  title: "Reasoning & Chain-of-Thought",
  summary:
    "Letting the model write out intermediate steps improves multi-step answers, and you pay for every one of those tokens.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "A model produces one token at a time, and each token can only use a fixed amount of computation. For a multi-step problem, forcing the answer to appear immediately leaves no room to work. **Chain-of-thought (CoT)** gives the model room: it writes intermediate steps first, and those tokens become context for the final answer.",
    },
    {
      type: "visual",
      key: "cot-cost",
      caption:
        "Adjust reasoning length, number of samples and price. See what reasoning does to cost and latency at scale.",
    },
    { type: "h", text: "The family of techniques" },
    {
      type: "table",
      headers: ["Technique", "What you do", "Costs"],
      rows: [
        ["**Zero-shot CoT**", "ask the model to reason step by step before answering", "reasoning tokens"],
        ["**Few-shot CoT**", "show worked examples that include the reasoning", "example tokens plus reasoning"],
        ["**Self-consistency**", "sample N reasoning paths at temperature > 0 and take the majority answer", "N × the tokens"],
        ["**Reasoning / thinking models**", "the model reasons internally in a separate budget before replying", "thinking tokens, billed as output"],
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "Reason first, answer last",
      text: "Put the reasoning **before** the final answer. If the answer comes first, the \"reasoning\" is a justification written after the fact and cannot influence it.",
    },
    { type: "h", text: "When it helps and when it does not" },
    {
      type: "ul",
      items: [
        "**Helps:** arithmetic, multi-hop questions, planning, logic, code reasoning, anything where a person would use scratch paper.",
        "**Little or no gain:** simple classification, extraction, lookups and formatting, where the answer is a direct read of the input.",
        "**Can hurt:** it adds latency, cost and more text that can contain a mistake or drift, so use it where measurement shows a gain.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Shown reasoning is not always the real reason",
      text: "The written steps are a plausible explanation, not a guaranteed trace of the computation. Research has found cases where the stated reasoning does not reflect what drove the answer. Verify outputs with checks you control, rather than trusting the explanation.",
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "Each generated token costs a fixed forward pass, so a longer chain means **more total computation** available before the answer. CoT trades tokens for compute: the model uses its own output as working memory. That is also why it is expensive: you pay output prices, which are higher than input prices, and decoding is sequential, so reasoning adds latency one token at a time.",
    },
    {
      type: "code",
      language: "text",
      code: `cost  = ((answer_tokens + reasoning_tokens) x samples / 1e6) x output_price
time  = (answer_tokens + reasoning_tokens) / decode_speed      # samples run in parallel

direct:            20 tokens  ->  fast, cheap
CoT:              320 tokens  ->  16x the output tokens
CoT x 5 samples: 1600 tokens  ->  80x the cost, ~same wall-clock time`,
      caption: "Self-consistency multiplies cost, not latency, if samples run in parallel.",
    },
    { type: "h", text: "Self-consistency, precisely" },
    {
      type: "ol",
      items: [
        "Sample **N** completions with the same prompt at a **non-zero temperature**, so the reasoning paths differ.",
        "Extract just the **final answer** from each, normalised (trim, lowercase).",
        "Return the **most common** answer. The agreement ratio doubles as a confidence signal.",
      ],
    },
    {
      type: "p",
      text: "It only helps when answers can be compared, and when errors are diverse rather than systematic. At temperature 0 all samples are the same, so voting buys nothing. If the model is consistently wrong in the same way, voting makes it confidently wrong.",
    },
    { type: "h", text: "Thinking models" },
    {
      type: "p",
      text: "Reasoning-trained models spend a separate **thinking budget** before answering. You usually control the budget rather than prompting for steps, and thinking tokens are billed as output. Practical rules: do not add a manual \"think step by step\" on top without testing it, set the smallest budget that meets your quality bar, and route easy requests to a non-thinking model (the cascade from Track 1).",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What interviewers listen for",
      text: "That you treat reasoning as a **cost-quality trade-off you measure**, not a free upgrade: where it helps, what it costs in tokens and time, how self-consistency multiplies the bill, and that you verify the final answer programmatically where you can.",
    },
    {
      type: "p",
      text: "Where the answer can be checked by code (a unit test, a calculator, a schema), check it. A cheap deterministic verifier beats more reasoning tokens.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Self-consistency: sample several reasoning paths and vote on the final answer.",
    code: `import re
from collections import Counter

PROMPT = """Solve the problem. Think step by step inside <reasoning> tags,
then give only the final answer inside <answer> tags.

<problem>
{problem}
</problem>"""


def extract_answer(reply: str) -> str | None:
    m = re.search(r"<answer>(.*?)</answer>", reply, re.S)
    return m.group(1).strip().lower() if m else None


def self_consistent(problem: str, n: int = 5):
    answers = []
    for _ in range(n):
        reply = call(                         # your SDK call
            model="claude-sonnet-5-5",
            prompt=PROMPT.format(problem=problem),
            temperature=0.8,                  # >0 so the paths actually differ
            max_tokens=800,
        )
        if (a := extract_answer(reply)) is not None:
            answers.append(a)

    if not answers:
        return None, 0.0
    winner, votes = Counter(answers).most_common(1)[0]
    return winner, votes / len(answers)       # agreement as a confidence signal`,
  },

  interview: [
    {
      question: "What is chain-of-thought prompting and why does it help?",
      answer:
        "You get the model to write intermediate reasoning steps before the final answer. Each token costs a fixed amount of computation, so a longer chain gives the model more total computation and working memory, since its own earlier tokens become context. It helps most on multi-step tasks such as arithmetic, logic and planning, and little on simple lookups or classification.",
      weakAnswer:
        "It makes the model think harder. — Hand-wavy; it does not explain the mechanism or the cost.",
      followUp: "What does it cost, and how would you decide if it is worth it?",
    },
    {
      question: "When would you avoid chain-of-thought?",
      answer:
        "When the answer is a direct read of the input, such as classification, extraction or formatting, where it adds cost and latency for no accuracy gain and gives more text that can drift. Also under tight latency budgets, and when a cheap programmatic verifier already guarantees correctness. I decide by measuring accuracy with and without it on my eval set.",
    },
    {
      question: "How does self-consistency work and what are its limits?",
      answer:
        "Sample N reasoning paths at a non-zero temperature, extract each final answer, and take the majority. The agreement ratio is a usable confidence signal. Limits: it multiplies token cost by N, it needs comparable answers, it does nothing at temperature 0, and it cannot fix a systematic error, where all paths are wrong the same way, so voting just makes it confidently wrong.",
    },
    {
      question: "Is the reasoning a model shows a faithful explanation of how it got the answer?",
      answer:
        "Not necessarily. Studies have found cases where the written chain is a plausible story that does not match what actually drove the answer, for example when a hint in the prompt changed the result but the reasoning never mentioned it. So I use reasoning for quality, not as an audit log, and I verify important outputs with independent checks.",
      followUp: "How would you build that check for a financial calculation?",
    },
    {
      question: "How do thinking or reasoning models change your approach?",
      answer:
        "Reasoning moves from the prompt to a budget I configure. I stop hand-writing 'think step by step', test whether it still adds value, set the smallest thinking budget that meets the quality bar, remember that thinking tokens bill as output, and route easy requests to a non-thinking model with a cascade. The measure is still accuracy per dollar and per second on my own eval set.",
    },
  ],

  challenges: [
    {
      id: "pe-3-quiz",
      kind: "quiz",
      title: "Checkpoint: reasoning and chain-of-thought",
      blurb: "Five questions on when reasoning helps and what it costs.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Why does chain-of-thought improve answers on multi-step problems?",
          options: [
            "It changes the model's weights for that request",
            "It gives the model more computation and working memory through its own intermediate tokens",
            "It makes the model less random",
            "It shortens the prompt",
          ],
          correctIndex: 1,
          explanation:
            "Each token is a forward pass, and earlier tokens become context. More reasoning tokens means more computation before the answer.",
        },
        {
          id: "q2",
          prompt: "Where should the reasoning go relative to the final answer?",
          options: [
            "After the answer, as justification",
            "Before the answer, so it can influence it",
            "In a separate request with no shared context",
            "It does not matter",
          ],
          correctIndex: 1,
          explanation:
            "Reasoning placed after the answer cannot affect it. Reason first, then answer.",
        },
        {
          id: "q3",
          prompt: "You run self-consistency with 5 samples in parallel and 300 reasoning tokens each. What happens to cost and latency versus one sample?",
          options: [
            "Cost 5×, latency about the same",
            "Cost 1×, latency 5×",
            "Cost 5×, latency 5×",
            "Cost and latency unchanged",
          ],
          correctIndex: 0,
          explanation:
            "Parallel samples multiply the tokens you pay for, but wall-clock time is set by the longest single sample.",
        },
        {
          id: "q4",
          prompt: "Which task is least likely to benefit from chain-of-thought?",
          options: [
            "A multi-hop word problem",
            "Planning a multi-step migration",
            "Classifying a ticket into one of four categories",
            "Debugging a logic puzzle",
          ],
          correctIndex: 2,
          explanation:
            "Classification is a direct read of the input. Reasoning adds cost and latency without much gain.",
        },
        {
          id: "q5",
          prompt: "A model's shown reasoning looks convincing. What should you conclude?",
          options: [
            "It is a faithful record of the computation",
            "It is a plausible explanation, not guaranteed to reflect the real cause, so verify important outputs independently",
            "It is always wrong",
            "It proves the answer is correct",
          ],
          correctIndex: 1,
          explanation:
            "Written reasoning can be unfaithful. Use deterministic checks where correctness matters.",
        },
      ],
    },
    {
      id: "pe-3-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: self-consistency voting",
      blurb: "The 5-sample vote costs 5× but never beats a single call. Find the line.",
      language: "python",
      lines: [
        "def self_consistent(question, n=5):",
        "    answers = []",
        "    for _ in range(n):",
        "        reply = call(model, question, temperature=0)",
        "        answers.append(extract_answer(reply))",
        "    return Counter(answers).most_common(1)[0][0]",
      ],
      buggyLine: 4,
      reasons: [
        "`most_common` returns the least common element",
        "temperature 0 makes the samples near-identical, so the vote adds cost and no diversity",
        "the loop should run n + 1 times",
        "`extract_answer` must be called after the loop",
      ],
      correctReasonIndex: 1,
      explanation:
        "Self-consistency depends on different reasoning paths. Greedy decoding at temperature 0 produces the same path every time, so you pay N times for one answer. Sample at a non-zero temperature, typically 0.5 to 1.0.",
      fix: "reply = call(model, question, temperature=0.8)   # paths must differ",
      xp: 40,
    },
    {
      id: "pe-3-code",
      kind: "code",
      title: "Code challenge: majority vote with agreement",
      blurb: "Normalise sampled answers, return the winner and how strongly the samples agreed.",
      functionName: "majorityVote",
      starter: `/**
 * Self-consistency voting.
 *
 * - Normalise each answer: String(a).trim().toLowerCase()
 * - The winner is the most common normalised answer.
 * - Ties: the answer that appeared first wins.
 * - agreement = winning count / total answers, rounded to 2 decimals.
 *
 * Return { answer, agreement }. For an empty list return { answer: null, agreement: 0 }.
 *
 * majorityVote(["A", "a", " a ", "b"]) -> { answer: "a", agreement: 0.75 }
 */
function majorityVote(answers) {
  // your code here
}`,
      tests: [
        { name: "normalises case and whitespace", args: [["A", "a", " a ", "b"]], expected: { answer: "a", agreement: 0.75 } },
        { name: "three out of five", args: [["42", "42", "41", "42", "41"]], expected: { answer: "42", agreement: 0.6 } },
        { name: "tie goes to the first seen", args: [["b", "a", "a", "b"]], expected: { answer: "b", agreement: 0.5 } },
        { name: "a single answer is unanimous", args: [["Yes"]], expected: { answer: "yes", agreement: 1 } },
        { name: "empty input", args: [[]], expected: { answer: null, agreement: 0 } },
        { name: "numbers are converted to strings", args: [[7, "7", 8]], expected: { answer: "7", agreement: 0.67 } },
      ],
      hints: [
        "Normalise first, then count occurrences. A Map keeps insertion order, which handles the tie-break.",
        "When scanning for the winner, only replace the best when a count is strictly greater.",
        "Round with Math.round(x * 100) / 100 after dividing by the total.",
      ],
      solution: `function majorityVote(answers) {
  if (answers.length === 0) return { answer: null, agreement: 0 };

  const counts = new Map();
  for (const a of answers) {
    const key = String(a).trim().toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let best = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }

  return { answer: best, agreement: Math.round((bestCount / answers.length) * 100) / 100 };
}`,
      xp: 70,
    },
  ],
};
