import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "vector-databases-and-pgvector",
  order: 1,
  title: "Vector Databases & pgvector",
  summary:
    "Where the vectors live decides your latency, your filters and your operations. Compare FAISS, Chroma, Qdrant, Weaviate, Pinecone and pgvector, and learn how to run pgvector properly.",
  minutes: 16,

  concept: [
    {
      type: "p",
      text: "Track 3 taught how nearest-neighbour search works. This lesson is about **where you run it**. A vector store has to do more than compare vectors: it must keep them durable, build an approximate index, apply **metadata filters**, accept updates and deletes, and survive restarts. The products differ mainly in *how much of that work they do for you*.",
    },
    {
      type: "table",
      headers: ["Option", "What it is", "Strength", "Watch out for"],
      rows: [
        ["**FAISS**", "a C++ library you call from your process", "very fast, many index types, GPU support", "not a database: you build persistence, filtering and updates yourself"],
        ["**Chroma**", "an embedded or lightweight server store", "tiny setup, great for prototypes and notebooks", "plan the move before you need real multi-tenant scale"],
        ["**Qdrant / Weaviate**", "dedicated open-source vector servers", "rich filtering, hybrid search, built to scale out", "one more system to run, secure and keep in sync with your main data"],
        ["**Pinecone**", "a managed service", "no servers to operate, scales on demand", "cost, data leaves your network, and vendor lock-in"],
        ["**pgvector**", "an extension inside PostgreSQL", "vectors beside your rows: joins, transactions, permissions, backups", "you tune memory and indexes yourself, and very large collections need care"],
      ],
    },
    {
      type: "sorter",
      title: "Which store fits the situation?",
      prompt: "Pick the best starting point for each case.",
      categories: ["Library (FAISS-style)", "Dedicated vector database", "pgvector in Postgres"],
      items: [
        { text: "A research notebook comparing index types on 200,000 vectors, no server wanted", answer: 0, why: "A library gives you raw speed and control without any service to run." },
        { text: "Your app already keeps users, documents and permissions in Postgres, with 2 million chunks", answer: 2, why: "One system, one backup, and permission joins happen in the same query." },
        { text: "Over 100 million vectors, many tenants, and you want autoscaling and advanced filtering out of the box", answer: 1, why: "This is the scale a dedicated engine is built for, and you accept running it." },
        { text: "Deleting a document must remove its metadata row and all its chunk vectors atomically", answer: 2, why: "A single database transaction gives you that guarantee. Two systems need extra reconciliation." },
      ],
    },
    {
      type: "stepper",
      title: "Life of a pgvector query",
      steps: [
        { label: "Store the vector beside the row", detail: "Declare a `vector(768)` column next to the text, document id and tenant id. The embedding is just another column.", items: ["id", "tenant_id", "content", "embedding vector(768)"], mark: [3] },
        { label: "Build an approximate index", detail: "Create an HNSW (or IVFFlat) index on the column, naming the distance operator class so it matches your queries.", items: ["HNSW index", "vector_cosine_ops"], mark: [0] },
        { label: "Embed the question", detail: "Your application converts the question to a vector with the same model used at indexing time.", items: ["question", "query vector"], mark: [1] },
        { label: "Order by distance", detail: "`ORDER BY embedding <=> query LIMIT k` asks the index for the nearest rows. Cosine distance is smaller for closer vectors.", items: ["ORDER BY <=>", "LIMIT k"], mark: [0] },
        { label: "Filter and join", detail: "A `WHERE tenant_id = ...` clause and a join to the documents table run in the same statement, which is the pgvector advantage.", items: ["WHERE tenant_id", "JOIN documents"], mark: [0, 1] },
      ],
      caption: "Same ideas as any vector database; the difference is that it is all one SQL statement.",
    },
  ],

  underTheHood: [
    { type: "h", text: "pgvector in practice" },
    {
      type: "code",
      language: "sql",
      caption: "A minimal multi-tenant chunk table with an HNSW cosine index.",
      code: `CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   INT  NOT NULL,
  document_id INT  NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(768) NOT NULL
);

CREATE INDEX chunks_embedding_hnsw
  ON chunks USING hnsw (embedding vector_cosine_ops);

-- nearest five chunks for one tenant
SELECT id, content, 1 - (embedding <=> $1) AS similarity
FROM chunks
WHERE tenant_id = $2
ORDER BY embedding <=> $1
LIMIT 5;`,
    },
    {
      type: "table",
      headers: ["Operator", "Meaning", "Index operator class"],
      rows: [
        ["`<->`", "Euclidean (L2) distance", "`vector_l2_ops`"],
        ["`<=>`", "cosine distance (0 means identical direction)", "`vector_cosine_ops`"],
        ["`<#>`", "negative inner product", "`vector_ip_ops`"],
      ],
    },
    {
      type: "p",
      text: "**The index only helps if the query matches it.** An index built with `vector_cosine_ops` is used by `<=>`, not by `<->`. Distances sort ascending, so the nearest rows come first, and similarity is `1 - cosine distance`.",
    },
    { type: "h", text: "HNSW or IVFFlat?" },
    {
      type: "ul",
      items: [
        "**HNSW**: a layered graph. Better recall and speed for a given effort, no training step, but slower to build and hungry for memory. The usual default.",
        "**IVFFlat**: clusters the vectors into lists and searches only the nearest few (`probes`). Smaller and faster to build, but it must be built *after* the table has representative data, and recall depends on `lists` and `probes`.",
      ],
    },
    {
      type: "calculator",
      title: "How much memory will the vectors need?",
      inputs: [
        { key: "n", label: "Vectors", min: 100000, max: 50000000, step: 100000, value: 5000000 },
        { key: "d", label: "Dimensions", min: 128, max: 3072, step: 128, value: 1536 },
        { key: "b", label: "Bytes per value (4 = float32)", min: 1, max: 4, step: 1, value: 4 },
        { key: "o", label: "Index overhead", min: 100, max: 300, step: 10, value: 150, unit: "%" },
      ],
      outputs: [
        { label: "Raw vectors (GB)", formula: "n * d * b / 1e9", format: "fixed2" },
        { label: "With index overhead (GB)", formula: "n * d * b * (o / 100) / 1e9", format: "fixed2" },
      ],
      note: "HNSW performs best when the graph fits in RAM. Halving the bytes per value (quantization) or the dimensions are the two big levers.",
    },
    { type: "h", text: "The filter trap" },
    {
      type: "p",
      text: "An approximate index returns its nearest candidates first, and the `WHERE` clause is applied **afterwards**. If a tenant owns 1% of the rows, most candidates are discarded and you may get **fewer than k results**, or none. Fixes: raise the search breadth (`hnsw.ef_search`), use your version's iterative index scans, build a **partial index per large tenant**, or **partition** the table by tenant.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Recall silently drops with selective filters",
      text: "A filtered query can return top-k that look fine but miss better matches. Test recall with filters on, not only without them.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"which vector database would you choose?\"",
      text: "Do not name a favourite. State the constraints (scale, filters, existing stack, team, budget), then pick: pgvector when data already lives in Postgres and scale is moderate, a dedicated engine for very large or high-QPS workloads, a managed service when you want no operations, and a library for experiments.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Insert chunks and run a tenant-filtered nearest-neighbour search with psycopg.",
    code: `import psycopg
from pgvector.psycopg import register_vector

conn = psycopg.connect("postgresql://localhost/rag")
register_vector(conn)          # lets you pass Python lists / numpy arrays as vectors


def add_chunk(tenant_id: int, document_id: int, text: str, vector: list[float]) -> None:
    conn.execute(
        "INSERT INTO chunks (tenant_id, document_id, content, embedding) VALUES (%s, %s, %s, %s)",
        (tenant_id, document_id, text, vector),
    )


def search(tenant_id: int, query_vector: list[float], k: int = 5):
    # <=> is cosine distance: smaller is closer, so ORDER BY ascending.
    return conn.execute(
        """
        SELECT id, content, 1 - (embedding <=> %s) AS similarity
        FROM chunks
        WHERE tenant_id = %s
        ORDER BY embedding <=> %s
        LIMIT %s
        """,
        (query_vector, tenant_id, query_vector, k),
    ).fetchall()


# Tune the recall/speed trade-off per query when needed:
conn.execute("SET hnsw.ef_search = 100")`,
  },

  interview: [
    {
      question: "When would you choose pgvector over a dedicated vector database?",
      answer:
        "When the data already lives in Postgres and the collection is in the low millions to tens of millions of vectors. I get transactions, joins to permissions and metadata, one backup story and one system to operate. I would move to a dedicated engine if I needed very high query rates, hundreds of millions of vectors, or specialised features, and I would measure before deciding.",
      weakAnswer:
        "Always use a dedicated vector database because it is made for vectors. — That adds a system to run and keep in sync without checking that you need it.",
    },
    {
      question: "HNSW versus IVFFlat: how do you choose?",
      answer:
        "HNSW gives better recall and latency for the same effort and needs no training, at the cost of build time and memory, so it is my default. IVFFlat builds faster and uses less memory, but it needs representative data before the index is built and its recall depends on the number of lists and probes. I would benchmark both on my own data.",
    },
    {
      question: "A filtered vector query returns only two rows when you asked for ten. Why, and how do you fix it?",
      answer:
        "The approximate index finds its nearest candidates first and the filter is applied afterwards, so a selective filter discards most of them. I would raise the search breadth, use iterative scans if my version supports them, add a partial index or partition for large tenants, and check recall with filters enabled.",
    },
    {
      question: "Your embeddings are 1,536-dimension float32 and you have 20 million chunks. What do you worry about?",
      answer:
        "Memory first: 20 million x 1,536 x 4 bytes is about 123 GB before index overhead, which will not fit a small instance. Options are a smaller embedding dimension, lower-precision storage or quantization, partitioning across nodes, or a dedicated engine built to shard. I would also measure how recall changes with each reduction.",
    },
    {
      question: "How do you keep the vector store consistent with the source documents?",
      answer:
        "Store a document id and version with every chunk and update by replacing all chunks of a document in one transaction, so there are never mixed versions. Handle deletes the same way. With a separate vector database I would need an outbox or reconciliation job, which is a major reason to keep vectors in Postgres when I can.",
    },
  ],

  challenges: [
    {
      id: "ar-1-quiz",
      kind: "quiz",
      title: "Checkpoint: vector databases",
      blurb: "Five questions on choosing and running a vector store.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What is FAISS best described as?",
          options: [
            "A managed cloud vector database",
            "A fast similarity-search library you run inside your own process",
            "A SQL extension",
            "An embedding model",
          ],
          correctIndex: 1,
          explanation:
            "FAISS is a library. Persistence, filtering and updates are your responsibility.",
        },
        {
          id: "q2",
          prompt: "Which pgvector operator returns cosine distance?",
          options: ["`<->`", "`<=>`", "`<#>`", "`||`"],
          correctIndex: 1,
          explanation:
            "`<->` is Euclidean, `<=>` is cosine distance and `<#>` is negative inner product.",
        },
        {
          id: "q3",
          prompt: "Your query uses `<=>` but the index was built with `vector_l2_ops`. What happens?",
          options: [
            "It works and is faster",
            "The index is not used for that query, so it falls back to a slower scan",
            "The database converts the metric automatically",
            "The query errors",
          ],
          correctIndex: 1,
          explanation:
            "The operator class must match the operator in ORDER BY for the index to apply.",
        },
        {
          id: "q4",
          prompt: "Why can a selective `WHERE` filter on an HNSW query return fewer than k rows?",
          options: [
            "HNSW cannot be filtered",
            "Candidates are found first and the filter removes many of them afterwards",
            "The vectors are corrupted",
            "LIMIT is ignored with filters",
          ],
          correctIndex: 1,
          explanation:
            "Post-filtering an approximate candidate list can leave too few rows. Raise the search breadth, partition, or use iterative scans.",
        },
        {
          id: "q5",
          prompt: "Which is the strongest reason to put vectors in the same Postgres as your application data?",
          options: [
            "Postgres is always faster than specialised engines",
            "Transactions and joins: a document, its permissions and its chunks stay consistent in one system",
            "Postgres has unlimited scale",
            "It avoids needing an embedding model",
          ],
          correctIndex: 1,
          explanation:
            "One system and one transaction boundary remove a whole class of sync problems.",
        },
      ],
    },
    {
      id: "ar-1-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: nearest-neighbour SQL",
      blurb: "The assistant keeps retrieving the least relevant chunks. Find the line.",
      language: "python",
      lines: [
        "def search(conn, query_vec, k=5):",
        "    sql = \"\"\"SELECT id, content FROM chunks",
        "             ORDER BY embedding <=> %s::vector DESC",
        "             LIMIT %s\"\"\"",
        "    return conn.execute(sql, (query_vec, k)).fetchall()",
      ],
      buggyLine: 3,
      reasons: [
        "the cast to vector is not allowed",
        "<=> is a distance, so DESC puts the farthest rows first; nearest-first needs ascending order",
        "LIMIT must come before ORDER BY",
        "fetchall cannot be used with vectors",
      ],
      correctReasonIndex: 1,
      explanation:
        "Smaller distance means closer. Sorting descending returns the least similar chunks, and it also prevents the index from being used for its nearest-neighbour scan.",
      fix: "ORDER BY embedding <=> %s::vector",
      xp: 40,
    },
    {
      id: "ar-1-code",
      kind: "code",
      title: "Code challenge: vector memory estimate",
      blurb: "Estimate the memory for a vector collection and round it to two decimals.",
      functionName: "vectorMemoryGB",
      starter: `/**
 * vectorMemoryGB(vectors, dims, bytesPerValue, overheadFactor)
 *
 * Memory in GB (1 GB = 1e9 bytes) for the vectors, multiplied by an index
 * overhead factor (1 = no overhead, 1.5 = 50% extra).
 * Round to two decimal places.
 */
function vectorMemoryGB(vectors, dims, bytesPerValue, overheadFactor) {
  // your code here
}`,
      tests: [
        { name: "1M x 768 float32", args: [1000000, 768, 4, 1], expected: 3.07 },
        { name: "with 50% overhead", args: [1000000, 768, 4, 1.5], expected: 4.61 },
        { name: "int8 storage", args: [10000000, 1536, 1, 1], expected: 15.36 },
        { name: "small collection", args: [100000, 128, 4, 1], expected: 0.05 },
        { name: "25% overhead", args: [5000000, 1536, 4, 1.25], expected: 38.4 },
      ],
      hints: [
        "Raw bytes are vectors x dims x bytesPerValue.",
        "Multiply by overheadFactor, divide by 1e9 for GB.",
        "Round with Math.round(x * 100) / 100.",
      ],
      solution: `function vectorMemoryGB(vectors, dims, bytesPerValue, overheadFactor) {
  const gb = (vectors * dims * bytesPerValue * overheadFactor) / 1e9;
  return Math.round(gb * 100) / 100;
}`,
      xp: 70,
    },
  ],
};
