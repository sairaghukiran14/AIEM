import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "the-rag-pipeline",
  order: 1,
  title: "The RAG Pipeline",
  summary:
    "Retrieval-augmented generation fetches relevant passages and hands them to the model. Learn every stage, why each exists and where it breaks.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "A model only knows what was in its training data and what you put in its prompt (Track 1). **Retrieval-augmented generation (RAG)** closes that gap: at question time, search your own data, put the most relevant passages in the prompt, and ask the model to answer **from them**. It is how a chatbot answers questions about your company wiki, contracts or product docs.",
    },
    {
      type: "visual",
      key: "rag-pipeline",
      caption:
        "Click each stage. For every one you will see what it does, what you can tune, how it typically fails, and how to catch the failure.",
    },
    { type: "h", text: "Why RAG instead of the alternatives" },
    {
      type: "table",
      headers: ["Approach", "Good for", "Weak at"],
      rows: [
        ["**Prompt only**", "stable, small knowledge that fits in the prompt", "anything large or changing"],
        ["**RAG**", "private, large or fast-changing knowledge; answers with sources", "tasks that need whole-corpus reasoning; adds moving parts"],
        ["**Fine-tuning** (Track 7)", "style, format and narrow behaviours", "injecting facts, which it does unreliably and cannot cite"],
        ["**Long context**", "a few documents you can afford to send each time", "cost, latency and accuracy at scale (Track 1: lost in the middle)"],
      ],
    },
    {
      type: "sorter",
      title: "Which approach fits?",
      prompt: "Pick the best first approach for each need.",
      categories: ["RAG", "Fine-tuning", "Just prompt it"],
      items: [
        { text: "Answer questions from an internal wiki that changes every week", answer: 0, why: "Fresh, large, private knowledge: retrieve it at query time." },
        { text: "Make every reply follow a strict JSON shape", answer: 2, why: "A format requirement is handled by prompting and structured output (Track 2)." },
        { text: "Show which policy page each answer came from", answer: 0, why: "Attribution needs the source text in the prompt, which retrieval provides." },
        { text: "Teach a model a narrow, stable behaviour from thousands of labelled examples", answer: 1, why: "Consistent behaviour from many examples is what fine-tuning is for." },
        { text: "A ten-question FAQ that never changes", answer: 2, why: "It fits in the prompt. Build retrieval only when you outgrow that." },
      ],
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "A RAG system is really **two pipelines** that share an index.",
    },
    {
      type: "table",
      headers: ["", "Indexing (offline)", "Querying (online)"],
      rows: [
        ["Runs", "when documents are added or changed", "on every user question"],
        ["Steps", "load, clean, chunk, embed, store with metadata", "rewrite, embed, retrieve, rerank, assemble, generate"],
        ["Optimised for", "throughput, correctness, freshness", "latency and answer quality"],
        ["Key risk", "bad parsing, stale or duplicated content", "retrieving the wrong thing or ignoring it"],
      ],
    },
    { type: "h", text: "Design decisions you must make early" },
    {
      type: "ul",
      items: [
        "**Access control**: filter retrieval by what **this user** may see. If you retrieve first and filter later, restricted text can leak into the prompt and then into the answer.",
        "**Freshness**: how quickly must an updated document be reflected? Incremental re-indexing, deletions and versioning matter.",
        "**Citations**: store a stable id, title and location with each chunk so answers can point back.",
        "**What to do when nothing relevant is found**: answer \"I don't know\" rather than letting the model improvise (lesson 4).",
        "**Evaluation from day one**: without it you cannot tell whether a change helped (lesson 6).",
      ],
    },
    {
      type: "calculator",
      title: "RAG versus sending the whole corpus",
      inputs: [
        { key: "corpus", label: "Corpus size", min: 10000, max: 5000000, step: 10000, value: 800000, unit: "tokens" },
        { key: "k", label: "Chunks retrieved (k)", min: 1, max: 20, step: 1, value: 5 },
        { key: "chunk", label: "Tokens per chunk", min: 100, max: 1000, step: 50, value: 400 },
        { key: "price", label: "Input price per 1M tokens", min: 0.1, max: 20, step: 0.1, value: 3, unit: "$" },
        { key: "queries", label: "Questions per day", min: 100, max: 1000000, step: 100, value: 20000 },
      ],
      outputs: [
        { label: "RAG input tokens per question", formula: "k * chunk + 300", format: "int" },
        { label: "Whole-corpus input per question", formula: "corpus + 300", format: "int" },
        { label: "RAG cost per day", formula: "(k * chunk + 300) / 1e6 * price * queries", format: "usd" },
        { label: "Whole-corpus cost per day", formula: "(corpus + 300) / 1e6 * price * queries", format: "usd" },
      ],
      note: "Ignores output tokens, retrieval infrastructure and prompt caching, which narrows the gap for a small, stable corpus. A corpus this big would not fit most context windows at all.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"what is RAG and when would you use it?\"",
      text: "Retrieve relevant passages at query time and ground the answer in them. Use it for private, large or changing knowledge and when you need citations. Then name the real work: chunking, hybrid retrieval, reranking, context assembly, grounding prompts, access control and evaluation.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A minimal but honest RAG function: filter by permission, ground the answer, return sources.",
    code: `def answer(user, question: str) -> dict:
    # 1. Retrieve, restricted to what this user is allowed to read.
    hits = index.search(
        embed(question, kind="query"),
        top_k=20,
        filter={"allowed_groups": {"$in": user.groups}},     # ACL at retrieval time
    )
    chunks = rerank(question, hits)[:5]

    # 2. Refuse early when nothing relevant came back.
    if not chunks or chunks[0].score < MIN_SCORE:
        return {"answer": "I could not find this in the documents.", "sources": []}

    # 3. Assemble a grounded prompt with numbered sources.
    sources = "\\n".join(f"[{i}] {c.text}" for i, c in enumerate(chunks, start=1))
    prompt = (
        "Answer using only the sources below. Cite them like [1]. "
        "If they do not contain the answer, say so.\\n"
        f"<sources>\\n{sources}\\n</sources>\\n\\nQuestion: {question}"
    )

    reply = llm(prompt, temperature=0)
    return {"answer": reply, "sources": [c.metadata for c in chunks]}`,
  },

  interview: [
    {
      question: "What is RAG and why use it?",
      answer:
        "Retrieval-augmented generation searches your own data at query time and puts the most relevant passages in the prompt so the model answers from them. It gives access to private, large and fast-changing knowledge, supports citations, and avoids retraining. It adds moving parts: chunking, retrieval quality, context assembly and evaluation all need care.",
      weakAnswer:
        "It stops hallucinations. — It reduces them when retrieval and grounding work, but it does not stop them.",
    },
    {
      question: "When would you choose RAG over fine-tuning?",
      answer:
        "When the problem is knowledge: facts that are private, large or changing, and where I need citations. Fine-tuning is better for behaviour such as style, format or a narrow task, and is poor at reliably injecting facts. They combine well: fine-tune for behaviour, retrieve for facts.",
      followUp: "And versus a very long context window?",
    },
    {
      question: "Walk me through a RAG query end to end.",
      answer:
        "Rewrite the question into a standalone query if needed, embed it, retrieve candidates with hybrid search filtered by the user's permissions, rerank to the best few, assemble them into a prompt within a token budget with source labels, then generate with instructions to answer only from the sources, cite, and say when the answer is missing. I log each stage so failures can be located.",
    },
    {
      question: "How do you prevent a RAG system from leaking documents a user should not see?",
      answer:
        "Apply the access filter at retrieval time, using the user's identity and the permissions stored as metadata on each chunk, so restricted text never enters the prompt. Filtering after generation is too late. I also keep permissions in sync with the source system, test with users who lack access, and avoid caches that mix users.",
    },
    {
      question: "What does the indexing pipeline need to handle in production?",
      answer:
        "Reliable parsing and cleaning, chunking with metadata, embedding at scale with retries and rate limits, and keeping the index consistent with the sources: incremental updates, deletions, versioning, and permission changes. I also store the chunking and embedding versions with the index so a change can be migrated safely.",
    },
  ],

  challenges: [
    {
      id: "rag-1-quiz",
      kind: "quiz",
      title: "Checkpoint: the RAG pipeline",
      blurb: "Five questions on what each stage is for.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which problem is RAG best suited to solve?",
          options: [
            "Making replies follow a house tone of voice",
            "Answering questions from large, private or frequently changing documents",
            "Speeding up token generation",
            "Reducing the model's parameter count",
          ],
          correctIndex: 1,
          explanation:
            "RAG supplies knowledge at query time. Tone and format are better handled by prompting or fine-tuning.",
        },
        {
          id: "q2",
          prompt: "Where should permission filtering be applied in a multi-user RAG system?",
          options: [
            "After the model generates its answer",
            "At retrieval time, so restricted text never reaches the prompt",
            "Only in the user interface",
            "It is not necessary if the model is told to be careful",
          ],
          correctIndex: 1,
          explanation:
            "Once restricted text is in the prompt it can leak into the answer. Filter before it gets there.",
        },
        {
          id: "q3",
          prompt: "Which is part of the OFFLINE indexing pipeline?",
          options: [
            "Reranking the retrieved chunks",
            "Chunking and embedding documents",
            "Generating the final answer",
            "Rewriting the user's question",
          ],
          correctIndex: 1,
          explanation:
            "Indexing loads, cleans, chunks, embeds and stores. The others run per question.",
        },
        {
          id: "q4",
          prompt: "Retrieval returns nothing relevant. What should a well-designed system do?",
          options: [
            "Let the model answer from memory",
            "Say it could not find the answer in the documents",
            "Retry until something matches",
            "Return a random document",
          ],
          correctIndex: 1,
          explanation:
            "An honest 'not found' is better than a confident invented answer. Design the refusal path explicitly.",
        },
        {
          id: "q5",
          prompt: "Why is fine-tuning a poor substitute for RAG when the goal is up-to-date facts?",
          options: [
            "It cannot be run on private data",
            "It injects facts unreliably, goes stale, and cannot point to sources",
            "It is always more expensive than RAG",
            "It removes the model's ability to cite",
          ],
          correctIndex: 1,
          explanation:
            "Facts baked into weights are hard to update and verify. Retrieval keeps knowledge external and citable.",
        },
      ],
    },
    {
      id: "rag-1-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a multi-tenant RAG endpoint",
      blurb: "A user saw a sentence from a document they have no access to. Find the line.",
      language: "python",
      lines: [
        "def answer(user, question):",
        "    docs = index.search(embed(question), top_k=5)",
        "    prompt = build_prompt(question, docs)",
        "    return llm(prompt)",
      ],
      buggyLine: 2,
      reasons: [
        "top_k should be larger",
        "retrieval ignores the user's permissions, so text from restricted documents enters the prompt and can appear in the answer",
        "the question must be embedded after the prompt is built",
        "llm must be called before search",
      ],
      correctReasonIndex: 1,
      explanation:
        "Authorisation has to happen where data is selected. With no filter, the nearest chunks may belong to documents this user cannot read, and the model will happily quote them. Pass a permission filter to the search.",
      fix: "docs = index.search(embed(question), top_k=5, filter={'allowed_groups': {'$in': user.groups}})",
      xp: 40,
    },
    {
      id: "rag-1-code",
      kind: "code",
      title: "Code challenge: assemble a RAG prompt",
      blurb: "Format retrieved chunks as numbered sources followed by the question.",
      functionName: "buildRagPrompt",
      starter: `/**
 * Build the user part of a RAG prompt.
 *
 * Format:
 *   <sources>
 *   [1] first chunk text
 *   [2] second chunk text
 *   </sources>
 *
 *   Question: <question>
 *
 * - Number sources from 1, in the order given.
 * - There is a blank line between </sources> and "Question:".
 * - With no chunks, still output the empty <sources></sources> block.
 *
 * buildRagPrompt("Hi?", [{ id: "a", text: "Hello" }])
 *   -> "<sources>\\n[1] Hello\\n</sources>\\n\\nQuestion: Hi?"
 */
function buildRagPrompt(question, chunks) {
  // your code here
}`,
      tests: [
        {
          name: "one source",
          args: ["Hi?", [{ id: "a", text: "Hello" }]],
          expected: "<sources>\n[1] Hello\n</sources>\n\nQuestion: Hi?",
        },
        {
          name: "sources are numbered from 1 in order",
          args: ["Q", [{ id: "a", text: "first" }, { id: "b", text: "second" }, { id: "c", text: "third" }]],
          expected: "<sources>\n[1] first\n[2] second\n[3] third\n</sources>\n\nQuestion: Q",
        },
        { name: "no chunks gives an empty block", args: ["Q", []], expected: "<sources>\n</sources>\n\nQuestion: Q" },
        {
          name: "the question text is kept as is",
          args: ["What is 2 + 2?", [{ id: "x", text: "Math facts." }]],
          expected: "<sources>\n[1] Math facts.\n</sources>\n\nQuestion: What is 2 + 2?",
        },
        {
          name: "ids are not shown, only numbers",
          args: ["Q", [{ id: "doc-17#3", text: "Body" }]],
          expected: "<sources>\n[1] Body\n</sources>\n\nQuestion: Q",
        },
      ],
      hints: [
        "Turn each chunk into a line: the number in square brackets, a space, then the text.",
        "Put '<sources>' first, then all the lines, then '</sources>', and join those pieces with a single newline.",
        "Append a blank line and 'Question: ' plus the question. An empty list should still produce the two tag lines.",
      ],
      solution: `function buildRagPrompt(question, chunks) {
  const lines = chunks.map((c, i) => "[" + (i + 1) + "] " + c.text);
  const block = ["<sources>", ...lines, "</sources>"].join("\\n");
  return block + "\\n\\nQuestion: " + question;
}`,
      xp: 70,
    },
  ],
};
