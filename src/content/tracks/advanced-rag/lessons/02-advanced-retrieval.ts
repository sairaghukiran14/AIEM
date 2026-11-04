import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "advanced-retrieval-techniques",
  order: 2,
  title: "Advanced Retrieval: Contextual, Parent-Child, Hierarchical & Multi-Hop",
  summary:
    "Four techniques that fix the cases plain chunk search misses: chunks that lost their context, answers that need surrounding text, questions about structure, and questions that need two lookups.",
  minutes: 17,

  concept: [
    {
      type: "p",
      text: "Plain RAG embeds small chunks and returns the nearest ones. That fails in four predictable ways, and each has a named technique:",
    },
    {
      type: "table",
      headers: ["Problem", "Technique", "Idea"],
      rows: [
        ["A chunk says \"revenue grew 3%\" and nothing says *which company or year*", "**Contextual retrieval**", "prepend a short, generated description of where the chunk comes from, before embedding and keyword indexing"],
        ["The matching sentence is found, but the answer needs the paragraphs around it", "**Parent-child retrieval**", "search small chunks, then return the larger parent they belong to"],
        ["The question is about a whole report, not one fact", "**Hierarchical retrieval**", "index summaries at several levels and drill down: document, then section, then chunk"],
        ["The answer needs one lookup to decide the next lookup", "**Multi-hop retrieval**", "retrieve, read, form a follow-up query, retrieve again"],
      ],
    },
    {
      type: "sorter",
      title: "Name the technique",
      prompt: "Match each symptom to the technique that addresses it.",
      categories: ["Contextual", "Parent-child", "Hierarchical", "Multi-hop"],
      items: [
        { text: "Chunks read `The company's revenue grew 3% over the previous quarter` with no company named", answer: 0, why: "The chunk lost its context. Prepend where it came from before indexing." },
        { text: "The sentence about the refund window is found, but the exceptions in the next paragraph are lost", answer: 1, why: "Search small for precision, then return the larger parent for completeness." },
        { text: "`Summarise the main risks in this 200-page filing`", answer: 2, why: "This needs document and section level summaries, not isolated chunks." },
        { text: "`Who manages the author of the Q3 incident report?`", answer: 3, why: "You must find the author first, then look up their manager." },
      ],
    },
    {
      type: "stepper",
      title: "Parent-child retrieval",
      steps: [
        { label: "Split into parents", detail: "Cut the document into larger sections, say about 1,000 tokens each. These are what the model will eventually read.", items: ["parent A", "parent B"], mark: [0, 1] },
        { label: "Split parents into children", detail: "Cut each parent into small chunks of about 200 tokens. Every child records the id of its parent.", items: ["A.1", "A.2", "A.3", "B.1", "B.2"], mark: [0, 1, 2, 3, 4] },
        { label: "Embed and search the children", detail: "Small chunks give a sharper vector, so matching is more precise.", items: ["A.2 best match", "B.1 second"], mark: [0] },
        { label: "Swap each hit for its parent", detail: "Map the hit children to their parents and remove duplicates, keeping rank order. Two hits in the same parent count once.", items: ["parent A", "parent B"], mark: [0] },
        { label: "Send the parents to the model", detail: "The model gets complete, coherent sections, while search stayed precise.", items: ["A (1,000 tokens)", "B (1,000 tokens)"], mark: [0] },
      ],
      caption: "Search small, read big.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Contextual retrieval" },
    {
      type: "p",
      text: "Before indexing, ask a model for one or two sentences that situate each chunk in its document, such as the company, period and section. Prepend that to the chunk and use the **combined text** for both the embedding and the keyword index. Retrieval accuracy improves most when the original chunks were ambiguous out of context.",
    },
    {
      type: "compare",
      title: "Which text do you index?",
      prompt: "A chunk comes from the ACME Corp Q2 2024 report. Which version gives retrieval something to work with?",
      a: { label: "Raw chunk", text: "The company's revenue grew by 3% over the previous quarter." },
      b: { label: "Contextualised chunk", text: "From ACME Corp's Q2 2024 financial report, revenue section: The company's revenue grew by 3% over the previous quarter." },
      better: 1,
      why: "The prepended context carries the entity and period that the question will contain. The raw chunk can match thousands of other companies.",
    },
    {
      type: "calculator",
      title: "What does contextualising a corpus cost?",
      inputs: [
        { key: "chunks", label: "Chunks to contextualise", min: 10000, max: 1000000, step: 10000, value: 200000 },
        { key: "chunkTok", label: "Tokens per chunk", min: 100, max: 1000, step: 50, value: 300 },
        { key: "docTok", label: "Document tokens sent with each chunk", min: 1000, max: 20000, step: 1000, value: 8000 },
        { key: "price", label: "Input price per million tokens ($)", min: 1, max: 10, step: 1, value: 3 },
        { key: "cached", label: "Share of document tokens read from cache", min: 0, max: 100, step: 10, value: 90, unit: "%" },
      ],
      outputs: [
        { label: "Cost without caching ($)", formula: "chunks * (chunkTok + docTok) * price / 1e6", format: "usd" },
        { label: "Cost with the document prefix cached ($)", formula: "chunks * (chunkTok + docTok * (1 - cached / 100) + docTok * (cached / 100) * 0.1) * price / 1e6", format: "usd" },
      ],
      note: "Each chunk is processed together with its whole document. Caching that shared document prefix is what makes contextual retrieval affordable. Cached tokens are assumed to cost 10% of normal.",
    },
    { type: "h", text: "Hierarchical retrieval" },
    {
      type: "p",
      text: "Build a tree: a summary per document, a summary per section, then the raw chunks. A broad question matches summaries near the top and you descend into only the best branches, which also narrows the search space. The cost is an offline summarisation pass, and the summaries must be refreshed when documents change.",
    },
    { type: "h", text: "Multi-hop retrieval" },
    {
      type: "p",
      text: "Some questions cannot be answered from any single search, because the second query depends on the first answer. The standard loop is **retrieve, read, decide whether the evidence is enough, otherwise write the next query and retrieve again**, with a hard limit on hops. This is where retrieval starts to look like an agent (Track 5).",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Every hop adds latency and a chance to go wrong",
      text: "Three hops of retrieval plus a model call each can take many seconds. Cap the hops, stop when the evidence is sufficient, and only use multi-hop when a router decides the question needs it.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "Pick by failure, not by fashion",
      text: "Start from the failing eval cases. Ambiguous chunks suggest contextual retrieval, truncated answers suggest parent-child, overview questions suggest hierarchy, dependent lookups suggest multi-hop. Measure each against the baseline.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Contextualise chunks at indexing time, and expand child hits to their parents at query time.",
    code: `def contextualise(chunk: str, document: str, llm) -> str:
    prompt = (
        "Here is a document:\\n<document>\\n" + document + "\\n</document>\\n"
        "Here is a chunk from it:\\n<chunk>\\n" + chunk + "\\n</chunk>\\n"
        "Write one or two sentences that situate the chunk within the document "
        "(entity, period, section). Reply with only that context."
    )
    return llm(prompt) + " " + chunk       # index THIS text, not the raw chunk


def index_document(doc_id, document, chunks, llm, embed, store):
    for i, chunk in enumerate(chunks):
        text = contextualise(chunk, document, llm)
        store.add(id=f"{doc_id}:{i}", text=text, vector=embed(text), parent_id=doc_id)


def retrieve_parents(question, embed, store, k=8, max_parents=3):
    hits = store.search(embed(question), k=k)          # small chunks, best first
    seen, parents = set(), []
    for hit in hits:
        if hit.parent_id not in seen:                  # keep rank order, drop repeats
            seen.add(hit.parent_id)
            parents.append(store.get_parent(hit.parent_id))
        if len(parents) == max_parents:
            break
    return parents`,
  },

  interview: [
    {
      question: "What is contextual retrieval and when does it help?",
      answer:
        "Before indexing, a model writes a short description that situates each chunk in its document, and I prepend it to the chunk for both embeddings and keyword search. It helps when chunks are ambiguous on their own, such as a sentence about revenue growth with no company or year. The cost is one model call per chunk, which prompt caching of the shared document makes manageable.",
      weakAnswer:
        "It retrieves the surrounding context at query time. — That describes parent-child retrieval; contextual retrieval changes what is indexed.",
    },
    {
      question: "Explain parent-child retrieval and the trade-off it makes.",
      answer:
        "I index small child chunks for precise matching, but each child points to a larger parent. At query time I search children, replace the hits with their parents, deduplicate and return the parents to the model. I get precision in search and completeness in the context. The trade-off is larger context tokens per hit, so I cap the number of parents.",
    },
    {
      question: "How would you answer \"summarise the main risks in this 200-page filing\" with RAG?",
      answer:
        "Chunk-level search gives scattered fragments, so I would use hierarchical retrieval: summaries per section and per document built at indexing time, a search over the summaries to pick the relevant sections, and then a map-reduce style summary over those sections. I would accept the extra indexing cost and refresh summaries when the document changes.",
    },
    {
      question: "What is multi-hop retrieval and how do you keep it from running away?",
      answer:
        "It is iterative retrieval for questions where the second search depends on the first result. After each retrieval a model checks whether the evidence suffices, and if not it writes the next query. I cap the number of hops, set a latency and token budget, de-duplicate evidence, and only route to it for questions that need it.",
    },
    {
      question: "Your eval shows the right fact is retrieved but answers are missing caveats from the next paragraph. What do you try?",
      answer:
        "That points to chunks that are too small for the answer. I would try parent-child retrieval or add neighbouring chunks, then compare answer completeness and context cost on the eval set. I would also check that overlap or section-aware splitting is not cutting caveats away from their rule.",
    },
  ],

  challenges: [
    {
      id: "ar-2-quiz",
      kind: "quiz",
      title: "Checkpoint: advanced retrieval",
      blurb: "Five questions on choosing the right technique.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What does contextual retrieval change?",
          options: [
            "The generation prompt",
            "The text that is embedded and keyword-indexed for each chunk",
            "The vector database",
            "The number of results returned",
          ],
          correctIndex: 1,
          explanation:
            "A situating description is prepended to each chunk before indexing, so the chunk carries its entity and context.",
        },
        {
          id: "q2",
          prompt: "In parent-child retrieval, what do you embed and what do you send to the model?",
          options: [
            "Embed parents, send children",
            "Embed small children, send the larger parents",
            "Embed and send the same chunks",
            "Embed summaries, send raw documents",
          ],
          correctIndex: 1,
          explanation:
            "Small chunks match precisely. Larger parents give the model coherent context.",
        },
        {
          id: "q3",
          prompt: "Which question most needs multi-hop retrieval?",
          options: [
            "What is our refund window?",
            "Who is the manager of the person who wrote the Q3 incident report?",
            "Define RAG.",
            "List all product names.",
          ],
          correctIndex: 1,
          explanation:
            "The second lookup (the manager) depends on the result of the first (the author).",
        },
        {
          id: "q4",
          prompt: "Why does contextual retrieval use prompt caching?",
          options: [
            "To make answers more creative",
            "Each chunk is processed with its whole document, so caching the shared document prefix cuts the cost sharply",
            "To avoid needing an embedding model",
            "To speed up the user interface",
          ],
          correctIndex: 1,
          explanation:
            "The same long document is sent with every one of its chunks, which is exactly what a cache serves cheaply.",
        },
        {
          id: "q5",
          prompt: "What is the main risk of multi-hop retrieval?",
          options: [
            "It cannot use a vector store",
            "Latency and errors compound with every hop, so it needs caps and a router",
            "It only works on tables",
            "It removes citations",
          ],
          correctIndex: 1,
          explanation:
            "Each hop adds retrieval and a model call. Limit hops and use it only when needed.",
        },
      ],
    },
    {
      id: "ar-2-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: contextual indexing",
      blurb: "Contextual retrieval gave no improvement at all. Find the line.",
      language: "python",
      lines: [
        "def index_document(doc_id, document, chunks, llm, embed, store):",
        "    for i, chunk in enumerate(chunks):",
        "        context = llm(situate_prompt(document, chunk))",
        "        text = context + \" \" + chunk",
        "        store.add(id=f\"{doc_id}:{i}\", text=text, vector=embed(chunk))",
      ],
      buggyLine: 5,
      reasons: [
        "the id format is invalid",
        "the context is generated but the embedding is computed from the raw chunk, so the index never sees the added context",
        "enumerate cannot be used with chunks",
        "llm must be called after embed",
      ],
      correctReasonIndex: 1,
      explanation:
        "The whole point is that the vector and the keyword index represent the contextualised text. Embedding the raw chunk discards the work.",
      fix: "store.add(id=f\"{doc_id}:{i}\", text=text, vector=embed(text))",
      xp: 40,
    },
    {
      id: "ar-2-code",
      kind: "code",
      title: "Code challenge: expand hits to parents",
      blurb: "Replace ranked child hits with their parents, keeping rank order, without repeats.",
      functionName: "expandToParents",
      starter: `/**
 * expandToParents(hits, parentOf, maxParents)
 *
 *   hits:       child chunk ids, best match first
 *   parentOf:   an object mapping each child id to its parent id
 *   maxParents: the most parents to return
 *
 * Return the parent ids in the order they first appear, with no duplicates,
 * stopping at maxParents. Ignore hits that have no parent.
 */
function expandToParents(hits, parentOf, maxParents) {
  // your code here
}`,
      tests: [
        { name: "dedupes and keeps order", args: [["a1", "b1", "a2"], { a1: "A", a2: "A", b1: "B" }, 5], expected: ["A", "B"] },
        { name: "respects the limit", args: [["a1", "b1", "c1"], { a1: "A", b1: "B", c1: "C" }, 2], expected: ["A", "B"] },
        { name: "ignores unknown hits", args: [["x", "a1"], { a1: "A" }, 3], expected: ["A"] },
        { name: "rank order wins", args: [["b1", "a1", "b2"], { a1: "A", b1: "B", b2: "B" }, 5], expected: ["B", "A"] },
        { name: "empty hits", args: [[], { a1: "A" }, 3], expected: [] },
        { name: "limit of zero", args: [["a1"], { a1: "A" }, 0], expected: [] },
      ],
      hints: [
        "Walk the hits in order and look up each parent.",
        "Keep a Set of parents you have already added.",
        "Stop once you have maxParents, including the case where maxParents is 0.",
      ],
      solution: `function expandToParents(hits, parentOf, maxParents) {
  const seen = new Set();
  const out = [];
  for (const hit of hits) {
    if (out.length >= maxParents) break;
    const parent = parentOf[hit];
    if (parent === undefined || seen.has(parent)) continue;
    seen.add(parent);
    out.push(parent);
  }
  return out;
}`,
      xp: 70,
    },
  ],
};
