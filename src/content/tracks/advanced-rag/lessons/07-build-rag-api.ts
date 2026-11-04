import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "build-a-rag-api-fastapi-pgvector",
  order: 7,
  title: "Build It: FastAPI, pgvector, Hybrid Search & Streaming",
  summary:
    "Put the whole track together: an ingestion endpoint, hybrid search in one SQL statement, a streaming answer endpoint, and a React client that reads the stream.",
  minutes: 20,

  concept: [
    {
      type: "p",
      text: "This lesson is the blueprint for a complete, small, production-shaped RAG service. It uses **Python and FastAPI** for the API, **PostgreSQL with pgvector** for chunks, vectors and metadata, and **server-sent events** to stream the answer to a **React** front end. Each piece connects to an earlier lesson, so use it as a checklist as you build.",
    },
    {
      type: "table",
      headers: ["Part", "Choice", "Why"],
      rows: [
        ["**API**", "FastAPI with async endpoints", "native streaming responses, typed request models, easy tests"],
        ["**Storage**", "Postgres + pgvector", "chunks, vectors, permissions and metadata in one transactional system (lesson 1)"],
        ["**Search**", "vector search and full-text search fused with RRF", "catches both meaning and exact tokens (Track 3)"],
        ["**Answering**", "prompt with numbered sources, stream tokens as SSE", "grounded, cited, and responsive (Tracks 4 and 8)"],
        ["**Client**", "React reading the stream", "show tokens as they arrive, then the citations"],
      ],
    },
    {
      type: "sorter",
      title: "Ingestion path or query path?",
      prompt: "Decide where each step belongs.",
      categories: ["Ingestion (once per document)", "Query (every question)"],
      items: [
        { text: "Hash the file content to skip documents you already indexed", answer: 0, why: "Idempotent ingestion belongs to the write path." },
        { text: "Split the text into chunks with overlap", answer: 0, why: "Chunking happens once, when the document is added." },
        { text: "Embed the user's question", answer: 1, why: "The question is embedded at request time, with the same model used for documents." },
        { text: "Stream tokens to the browser as server-sent events", answer: 1, why: "Streaming is part of answering a question." },
        { text: "Write all chunk rows for a document in one transaction", answer: 0, why: "Atomic writes avoid half-indexed documents." },
        { text: "Rerank candidates and build the prompt with numbered sources", answer: 1, why: "These are query-time quality stages." },
      ],
    },
    {
      type: "stepper",
      title: "One question through the service",
      steps: [
        { label: "Authenticate", detail: "A dependency resolves the user and their tenant from the session or token. The tenant never comes from the request body.", items: ["token", "user.tenant_id"], mark: [1] },
        { label: "Embed the question", detail: "Call the embedding model without blocking the event loop, using an async client or a worker thread.", items: ["question", "vector"], mark: [1] },
        { label: "Hybrid search in SQL", detail: "One statement runs a vector ranking and a full-text ranking filtered by tenant, then fuses them with reciprocal rank fusion.", items: ["vector top 20", "text top 20", "RRF top 5"], mark: [2] },
        { label: "Build the prompt", detail: "Number each passage as a source, tell the model to answer only from them and cite by number, and to say when the sources are insufficient.", items: ["[1] ...", "[2] ...", "instructions"], mark: [2] },
        { label: "Stream the answer", detail: "Yield tokens as SSE events as they arrive, then send a final event with the source list, so the UI can render citations.", items: ["event: token", "event: sources", "event: done"], mark: [0, 1, 2] },
      ],
      caption: "Every earlier lesson appears somewhere in this path.",
    },
  ],

  underTheHood: [
    { type: "h", text: "The schema" },
    {
      type: "code",
      language: "sql",
      caption: "Chunks with a vector column and a generated full-text column.",
      code: `CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    INT  NOT NULL,
  title        TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  UNIQUE (tenant_id, content_hash)            -- idempotent ingestion
);

CREATE TABLE chunks (
  id          BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id   INT    NOT NULL,
  position    INT    NOT NULL,
  content     TEXT   NOT NULL,
  embedding   vector(768) NOT NULL,
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

CREATE INDEX chunks_vec ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX chunks_tsv ON chunks USING gin (tsv);
CREATE INDEX chunks_tenant ON chunks (tenant_id);`,
    },
    { type: "h", text: "Hybrid search in one statement" },
    {
      type: "code",
      language: "sql",
      caption: "Vector and keyword rankings fused with reciprocal rank fusion (k = 60).",
      code: `WITH vec AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1) AS rank
  FROM chunks WHERE tenant_id = $3
  ORDER BY embedding <=> $1 LIMIT 20
),
txt AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(tsv, q) DESC) AS rank
  FROM chunks, websearch_to_tsquery('english', $2) q
  WHERE tenant_id = $3 AND tsv @@ q
  ORDER BY ts_rank_cd(tsv, q) DESC LIMIT 20
)
SELECT c.id, c.content,
       COALESCE(1.0 / (60 + vec.rank), 0) + COALESCE(1.0 / (60 + txt.rank), 0) AS score
FROM chunks c
LEFT JOIN vec ON vec.id = c.id
LEFT JOIN txt ON txt.id = c.id
WHERE vec.id IS NOT NULL OR txt.id IS NOT NULL
ORDER BY score DESC
LIMIT 5;`,
    },
    {
      type: "p",
      text: "Parameters: **$1** is the query vector, **$2** the raw question text, **$3** the tenant id taken from the authenticated user.",
    },
    { type: "h", text: "The React side" },
    {
      type: "code",
      language: "tsx",
      caption: "Read a streamed response and append tokens as they arrive.",
      code: `async function ask(question: string, onToken: (t: string) => void, onSources: (s: unknown[]) => void) {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok || !res.body) throw new Error("Request failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\\n\\n");      // SSE events end with a blank line
    buffer = events.pop() ?? "";               // keep any incomplete event for the next read
    for (const raw of events) {
      const type = /^event: (.+)$/m.exec(raw)?.[1];
      const data = /^data: (.+)$/m.exec(raw)?.[1];
      if (!data) continue;
      if (type === "token") onToken(JSON.parse(data));
      if (type === "sources") onSources(JSON.parse(data));
    }
  }
}`,
    },
    {
      type: "calculator",
      title: "How long will ingestion take?",
      inputs: [
        { key: "docs", label: "Documents", min: 100, max: 50000, step: 100, value: 10000 },
        { key: "perDoc", label: "Chunks per document", min: 5, max: 100, step: 5, value: 40 },
        { key: "batch", label: "Chunks per embedding request", min: 16, max: 256, step: 16, value: 64 },
        { key: "callMs", label: "Embedding request latency", min: 100, max: 2000, step: 100, value: 400, unit: "ms" },
        { key: "conc", label: "Concurrent requests", min: 1, max: 32, step: 1, value: 4 },
      ],
      outputs: [
        { label: "Total chunks", formula: "docs * perDoc", format: "int" },
        { label: "Embedding requests", formula: "Math.ceil(docs * perDoc / batch)", format: "int" },
        { label: "Time (minutes)", formula: "Math.ceil(docs * perDoc / batch) * callMs / conc / 60000", format: "fixed1" },
      ],
      note: "Batching and concurrency are the two levers. Respect the provider's rate limits (Track 8) and make ingestion resumable.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Never block the event loop",
      text: "A synchronous HTTP call inside an `async def` endpoint stalls every other request on that worker. Use an async client, or move blocking work to a thread with `run_in_threadpool`.",
    },
    {
      type: "callout",
      tone: "key",
      title: "Security checks to build in from the start",
      text: "Take the tenant from the authenticated user, never the request body. Filter by tenant inside the SQL. Treat document text as untrusted data in the prompt (Track 2). Cap question length, rate limit per user, and log traces with sensitive text handled per policy.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"walk me through your RAG service design\"",
      text: "Follow the two paths: ingestion (parse, chunk, embed in batches, write in one transaction, idempotent by content hash) and query (authenticate, embed without blocking, hybrid search filtered by tenant, rerank, build a cited prompt, stream SSE). Then name your evals, monitoring and how you would scale each part.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A compact FastAPI service: tenant-safe hybrid search and a streamed, cited answer.",
    code: `import json
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import asyncpg


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(dsn=DATABASE_URL, min_size=2, max_size=10)
    yield
    await app.state.pool.close()

app = FastAPI(lifespan=lifespan)


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)    # cap what users can send


def sse(event: str, data) -> str:
    return f"event: {event}\\ndata: {json.dumps(data)}\\n\\n"   # a blank line ends the event


@app.post("/query")
async def query(req: QueryRequest, user=Depends(current_user)):
    vector = await embed_async(req.question)                # async client: never blocks the loop

    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(HYBRID_SQL, vector, req.question, user.tenant_id)   # tenant from auth

    sources = [{"n": i + 1, "id": r["id"], "text": r["content"]} for i, r in enumerate(rows)]

    async def events():
        async for token in stream_llm(build_prompt(req.question, sources)):
            yield sse("token", token)
        yield sse("sources", [{"n": s["n"], "id": s["id"]} for s in sources])
        yield sse("done", True)

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})`,
  },

  interview: [
    {
      question: "Describe the ingestion path of a production RAG service.",
      answer:
        "Receive the file, hash its content to skip duplicates, parse it into clean text with metadata, chunk it, embed the chunks in batches with limited concurrency, and write the document and all its chunks in one transaction. Updates replace every chunk of the document atomically. I make it resumable, rate-limit-aware and observable, and run it as a background job rather than in the request path.",
    },
    {
      question: "How do you implement hybrid search with Postgres and pgvector?",
      answer:
        "Keep a vector column with an HNSW index and a generated tsvector column with a GIN index. One query ranks by vector distance and by full-text rank, both filtered by tenant, then fuses the two rankings with reciprocal rank fusion and returns the top few. It gets meaning and exact-token matching in a single round trip.",
    },
    {
      question: "How do you stream a RAG answer to a React client?",
      answer:
        "The FastAPI endpoint returns a StreamingResponse of server-sent events, yielding token events as the model produces them and a final sources event for citations. The client reads the response body with a stream reader, splits on blank lines, keeps incomplete events in a buffer, and appends tokens to the UI. I also disable proxy buffering so tokens are not held back.",
    },
    {
      question: "Where can an async FastAPI RAG service become slow without any obvious error?",
      answer:
        "Blocking calls inside async handlers, such as a synchronous embedding client, which stall the whole event loop. Also an undersized database pool, unbatched embedding calls, a missing index or an index that does not match the operator, and proxies that buffer the stream. I would find them with traces and per-stage timings.",
    },
    {
      question: "How do you make sure one tenant can never see another tenant's chunks?",
      answer:
        "The tenant comes from the authenticated identity, never from the request body. It is a WHERE condition in the same SQL statement as the vector and text search, backed by an index, and I can add Postgres row-level security as a second layer. I would add tests that query as one tenant and assert no rows from another, and check the filter's effect on recall.",
    },
  ],

  challenges: [
    {
      id: "ar-7-quiz",
      kind: "quiz",
      title: "Checkpoint: building the service",
      blurb: "Five questions on the FastAPI and pgvector build.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Why use `StreamingResponse` with `text/event-stream` for the answer endpoint?",
          options: [
            "To make the database faster",
            "To send tokens to the browser as they are generated instead of waiting for the full answer",
            "To avoid authentication",
            "To compress embeddings",
          ],
          correctIndex: 1,
          explanation:
            "Server-sent events let the client render the answer progressively.",
        },
        {
          id: "q2",
          prompt: "Where should the tenant id used in the SQL filter come from?",
          options: [
            "A field in the JSON request body",
            "The authenticated user's identity on the server",
            "A query parameter",
            "A cookie value the client can edit",
          ],
          correctIndex: 1,
          explanation:
            "Anything the client supplies can be forged. The server must derive the tenant from authentication.",
        },
        {
          id: "q3",
          prompt: "What makes ingestion idempotent in the schema shown?",
          options: [
            "The HNSW index",
            "A unique constraint on tenant and content hash",
            "The tsvector column",
            "Row-level security",
          ],
          correctIndex: 1,
          explanation:
            "Re-uploading the same content hits the unique constraint, so it can be skipped instead of duplicated.",
        },
        {
          id: "q4",
          prompt: "A synchronous embedding call is made inside an `async def` endpoint. What is the effect?",
          options: [
            "Nothing, Python handles it",
            "It blocks the event loop, so other requests on the worker wait",
            "It makes the response stream faster",
            "It breaks the database pool",
          ],
          correctIndex: 1,
          explanation:
            "Use an async client or run blocking work in a thread pool.",
        },
        {
          id: "q5",
          prompt: "Why send a final `sources` event after the tokens?",
          options: [
            "The model cannot cite",
            "So the client can render citations alongside the streamed answer",
            "To close the database connection",
            "To embed the answer",
          ],
          correctIndex: 1,
          explanation:
            "Citations are part of a trustworthy answer, and a separate event keeps them structured.",
        },
      ],
    },
    {
      id: "ar-7-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: the slow endpoint",
      blurb: "Under load every request slows down together, even though CPU is idle. Find the line.",
      language: "python",
      lines: [
        "@app.post(\"/query\")",
        "async def query(req: QueryRequest, user=Depends(auth)):",
        "    vec = sync_client.embed(req.question)",
        "    rows = await db.fetch(SEARCH_SQL, vec, user.tenant_id)",
        "    return StreamingResponse(stream_answer(req.question, rows))",
      ],
      buggyLine: 3,
      reasons: [
        "the embedding must be computed after the database fetch",
        "a blocking synchronous call inside an async handler stalls the event loop, so every other request waits for it",
        "user.tenant_id should come from the request body",
        "StreamingResponse cannot be returned from async functions",
      ],
      correctReasonIndex: 1,
      explanation:
        "Async handlers must not call blocking code. Use an async client or run the call in a worker thread.",
      fix: "vec = await async_client.embed(req.question)   # or: await run_in_threadpool(sync_client.embed, ...)",
      xp: 40,
    },
    {
      id: "ar-7-code",
      kind: "code",
      title: "Code challenge: reciprocal rank fusion",
      blurb: "Merge several ranked lists into one using reciprocal rank fusion.",
      functionName: "reciprocalRankFusion",
      starter: `/**
 * reciprocalRankFusion(lists, k)
 *
 *   lists: an array of ranked arrays of ids, best first
 *   k:     the smoothing constant (commonly 60)
 *
 * Each id scores 1 / (k + rank) in every list that contains it, where the
 * first item has rank 1. Add the scores across lists.
 *
 * Return all ids sorted by total score, highest first.
 * Break ties by id in ascending alphabetical order.
 */
function reciprocalRankFusion(lists, k) {
  // your code here
}`,
      tests: [
        { name: "documents both lists like rise", args: [[["A", "B", "C"], ["C", "A", "D"]], 60], expected: ["A", "C", "B", "D"] },
        { name: "single list keeps its order", args: [[["x", "y", "z"]], 60], expected: ["x", "y", "z"] },
        { name: "no lists", args: [[], 60], expected: [] },
        { name: "ties broken alphabetically", args: [[["B"], ["A"]], 60], expected: ["A", "B"] },
        { name: "symmetric lists tie", args: [[["x", "y"], ["y", "x"]], 60], expected: ["x", "y"] },
        { name: "an item in more lists wins", args: [[["a", "b"], ["c", "b"], ["d", "b"]], 60], expected: ["b", "a", "c", "d"] },
      ],
      hints: [
        "Keep an object that maps each id to its running score.",
        "For each list, add 1 / (k + index + 1) to the id, because index starts at 0.",
        "Sort ids with a comparator: higher score first, then a.localeCompare(b) for ties.",
      ],
      solution: `function reciprocalRankFusion(lists, k) {
  const scores = {};
  for (const list of lists) {
    list.forEach((id, i) => {
      scores[id] = (scores[id] || 0) + 1 / (k + i + 1);
    });
  }
  return Object.keys(scores).sort((a, b) => {
    const d = scores[b] - scores[a];
    if (Math.abs(d) > 1e-12) return d;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}`,
      xp: 70,
    },
  ],
};
