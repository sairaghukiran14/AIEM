import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "what-embeddings-are",
  order: 1,
  title: "What Embeddings Are",
  summary:
    "An embedding turns text into a point in space where distance means difference in meaning. It is the foundation of semantic search and RAG.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "An **embedding model** maps a piece of text to a fixed-length list of numbers, a **vector**, such as 384, 1024 or 3072 floats. The model is trained so that texts with similar meaning land **close together** and unrelated texts land far apart. Search then becomes geometry: embed the query, find the nearest document vectors.",
    },
    {
      type: "visual",
      key: "embedding-space",
      caption:
        "A 2-D toy. Drag the query and watch its nearest neighbours change. Real embeddings work the same way in hundreds or thousands of dimensions.",
    },
    { type: "h", text: "What embeddings are good for" },
    {
      type: "ul",
      items: [
        "**Semantic search**: \"how do I get my money back\" finds the page titled \"Refund policy\" with no shared words.",
        "**Retrieval for RAG** (Track 4): fetch the passages most relevant to a question.",
        "**Deduplication and clustering**: group near-identical support tickets.",
        "**Classification with few labels**: nearest-neighbour over labelled examples.",
        "**Recommendations**: items near the ones a user liked.",
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "Embeddings are not generation",
      text: "An embedding model reads text and returns a vector. It does not write anything. It is a different, smaller kind of model from the chat LLM you have used in Tracks 1 and 2, trained for a different objective.",
    },
    {
      type: "sorter",
      title: "Embeddings or exact match?",
      prompt: "Pick the better first tool for each job.",
      categories: ["Embeddings", "Exact / keyword"],
      items: [
        { text: "Find help articles that answer a differently worded question", answer: 0, why: "Paraphrases share meaning, not words. That is what embeddings capture." },
        { text: "Look up the order with ID ORD-48213", answer: 1, why: "An identifier has no semantics to generalise. Exact match is correct and cheap." },
        { text: "Group thousands of tickets about the same underlying issue", answer: 0, why: "Clustering by meaning is a core embedding use." },
        { text: "Find the log line containing error code E_CONN_RESET", answer: 1, why: "Rare literal tokens are best found by keyword search." },
        { text: "Suggest similar products from their descriptions", answer: 0, why: "Descriptions that mean similar things embed near each other." },
      ],
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "Most embedding models are Transformer **encoders** (the same attention mechanism from Track 1, without the causal mask). The text goes through the layers, then the per-token outputs are **pooled** (averaged, or taken from a special token) into one vector.",
    },
    { type: "h", text: "How they are trained" },
    {
      type: "ol",
      items: [
        "Collect many **positive pairs**: a question and its answer, a title and its body, a query and a clicked result.",
        "Train with a **contrastive loss**: pull each pair's vectors together and push the pair away from every other item in the batch (the **negatives**).",
        "Add **hard negatives**: items that look relevant but are not, so the model learns fine distinctions.",
        "Usually **normalise** vectors to length 1, so only direction carries meaning.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Vectors from different models are not comparable",
      text: "Each model defines its own space. Dimension 17 means something in one model and nothing in another. Queries and documents must be embedded with the **same model and version**, and switching models means re-embedding the whole corpus.",
    },
    { type: "h", text: "Practical details that matter" },
    {
      type: "ul",
      items: [
        "**Input limit**: each model accepts a maximum number of tokens (Track 1). Longer text is truncated or errors, which is why chunking exists (lesson 3).",
        "**Query versus document**: many models expect a prefix or instruction for queries (\"query: ...\") and another for documents. Skipping it quietly lowers quality.",
        "**Known weak spots**: negation (\"covered\" vs \"not covered\"), exact numbers, rare identifiers and very short queries. Hybrid search (lesson 5) exists for these.",
        "**Dimensions cost money**: storage and search time scale with the number of dimensions and the bytes per value.",
      ],
    },
    {
      type: "calculator",
      title: "What does the index cost to store?",
      inputs: [
        { key: "n", label: "Vectors (chunks)", min: 100000, max: 100000000, step: 100000, value: 5000000 },
        { key: "dims", label: "Dimensions", min: 128, max: 4096, step: 128, value: 1024 },
        { key: "bytes", label: "Bytes per value (4 = float32, 1 = int8)", min: 1, max: 4, step: 1, value: 4 },
      ],
      outputs: [
        { label: "Raw vector storage (GB)", formula: "n * dims * bytes / 1e9", format: "fixed1" },
        { label: "Same index at 4x fewer bytes (GB)", formula: "n * dims * Math.max(1, bytes / 4) / 1e9", format: "fixed1" },
      ],
      note: "This is only the raw vectors. Indexes add overhead on top (lesson 4), and RAM is the usual limit for fast search.",
      caption: "Storage is roughly vectors x dimensions x bytes per value.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to explain it in one breath",
      text: "An embedding model maps text to a vector so that similar meaning means nearby vectors, trained contrastively on pairs. You search by embedding the query and finding nearest neighbours, but only with the same model for both sides, and not as a replacement for exact match on identifiers.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Embed, normalise, and search by dot product. With unit vectors, dot product equals cosine.",
    code: `import numpy as np
from anthropic import Anthropic  # use your provider's embeddings endpoint

# Pseudocode for the call; every provider has an equivalent.
def embed(texts: list[str], kind: str) -> np.ndarray:
    # kind is "query" or "document": many models want to know which.
    resp = embeddings_client.create(model=EMBED_MODEL, input=texts, input_type=kind)
    return np.array([item.embedding for item in resp.data], dtype=np.float32)


def normalise(m: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(m, axis=1, keepdims=True)
    return m / np.maximum(norms, 1e-12)        # avoid dividing by zero


docs = ["Refund policy: money back within 30 days.",
        "How to reset your password.",
        "Our office is in Berlin."]
doc_vecs = normalise(embed(docs, kind="document"))        # index once, store
query_vec = normalise(embed(["how do I get my money back"], kind="query"))[0]

scores = doc_vecs @ query_vec          # unit vectors: dot product == cosine similarity
best = int(np.argmax(scores))
print(docs[best], float(scores[best]))`,
  },

  interview: [
    {
      question: "What is an embedding and what is it used for?",
      answer:
        "An embedding is a fixed-length vector produced by a model so that texts with similar meaning are close together in the vector space. You use it for semantic search and RAG retrieval, deduplication, clustering, and nearest-neighbour classification. Search works by embedding the query and finding the closest document vectors.",
      weakAnswer:
        "It converts words to numbers. — True of any encoding; it misses the key property that distance reflects meaning.",
    },
    {
      question: "How are embedding models trained?",
      answer:
        "With a contrastive objective over positive pairs such as question-answer or title-body. The loss pulls each pair's vectors together and pushes them away from other items in the batch, with hard negatives added so the model learns subtle distinctions. Outputs are typically pooled from the encoder's token states and normalised.",
      followUp: "Why do hard negatives matter?",
    },
    {
      question: "Why must queries and documents use the same embedding model?",
      answer:
        "Each model defines its own vector space, so coordinates and distances from different models are not comparable. Mixing them gives scores that look plausible and mean nothing. The practical consequences are that I store the model id and version with the index, assert they match at query time, and re-embed everything when I change models.",
    },
    {
      question: "Where do embeddings fail, and what do you do about it?",
      answer:
        "They are weak on negation, exact numbers, rare identifiers and very short queries, because meaning-based similarity blurs literal tokens. I combine them with keyword search (hybrid), add a reranker, apply metadata filters for structured constraints, and measure retrieval on my own labelled queries rather than trusting leaderboard scores.",
    },
    {
      question: "How do you estimate the storage for a vector index?",
      answer:
        "Vectors times dimensions times bytes per value. Five million chunks at 1024 dimensions in float32 is about 20 GB of raw vectors, before the index structure's overhead. I reduce it with fewer dimensions, lower precision such as int8, or product quantisation, and check the recall cost of each.",
    },
  ],

  challenges: [
    {
      id: "es-1-quiz",
      kind: "quiz",
      title: "Checkpoint: what embeddings are",
      blurb: "Five questions on the idea and its limits.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What property does a good embedding model give its vectors?",
          options: [
            "Each dimension corresponds to a word",
            "Texts with similar meaning are close together",
            "Longer texts always have larger vectors",
            "They can be converted back into the original text",
          ],
          correctIndex: 1,
          explanation:
            "Closeness reflects semantic similarity. Dimensions are not interpretable words, and embeddings are not invertible in general.",
        },
        {
          id: "q2",
          prompt: "You re-embed only your documents with a newer model but keep embedding queries with the old one. What happens?",
          options: [
            "Results improve because the documents are newer",
            "Nothing, vectors from all models are compatible",
            "Scores become meaningless because the two sides live in different spaces",
            "The index rejects the queries",
          ],
          correctIndex: 2,
          explanation:
            "Vectors from different models are not comparable. Queries and documents must share one model and version.",
        },
        {
          id: "q3",
          prompt: "Which job is the weakest fit for embedding search alone?",
          options: [
            "Finding articles that answer a reworded question",
            "Looking up a record by an exact order ID",
            "Grouping similar support tickets",
            "Suggesting similar products",
          ],
          correctIndex: 1,
          explanation:
            "An identifier has no meaning to generalise. Exact or keyword lookup is correct.",
        },
        {
          id: "q4",
          prompt: "A document is longer than the embedding model's token limit. What is the usual consequence?",
          options: [
            "The vector is automatically averaged across all parts",
            "The extra text is truncated or the call errors, which is why you chunk documents",
            "The model switches to a larger context",
            "The vector is split into two",
          ],
          correctIndex: 1,
          explanation:
            "Embedding models have an input limit, so documents are split into chunks sized to fit.",
        },
        {
          id: "q5",
          prompt: "5 million vectors, 1024 dimensions, float32. Roughly how much raw storage?",
          options: ["About 2 GB", "About 20 GB", "About 200 GB", "About 2 TB"],
          correctIndex: 1,
          explanation:
            "5,000,000 x 1024 x 4 bytes is about 20.5 GB, before any index overhead.",
        },
      ],
    },
    {
      id: "es-1-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: finding the most similar document",
      blurb: "Long documents win far too often. Find the line.",
      language: "python",
      lines: [
        "def most_similar(query_vec, doc_vecs):",
        "    # doc_vecs: numpy array (n, d), query_vec: (d,)",
        "    scores = doc_vecs @ query_vec          # 'cosine similarity'",
        "    return int(np.argmax(scores))",
      ],
      buggyLine: 3,
      reasons: [
        "argmax should be argmin for similarity",
        "a dot product equals cosine similarity only for unit-length vectors; with unnormalised vectors the longest vector wins regardless of direction",
        "doc_vecs must be transposed first",
        "the function should return the vector, not its index",
      ],
      correctReasonIndex: 1,
      explanation:
        "Dot product mixes direction and magnitude. Unless the embeddings were normalised to length 1, large-norm vectors score high even when they point somewhere else. Normalise both sides, or divide by the norms to get true cosine.",
      fix: "scores = (doc_vecs / norms(doc_vecs)) @ (query_vec / norm(query_vec))",
      xp: 40,
    },
    {
      id: "es-1-code",
      kind: "code",
      title: "Code challenge: normalise a vector",
      blurb: "Scale a vector to unit length. This is the first step before most similarity search.",
      functionName: "normalize",
      starter: `/**
 * Return a new array: the vector scaled to length 1.
 *
 *   normalize([3, 4])   -> [0.6, 0.8]
 *   normalize([0, 0])   -> [0, 0]     (a zero vector stays zero, no NaN)
 *   normalize([-3, 4])  -> [-0.6, 0.8]
 *
 * Do not modify the input array.
 */
function normalize(vec) {
  // your code here
}`,
      tests: [
        { name: "a 3-4-5 triangle", args: [[3, 4]], expected: [0.6, 0.8] },
        { name: "negative components keep their sign", args: [[-3, 4]], expected: [-0.6, 0.8] },
        { name: "an axis vector is unchanged", args: [[1, 0, 0]], expected: [1, 0, 0] },
        { name: "a longer axis vector shrinks to length 1", args: [[2, 0, 0]], expected: [1, 0, 0] },
        { name: "a zero vector stays zero", args: [[0, 0]], expected: [0, 0] },
        { name: "an empty vector stays empty", args: [[]], expected: [] },
      ],
      hints: [
        "The length is the square root of the sum of squares. Math.hypot(...vec) does this.",
        "Divide every component by the length.",
        "Guard the zero-length case first so you never divide by zero.",
      ],
      solution: `function normalize(vec) {
  const length = Math.hypot(...vec);
  if (length === 0) return vec.map(() => 0);
  return vec.map((x) => x / length);
}`,
      xp: 70,
    },
  ],
};
