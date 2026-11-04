import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "hallucination-detection-and-verification",
  order: 6,
  title: "Hallucination Detection & Answer Verification",
  summary:
    "RAG reduces hallucinations; it does not remove them. Learn the kinds of unsupported answers, how to check an answer against its evidence, and what to do when the check fails.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "A RAG answer can be wrong even when retrieval worked. The model can add a fact the passages never state, contradict them, or cite a passage that does not support the claim. **Detection** means checking the answer *against the evidence it was given*, then deciding what to do.",
    },
    {
      type: "sorter",
      title: "Which kind of failure is it?",
      prompt: "Classify each answer problem.",
      categories: ["Unsupported claim", "Contradiction", "Bad citation"],
      items: [
        { text: "The answer says shipping is free over $50. No retrieved passage mentions a threshold.", answer: 0, why: "A claim with no support in the evidence." },
        { text: "The passage says 24 days of leave. The answer says 18 days.", answer: 1, why: "The answer disagrees with the evidence it was given." },
        { text: "The answer cites [3], but passage 3 is about a different topic.", answer: 2, why: "The citation does not support the claim it is attached to." },
        { text: "The answer adds that the policy was updated last March. No source says so.", answer: 0, why: "An invented detail that sounds plausible but has no evidence." },
      ],
    },
    {
      type: "stepper",
      title: "Claim-level verification",
      steps: [
        { label: "Split the answer into claims", detail: "Break the answer into small, checkable statements, such as one fact per sentence.", items: ["claim 1: 24 days", "claim 2: after 2 years", "claim 3: paid leave"], mark: [0, 1, 2] },
        { label: "Find evidence for each claim", detail: "For every claim, take the best-matching retrieved passage (or the cited one).", items: ["claim 1 -> passage 2", "claim 2 -> passage 2", "claim 3 -> passage 2"], mark: [0, 1, 2] },
        { label: "Judge: supported, contradicted, or unsupported", detail: "A verifier checks whether the passage entails the claim. This can be an NLI model, an LLM judge, or for numbers and names, a simple deterministic check.", items: ["supported", "supported", "unsupported"], mark: [2] },
        { label: "Score the answer", detail: "Faithfulness is supported claims divided by total claims. Here two of three claims are supported, so about 67%.", items: ["2 / 3 = 67%"], mark: [0] },
        { label: "Act on the score", detail: "Above the threshold: return it. Below: regenerate with stricter instructions, remove the unsupported claim, flag it as uncertain, abstain, or route to a human.", items: ["pass", "retry", "abstain"], mark: [0, 1, 2] },
      ],
      caption: "Check claims against evidence, not the whole answer against a feeling.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Detection methods, cheapest first" },
    {
      type: "table",
      headers: ["Method", "How it works", "Good at", "Weakness"],
      rows: [
        ["**Deterministic checks**", "numbers, dates, names and IDs in the answer must appear in the context", "invented figures, wrong amounts", "cannot judge meaning or paraphrase"],
        ["**Citation verification**", "check that each cited passage actually entails its claim", "wrong or decorative citations", "needs a good verifier"],
        ["**NLI or LLM verifier**", "judge each claim against the passages as supported, contradicted or unsupported", "subtle unsupported or contradicted claims", "added latency and cost; the verifier can be wrong"],
        ["**Self-consistency**", "sample several answers and look for disagreement", "unstable guesses", "costs several generations; agreement does not prove truth"],
        ["**Retrieval confidence**", "low retrieval scores or an empty result set mean the evidence is weak", "questions the corpus cannot answer", "a coarse signal"],
      ],
    },
    {
      type: "calculator",
      title: "Faithfulness and a pass threshold",
      inputs: [
        { key: "total", label: "Claims in the answer", min: 1, max: 20, step: 1, value: 8 },
        { key: "supported", label: "Claims the verifier marks as supported", min: 0, max: 20, step: 1, value: 6 },
        { key: "threshold", label: "Required faithfulness", min: 50, max: 100, step: 5, value: 90, unit: "%" },
      ],
      outputs: [
        { label: "Faithfulness", formula: "Math.min(supported, total) / total", format: "pct" },
        { label: "Unsupported claims", formula: "Math.max(total - supported, 0)", format: "int" },
        { label: "Passes the threshold? (1 = yes, 0 = no)", formula: "(Math.min(supported, total) / total) >= (threshold / 100) ? 1 : 0", format: "int" },
      ],
      note: "A high threshold catches more hallucinations and rejects more good answers. Choose it from labelled examples, and decide in advance what happens on a failure.",
    },
    { type: "h", text: "What to do when the check fails" },
    {
      type: "ul",
      items: [
        "**Regenerate** with a stricter grounding instruction and fewer, better passages.",
        "**Remove** the unsupported sentences and return the rest.",
        "**Flag uncertainty** to the user and show sources prominently.",
        "**Abstain** with an honest message and an alternative such as contacting support.",
        "**Route to a human** for high-stakes domains, and log the case for the eval set.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Verification and streaming pull in opposite directions",
      text: "You cannot verify text the user has already seen. Either verify sentence by sentence before showing each one, buffer short answers, or stream first and flag or retract afterwards. Pick based on the risk of the domain.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"how do you detect hallucinations in RAG?\"",
      text: "Check claims against the evidence: deterministic checks for numbers and names, a verifier for entailment, citation checks, retrieval-confidence gating, then a defined action. Measure it with a test set that includes unanswerable questions, track a faithfulness score in production, and be explicit about the added latency.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A cheap deterministic number check, and a faithfulness score from a claim verifier.",
    code: `import re

def numbers_in(text: str) -> set[str]:
    text = re.sub(r"(?<=\\d),(?=\\d)", "", text)        # 1,200 -> 1200
    return set(re.findall(r"\\d+(?:\\.\\d+)?", text))


def unsupported_numbers(answer: str, context: str) -> list[str]:
    """Numbers the answer states that never appear in the retrieved context."""
    allowed = numbers_in(context)
    seen, out = set(), []
    for n in re.findall(r"\\d+(?:\\.\\d+)?", re.sub(r"(?<=\\d),(?=\\d)", "", answer)):
        if n not in allowed and n not in seen:
            seen.add(n)
            out.append(n)
    return out


def faithfulness(claims: list[str], context: str, verify) -> float:
    if not claims:
        return 1.0
    supported = sum(1 for claim in claims if verify(claim, context) == "supported")
    return supported / len(claims)            # divide by CLAIMS, not by passages


def guarded_answer(question, passages, generate, split_claims, verify, threshold=0.9):
    context = "\\n".join(passages)
    answer = generate(question, passages)
    if unsupported_numbers(answer, context):
        return "I could not verify that figure in the documents."
    if faithfulness(split_claims(answer), context, verify) < threshold:
        return "I am not confident this is fully supported by the documents."
    return answer`,
  },

  interview: [
    {
      question: "Why does RAG still hallucinate?",
      answer:
        "Retrieval can return irrelevant or incomplete passages, and the model can still add details from its own knowledge, misread the evidence, or attach a citation to a claim the passage does not support. RAG shifts the odds by supplying evidence. It does not make the model incapable of inventing.",
      weakAnswer:
        "It only hallucinates when the vector database is wrong. — Generation can also fail with perfect retrieval.",
    },
    {
      question: "How do you measure faithfulness for a RAG answer?",
      answer:
        "Split the answer into atomic claims, judge each against the retrieved passages as supported, contradicted or unsupported with a verifier, and divide supported claims by total claims. I validate the verifier against human labels, and test on a set that includes unanswerable questions to check the system abstains.",
    },
    {
      question: "How would you catch invented numbers cheaply?",
      answer:
        "A deterministic check: extract numbers, dates and identifiers from the answer and require each to appear in the retrieved context, after normalising formats such as thousand separators. It is fast, free and catches a common, costly failure. It cannot judge meaning, so I combine it with a verifier for the rest.",
    },
    {
      question: "A verifier adds 800 ms to every answer. How do you decide whether it is worth it?",
      answer:
        "By the cost of a wrong answer in this product. In a legal or medical context, correctness outweighs latency, so I verify. In casual chat I might verify only when retrieval confidence is low or the answer contains numbers. I would measure how many hallucinations it catches against the false rejections and the latency, and consider a smaller, faster verifier.",
    },
    {
      question: "How do you reconcile answer verification with streaming responses?",
      answer:
        "Verification needs the text, streaming shows it early. Options are to verify and release sentence by sentence, buffer short answers, or stream immediately and flag or retract if a later check fails. For high-risk domains I prefer to verify before showing. For low-risk ones I stream and log the verification result for monitoring.",
    },
  ],

  challenges: [
    {
      id: "ar-6-quiz",
      kind: "quiz",
      title: "Checkpoint: hallucination detection",
      blurb: "Five questions on verifying answers against evidence.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "The passage says 24 days of leave. The answer says 18 days. What is this?",
          options: ["A bad citation", "A contradiction of the evidence", "An unsupported claim only", "A formatting error"],
          correctIndex: 1,
          explanation:
            "The answer disagrees with the evidence it was given.",
        },
        {
          id: "q2",
          prompt: "How is faithfulness usually computed?",
          options: [
            "Supported claims divided by the number of retrieved passages",
            "Supported claims divided by the total number of claims in the answer",
            "The length of the answer divided by the prompt",
            "Retrieval score times temperature",
          ],
          correctIndex: 1,
          explanation:
            "It is the share of the answer's own claims that the evidence supports.",
        },
        {
          id: "q3",
          prompt: "Which check is cheapest and catches invented figures?",
          options: [
            "Ask the user",
            "Confirm that every number in the answer appears in the retrieved context",
            "Raise the temperature",
            "Add more chunks",
          ],
          correctIndex: 1,
          explanation:
            "A deterministic number check is fast and free, though it cannot judge meaning.",
        },
        {
          id: "q4",
          prompt: "What does self-consistency checking do?",
          options: [
            "Samples several answers and looks for disagreement as a warning sign",
            "Guarantees the answer is true if samples agree",
            "Removes the need for retrieval",
            "Rewrites the query",
          ],
          correctIndex: 0,
          explanation:
            "Disagreement suggests an unstable guess. Agreement is not proof, since a model can be consistently wrong.",
        },
        {
          id: "q5",
          prompt: "Why do verification and streaming conflict?",
          options: [
            "Streaming uses a different model",
            "You cannot check text the user has already seen, so you must verify before showing or be ready to flag and retract",
            "Verification cannot read tokens",
            "Streaming removes citations",
          ],
          correctIndex: 1,
          explanation:
            "The trade-off depends on how risky a wrong answer is in your product.",
        },
      ],
    },
    {
      id: "ar-6-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: the faithfulness score",
      blurb: "Faithfulness sometimes comes out above 100%. Find the line.",
      language: "python",
      lines: [
        "def faithfulness(claims, verify, context):",
        "    supported = sum(1 for c in claims if verify(c, context))",
        "    return supported / len(context)",
      ],
      buggyLine: 3,
      reasons: [
        "sum cannot be used with a generator",
        "it divides by the number of context passages instead of the number of claims, so the score is meaningless and can exceed 1",
        "verify must be called with the answer, not a claim",
        "the function should return an integer",
      ],
      correctReasonIndex: 1,
      explanation:
        "Faithfulness is supported claims over total claims. The denominator must be the answer's claims, and an empty list needs a defined result.",
      fix: "return supported / len(claims) if claims else 1.0",
      xp: 40,
    },
    {
      id: "ar-6-code",
      kind: "code",
      title: "Code challenge: numbers the evidence does not support",
      blurb: "List the numbers in an answer that never appear in the context.",
      functionName: "unsupportedNumbers",
      starter: `/**
 * unsupportedNumbers(answer, context)
 *
 * Find every number in 'answer' that does not appear as a number in 'context'.
 * Numbers are digits with an optional decimal part, like 24 or 4.5.
 * Treat thousand separators as absent: 1,200 means 1200.
 *
 * Return the unsupported numbers as strings, in the order they first appear
 * in the answer, with no duplicates.
 */
function unsupportedNumbers(answer, context) {
  // your code here
}`,
      tests: [
        { name: "all supported", args: ["Employees get 24 days after 2 years", "Employees completing 2 years receive 24 days of paid leave"], expected: [] },
        { name: "one invented number", args: ["Employees get 30 days", "Employees receive 24 days"], expected: ["30"] },
        { name: "thousand separators", args: ["The fee is 1,200 dollars", "fee: 1200 dollars"], expected: [] },
        { name: "no duplicates, keeps order", args: ["5 and 5 and 7 and 9", "only 5 is stated"], expected: ["7", "9"] },
        { name: "decimals", args: ["The rate is 4.5%", "rate 4.5 percent"], expected: [] },
        { name: "no numbers in the answer", args: ["Yes, that is allowed", "Allowed after 2 years"], expected: [] },
      ],
      hints: [
        "Normalise both texts with .replace(/(\\d),(?=\\d)/g, '$1') to remove thousand separators.",
        "Extract numbers with text.match(/\\d+(?:\\.\\d+)?/g) || [].",
        "Put the context numbers in a Set, then keep answer numbers not in it, skipping ones you already added.",
      ],
      solution: `function unsupportedNumbers(answer, context) {
  const clean = (t) => t.replace(/(\\d),(?=\\d)/g, "$1");
  const find = (t) => clean(t).match(/\\d+(?:\\.\\d+)?/g) || [];
  const allowed = new Set(find(context));
  const out = [];
  for (const n of find(answer)) {
    if (!allowed.has(n) && !out.includes(n)) out.push(n);
  }
  return out;
}`,
      xp: 70,
    },
  ],
};
