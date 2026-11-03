import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "evaluating-rag",
  order: 6,
  title: "Evaluating RAG",
  summary:
    "Measure retrieval and generation separately, build a test set from real questions, and know what each number means.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "Without evaluation, every RAG change is a guess, and a demo that works on five questions tells you nothing about the five hundred you have not tried. A good evaluation answers three separate questions, because they fail separately: **did we retrieve the right evidence, did the answer use it faithfully, and is the final answer correct and useful?**",
    },
    {
      type: "table",
      headers: ["Layer", "Question", "Typical metrics"],
      rows: [
        ["**Retrieval**", "Was the supporting evidence found?", "recall@k, hit rate, MRR, precision@k"],
        ["**Grounding**", "Is every claim supported by the retrieved context?", "faithfulness / groundedness rate, citation validity"],
        ["**Answer**", "Is it correct, complete and on topic?", "correctness vs a reference, answer relevance, refusal accuracy"],
        ["**System**", "Is it fast and affordable?", "latency percentiles, tokens and cost per question"],
      ],
    },
    {
      type: "calculator",
      title: "Why the stages multiply",
      inputs: [
        { key: "recall", label: "Retrieval hit rate", min: 0, max: 100, step: 1, value: 85, unit: "%" },
        { key: "faith", label: "Correct answer when the evidence is present", min: 0, max: 100, step: 1, value: 90, unit: "%" },
        { key: "refuse", label: "Correct 'not found' when evidence is absent", min: 0, max: 100, step: 1, value: 60, unit: "%" },
      ],
      outputs: [
        { label: "Correct when the answer exists in the corpus", formula: "recall / 100 * faith / 100", format: "pct" },
        { label: "Share of such questions that fail at retrieval", formula: "1 - recall / 100", format: "pct" },
        { label: "Share that fail at generation despite good retrieval", formula: "recall / 100 * (1 - faith / 100)", format: "pct" },
      ],
      note: "You cannot out-prompt a retrieval ceiling. With an 85% hit rate, the best possible answer rate is 85% even if generation were perfect.",
    },
    {
      type: "sorter",
      title: "Which layer does the metric measure?",
      prompt: "Assign each metric to the part of the system it evaluates.",
      categories: ["Retrieval", "Grounding", "Answer"],
      items: [
        { text: "Recall@5 against labelled relevant chunks", answer: 0, why: "It asks whether the right evidence appeared in the retrieved list." },
        { text: "Share of answer sentences supported by the cited context", answer: 1, why: "Faithfulness compares the answer with the context it was given." },
        { text: "Agreement with a reference answer written by an expert", answer: 2, why: "Correctness compares the final answer with the truth." },
        { text: "Mean reciprocal rank of the first relevant chunk", answer: 0, why: "It is about where evidence sits in the ranking." },
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "Building the test set" },
    {
      type: "ol",
      items: [
        "**Start from real questions**: search logs, support tickets, interviews with users. Real phrasing matters.",
        "**Label the evidence**: for each question, mark which chunks or passages contain the answer, plus a short reference answer.",
        "**Cover the hard cases**: multi-hop questions, ambiguous questions, follow-ups, questions with no answer, and questions where sources conflict.",
        "**Use synthetic generation carefully**: a model can draft questions from your documents to get volume, but have people review them, because synthetic questions tend to be easier and closer to the text than real ones.",
        "**Keep a held-out slice** you never tune against, and grow the set whenever production surprises you (Track 2).",
      ],
    },
    { type: "h", text: "Measuring faithfulness" },
    {
      type: "p",
      text: "A common approach is an **LLM judge**: give a model the retrieved context and the answer, and ask whether each claim is supported by that context, claim by claim. The crucial detail is that the judge must **see the sources**. A judge that sees only the question and answer is measuring plausibility from its own knowledge, which is not faithfulness. Judges have biases (favouring longer, more confident answers, and their own model's style), so calibrate them against human labels on a sample (Track 6).",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Do not forget the questions with no answer",
      text: "Include unanswerable questions and measure whether the system abstains. A set containing only answerable questions rewards a system that never says \"I don't know\".",
    },
    { type: "h", text: "Using the numbers" },
    {
      type: "ul",
      items: [
        "**Compare per case**, not only averages, when you change anything (Track 2).",
        "**Run the set in CI** so a retrieval or prompt change that regresses a metric is caught before release.",
        "**Track online signals** as well: thumbs up and down, citation clicks, follow-up rephrasings and escalations. They are noisy but reflect real users.",
        "**Mind statistical noise.** With 50 cases, a few-point change is a case or two. Grow the set before trusting small differences.",
        "**Add every production failure** to the set as a permanent regression test.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That RAG is evaluated in layers (retrieval, grounding, answer), that the judge must see the sources, that unanswerable questions belong in the set, that stage metrics locate the problem, and that the set comes from real questions and grows from failures.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Stage-level scores over a labelled set, so a regression points at a stage.",
    code: `def rag_scores(cases: list[dict]) -> dict:
    """Each case: retrieved (ids), gold (ids), supported (bool), correct (bool)."""
    n = len(cases)
    hits = [bool(set(c["retrieved"]) & set(c["gold"])) for c in cases]

    answerable_with_hit = [c for c, h in zip(cases, hits) if h]
    return {
        "retrieval_hit": round(sum(hits) / n, 2),
        "grounded_rate": round(sum(c["supported"] for c in cases) / n, 2),
        "correct_rate": round(sum(c["correct"] for c in cases) / n, 2),
        # How good is generation when retrieval did its job?
        "correct_given_hit": round(
            sum(c["correct"] for c in answerable_with_hit) / len(answerable_with_hit), 2
        ) if answerable_with_hit else 0.0,
    }


FAITHFULNESS_JUDGE = """You are checking an answer against its sources.
List each claim in the answer. For each, say SUPPORTED or UNSUPPORTED by the sources only.

<sources>
{sources}
</sources>

<answer>
{answer}
</answer>"""     # the judge sees the SOURCES, otherwise it measures plausibility, not faithfulness`,
  },

  interview: [
    {
      question: "How would you evaluate a RAG system?",
      answer:
        "In layers. Retrieval with recall at k and MRR against labelled relevant chunks, grounding with a faithfulness check of each claim against the retrieved context, and the final answer with correctness against references, including questions that have no answer. I build the set from real questions, keep a held-out slice, run it in CI, and add production failures to it.",
      weakAnswer:
        "Ask the model to rate its own answers. — Unreliable, and it ignores retrieval entirely.",
    },
    {
      question: "How do you measure faithfulness, and what is the common mistake?",
      answer:
        "I give a judge model the retrieved context and the answer and have it decide, claim by claim, whether the context supports each one. The common mistake is giving the judge only the question and answer, which measures how plausible the answer sounds to the judge, not whether it is supported. I also calibrate the judge against human labels because judges are biased.",
      followUp: "What biases do LLM judges have?",
    },
    {
      question: "Why include unanswerable questions in the test set?",
      answer:
        "Because abstaining is part of correct behaviour. A set with only answerable questions cannot detect a system that guesses instead of saying it does not know. I measure both refusal accuracy on unanswerable questions and over-refusal on answerable ones.",
    },
    {
      question: "Retrieval hit rate is 80% and the answer is correct 72% of the time overall. What does that tell you?",
      answer:
        "The ceiling for questions that need retrieval is about 80%, so the biggest lever is retrieval, not the prompt. The ratio 72 over 80, about 90%, suggests generation is mostly doing its job when evidence is present. I would look at the 20% of retrieval misses first, using traces to see whether they are ingestion, query or ranking problems.",
    },
    {
      question: "How do you create an evaluation set when you have no labelled data?",
      answer:
        "Start with real questions from logs or stakeholders, even a few dozen, and label the supporting passages by hand. Use a model to draft more questions from the documents for volume, but have people review them since synthetic questions skew easy. Include no-answer and multi-hop cases, hold out a slice, and keep adding failures from production.",
    },
  ],

  challenges: [
    {
      id: "rag-6-quiz",
      kind: "quiz",
      title: "Checkpoint: evaluating RAG",
      blurb: "Five questions on layered evaluation.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Why evaluate retrieval and generation separately?",
          options: [
            "It is required by vector databases",
            "They fail independently, and separate metrics show which one to fix",
            "Retrieval metrics are cheaper",
            "Generation cannot be evaluated",
          ],
          correctIndex: 1,
          explanation:
            "An end-to-end score cannot tell you whether to change retrieval or the prompt.",
        },
        {
          id: "q2",
          prompt: "What must a faithfulness judge be given to measure faithfulness?",
          options: [
            "Only the question",
            "The retrieved context and the answer",
            "Only the final answer",
            "A reference answer only",
          ],
          correctIndex: 1,
          explanation:
            "Faithfulness is support by the context. Without the sources the judge measures plausibility.",
        },
        {
          id: "q3",
          prompt: "A test set contains only answerable questions. What can it not reveal?",
          options: [
            "Retrieval misses",
            "A system that guesses instead of abstaining when the answer is absent",
            "Latency",
            "Citation formats",
          ],
          correctIndex: 1,
          explanation:
            "Unanswerable questions test abstention. Without them, guessing looks free.",
        },
        {
          id: "q4",
          prompt: "Retrieval hit rate is 70%. Roughly what is the best achievable answer rate on answerable questions?",
          options: [
            "100%, if the prompt is good",
            "About 70%, since answers cannot use evidence that was never retrieved",
            "50%",
            "It depends only on the model size",
          ],
          correctIndex: 1,
          explanation:
            "Retrieval sets a ceiling. Better prompting cannot recover missing evidence.",
        },
        {
          id: "q5",
          prompt: "Why review synthetic questions generated from your documents?",
          options: [
            "They are always perfect",
            "They tend to be easier and closer to the document wording than real user questions",
            "They cannot be graded",
            "They duplicate the training data",
          ],
          correctIndex: 1,
          explanation:
            "Synthetic questions copy the document's phrasing. Real questions are messier, so people should review and mix in real ones.",
        },
      ],
    },
    {
      id: "rag-6-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a faithfulness check",
      blurb: "Answers that are fluent but unsupported keep getting full marks. Find the line.",
      language: "python",
      lines: [
        "def faithfulness(answer, question):",
        "    verdict = judge_llm(f'Question: {question}\\nAnswer: {answer}\\nIs the answer correct?')",
        "    return verdict == 'yes'",
      ],
      buggyLine: 2,
      reasons: [
        "the judge should be asked in a different language",
        "the judge never sees the retrieved sources, so it rates plausibility from its own knowledge rather than whether the answer is supported by the context",
        "the verdict must be compared with a number",
        "the question must be removed",
      ],
      correctReasonIndex: 1,
      explanation:
        "Faithfulness is defined against the context the answer was generated from. A judge without the sources cannot check support, so it rewards fluent, plausible text, including hallucinations that happen to sound right.",
      fix: "judge_llm(FAITHFULNESS_JUDGE.format(sources=sources, answer=answer))   # judge sees the context",
      xp: 40,
    },
    {
      id: "rag-6-code",
      kind: "code",
      title: "Code challenge: stage-level RAG scores",
      blurb: "Turn labelled results into retrieval, grounding and correctness rates.",
      functionName: "ragScores",
      starter: `/**
 * Each case: { retrieved: string[], gold: string[], supported: boolean, correct: boolean }
 *
 * Return rates rounded to 2 decimals:
 *   retrievalHit:    share of cases where retrieved shares at least one id with gold
 *   groundedRate:    share of cases with supported === true
 *   correctRate:     share of cases with correct === true
 *   correctGivenHit: among cases with a retrieval hit, the share with correct === true
 *                    (0 when there are no hits)
 *
 * For an empty list return all four as 0.
 */
function ragScores(cases) {
  // your code here
}`,
      tests: [
        {
          name: "a small mixed set",
          args: [[
            { retrieved: ["a", "b"], gold: ["a"], supported: true, correct: true },
            { retrieved: ["c"], gold: ["d"], supported: false, correct: false },
            { retrieved: ["e", "f"], gold: ["f"], supported: true, correct: false },
            { retrieved: ["g"], gold: ["g"], supported: true, correct: true },
          ]],
          expected: { retrievalHit: 0.75, groundedRate: 0.75, correctRate: 0.5, correctGivenHit: 0.67 },
        },
        {
          name: "no retrieval hits",
          args: [[{ retrieved: ["x"], gold: ["y"], supported: false, correct: false }]],
          expected: { retrievalHit: 0, groundedRate: 0, correctRate: 0, correctGivenHit: 0 },
        },
        {
          name: "everything works",
          args: [[
            { retrieved: ["a"], gold: ["a"], supported: true, correct: true },
            { retrieved: ["b"], gold: ["b"], supported: true, correct: true },
          ]],
          expected: { retrievalHit: 1, groundedRate: 1, correctRate: 1, correctGivenHit: 1 },
        },
        { name: "empty input", args: [[]], expected: { retrievalHit: 0, groundedRate: 0, correctRate: 0, correctGivenHit: 0 } },
        {
          name: "correct without a hit counts only in the overall rate",
          args: [[
            { retrieved: ["x"], gold: ["y"], supported: false, correct: true },
            { retrieved: ["a"], gold: ["a"], supported: true, correct: false },
          ]],
          expected: { retrievalHit: 0.5, groundedRate: 0.5, correctRate: 0.5, correctGivenHit: 0 },
        },
      ],
      hints: [
        "A retrieval hit means retrieved and gold share at least one id. Compute that flag per case first.",
        "Rates are counts divided by the total number of cases. correctGivenHit divides by the number of hits instead.",
        "Guard the empty list and the zero-hit case so you never divide by zero. Round with Math.round(x * 100) / 100.",
      ],
      solution: `function ragScores(cases) {
  const zero = { retrievalHit: 0, groundedRate: 0, correctRate: 0, correctGivenHit: 0 };
  if (cases.length === 0) return zero;

  const round = (x) => Math.round(x * 100) / 100;
  const hit = cases.map((c) => c.retrieved.some((id) => c.gold.includes(id)));
  const hits = hit.filter(Boolean).length;
  const correctWithHit = cases.filter((c, i) => hit[i] && c.correct).length;

  return {
    retrievalHit: round(hits / cases.length),
    groundedRate: round(cases.filter((c) => c.supported).length / cases.length),
    correctRate: round(cases.filter((c) => c.correct).length / cases.length),
    correctGivenHit: hits === 0 ? 0 : round(correctWithHit / hits),
  };
}`,
      xp: 70,
    },
  ],
};
