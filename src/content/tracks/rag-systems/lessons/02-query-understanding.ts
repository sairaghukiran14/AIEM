import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "query-understanding",
  order: 2,
  title: "Query Understanding",
  summary:
    "Users do not type good search queries. Rewrite, expand, decompose and route the question before you retrieve.",
  minutes: 13,

  concept: [
    {
      type: "p",
      text: "Retrieval can only be as good as the query it is given, and real questions are messy: they depend on earlier turns (\"and what about 2023?\"), use vague words, bundle several questions together, or do not need retrieval at all. **Query understanding** is the step that turns what the user typed into what the search should run.",
    },
    {
      type: "stepper",
      title: "A follow-up question, fixed",
      steps: [
        { label: "The conversation", detail: "Turn 1: \"What was the refund window in the 2022 policy?\" Answer: 14 days. Turn 2: \"And what about 2023?\"", items: ["User: refund window in the 2022 policy?", "Bot: 14 days.", "User: And what about 2023?"], mark: [2] },
        { label: "Searching the raw message fails", detail: "\"And what about 2023?\" has no subject. Embedding it finds generic 2023 content, not the refund policy.", items: ["query: And what about 2023?", "top hit: 2023 holiday calendar"], mark: [1] },
        { label: "Rewrite using the history", detail: "A small model rewrites the last message into a standalone query, using the earlier turns.", items: ["rewritten: refund window in the 2023 policy"], mark: [0] },
        { label: "Retrieve with the rewrite", detail: "Now the search has the subject and the year, and finds the right section. Log both queries so you can debug later.", items: ["top hit: 2023 Refund Policy, section 3"], mark: [0] },
      ],
      caption: "The most common single improvement to a chat-style RAG system.",
    },
    { type: "h", text: "The toolbox" },
    {
      type: "table",
      headers: ["Technique", "What it does", "Use when"],
      rows: [
        ["**Rewrite to standalone**", "resolve pronouns and omitted context from the history", "any multi-turn chat"],
        ["**Multi-query / expansion**", "generate several phrasings, search all, merge", "vague or short queries; vocabulary mismatch"],
        ["**HyDE**", "have the model write a hypothetical answer, embed that instead of the question", "questions phrased very unlike the documents"],
        ["**Decomposition**", "split a compound question into sub-questions and search each", "multi-hop or multi-part questions"],
        ["**Routing**", "decide which index to use, or whether to retrieve at all", "several sources, or chit-chat and calculations"],
        ["**Filter extraction**", "turn \"in 2023, from legal\" into metadata filters", "structured constraints in free text"],
      ],
    },
    {
      type: "sorter",
      title: "Which technique fixes this?",
      prompt: "Match each failure to the most appropriate fix.",
      categories: ["Rewrite follow-up", "Multi-query", "Decompose", "Skip retrieval"],
      items: [
        { text: "\"What about its price?\" asked right after a question about a specific product", answer: 0, why: "The subject lives in the previous turn. Rewrite using the history." },
        { text: "\"cheap laptops\" returns nothing because the documents say \"budget notebooks\"", answer: 1, why: "Vocabulary mismatch. Several phrasings widen what the search can match." },
        { text: "\"Compare the 2022 and 2023 refund policies and tell me what changed\"", answer: 2, why: "Two retrievals are needed, one per policy, then a comparison." },
        { text: "\"Thanks, that was helpful!\"", answer: 3, why: "No knowledge is needed. Retrieval would just inject noise." },
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "How each one works and what it costs" },
    {
      type: "ul",
      items: [
        "**Rewrite** is one extra LLM call before retrieval, so it adds latency. Use a small, fast model, give it the recent turns, and tell it to output only the query. Always log the rewrite.",
        "**Multi-query** runs N searches, often in parallel, and merges the lists. Merge by how many lists a result appears in and its best rank (or with reciprocal rank fusion from Track 3). Cost scales with N.",
        "**HyDE** embeds a plausible but possibly wrong answer. It works because an answer looks more like the target passage than a question does, but a hallucinated detail can pull the search the wrong way, so keep it as one signal among others.",
        "**Decomposition** needs a planning call and then several retrievals, and the answers must be combined. It is where RAG starts to look like an agent (Track 5).",
        "**Routing** is a classifier, sometimes just a small model with a few examples. A wrong route fails silently, so measure it.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Rewrites can drift",
      text: "A rewriter can add details the user never said or lose a constraint. Keep the original query in the retrieval too (search both), give the rewriter strict instructions, and evaluate with and without it. A technique that helps on average can still hurt specific questions.",
    },
    { type: "h", text: "Know when not to do it" },
    {
      type: "p",
      text: "Each technique adds latency and a new way to fail. A single-turn system with clean queries may need none of them. Add one when you can point to a **failing class of questions** in your evaluation (lesson 6), and keep it only if the metrics improve.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What interviewers listen for",
      text: "That you tie each technique to a concrete failure, name the cost (extra model call, N searches), mention merging results rather than concatenating them, and say you would measure retrieval with and without the change.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Rewrite with history, search with both queries, and merge by agreement.",
    code: `REWRITE_PROMPT = """Rewrite the last user message as a standalone search query.
Use the conversation for missing context. Do not add facts. Output only the query.

<conversation>
{history}
</conversation>

Last message: {question}"""


def retrieve_for_turn(history: list[str], question: str, k: int = 8) -> list[str]:
    standalone = llm(
        REWRITE_PROMPT.format(history="\\n".join(history[-6:]), question=question),
        model=SMALL_MODEL, temperature=0, max_tokens=60,
    ).strip()

    log.info("rewrite", original=question, rewritten=standalone)   # essential for debugging

    # Search both: the rewrite may drift, the original may lack context.
    lists = [search(q, top_k=k) for q in {standalone, question}]
    return merge(lists, limit=k)


def merge(lists: list[list[str]], limit: int) -> list[str]:
    seen_in: dict[str, int] = {}
    best_rank: dict[str, int] = {}
    order: list[str] = []
    for lst in lists:
        for rank, doc_id in enumerate(lst, start=1):
            if doc_id not in seen_in:
                order.append(doc_id)
            seen_in[doc_id] = seen_in.get(doc_id, 0) + 1
            best_rank[doc_id] = min(best_rank.get(doc_id, rank), rank)
    order.sort(key=lambda d: (-seen_in[d], best_rank[d], order.index(d)))
    return order[:limit]`,
  },

  interview: [
    {
      question: "Why does a chat-style RAG system need query rewriting?",
      answer:
        "Follow-up messages depend on earlier turns, so searching them verbatim gives an embedding with no subject. A rewrite step uses the conversation to turn the last message into a standalone query before retrieval. I use a small fast model, log the rewrite, and evaluate it because rewrites can drift or add details.",
      weakAnswer:
        "To make the query better. — Does not say what is wrong with the raw query.",
    },
    {
      question: "What is HyDE and when is it useful?",
      answer:
        "Hypothetical Document Embeddings: have the model write a plausible answer, embed that, and search with it. An answer looks more like the target passage than a question does, so it helps when questions are phrased very differently from the documents. The risk is that a wrong detail in the hypothetical answer misleads retrieval, so I treat it as one signal and measure the gain.",
    },
    {
      question: "How do you handle a question that needs information from several documents?",
      answer:
        "Decompose it into sub-questions, retrieve for each, then give the model all the evidence to compose an answer. It costs a planning call and multiple searches. When the number of steps is not known in advance, this becomes an agent loop with retrieval as a tool.",
      followUp: "How would you evaluate it?",
    },
    {
      question: "How do you merge results from several rewritten queries?",
      answer:
        "Not by concatenation, which duplicates and loses rank information. I deduplicate by id and order by how many queries returned each item, then by its best rank, or use reciprocal rank fusion. Results that several phrasings agree on are usually the most reliable.",
    },
    {
      question: "How do you decide whether a query technique is worth keeping?",
      answer:
        "I tie it to a failing class of questions in my eval set, implement it, and compare retrieval metrics and end-to-end quality with and without it, including latency and cost. If it helps overall but regresses certain questions, I diff per case. If the metrics do not move, I remove it to cut latency and failure modes.",
    },
  ],

  challenges: [
    {
      id: "rag-2-quiz",
      kind: "quiz",
      title: "Checkpoint: query understanding",
      blurb: "Five questions on rewriting, expansion and routing.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What problem does rewriting the query to a standalone form solve?",
          options: [
            "Slow embedding calls",
            "Follow-up messages that depend on earlier turns have no searchable subject",
            "Large documents",
            "Duplicate chunks in the index",
          ],
          correctIndex: 1,
          explanation:
            "Without the history, a message like 'and 2023?' has nothing for retrieval to match.",
        },
        {
          id: "q2",
          prompt: "A user sends 'thanks, great!' Which behaviour is best?",
          options: [
            "Retrieve ten chunks and answer from them",
            "Route around retrieval, since no knowledge is needed",
            "Rewrite it into a longer query",
            "Return a random document",
          ],
          correctIndex: 1,
          explanation:
            "Retrieval would only add noise and latency. Routing decides when not to retrieve.",
        },
        {
          id: "q3",
          prompt: "What is the main risk of HyDE?",
          options: [
            "It cannot be combined with other signals",
            "A hallucinated detail in the hypothetical answer can pull the search in the wrong direction",
            "It requires fine-tuning",
            "It only works for numbers",
          ],
          correctIndex: 1,
          explanation:
            "The hypothetical answer is generated by a model and may be wrong. Treat it as one signal.",
        },
        {
          id: "q4",
          prompt: "How should results from several query variants be combined?",
          options: [
            "Concatenate the lists",
            "Deduplicate and order by agreement and best rank, or use reciprocal rank fusion",
            "Use only the first query's results",
            "Pick one list at random",
          ],
          correctIndex: 1,
          explanation:
            "Results that multiple phrasings agree on are usually best, and merging should respect rank.",
        },
        {
          id: "q5",
          prompt: "A rewriter sometimes adds details the user never mentioned. What is a sound mitigation?",
          options: [
            "Remove rewriting entirely, always",
            "Search with both the original and rewritten queries, constrain the rewrite prompt, and evaluate with and without it",
            "Raise the temperature",
            "Rewrite twice",
          ],
          correctIndex: 1,
          explanation:
            "Keep the original as a safety net and measure. Drift is a failure mode to manage, not a reason to give up.",
        },
      ],
    },
    {
      id: "rag-2-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a conversational retriever",
      blurb: "Follow-up questions retrieve irrelevant passages. Find the line.",
      language: "python",
      lines: [
        "def retrieve_for_turn(history, question):",
        "    standalone = llm(f'Rewrite as a standalone search query: {question}')",
        "    return index.search(embed(standalone), top_k=5)",
      ],
      buggyLine: 2,
      reasons: [
        "the rewrite model call should use temperature above 1",
        "the history is never given to the rewriter, so pronouns and omitted subjects cannot be resolved",
        "top_k must be 1",
        "embed must be called on the original question",
      ],
      correctReasonIndex: 1,
      explanation:
        "A rewrite step only works if it can see the conversation. With just the last message, 'and what about 2023?' stays ambiguous. Include the recent turns in the rewrite prompt.",
      fix: "llm(REWRITE_PROMPT.format(history=format_turns(history[-6:]), question=question))",
      xp: 40,
    },
    {
      id: "rag-2-code",
      kind: "code",
      title: "Code challenge: merge multi-query results",
      blurb: "Deduplicate results from several query variants, ranking by agreement and best rank.",
      functionName: "mergeResults",
      starter: `/**
 * \`lists\` holds one ranked array of ids per query variant (best first, rank from 1).
 * Return up to \`limit\` unique ids ordered by:
 *   1. number of lists the id appears in (more first)
 *   2. its best (smallest) rank across lists (smaller first)
 *   3. the order it was first seen (scanning lists in order, top to bottom)
 *
 * mergeResults([["a","b"],["b","c"]], 3) -> ["b", "a", "c"]
 */
function mergeResults(lists, limit) {
  // your code here
}`,
      tests: [
        { name: "agreement wins, then best rank", args: [[["a", "b"], ["b", "c"]], 3], expected: ["b", "a", "c"] },
        { name: "limit truncates", args: [[["a", "b"], ["b", "c"]], 2], expected: ["b", "a"] },
        { name: "a single list keeps its order", args: [[["x", "y", "z"]], 5], expected: ["x", "y", "z"] },
        { name: "an id repeated across lists is counted per list", args: [[["x"], ["y"], ["x"]], 5], expected: ["x", "y"] },
        { name: "full ties fall back to first seen", args: [[["a"], ["b"]], 5], expected: ["a", "b"] },
        { name: "no lists", args: [[], 3], expected: [] },
        {
          name: "best rank breaks a count tie",
          args: [[["p", "q", "r"], ["r", "q"]], 3],
          expected: ["r", "q", "p"],
        },
      ],
      hints: [
        "Track three things per id: how many lists contain it, its smallest rank, and when it was first seen.",
        "Count an id once per list even if (unexpectedly) it repeats inside a single list.",
        "Sort with count descending, best rank ascending, first-seen ascending, then slice to the limit.",
      ],
      solution: `function mergeResults(lists, limit) {
  const count = new Map();
  const bestRank = new Map();
  const firstSeen = new Map();

  for (const list of lists) {
    const inThisList = new Set();
    list.forEach((id, i) => {
      const rank = i + 1;
      if (!firstSeen.has(id)) firstSeen.set(id, firstSeen.size);
      if (!bestRank.has(id) || rank < bestRank.get(id)) bestRank.set(id, rank);
      if (!inThisList.has(id)) {
        inThisList.add(id);
        count.set(id, (count.get(id) || 0) + 1);
      }
    });
  }

  return [...count.keys()]
    .sort(
      (a, b) =>
        count.get(b) - count.get(a) ||
        bestRank.get(a) - bestRank.get(b) ||
        firstSeen.get(a) - firstSeen.get(b)
    )
    .slice(0, limit);
}`,
      xp: 70,
    },
  ],
};
