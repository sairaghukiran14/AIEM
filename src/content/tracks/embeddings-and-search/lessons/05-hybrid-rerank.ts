import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "hybrid-search-and-reranking",
  order: 5,
  title: "Hybrid Search & Reranking",
  summary:
    "Vector search and keyword search fail in opposite ways. Combine them, then use a slower, sharper model to pick the best few.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "**Dense retrieval** (embeddings) finds passages that mean the same thing. **Sparse retrieval** (keyword search such as BM25) finds passages that contain the same words. Each is blind where the other sees clearly, so production systems usually run both, then **rerank**.",
    },
    {
      type: "table",
      headers: ["", "Dense (embeddings)", "Sparse (BM25 / keyword)"],
      rows: [
        ["Strong at", "paraphrase, synonyms, vague questions", "exact terms, IDs, codes, names, rare words"],
        ["Weak at", "exact tokens, numbers, negation", "different wording for the same idea"],
        ["Needs", "an embedding model and a vector index", "an inverted index (cheap, mature)"],
        ["Explains itself", "poorly", "well: you can see the matched words"],
      ],
    },
    {
      type: "sorter",
      title: "Which retriever finds it?",
      prompt: "Decide which kind of search is most likely to succeed for each query.",
      categories: ["Keyword (BM25)", "Dense (embeddings)", "Needs both"],
      items: [
        { text: "Query: ERR_CONN_4092. Document contains the string ERR_CONN_4092.", answer: 0, why: "A rare literal token. Keyword search matches it exactly; embeddings may blur it." },
        { text: "Query: how do I get my money back. Document title: Refund policy.", answer: 1, why: "No shared words, same meaning. This is dense retrieval's strength." },
        { text: "Query: refund policy for order ORD-77.", answer: 2, why: "The concept is semantic, the order ID is literal. You want both signals." },
        { text: "Query: laptop won't turn on. Document: Troubleshooting a device that fails to power up.", answer: 1, why: "Paraphrase again: different words, same intent." },
      ],
    },
    { type: "h", text: "Combining the two lists" },
    {
      type: "p",
      text: "You get two ranked lists. You cannot just add their scores: BM25 scores are unbounded and cosine scores sit between −1 and 1, so one drowns the other. The standard fix is **Reciprocal Rank Fusion (RRF)**, which ignores scores and uses only ranks.",
    },
    {
      type: "stepper",
      title: "Reciprocal Rank Fusion on three documents",
      steps: [
        { label: "Two ranked lists", detail: "Dense returns A, B, C. Keyword returns B, C, A. Rank starts at 1.", items: ["Dense: A, B, C", "Keyword: B, C, A"], mark: [0, 1] },
        { label: "Score each appearance", detail: "Each appearance adds 1 / (k + rank), with k = 60 by convention. Rank 1 gives 1/61 = 0.0164, rank 2 gives 1/62 = 0.0161, rank 3 gives 1/63 = 0.0159.", items: ["A: 1/61 + 1/63", "B: 1/62 + 1/61", "C: 1/63 + 1/62"], mark: [0, 1, 2] },
        { label: "Add them up", detail: "A = 0.0323, B = 0.0325, C = 0.0320. B was near the top of both lists, so it wins even though it was not first in the dense list.", items: ["B 0.0325", "A 0.0323", "C 0.0320"], mark: [0] },
        { label: "Why k = 60?", detail: "k damps the advantage of the very top ranks, so a document that is merely good in both lists can beat one that is first in a single list. It is not very sensitive; 60 is a robust default.", items: ["small k: top ranks dominate", "large k: smoother blend"], mark: [1] },
      ],
      caption: "No score calibration needed, which is why RRF is so widely used.",
    },
    {
      type: "callout",
      tone: "key",
      title: "Two stages: cast wide, then judge carefully",
      text: "Stage one (dense + keyword + fusion) is fast and returns maybe 50 to 200 candidates. Stage two (a reranker) reads each candidate together with the query and keeps the best 5 to 10. Recall comes from stage one, precision from stage two.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Bi-encoder versus cross-encoder" },
    {
      type: "p",
      text: "The embedding models you have used so far are **bi-encoders**: query and document are encoded **separately**, so document vectors can be precomputed and searched in milliseconds. A **cross-encoder** reads the query and one document **together** in a single pass and outputs a relevance score. It can model the interaction between them (attention across both texts), so it is much more accurate, but it must run once per candidate at query time, so it is far too slow to apply to the whole corpus.",
    },
    {
      type: "code",
      language: "text",
      code: `bi-encoder:    embed(query), embed(doc) -> compare vectors     fast, precomputable, less precise
cross-encoder: score(query + doc together)             slow, per-candidate, more precise

pipeline:  retrieve 100 candidates (fast)  ->  rerank 100 with cross-encoder  ->  keep top 5`,
    },
    { type: "h", text: "BM25 in one paragraph" },
    {
      type: "p",
      text: "BM25 scores a document for each query term using three ideas: **term frequency** with diminishing returns (the tenth occurrence matters less than the second), **inverse document frequency** (rare terms are worth more than common ones), and **length normalisation** (a match in a short document counts for more). It needs no training, runs on an inverted index, and is a strong baseline that embeddings alone often fail to beat on keyword-heavy queries.",
    },
    { type: "h", text: "Tuning the two-stage pipeline" },
    {
      type: "ul",
      items: [
        "**Candidates in**: too few and the right document never reaches the reranker. Measure recall at the candidate depth.",
        "**Results out**: too many dilutes the prompt (Track 1: lost in the middle); too few risks dropping the answer.",
        "**Latency**: reranking 100 candidates costs real time. Budget it, batch it, and consider smaller or hosted rerankers.",
        "**Score thresholds**: a reranker score can say \"nothing here is relevant\", which lets the system answer \"I don't know\" instead of guessing (Track 4).",
        "**Filters and permissions** apply before or during retrieval, never only at display time.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "Strong candidates say",
      text: "That dense and keyword search have complementary failure modes, that fusion should be rank-based because scores are not comparable, and that a cross-encoder reranker is a precision stage applied only to a small candidate set, with each stage evaluated separately.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Reciprocal rank fusion across any number of ranked lists.",
    code: `from collections import defaultdict

def rrf(ranked_lists: list[list[str]], k: int = 60) -> list[str]:
    """Fuse ranked id lists. Ranks start at 1; scores are ignored, only order matters."""
    scores: dict[str, float] = defaultdict(float)
    first_seen: dict[str, int] = {}

    for lst in ranked_lists:
        for rank, doc_id in enumerate(lst, start=1):
            scores[doc_id] += 1.0 / (k + rank)
            first_seen.setdefault(doc_id, len(first_seen))   # stable tie-break

    return sorted(scores, key=lambda d: (-scores[d], first_seen[d]))


dense   = ["A", "B", "C"]
keyword = ["B", "C", "A"]
print(rrf([dense, keyword]))                 # ['B', 'A', 'C']

# Two-stage retrieval:
#   candidates = rrf([dense_search(q, 100), bm25_search(q, 100)])[:100]
#   top = cross_encoder_rerank(q, candidates)[:5]`,
  },

  interview: [
    {
      question: "Why combine keyword and vector search?",
      answer:
        "They fail in complementary ways. Embeddings handle paraphrase and vague questions but blur exact tokens like IDs, error codes and rare names, while keyword search matches literal terms precisely but misses reworded intent. Running both and fusing the results covers more queries than either alone.",
      weakAnswer:
        "Hybrid is better because it uses two methods. — No reasoning about what each one gets wrong.",
    },
    {
      question: "How do you merge BM25 and vector results?",
      answer:
        "With reciprocal rank fusion. Each document gets the sum of 1 over (60 plus its rank) across the lists it appears in, and I sort by that. It uses ranks only, so it avoids the problem that BM25 scores are unbounded and cosine scores are not on the same scale. The alternative is weighted score fusion, which needs careful normalisation and tuning.",
      followUp: "What does the constant 60 do?",
    },
    {
      question: "What is a cross-encoder reranker and why not use it for all search?",
      answer:
        "A cross-encoder reads the query and a document together and outputs a relevance score, which captures their interaction and is much more accurate than comparing separate embeddings. But it must run once per candidate at query time and cannot be precomputed, so it is too slow for the whole corpus. I use it as a second stage on the top 50 to 200 candidates.",
    },
    {
      question: "The correct document is retrieved at rank 40 and the reranker takes the top 20. What happens?",
      answer:
        "It never reaches the reranker, so no later stage can recover it. The fix is to evaluate recall at the candidate depth and raise the number of candidates, improve first-stage retrieval, or both, balancing against reranker latency and cost.",
    },
    {
      question: "When is keyword search alone enough?",
      answer:
        "When queries are mostly exact terms: product codes, error messages, names, or a technical corpus where users know the vocabulary. It is cheap, explainable and a strong baseline. I still measure it against hybrid on real queries before deciding, because users often rephrase.",
    },
  ],

  challenges: [
    {
      id: "es-5-quiz",
      kind: "quiz",
      title: "Checkpoint: hybrid search and reranking",
      blurb: "Five questions on fusion and two-stage retrieval.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which query is most likely to fail with embeddings alone?",
          options: [
            "how do I get a refund",
            "ERR_CONN_4092",
            "tips for faster onboarding",
            "what is your cancellation policy",
          ],
          correctIndex: 1,
          explanation:
            "Rare literal identifiers are exact-match territory. Embeddings can blur them.",
        },
        {
          id: "q2",
          prompt: "Why use rank-based fusion instead of adding raw scores?",
          options: [
            "Ranks are cheaper to store",
            "BM25 and cosine scores are on different, incomparable scales, so one would drown the other",
            "Scores are always negative",
            "Ranking removes duplicates",
          ],
          correctIndex: 1,
          explanation:
            "RRF needs no score calibration. Only the order within each list matters.",
        },
        {
          id: "q3",
          prompt: "What distinguishes a cross-encoder from a bi-encoder?",
          options: [
            "It uses a different tokenizer",
            "It reads the query and document together, so it is more accurate but cannot be precomputed",
            "It produces smaller vectors",
            "It only works on short queries",
          ],
          correctIndex: 1,
          explanation:
            "Joint encoding captures interaction but must run per candidate at query time.",
        },
        {
          id: "q4",
          prompt: "Where does recall come from in a two-stage pipeline, and where does precision come from?",
          options: [
            "Recall from the reranker, precision from first-stage retrieval",
            "Recall from first-stage retrieval, precision from the reranker",
            "Both from the reranker",
            "Both from the embedding model",
          ],
          correctIndex: 1,
          explanation:
            "The first stage must include the right documents; the reranker orders them well. A missed candidate cannot be recovered.",
        },
        {
          id: "q5",
          prompt: "A document appears at rank 1 in one list and is absent from the other. Under RRF with k = 60, its score is:",
          options: [
            "0, because it is missing from one list",
            "1/61, the contribution from the one list it appears in",
            "1/60",
            "2/61",
          ],
          correctIndex: 1,
          explanation:
            "Each appearance contributes 1/(k + rank). Absence contributes nothing.",
        },
      ],
    },
    {
      id: "es-5-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a hybrid scorer",
      blurb: "Keyword matches always dominate, however irrelevant. Find the line.",
      language: "python",
      lines: [
        "def hybrid(query, docs):",
        "    results = []",
        "    for d in docs:",
        "        score = bm25(query, d) + cosine(embed(query), d.vec)",
        "        results.append((score, d))",
        "    return sorted(results, reverse=True)",
      ],
      buggyLine: 4,
      reasons: [
        "bm25 should be subtracted, not added",
        "BM25 is unbounded (often 0 to 30) while cosine stays near 0 to 1, so adding raw scores lets BM25 dominate; use rank fusion or normalise first",
        "embed(query) must be moved outside the function",
        "sorted must use a key function",
      ],
      correctReasonIndex: 1,
      explanation:
        "Raw scores from different systems are not comparable. A BM25 score of 12 versus a cosine of 0.9 means the dense signal barely matters. Use reciprocal rank fusion, or normalise each score distribution before combining.",
      fix: "fused = rrf([rank_by(bm25), rank_by(cosine)])   # rank-based, scale-free",
      xp: 40,
    },
    {
      id: "es-5-code",
      kind: "code",
      title: "Code challenge: reciprocal rank fusion",
      blurb: "Fuse several ranked lists into one using RRF.",
      functionName: "rrf",
      starter: `/**
 * Reciprocal Rank Fusion.
 *
 * \`lists\` is an array of ranked arrays of ids (best first). Rank starts at 1.
 * Each appearance of an id adds 1 / (k + rank) to its score.
 * Return all ids sorted by total score, highest first.
 * Ties: the id that was seen first (scanning lists in order, top to bottom) comes first.
 *
 * rrf([["a","b","c"], ["b","c","a"]], 60) -> ["b", "a", "c"]
 */
function rrf(lists, k) {
  // your code here
}`,
      tests: [
        { name: "a document high in both lists wins", args: [[["a", "b", "c"], ["b", "c", "a"]], 60], expected: ["b", "a", "c"] },
        { name: "one list keeps its order", args: [[["x", "y", "z"]], 60], expected: ["x", "y", "z"] },
        {
          name: "ties go to the id seen first",
          args: [[["x", "y"], ["z"]], 60],
          expected: ["x", "z", "y"],
        },
        { name: "a small k, tie broken by first seen", args: [[["a", "b"], ["b", "a"]], 1], expected: ["a", "b"] },
        { name: "no lists", args: [[], 60], expected: [] },
        { name: "empty lists", args: [[[], []], 60], expected: [] },
        {
          name: "a document in every list beats one in a single list",
          args: [[["p", "q"], ["r", "q"], ["s", "q"]], 60],
          expected: ["q", "p", "r", "s"],
        },
      ],
      hints: [
        "Keep a Map of id to score and a second Map (or array) that records the order in which ids were first seen.",
        "Loop over each list; rank is the index plus 1. Add 1 / (k + rank) to that id's score.",
        "Sort the ids by score descending, then by first-seen order ascending.",
      ],
      solution: `function rrf(lists, k) {
  const scores = new Map();
  const firstSeen = new Map();

  for (const list of lists) {
    list.forEach((id, i) => {
      scores.set(id, (scores.get(id) || 0) + 1 / (k + i + 1));
      if (!firstSeen.has(id)) firstSeen.set(id, firstSeen.size);
    });
  }

  return [...scores.keys()].sort(
    (a, b) => scores.get(b) - scores.get(a) || firstSeen.get(a) - firstSeen.get(b)
  );
}`,
      xp: 70,
    },
  ],
};
