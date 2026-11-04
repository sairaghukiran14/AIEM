import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "corrective-self-and-agentic-rag",
  order: 4,
  title: "Corrective, Self-RAG & Agentic RAG",
  summary:
    "A plain pipeline cannot tell that its own retrieval failed. These patterns add a check: grade what was retrieved, act on the grade, and let the system decide when and how much to retrieve.",
  minutes: 16,

  concept: [
    {
      type: "p",
      text: "In a standard pipeline, bad retrieval produces a confident wrong answer, because nothing in the flow ever asks *was this evidence any good?* The patterns in this lesson add that question and a response to the answer.",
    },
    {
      type: "table",
      headers: ["Pattern", "Core idea", "How it decides"],
      rows: [
        ["**Corrective RAG (CRAG)**", "grade the retrieved documents, then act: use them, refine them, or throw them away and look elsewhere", "an evaluator scores relevance against thresholds"],
        ["**Self-RAG**", "the model itself learns to decide *whether* to retrieve and to critique its own output for relevance and support", "special reflection tokens produced by a model trained for it"],
        ["**Agentic RAG**", "retrieval is a tool in an agent loop; the agent plans, searches, reads, and searches again until it is satisfied", "the agent's own reasoning, bounded by limits"],
      ],
    },
    {
      type: "sorter",
      title: "Which pattern is being described?",
      prompt: "Match each description to a pattern.",
      categories: ["Corrective (CRAG)", "Self-RAG", "Agentic RAG"],
      items: [
        { text: "A grader scores the retrieved documents; if all are poor, fall back to a web search", answer: 0, why: "Grade, then take a corrective action, is the CRAG idea." },
        { text: "The model emits tokens saying whether retrieval is needed and whether its answer is supported", answer: 1, why: "Self-RAG trains reflection into the model itself." },
        { text: "The system calls a search tool several times, choosing queries as it learns more", answer: 2, why: "Retrieval as a tool inside a planning loop is agentic." },
        { text: "Low-confidence results trigger a query rewrite and one more retrieval round", answer: 0, why: "A corrective retry driven by a relevance grade." },
      ],
    },
    {
      type: "stepper",
      title: "The corrective RAG flow",
      steps: [
        { label: "Retrieve", detail: "Run the normal search and get candidate passages.", items: ["candidates"], mark: [0] },
        { label: "Grade", detail: "A relevance grader (often a small, fast model) scores each passage against the question, from 0 to 1.", items: ["0.82", "0.41", "0.12"], mark: [0] },
        { label: "Decide", detail: "Compare the best score with two thresholds. At or above the upper one: use the passages. Below the lower one: they are useless. Between: they are ambiguous.", items: ["upper 0.7", "lower 0.3"], mark: [0, 1] },
        { label: "Act", detail: "Use: keep the good passages, drop the poor ones. Ambiguous: rewrite the query and retrieve again. Incorrect: switch source, such as a web search, or abstain.", items: ["use", "refine", "fall back"], mark: [0, 1, 2] },
        { label: "Generate, with a limit", detail: "Answer from the corrected evidence. Cap the retries so a question with no answer cannot loop forever.", items: ["max rounds = 2"], mark: [0] },
      ],
      caption: "The key addition is a graded decision, not another model call for its own sake.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Designing the retrieval grader" },
    {
      type: "ul",
      items: [
        "**Use the cheapest model that is accurate enough.** A small model or a cross-encoder scoring (question, passage) is usually enough, and it runs on every request.",
        "**Calibrate thresholds on labelled data.** Choose the upper and lower thresholds from your eval set, not from a guess, and recheck when the corpus or model changes.",
        "**Grading can be wrong in both directions.** Discarding a good passage hurts recall. Keeping a bad one hurts precision. Measure both.",
        "**Always have an abstain path.** If nothing relevant exists, saying so beats a fluent invention (Track 4, lesson 4).",
      ],
    },
    {
      type: "calculator",
      title: "What do the extra checks cost on average?",
      inputs: [
        { key: "baseMs", label: "Plain pipeline latency", min: 1000, max: 8000, step: 500, value: 3000, unit: "ms" },
        { key: "gradeMs", label: "Grader call (every request)", min: 100, max: 2000, step: 100, value: 600, unit: "ms" },
        { key: "retryPct", label: "Share of requests that retry", min: 0, max: 100, step: 5, value: 20, unit: "%" },
        { key: "retryMs", label: "Extra time per retry (rewrite, retrieve, regrade)", min: 500, max: 5000, step: 500, value: 2000, unit: "ms" },
      ],
      outputs: [
        { label: "Average latency", formula: "baseMs + gradeMs + (retryPct / 100) * retryMs", format: "ms" },
        { label: "Worst case with one retry", formula: "baseMs + gradeMs + retryMs", format: "ms" },
        { label: "Average increase over plain", formula: "(gradeMs + (retryPct / 100) * retryMs) / baseMs", format: "pct" },
      ],
      note: "The grader runs on everything, so keep it fast. The retry cost is paid only by the minority that needs it, which is the point.",
    },
    { type: "h", text: "Agentic RAG, with brakes" },
    {
      type: "p",
      text: "In agentic RAG the model decides when to call retrieval, with what query, and whether it has enough. That flexibility is also the risk: loops that never end, repeated identical searches, ballooning context and cost. Apply the controls from Track 5: a **maximum number of steps**, **repeat detection**, a **token and time budget**, and a final answer path that says what could not be found.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "More loops are not more truth",
      text: "A retry loop without a bound turns a missing document into an infinite, expensive search. Every corrective or agentic loop needs a hard limit and a defined exit.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"how would you make RAG more reliable?\"",
      text: "Add a verification step the pipeline lacks: grade retrieval, act on the grade (use, refine, fall back), cap the retries, abstain when evidence is missing, then measure faithfulness and the added latency on an eval set. Mention that Self-RAG needs a specially trained model, while a prompted grader approximates it.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A bounded corrective loop: grade, act, retry at most twice, abstain if needed.",
    code: `def grade_action(scores: list[float], upper: float = 0.7, lower: float = 0.3) -> str:
    best = max(scores, default=0.0)
    if best >= upper:
        return "use"
    if best < lower:
        return "fallback"
    return "refine"


def corrective_answer(question, retrieve, grade, rewrite, web_search, llm, max_rounds: int = 2):
    query = question
    for round_ in range(max_rounds + 1):
        docs = retrieve(query)
        scores = [grade(question, d) for d in docs]
        action = grade_action(scores)

        if action == "use":
            good = [d for d, s in zip(docs, scores) if s >= 0.3]     # drop the poor ones
            return llm(question, good)

        if action == "fallback":
            docs = web_search(question)                              # a different source
            return llm(question, docs) if docs else "I could not find a reliable answer."

        query = rewrite(query)                                       # refine and try again

    return "I could not find a reliable answer."                      # bounded: always exits`,
  },

  interview: [
    {
      question: "What is corrective RAG?",
      answer:
        "Corrective RAG adds an evaluation step after retrieval. A grader scores the retrieved documents for relevance, and the result chooses an action: use the good documents, refine the query and retrieve again if the results are ambiguous, or switch to another source such as web search if they are poor. It stops a pipeline from confidently answering from bad evidence.",
      weakAnswer:
        "It corrects the answer after generation. — The correction happens on the retrieval, before generation.",
    },
    {
      question: "How is Self-RAG different from corrective RAG?",
      answer:
        "Corrective RAG is a pipeline-level wrapper: an external grader evaluates retrieval and the system acts on it. Self-RAG trains the language model itself to emit reflection tokens that decide whether to retrieve at all and to critique whether passages are relevant and the answer is supported. Self-RAG needs a specially trained model, while corrective RAG can wrap any model.",
    },
    {
      question: "What is agentic RAG and what controls does it need?",
      answer:
        "Retrieval becomes a tool in an agent loop, so the model plans queries, reads results and searches again until it judges the evidence sufficient. It is powerful for multi-part questions. It needs a hard step limit, repeat-call detection, token and time budgets, and an explicit path for reporting what it could not find, otherwise it can loop and burn cost.",
    },
    {
      question: "What are the risks of using an LLM as the retrieval grader?",
      answer:
        "It adds latency and cost to every request, it can be wrong, and it can be inconsistent. A false negative discards a useful passage and a false positive keeps a harmful one. I would use a small model or cross-encoder, calibrate thresholds on labelled examples, measure the grader's own precision and recall, and keep an abstain path.",
    },
    {
      question: "Your corrective loop sometimes runs 20 times on certain questions. What is wrong and what is the fix?",
      answer:
        "There is no bound, so questions with no answer in the corpus keep failing the grade and rewriting forever. I would add a maximum number of rounds, detect repeated or near-identical rewrites, and end with a defined fallback: another source or an honest statement that the answer was not found. I would log round counts to see how often it triggers.",
    },
  ],

  challenges: [
    {
      id: "ar-4-quiz",
      kind: "quiz",
      title: "Checkpoint: corrective and agentic RAG",
      blurb: "Five questions on self-checking retrieval patterns.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What does the grader in corrective RAG evaluate?",
          options: [
            "The grammar of the final answer",
            "How relevant the retrieved documents are to the question",
            "The length of the prompt",
            "The user's intent only",
          ],
          correctIndex: 1,
          explanation:
            "The grade of the retrieved evidence decides whether to use it, refine the query, or look elsewhere.",
        },
        {
          id: "q2",
          prompt: "The best retrieval score is between the lower and upper thresholds. What does corrective RAG usually do?",
          options: [
            "Answer immediately",
            "Refine or rewrite the query and retrieve again, within a limit",
            "Delete the index",
            "Increase the temperature",
          ],
          correctIndex: 1,
          explanation:
            "Ambiguous results trigger a refinement round. Poor results trigger a fallback source or an abstention.",
        },
        {
          id: "q3",
          prompt: "What distinguishes Self-RAG?",
          options: [
            "It uses a graph database",
            "A model is trained to emit reflection signals about when to retrieve and whether outputs are supported",
            "It requires no retrieval",
            "It only works with images",
          ],
          correctIndex: 1,
          explanation:
            "Self-RAG builds the critique into the model, unlike an external grader wrapped around any model.",
        },
        {
          id: "q4",
          prompt: "Which control is essential for any loop-based RAG design?",
          options: [
            "A larger context window",
            "A hard limit on rounds or steps, plus a defined exit",
            "A higher temperature",
            "More chunks per query",
          ],
          correctIndex: 1,
          explanation:
            "Without a bound, a question with no available answer loops forever and costs money.",
        },
        {
          id: "q5",
          prompt: "Why use a small model or cross-encoder as the grader?",
          options: [
            "It is more creative",
            "The grader runs on every request, so it must be fast and cheap while accurate enough",
            "It removes the need for thresholds",
            "It stores the documents",
          ],
          correctIndex: 1,
          explanation:
            "A slow, expensive grader taxes every query, including the ones that did not need correcting.",
        },
      ],
    },
    {
      id: "ar-4-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: the endless retry",
      blurb: "A few questions hang for minutes and run up a large bill. Find the line.",
      language: "python",
      lines: [
        "def corrective_answer(question, retrieve, grade, rewrite, llm):",
        "    query = question",
        "    while True:",
        "        docs = retrieve(query)",
        "        if grade(question, docs) >= 0.7:",
        "            return llm(question, docs)",
        "        query = rewrite(query)",
      ],
      buggyLine: 3,
      reasons: [
        "the loop should use a for statement with range",
        "there is no maximum number of rounds, so a question with no good evidence retries forever",
        "grade must be called before retrieve",
        "rewrite should never be used in a loop",
      ],
      correctReasonIndex: 1,
      explanation:
        "Corrective loops need a hard bound and a fallback. Otherwise the worst case is unbounded latency and cost.",
      fix: "for _ in range(max_rounds):   # then fall back or abstain",
      xp: 40,
    },
    {
      id: "ar-4-code",
      kind: "code",
      title: "Code challenge: the corrective decision",
      blurb: "Turn retrieval relevance scores into use, refine or fallback.",
      functionName: "gradeAction",
      starter: `/**
 * gradeAction(scores, upper, lower)
 *
 *   scores: relevance scores (0 to 1) of the retrieved documents
 *   upper:  threshold at or above which the retrieval is good enough
 *   lower:  threshold below which the retrieval is useless
 *
 * Look at the BEST score:
 *   best >= upper  -> "use"
 *   best <  lower  -> "fallback"
 *   otherwise      -> "refine"
 * An empty list has no evidence at all, so return "fallback".
 */
function gradeAction(scores, upper, lower) {
  // your code here
}`,
      tests: [
        { name: "good evidence", args: [[0.9, 0.2], 0.7, 0.3], expected: "use" },
        { name: "ambiguous", args: [[0.5, 0.4], 0.7, 0.3], expected: "refine" },
        { name: "poor evidence", args: [[0.1, 0.2], 0.7, 0.3], expected: "fallback" },
        { name: "no results", args: [[], 0.7, 0.3], expected: "fallback" },
        { name: "upper is inclusive", args: [[0.7], 0.7, 0.3], expected: "use" },
        { name: "lower is exclusive", args: [[0.3], 0.7, 0.3], expected: "refine" },
      ],
      hints: [
        "Find the best score with Math.max(...scores), but handle the empty list first.",
        "Check the upper threshold first, then the lower one.",
        "Use >= for upper and < for lower.",
      ],
      solution: `function gradeAction(scores, upper, lower) {
  if (scores.length === 0) return "fallback";
  const best = Math.max(...scores);
  if (best >= upper) return "use";
  if (best < lower) return "fallback";
  return "refine";
}`,
      xp: 70,
    },
  ],
};
