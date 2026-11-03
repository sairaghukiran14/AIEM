import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "choosing-and-evaluating-embeddings",
  order: 6,
  title: "Choosing & Evaluating Embeddings",
  summary:
    "Pick an embedding model by measuring retrieval on your own questions, then plan for the day you have to change it.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "There are dozens of embedding models. Leaderboards help you shortlist, but the only number that matters is how well a model retrieves **your documents for your users' questions**. Choosing well is a measurement exercise, and so is knowing when to change.",
    },
    { type: "h", text: "What to compare" },
    {
      type: "table",
      headers: ["Factor", "Why it matters"],
      rows: [
        ["**Retrieval quality on your data**", "the real objective; measured with your own labelled queries"],
        ["**Dimensions**", "storage, memory and search speed scale with it; some models allow truncating to fewer"],
        ["**Max input tokens**", "caps your chunk size (lesson 3)"],
        ["**Languages and domains**", "multilingual or code or legal text can differ a lot between models"],
        ["**Cost and latency**", "per-token price to embed the corpus and, separately, every query"],
        ["**Hosting and licence**", "API versus self-hosted, data residency, licence terms"],
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Leaderboards are a starting point",
      text: "Public benchmarks average over many tasks and datasets, and models can be tuned toward them. A model ranked first overall can lose on your domain. Use the leaderboard to pick three candidates, then test them yourself.",
    },
    { type: "h", text: "Build a retrieval eval" },
    {
      type: "ol",
      items: [
        "Collect **50 to 200 real questions** (from search logs, support tickets, or written by domain experts).",
        "For each, label the **relevant chunks or documents**. Even one or two per question is enough to start.",
        "Run each candidate model over the same chunks and queries.",
        "Compute **recall@k** (did the relevant item appear in the top k?) and **MRR** (how high was the first relevant item?).",
        "Read the **failures**. They tell you whether to change the model, the chunking, or add keyword search.",
      ],
    },
    {
      type: "calculator",
      title: "Cost to embed a corpus (and to switch models)",
      inputs: [
        { key: "docs", label: "Chunks in the corpus", min: 10000, max: 100000000, step: 10000, value: 5000000 },
        { key: "tokens", label: "Tokens per chunk", min: 50, max: 1000, step: 10, value: 350 },
        { key: "price", label: "Price per 1M tokens", min: 0.01, max: 0.5, step: 0.01, value: 0.1, unit: "$" },
      ],
      outputs: [
        { label: "Tokens to embed", formula: "docs * tokens", format: "int" },
        { label: "One full (re-)embedding run", formula: "docs * tokens / 1e6 * price", format: "usd" },
        { label: "Evaluating 3 candidate models on this corpus", formula: "3 * docs * tokens / 1e6 * price", format: "usd" },
      ],
      note: "Price is illustrative. Evaluate on a sample of the corpus first, which costs a tiny fraction of this.",
    },
  ],

  underTheHood: [
    { type: "h", text: "The two metrics, precisely" },
    {
      type: "code",
      language: "text",
      code: `recall@k   = (relevant items found in the top k) / (total relevant items)    averaged over queries
MRR        = mean over queries of  1 / (rank of the first relevant item)          0 if none found

example, 3 queries, relevant item ranks: 1, 4, not found
  recall@3 (1 relevant each) = (1 + 0 + 0) / 3 = 0.33
  MRR                         = (1/1 + 1/4 + 0) / 3 = 0.42`,
      caption: "Recall asks 'did we find it'. MRR asks 'how near the top'.",
    },
    { type: "h", text: "Dimensions, truncation and quantisation" },
    {
      type: "p",
      text: "Some models are trained so that the **first N dimensions are a usable embedding on their own** (often called Matryoshka-style), letting you truncate vectors to save memory with a measured quality cost. You can also lower precision, from float32 to int8 or binary. Each of these is a trade you verify with your eval, not assume.",
    },
    { type: "h", text: "Embedding drift and versioning" },
    {
      type: "ul",
      items: [
        "**Store the model id, version and dimension** with the index, and assert them at query time (lesson 1).",
        "**Provider updates**: a hosted model's behaviour can change or be deprecated. Pin versions and watch the deprecation schedule.",
        "**Changing models means re-embedding everything**, because spaces are incompatible. Budget the cost and time.",
        "**Content drift**: new jargon, products and documents change the distribution. Re-run your eval on a schedule and add new failing queries to it.",
      ],
    },
    {
      type: "stepper",
      title: "Switching embedding models with no downtime",
      steps: [
        { label: "Create a second index", detail: "Keep the live index untouched. Create a new index configured for the new model's dimension and metric.", items: ["index v1 (live)", "index v2 (empty)"], mark: [1] },
        { label: "Dual-write", detail: "Embed every new or updated chunk with both models and write to both indexes, so v2 does not fall behind while you backfill.", items: ["v1 gets new chunks", "v2 gets new chunks"], mark: [0, 1] },
        { label: "Backfill", detail: "Embed the existing corpus with the new model into v2 in batches, respecting rate limits and cost.", items: ["batch 1", "batch 2", "batch N"], mark: [0, 1, 2] },
        { label: "Shadow and compare", detail: "Send real queries to both, serve v1, and compare results offline on your eval set and on live traffic.", items: ["serve v1", "log v2", "diff"], mark: [1, 2] },
        { label: "Cut over, keep a rollback", detail: "Switch reads to v2 behind a flag. Keep v1 for a while so rollback is one config change, then delete it.", items: ["reads -> v2", "v1 on standby"], mark: [0] },
      ],
      caption: "The same pattern applies to any change that invalidates stored vectors, including new chunking.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"how do you pick an embedding model?\"",
      text: "Shortlist from public benchmarks and constraints (languages, dimensions, cost, hosting), build a labelled retrieval eval from real questions, compare recall@k and MRR, read the failures, and choose the cheapest model that meets the bar. Then say how you would version the index and migrate safely.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Recall@k and MRR over a labelled set of queries.",
    code: `def evaluate(results: dict[str, list[str]], relevant: dict[str, set[str]], k: int) -> dict:
    """results[query] = ranked list of doc ids; relevant[query] = ids that are correct."""
    recalls, rrs = [], []
    for q, ranked in results.items():
        rel = relevant[q]
        if not rel:
            continue                                   # skip queries with no labels
        found = sum(1 for d in ranked[:k] if d in rel)
        recalls.append(found / len(rel))

        rr = 0.0
        for rank, d in enumerate(ranked, start=1):     # rank starts at 1
            if d in rel:
                rr = 1.0 / rank
                break
        rrs.append(rr)

    n = len(recalls)
    return {"recall_at_k": round(sum(recalls) / n, 2), "mrr": round(sum(rrs) / n, 2)}


results  = {"q1": ["a", "b"], "q2": ["x", "y", "z", "d"], "q3": ["m", "n"]}
relevant = {"q1": {"a"}, "q2": {"d"}, "q3": {"zzz"}}
print(evaluate(results, relevant, k=3))     # {'recall_at_k': 0.33, 'mrr': 0.42}`,
  },

  interview: [
    {
      question: "How do you choose an embedding model for a product?",
      answer:
        "I shortlist using public benchmarks and constraints such as languages, dimensions, max tokens, cost and hosting, then build a labelled retrieval eval from real questions and compare candidates on recall at k and MRR over the same chunks. I read the failures, weigh cost and latency, and pick the cheapest model that meets the quality bar, then version the index so I can migrate later.",
      weakAnswer:
        "Pick the top model on the MTEB leaderboard. — Benchmarks are averaged and may not reflect your domain.",
    },
    {
      question: "Explain recall@k and MRR.",
      answer:
        "Recall at k is the share of a query's relevant items that appear in the top k results, averaged over queries; it measures whether retrieval found the answer at all. MRR is the average of one over the rank of the first relevant result, so it rewards putting a right answer near the top. I report both, because a system can have good recall and still bury the answer low.",
      followUp: "Which matters more for RAG?",
    },
    {
      question: "How would you migrate to a new embedding model with zero downtime?",
      answer:
        "Build a second index for the new model, dual-write new and updated chunks to both, backfill the existing corpus in batches, then run shadow queries against both and compare on the eval set and live traffic. Cut reads over behind a flag, keep the old index for a rollback window, and delete it afterwards. Vectors from different models cannot be mixed, so there is no in-place upgrade.",
    },
    {
      question: "What are the trade-offs of reducing embedding dimensions?",
      answer:
        "Fewer dimensions cut storage, memory and search time roughly in proportion, at some loss of retrieval quality that depends on the model. Models trained to be truncatable lose less. I measure recall at k at several sizes on my own eval and choose the smallest that still meets the quality target, and I consider int8 quantisation as a separate, additive saving.",
    },
    {
      question: "Your retrieval quality slowly degrades over months. What do you check?",
      answer:
        "Whether the content or queries drifted, for example new products and jargon the model and my eval set did not cover; whether the provider changed or deprecated the model; whether ingestion or chunking changed; and whether index settings or data growth reduced ANN recall. I re-run the eval on fresh real queries, add the new failures to it, and monitor recall on a schedule.",
    },
  ],

  challenges: [
    {
      id: "es-6-quiz",
      kind: "quiz",
      title: "Checkpoint: choosing and evaluating embeddings",
      blurb: "Five questions on measuring retrieval and migrating models.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What is the most reliable evidence that a model suits your use case?",
          options: [
            "Its rank on a public leaderboard",
            "Its dimension count",
            "Its recall and MRR on your own labelled queries and documents",
            "Its price",
          ],
          correctIndex: 2,
          explanation:
            "Only your own data and questions measure your task. Leaderboards are a shortlist tool.",
        },
        {
          id: "q2",
          prompt: "Three queries have the first relevant result at ranks 1, 2 and 4. What is the MRR?",
          options: ["0.25", "About 0.58", "About 2.33", "0.75"],
          correctIndex: 1,
          explanation:
            "(1/1 + 1/2 + 1/4) / 3 = 1.75 / 3, about 0.58.",
        },
        {
          id: "q3",
          prompt: "Why can't you upgrade to a new embedding model by embedding only new documents?",
          options: [
            "New models reject old documents",
            "Vectors from different models live in different spaces, so old and new are not comparable",
            "It is against the licence",
            "The index would become too small",
          ],
          correctIndex: 1,
          explanation:
            "Mixing models in one index gives meaningless similarity scores. The whole corpus must be re-embedded.",
        },
        {
          id: "q4",
          prompt: "What is the safest way to cut over to a re-embedded index?",
          options: [
            "Delete the old index, then build the new one",
            "Build in parallel, dual-write, shadow-compare, switch behind a flag and keep a rollback window",
            "Switch immediately and fix problems as they appear",
            "Only re-embed popular documents",
          ],
          correctIndex: 1,
          explanation:
            "A parallel index with shadow comparison and a rollback path avoids both downtime and silent regressions.",
        },
        {
          id: "q5",
          prompt: "Retrieval quality drops after a hosted embedding model is silently updated. What practice would have caught it?",
          options: [
            "Using more dimensions",
            "Pinning the model version and running the retrieval eval on a schedule",
            "Lowering the chunk size",
            "Disabling the reranker",
          ],
          correctIndex: 1,
          explanation:
            "Pinned versions plus a recurring eval turn silent changes into visible metric changes.",
        },
      ],
    },
    {
      id: "es-6-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: querying the index",
      blurb: "Search returns confident but unrelated results since last week's upgrade. Find the line.",
      language: "python",
      lines: [
        "INDEX_MODEL = 'embed-small-v1'      # documents were embedded with this",
        "QUERY_MODEL = 'embed-large-v2'",
        "def search(q):",
        "    qv = embed(q, model=QUERY_MODEL)",
        "    return index.query(qv, top_k=5)",
      ],
      buggyLine: 4,
      reasons: [
        "top_k should be larger than 5",
        "the query is embedded with a different model than the one the documents were indexed with, so the vectors live in different spaces",
        "the embed call must not receive a model name",
        "the index should be queried before embedding",
      ],
      correctReasonIndex: 1,
      explanation:
        "Similarity is only meaningful within one model's space. Embedding queries with a newer model while documents remain on the old one returns arbitrary neighbours. Use one model id for both, store it with the index, and assert it matches at query time.",
      fix: "qv = embed(q, model=INDEX_MODEL)   # same model as the documents",
      xp: 40,
    },
    {
      id: "es-6-code",
      kind: "code",
      title: "Code challenge: recall@k and MRR",
      blurb: "Score a retrieval run against labelled relevant documents.",
      functionName: "evaluateRetrieval",
      starter: `/**
 * results:  array of ranked id arrays, one per query (best first).
 * relevant: array of arrays of relevant ids, aligned with results.
 * k:        cut-off for recall.
 *
 * recallAtK = mean over queries of (relevant ids found in the top k) / (relevant ids)
 * mrr       = mean over queries of 1 / (rank of the first relevant id), 0 if none
 *             (rank starts at 1 and looks at the WHOLE list, not only the top k)
 *
 * Skip queries whose relevant list is empty. Round both to 2 decimals.
 * If no query has labels return { recallAtK: 0, mrr: 0 }.
 *
 * evaluateRetrieval([["a","b"],["x","y","z","d"]], [["a"],["d"]], 3)
 *   -> { recallAtK: 0.5, mrr: 0.63 }
 */
function evaluateRetrieval(results, relevant, k) {
  // your code here
}`,
      tests: [
        {
          name: "a perfect first hit and a miss within k",
          args: [[["a", "b"], ["x", "y", "z", "d"]], [["a"], ["d"]], 3],
          expected: { recallAtK: 0.5, mrr: 0.63 },
        },
        {
          name: "the worked example from the lesson",
          args: [[["a", "b"], ["x", "y", "z", "d"], ["m", "n"]], [["a"], ["d"], ["zzz"]], 3],
          expected: { recallAtK: 0.33, mrr: 0.42 },
        },
        {
          name: "partial recall with several relevant items",
          args: [[["a", "x", "b", "c"]], [["a", "b", "c", "d"]], 3],
          expected: { recallAtK: 0.5, mrr: 1 },
        },
        {
          name: "queries with no labels are skipped",
          args: [[["a"], ["b"]], [[], ["b"]], 1],
          expected: { recallAtK: 1, mrr: 1 },
        },
        { name: "nothing labelled", args: [[["a"]], [[]], 5], expected: { recallAtK: 0, mrr: 0 } },
        {
          name: "MRR looks past k but recall does not",
          args: [[["x", "y", "z", "a"]], [["a"]], 2],
          expected: { recallAtK: 0, mrr: 0.25 },
        },
      ],
      hints: [
        "Loop over queries by index; skip when relevant[i] is empty.",
        "For recall, count relevant ids that appear in results[i].slice(0, k) and divide by relevant[i].length.",
        "For MRR, find the first position (1-based) of any relevant id in the full list; use 1 / position, or 0 if none. Average both and round to 2 decimals.",
      ],
      solution: `function evaluateRetrieval(results, relevant, k) {
  let recallSum = 0;
  let rrSum = 0;
  let counted = 0;

  results.forEach((ranked, i) => {
    const rel = new Set(relevant[i]);
    if (rel.size === 0) return;
    counted += 1;

    const found = ranked.slice(0, k).filter((id) => rel.has(id)).length;
    recallSum += found / rel.size;

    const pos = ranked.findIndex((id) => rel.has(id));
    rrSum += pos === -1 ? 0 : 1 / (pos + 1);
  });

  if (counted === 0) return { recallAtK: 0, mrr: 0 };
  const round = (x) => Math.round(x * 100) / 100;
  return { recallAtK: round(recallSum / counted), mrr: round(rrSum / counted) };
}`,
      xp: 70,
    },
  ],
};
