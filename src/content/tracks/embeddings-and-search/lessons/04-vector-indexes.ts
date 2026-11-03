import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "vector-indexes-and-ann",
  order: 4,
  title: "Vector Indexes & ANN",
  summary:
    "Comparing a query with every vector is exact but slow. Approximate nearest neighbour indexes trade a little accuracy for a lot of speed.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "**Exact search** (brute force) compares the query with every stored vector. It is perfectly accurate, and it costs work proportional to the number of vectors times the dimensions. For thousands of vectors that is fine. For tens of millions it is too slow for interactive use.",
    },
    {
      type: "p",
      text: "**Approximate nearest neighbour (ANN)** indexes organise vectors so a search only looks at a small, promising part of the data. They usually return the true nearest neighbours, but not always. That is the trade you are making: **recall** (how many true neighbours you find) against **latency** and **memory**.",
    },
    {
      type: "stepper",
      title: "How HNSW finds a neighbour",
      steps: [
        { label: "Layered graph", detail: "HNSW links each vector to a few near neighbours, in several layers. The top layer has very few nodes and long links; the bottom layer has every node and short links. It is a small-world graph: any node is only a few hops from any other.", items: ["Layer 2: 3 nodes", "Layer 1: 20 nodes", "Layer 0: all nodes"], mark: [0] },
        { label: "Enter at the top", detail: "Search starts from a fixed entry node in the top layer and greedily moves to whichever neighbour is closest to the query, until no neighbour is closer.", items: ["entry", "hop 1", "hop 2 (closest here)"], mark: [2] },
        { label: "Drop down a layer", detail: "From that closest node, drop to the next layer and repeat the greedy walk. Each layer refines the position, like zooming a map.", items: ["Layer 2 done", "Layer 1: closer", "Layer 0 next"], mark: [1] },
        { label: "Widen the search at the bottom", detail: "At layer 0 keep a list of the best ef candidates and keep exploring neighbours of the best ones. A larger ef explores more, finding more true neighbours but taking longer.", items: ["candidate 1", "candidate 2", "candidate 3", "..."], mark: [0, 1, 2] },
        { label: "Return the top k", detail: "Return the k best candidates. Typically about a logarithmic number of distance computations instead of all N, at a recall that you control with ef.", items: ["top 1", "top 2", "top 3"], mark: [0, 1, 2] },
      ],
      caption: "Zoom from coarse to fine, then look around locally.",
    },
    { type: "h", text: "The main index families" },
    {
      type: "table",
      headers: ["Index", "Idea", "Strength", "Cost"],
      rows: [
        ["**Flat (brute force)**", "compare with everything", "exact, no build step, simple", "linear in N"],
        ["**HNSW**", "multi-layer neighbour graph", "high recall, low latency, no training", "more memory, slower inserts"],
        ["**IVF**", "cluster vectors; search only the nearest clusters", "fast, smaller memory", "needs training; recall depends on probes"],
        ["**PQ (product quantisation)**", "compress vectors into short codes", "large memory savings", "lossy: lower recall"],
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "Measure recall, never assume it",
      text: "Recall at k = what fraction of the true top-k (from exact search) your ANN index returned. Pick settings by plotting recall against latency on a sample of your own vectors, because the curve depends on your data.",
    },
    {
      type: "calculator",
      title: "IVF: how much does it skip?",
      inputs: [
        { key: "n", label: "Vectors", min: 100000, max: 100000000, step: 100000, value: 10000000 },
        { key: "nlist", label: "Clusters (nlist)", min: 16, max: 65536, step: 16, value: 4096 },
        { key: "nprobe", label: "Clusters searched (nprobe)", min: 1, max: 512, step: 1, value: 16 },
      ],
      outputs: [
        { label: "Vectors compared per query", formula: "n * Math.min(nprobe, nlist) / nlist", format: "int" },
        { label: "Fraction of the data scanned", formula: "Math.min(nprobe, nlist) / nlist", format: "pct" },
        { label: "Rough speed-up vs brute force", formula: "nlist / Math.min(nprobe, nlist)", format: "fixed1" },
      ],
      note: "Raising nprobe scans more clusters: slower, but more likely to include the cluster that holds the true neighbour. Actual speed-up is lower because centroids must also be compared.",
    },
  ],

  underTheHood: [
    { type: "h", text: "IVF, step by step" },
    {
      type: "ol",
      items: [
        "**Train**: run k-means on a sample to find `nlist` centroids.",
        "**Add**: assign every vector to its nearest centroid, storing it in that cluster's list.",
        "**Search**: find the `nprobe` centroids closest to the query, then compare only vectors in those clusters.",
      ],
    },
    {
      type: "p",
      text: "The failure case is a query near a cluster boundary: its true neighbour may live in a cluster you did not probe. Larger `nprobe` fixes it at a cost. **Product quantisation** splits each vector into `m` pieces and replaces each piece with the id of its nearest codebook entry (often 1 byte), cutting memory by 10 to 50 times at some loss in accuracy. IVF and PQ are commonly combined.",
    },
    { type: "h", text: "Practical engineering concerns" },
    {
      type: "ul",
      items: [
        "**Memory is the real limit.** Fast indexes keep vectors, and for HNSW the graph, in RAM. Disk-based indexes exist and trade latency for capacity.",
        "**Metadata filters** (\"only documents this user may see\", \"after 2024\") are hard for ANN. **Post-filtering** searches first then drops results, and can return fewer than k. **Pre-filtering** restricts the search space but can break graph connectivity. Test filtered recall specifically.",
        "**Updates and deletes**: many indexes handle inserts well, deletes poorly (tombstones), and need periodic rebuilds.",
        "**Build time and parameters**: HNSW has `M` (links per node) and `efConstruction` (build effort); search has `efSearch`. Higher values raise recall and cost.",
        "**Pick the metric at creation** (lesson 2); changing it means rebuilding.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Do you even need ANN?",
      text: "Below a few hundred thousand vectors, exact search with a good library is often fast enough and removes a whole class of recall problems. Start simple; add an ANN index when measured latency requires it.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"HNSW or IVF?\"",
      text: "HNSW for high recall and low latency when memory allows, with no training step. IVF (often with PQ) when memory is tight or the dataset is huge, accepting recall tuned through nprobe. In both cases: measure recall against exact search on your data, and test with your real filters.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Exact search as a baseline, and recall@k of an approximate index measured against it.",
    code: `import numpy as np

def exact_top_k(query: np.ndarray, vectors: np.ndarray, k: int) -> list[int]:
    """Brute force on unit vectors: dot product == cosine. Ground truth for recall."""
    scores = vectors @ query
    return list(np.argsort(-scores)[:k])


def recall_at_k(approx_ids: list[int], exact_ids: list[int], k: int) -> float:
    """Fraction of the true top-k that the approximate index also returned."""
    return len(set(approx_ids[:k]) & set(exact_ids[:k])) / k


# Example with a hypothetical ANN index object:
#   index.search(query, k) -> list of ids
rng = np.random.default_rng(0)
vectors = rng.normal(size=(10_000, 128)).astype(np.float32)
vectors /= np.linalg.norm(vectors, axis=1, keepdims=True)

queries = vectors[:100]
recalls = []
for q in queries:
    truth = exact_top_k(q, vectors, 10)
    approx = ann_index.search(q, 10)          # your HNSW / IVF index
    recalls.append(recall_at_k(approx, truth, 10))
print("mean recall@10:", float(np.mean(recalls)))`,
  },

  interview: [
    {
      question: "Why use approximate nearest neighbour search instead of exact search?",
      answer:
        "Exact search costs work proportional to the number of vectors times the dimensions per query, which is too slow at tens of millions of vectors. ANN indexes search only a promising subset, giving large speed-ups at the price of occasionally missing a true neighbour. I treat recall as a tunable cost and measure it against exact search on my own data.",
      weakAnswer:
        "Because it is faster. — True, but it omits the recall trade-off, which is the point.",
    },
    {
      question: "Explain how HNSW works.",
      answer:
        "It builds a layered graph where each vector links to nearby vectors. Upper layers are sparse with long links, the bottom layer holds every vector. A query enters at the top, greedily walks toward the query, drops down a layer, and repeats, then at the bottom layer explores a list of ef candidates before returning the top k. Cost is roughly logarithmic in N, and ef trades recall for latency.",
      followUp: "What do M and efConstruction control?",
    },
    {
      question: "Compare HNSW with IVF.",
      answer:
        "HNSW gives high recall and low latency with no training, but uses more memory and handles deletes and inserts less gracefully. IVF clusters the data and searches only the nearest nprobe clusters; it uses less memory, especially with product quantisation, but needs a training step and recall depends on nprobe, with boundary queries being the weak spot. I choose by memory budget, dataset size and measured recall.",
    },
    {
      question: "What goes wrong with metadata filtering in a vector index?",
      answer:
        "Post-filtering retrieves the top k and then removes non-matching results, so a restrictive filter can leave you with fewer than k, or none. Pre-filtering restricts candidates first but can disrupt graph traversal in indexes like HNSW and hurt recall. I test recall with the real filters, and for highly selective filters I may partition data or fall back to an exact scan of the filtered subset.",
    },
    {
      question: "How do you choose ANN parameters in practice?",
      answer:
        "I take a sample of real vectors and queries, compute exact top-k as ground truth, then sweep parameters such as efSearch or nprobe, plotting recall against latency and memory. I pick the cheapest setting that meets my recall target, re-check after data growth, and keep a periodic recall monitor in production.",
    },
  ],

  challenges: [
    {
      id: "es-4-quiz",
      kind: "quiz",
      title: "Checkpoint: vector indexes",
      blurb: "Five questions on ANN trade-offs.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What do you trade when you switch from exact search to an ANN index?",
          options: [
            "Nothing, ANN is strictly better",
            "A little recall for much lower latency and compute",
            "Latency for storage",
            "Accuracy of the embedding model",
          ],
          correctIndex: 1,
          explanation:
            "ANN may miss a true neighbour occasionally. That recall loss buys large speed gains.",
        },
        {
          id: "q2",
          prompt: "In HNSW, what does raising efSearch do?",
          options: [
            "It adds more layers",
            "It explores more candidates at search time, raising recall and latency",
            "It lowers memory use",
            "It changes the distance metric",
          ],
          correctIndex: 1,
          explanation:
            "ef is the size of the candidate list during search. Bigger means more thorough and slower.",
        },
        {
          id: "q3",
          prompt: "In IVF, a query's true nearest neighbour is in a cluster that was not probed. What happens?",
          options: [
            "The index automatically probes it",
            "That neighbour is missed, which lowers recall; increasing nprobe reduces the risk",
            "The query fails with an error",
            "The vector is moved to the nearest cluster",
          ],
          correctIndex: 1,
          explanation:
            "IVF only compares vectors in probed clusters. Boundary queries are the classic weakness.",
        },
        {
          id: "q4",
          prompt: "What is product quantisation mainly used for?",
          options: [
            "Increasing recall",
            "Compressing vectors to cut memory, at some accuracy cost",
            "Choosing the metric",
            "Encrypting vectors",
          ],
          correctIndex: 1,
          explanation:
            "PQ replaces vector pieces with short codes, giving large memory savings but a lossy approximation.",
        },
        {
          id: "q5",
          prompt: "A restrictive metadata filter is applied after the ANN search returns its top 10. What can happen?",
          options: [
            "Results improve",
            "You may end up with far fewer than 10 results, or none",
            "The index rebuilds itself",
            "Nothing, filters never matter",
          ],
          correctIndex: 1,
          explanation:
            "Post-filtering discards non-matching results from a fixed-size list, so selective filters can empty it.",
        },
      ],
    },
    {
      id: "es-4-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: measuring index recall",
      blurb: "This function reports recall above 1 on some queries. Find the line.",
      language: "python",
      lines: [
        "def recall_at_k(approx_ids, exact_ids, k):",
        "    approx = set(approx_ids[:k])",
        "    exact = set(exact_ids[:k])",
        "    return len(approx | exact) / k",
      ],
      buggyLine: 4,
      reasons: [
        "the sets should be lists",
        "it counts the union of the two result sets instead of the intersection, so it can exceed 1 and rewards disagreement",
        "k should be used in the slice only",
        "the function should return the sets themselves",
      ],
      correctReasonIndex: 1,
      explanation:
        "Recall asks how many of the true neighbours were found: the size of the intersection divided by k. A union grows when the index returns wrong ids, so a worse index scores higher.",
      fix: "return len(approx & exact) / k",
      xp: 40,
    },
    {
      id: "es-4-code",
      kind: "code",
      title: "Code challenge: brute-force top-k by cosine",
      blurb: "Exact nearest-neighbour search: the ground truth you measure ANN recall against.",
      functionName: "topK",
      starter: `/**
 * Exact search. Return the ids of the k documents with the highest cosine
 * similarity to \`query\`, best first.
 *
 *   docs = [{ id: "a", vec: [1, 0] }, { id: "b", vec: [0, 1] }, { id: "c", vec: [1, 1] }]
 *   topK([1, 0], docs, 2) -> ["a", "c"]
 *
 * - Ties keep the original order of \`docs\`.
 * - A zero vector has similarity 0 with everything.
 * - If k is larger than the number of docs, return all of them.
 */
function topK(query, docs, k) {
  // your code here
}`,
      tests: [
        {
          name: "orders by cosine similarity",
          args: [[1, 0], [{ id: "a", vec: [1, 0] }, { id: "b", vec: [0, 1] }, { id: "c", vec: [1, 1] }], 2],
          expected: ["a", "c"],
        },
        {
          name: "length does not matter, only direction",
          args: [[1, 0], [{ id: "short", vec: [0.1, 0.9] }, { id: "long", vec: [50, 0] }], 1],
          expected: ["long"],
        },
        {
          name: "ties keep the original order",
          args: [[1, 0], [{ id: "x", vec: [1, 0] }, { id: "y", vec: [2, 0] }], 2],
          expected: ["x", "y"],
        },
        {
          name: "k larger than the collection returns everything",
          args: [[0, 1], [{ id: "a", vec: [1, 0] }, { id: "b", vec: [0, 1] }], 10],
          expected: ["b", "a"],
        },
        {
          name: "a zero vector scores 0",
          args: [[1, 1], [{ id: "z", vec: [0, 0] }, { id: "p", vec: [1, 1] }], 2],
          expected: ["p", "z"],
        },
        { name: "no documents", args: [[1, 0], [], 3], expected: [] },
        {
          name: "k of 0 returns nothing",
          args: [[1, 0], [{ id: "a", vec: [1, 0] }], 0],
          expected: [],
        },
      ],
      hints: [
        "Score every document with cosine similarity: dot product divided by the product of the lengths, using 0 when either length is 0.",
        "Keep each document's original index so you can break ties by it.",
        "Sort by score descending then index ascending, slice to k, and map to ids.",
      ],
      solution: `function topK(query, docs, k) {
  const norm = (v) => Math.hypot(...v);
  const cosine = (a, b) => {
    const denom = norm(a) * norm(b);
    if (denom === 0) return 0;
    return a.reduce((s, x, i) => s + x * b[i], 0) / denom;
  };

  return docs
    .map((d, index) => ({ id: d.id, index, score: cosine(query, d.vec) }))
    .sort((p, q) => q.score - p.score || p.index - q.index)
    .slice(0, k)
    .map((d) => d.id);
}`,
      xp: 70,
    },
  ],
};
