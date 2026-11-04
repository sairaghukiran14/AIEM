import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "rag-architectures-naive-to-modular",
  order: 3,
  title: "RAG Architectures: Naive, Advanced, Modular & Adaptive",
  summary:
    "RAG is a family of designs, not one pipeline. Learn what separates naive from advanced from modular RAG, and how a router sends each question down the cheapest path that can answer it.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "Interviewers say \"naive RAG\", \"advanced RAG\" and \"modular RAG\" as if they were products. They are **levels of design**. Knowing what each adds, and what each costs, lets you justify an architecture instead of reciting a buzzword.",
    },
    {
      type: "table",
      headers: ["Design", "Shape", "Adds", "Costs"],
      rows: [
        ["**Naive RAG**", "embed the question, take the top k, stuff them in a prompt, generate", "simplest thing that works", "weak on ambiguous queries, noisy context, no checks"],
        ["**Advanced RAG**", "naive plus work *before* retrieval (rewrite, expand, route), *during* it (hybrid search, filters) and *after* it (rerank, compress, deduplicate, order)", "much better precision and answer quality", "more latency, more components to tune"],
        ["**Modular RAG**", "the same parts as interchangeable modules behind interfaces, composed into flows with branches and loops", "swap or add a component without rewriting the system", "more design effort; needs a clear orchestrator and good tracing"],
        ["**Adaptive RAG**", "a router chooses the path per query: no retrieval, one step, or several", "spends effort only where the question needs it", "a bad router sends questions down the wrong path"],
      ],
    },
    {
      type: "sorter",
      title: "Which architecture is this?",
      prompt: "Classify each description.",
      categories: ["Naive", "Advanced", "Modular or Adaptive"],
      items: [
        { text: "Embed the question, take the top 3 chunks, put them in the prompt", answer: 0, why: "A single retrieve-then-generate pass with no extra stages." },
        { text: "Rewrite the query, run hybrid search, rerank, then compress the context", answer: 1, why: "The same linear flow, strengthened before, during and after retrieval." },
        { text: "A router sends greetings to the model directly and comparisons to a multi-step flow", answer: 2, why: "Choosing the path per question is adaptive routing." },
        { text: "Swap the reranker for a different one with a one-line config change", answer: 2, why: "Components behind interfaces are the point of modular design." },
      ],
    },
    {
      type: "stepper",
      title: "An adaptive router at work",
      steps: [
        { label: "Question arrives", detail: "The router looks at the question before any retrieval happens. It can be rules, a small classifier, or a model call.", items: ["question", "router"], mark: [1] },
        { label: "Chit-chat: answer directly", detail: "`Thanks, that helps!` needs no documents. Skipping retrieval saves latency and avoids injecting irrelevant text.", items: ["route: direct", "no retrieval"], mark: [0] },
        { label: "Simple fact: one retrieval", detail: "`What is our refund window?` runs the standard advanced pipeline once: rewrite, hybrid search, rerank, generate.", items: ["route: single", "1 retrieval"], mark: [0] },
        { label: "Complex: multi-step", detail: "`Compare the refund rules for UK and EU orders` is decomposed into sub-questions, each retrieved separately, then combined.", items: ["route: multi_step", "2 sub-queries"], mark: [0] },
        { label: "Log the decision", detail: "Record which route was taken. Wrong routes show up as a pattern in failing eval cases.", items: ["route logged"], mark: [0] },
      ],
      caption: "Spend effort only where the question needs it.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Advanced RAG, stage by stage" },
    {
      type: "table",
      headers: ["Stage", "Techniques", "Where it is covered"],
      rows: [
        ["**Pre-retrieval**", "query rewriting, expansion, decomposition, routing, metadata extraction", "Track 4 lesson 2, this lesson"],
        ["**Retrieval**", "hybrid search, filters, parent-child, contextual indexing", "Track 3, lesson 2 of this track"],
        ["**Post-retrieval**", "reranking, deduplication, compression, ordering, citations", "Track 3, Track 4"],
      ],
    },
    {
      type: "calculator",
      title: "What does each added stage cost in latency?",
      inputs: [
        { key: "rewriteMs", label: "Query rewrite call", min: 0, max: 1500, step: 100, value: 500, unit: "ms" },
        { key: "retrievalMs", label: "Retrieval", min: 20, max: 500, step: 20, value: 80, unit: "ms" },
        { key: "rerankMs", label: "Reranking", min: 0, max: 1000, step: 50, value: 300, unit: "ms" },
        { key: "genMs", label: "Answer generation", min: 500, max: 8000, step: 500, value: 3000, unit: "ms" },
      ],
      outputs: [
        { label: "Naive pipeline", formula: "retrievalMs + genMs", format: "ms" },
        { label: "Advanced pipeline", formula: "rewriteMs + retrievalMs + rerankMs + genMs", format: "ms" },
        { label: "Extra latency vs naive", formula: "(rewriteMs + rerankMs) / (retrievalMs + genMs)", format: "pct" },
      ],
      note: "Quality stages are not free. Add each one only if your eval shows it earns its latency, and consider running independent steps in parallel.",
    },
    { type: "h", text: "Modular RAG: components behind interfaces" },
    {
      type: "p",
      text: "Define a small interface for each part (a retriever returns scored passages, a reranker reorders them, a generator produces an answer with citations). The pipeline depends only on the interfaces. You can then test each module alone, replace one without touching the rest, and run **A/B comparisons** between implementations.",
    },
    {
      type: "p",
      text: "**Routing methods**, from cheapest to most flexible: keyword and length **rules**, a small **classifier** trained on labelled questions, or an **LLM router** prompted with the available paths. Whatever you use, give it a *safe default* (usually the single-step path), log every decision, and evaluate the router on its own.",
    },
    {
      type: "callout",
      tone: "key",
      title: "Complexity has to be earned",
      text: "Start with the simplest design that passes your eval. Add one technique at a time, measure the change per stage, and keep it only if the gain beats its cost in latency, money and maintenance.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"describe an advanced RAG architecture\"",
      text: "Describe it in three phases (before, during, after retrieval), name one technique per phase with the failure it fixes, then say how you would decide what to keep: stage metrics on an eval set, with latency and cost next to quality.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Modular pipeline: interfaces, a router, and a safe default path.",
    code: `from typing import Protocol

class Retriever(Protocol):
    def __call__(self, query: str, k: int) -> list[dict]: ...

class Reranker(Protocol):
    def __call__(self, query: str, docs: list[dict], top_n: int) -> list[dict]: ...

class Generator(Protocol):
    def __call__(self, question: str, docs: list[dict]) -> str: ...


def route(question: str) -> str:
    q = question.strip().lower()
    if q.startswith(("hi", "hello", "thanks")):
        return "direct"
    if " vs " in q or q.count("?") >= 2 or "compare" in q:
        return "multi_step"
    return "single"                       # safe default


def answer(question, retrieve: Retriever, rerank: Reranker, generate: Generator, rewrite, decompose):
    path = route(question)
    log_route(question, path)             # so wrong routes can be found later

    if path == "direct":
        return generate(question, [])     # no retrieval at all

    sub_questions = decompose(question) if path == "multi_step" else [question]
    evidence = []
    for sq in sub_questions:
        candidates = retrieve(rewrite(sq), k=20)
        evidence += rerank(sq, candidates, top_n=4)
    return generate(question, evidence)`,
  },

  interview: [
    {
      question: "What is the difference between naive and advanced RAG?",
      answer:
        "Naive RAG embeds the question, takes the top k chunks and generates. Advanced RAG adds work around retrieval: before it (rewriting, expansion, routing), during it (hybrid search, filters) and after it (reranking, deduplication, compression, ordering). The goal is higher precision and better answers, at the price of added latency and components, so each addition has to be justified by measurement.",
      weakAnswer:
        "Advanced RAG uses a bigger model. — The difference is the retrieval pipeline, not the generator.",
    },
    {
      question: "What does \"modular RAG\" mean in practice?",
      answer:
        "The system is built from interchangeable components behind clear interfaces, such as retriever, reranker, compressor and generator, composed by an orchestrator that can branch and loop. I can test each part alone, swap implementations, and A/B test them, which makes evolving the system far safer than editing one long function.",
    },
    {
      question: "What is adaptive RAG and what could go wrong with it?",
      answer:
        "A router decides per query whether to skip retrieval, do a single retrieval, or run a multi-step flow. It saves latency and cost on easy questions and invests effort on hard ones. The risk is misrouting: a complex question sent down the single path gets a poor answer, so I give the router a safe default, log its decisions and evaluate it separately.",
    },
    {
      question: "How would you decide which advanced techniques to add to a working naive pipeline?",
      answer:
        "I would begin from failing eval cases and classify them by stage. Missing exact codes suggest hybrid search, noisy context suggests reranking, ambiguous queries suggest rewriting. I add one technique at a time, measure stage metrics, answer quality, latency and cost against the baseline, and keep only what clearly pays for itself.",
    },
    {
      question: "How do you route queries: rules, a classifier or an LLM?",
      answer:
        "Rules are cheap, predictable and a good start when paths are clearly distinguishable. A small classifier trained on labelled questions is faster than an LLM and more accurate than rules once I have data. An LLM router is the most flexible but adds latency and cost. In every case I use a safe default and track routing accuracy.",
    },
  ],

  challenges: [
    {
      id: "ar-3-quiz",
      kind: "quiz",
      title: "Checkpoint: RAG architectures",
      blurb: "Five questions on naive, advanced, modular and adaptive designs.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which is a post-retrieval technique?",
          options: ["Query rewriting", "Reranking the retrieved candidates", "Choosing a chunk size", "Routing the question"],
          correctIndex: 1,
          explanation:
            "Reranking, deduplication, compression and ordering happen after candidates are retrieved.",
        },
        {
          id: "q2",
          prompt: "What is the main benefit of an adaptive router?",
          options: [
            "It removes the need for embeddings",
            "It spends retrieval effort only on questions that need it, saving latency and cost",
            "It guarantees correct answers",
            "It makes the model larger",
          ],
          correctIndex: 1,
          explanation:
            "Simple and conversational questions take a cheap path. Hard ones get a multi-step flow.",
        },
        {
          id: "q3",
          prompt: "What makes a RAG system modular?",
          options: [
            "It uses several models",
            "Components sit behind interfaces so they can be tested, replaced and A/B tested independently",
            "It stores data in modules",
            "It runs on several servers",
          ],
          correctIndex: 1,
          explanation:
            "Interfaces between retriever, reranker and generator are what let you change one part safely.",
        },
        {
          id: "q4",
          prompt: "Adding a reranker raises latency by 300 ms and quality improves a little on your eval. What do you do?",
          options: [
            "Keep it, because quality always wins",
            "Weigh the measured quality gain against the latency and cost for your use case, and decide with data",
            "Remove it, because latency always wins",
            "Add three more rerankers",
          ],
          correctIndex: 1,
          explanation:
            "Every stage trades quality for latency. The right answer depends on the product and the size of the gain.",
        },
        {
          id: "q5",
          prompt: "What should a router do when it is unsure?",
          options: [
            "Refuse to answer",
            "Fall back to a safe default path, usually single-step retrieval",
            "Pick a random path",
            "Always choose multi-step",
          ],
          correctIndex: 1,
          explanation:
            "A predictable default limits the damage of routing errors. Log decisions so they can be reviewed.",
        },
      ],
    },
    {
      id: "ar-3-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: routing that still retrieves",
      blurb: "Greetings are slow and sometimes answered with irrelevant policy text. Find the line.",
      language: "python",
      lines: [
        "def answer(query, retriever, llm):",
        "    route = classify(query)",
        "    docs = retriever(query)",
        "    if route == \"direct\":",
        "        return llm(query)",
        "    return llm(build_prompt(query, docs))",
      ],
      buggyLine: 3,
      reasons: [
        "classify must run after retrieval",
        "retrieval happens before the route is checked, so direct questions still pay for a search they never use",
        "build_prompt should not receive docs",
        "llm cannot be called twice",
      ],
      correctReasonIndex: 1,
      explanation:
        "Routing exists to skip work. Retrieve only inside the branches that need it.",
      fix: "if route == \"direct\": return llm(query)\ndocs = retriever(query)",
      xp: 40,
    },
    {
      id: "ar-3-code",
      kind: "code",
      title: "Code challenge: a rule-based router",
      blurb: "Choose direct, single or multi_step from the question text.",
      functionName: "routeQuery",
      starter: `/**
 * routeQuery(query) returns one of "direct", "single", "multi_step".
 *
 * Trim and lower-case the query first, then:
 *   - "direct" if it starts with a whole word: hi, hello, hey, thanks or "thank you"
 *   - "multi_step" if it contains the whole word compare, versus or vs,
 *     or contains two or more question marks
 *   - otherwise "single"
 * Check direct first. Note: "high availability" does NOT start with the word "hi".
 */
function routeQuery(query) {
  // your code here
}`,
      tests: [
        { name: "greeting", args: ["Hello there"], expected: "direct" },
        { name: "thanks with punctuation", args: ["Thanks!"], expected: "direct" },
        { name: "plain factual question", args: ["What is our refund window?"], expected: "single" },
        { name: "comparison word", args: ["Compare plan A versus plan B"], expected: "multi_step" },
        { name: "two questions", args: ["What is X? And what is Y?"], expected: "multi_step" },
        { name: "whole-word check for hi", args: ["high availability setup?"], expected: "single" },
        { name: "trim and case", args: ["   HELLO  "], expected: "direct" },
        { name: "vs abbreviation", args: ["How do these vs. alternatives differ?"], expected: "multi_step" },
      ],
      hints: [
        "Normalise with query.trim().toLowerCase() first.",
        "Use a regular expression with \\b so that whole words match: /^(hi|hello|hey|thanks|thank you)\\b/.",
        "Count question marks with (q.match(/\\?/g) || []).length.",
      ],
      solution: `function routeQuery(query) {
  const q = query.trim().toLowerCase();
  if (/^(hi|hello|hey|thanks|thank you)\\b/.test(q)) return "direct";
  const questions = (q.match(/\\?/g) || []).length;
  if (/\\b(compare|versus|vs)\\b/.test(q) || questions >= 2) return "multi_step";
  return "single";
}`,
      xp: 70,
    },
  ],
};
