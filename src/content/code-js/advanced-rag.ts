/** JavaScript versions of this track's lesson code examples, keyed by lesson slug. */
export const advancedRag: Record<string, string> = {
  "vector-databases-and-pgvector": `import pg from "pg";
import pgvector from "pgvector/pg";

const db = new pg.Client({ connectionString: "postgresql://localhost/rag" });
await db.connect();
await pgvector.registerTypes(db);   // lets you pass vectors as parameters

async function addChunk(tenantId, documentId, text, vector) {
  await db.query(
    "INSERT INTO chunks (tenant_id, document_id, content, embedding) VALUES ($1, $2, $3, $4)",
    [tenantId, documentId, text, pgvector.toSql(vector)],
  );
}

async function search(tenantId, queryVector, k = 5) {
  // <=> is cosine distance: smaller is closer, so ORDER BY ascending.
  const { rows } = await db.query(
    \`SELECT id, content, 1 - (embedding <=> $1) AS similarity
     FROM chunks
     WHERE tenant_id = $2
     ORDER BY embedding <=> $1
     LIMIT $3\`,
    [pgvector.toSql(queryVector), tenantId, k],
  );
  return rows;
}

// Tune the recall/speed trade-off per query when needed:
await db.query("SET hnsw.ef_search = 100");`,

  "advanced-retrieval-techniques": `async function contextualise(chunk, document, llm) {
  const prompt =
    \`Here is a document:\\n<document>\\n\${document}\\n</document>\\n\` +
    \`Here is a chunk from it:\\n<chunk>\\n\${chunk}\\n</chunk>\\n\` +
    "Write one or two sentences that situate the chunk within the document " +
    "(entity, period, section). Reply with only that context.";
  return (await llm(prompt)) + " " + chunk;   // index THIS text, not the raw chunk
}

async function indexDocument(docId, document, chunks, llm, embed, store) {
  for (const [i, chunk] of chunks.entries()) {
    const text = await contextualise(chunk, document, llm);
    await store.add({ id: \`\${docId}:\${i}\`, text, vector: await embed(text), parentId: docId });
  }
}

async function retrieveParents(question, embed, store, k = 8, maxParents = 3) {
  const hits = await store.search(await embed(question), k);   // small chunks, best first
  const seen = new Set();
  const parents = [];
  for (const hit of hits) {
    if (!seen.has(hit.parentId)) {                             // keep rank order, drop repeats
      seen.add(hit.parentId);
      parents.push(await store.getParent(hit.parentId));
    }
    if (parents.length === maxParents) break;
  }
  return parents;
}`,

  "rag-architectures-naive-to-modular": `// Each stage is just a function, so any one can be swapped without touching the rest:
//   retrieve(query, k) -> docs
//   rerank(query, docs, topN) -> docs
//   generate(question, docs) -> text

function route(question) {
  const q = question.trim().toLowerCase();
  if (["hi", "hello", "thanks"].some((word) => q.startsWith(word))) return "direct";
  if (q.includes(" vs ") || q.split("?").length - 1 >= 2 || q.includes("compare")) return "multi_step";
  return "single";                            // safe default
}

async function answer(question, { retrieve, rerank, generate, rewrite, decompose }) {
  const path = route(question);
  logRoute(question, path);                   // so wrong routes can be found later

  if (path === "direct") return generate(question, []);   // no retrieval at all

  const subQuestions = path === "multi_step" ? await decompose(question) : [question];
  const evidence = [];
  for (const sq of subQuestions) {
    const candidates = await retrieve(await rewrite(sq), 20);
    evidence.push(...(await rerank(sq, candidates, 4)));
  }
  return generate(question, evidence);
}`,

  "corrective-self-and-agentic-rag": `function gradeAction(scores, upper = 0.7, lower = 0.3) {
  const best = scores.length ? Math.max(...scores) : 0;
  if (best >= upper) return "use";
  if (best < lower) return "fallback";
  return "refine";
}

async function correctiveAnswer(question, { retrieve, grade, rewrite, webSearch, llm }, maxRounds = 2) {
  let query = question;
  for (let round = 0; round <= maxRounds; round++) {
    let docs = await retrieve(query);
    const scores = await Promise.all(docs.map((d) => grade(question, d)));
    const action = gradeAction(scores);

    if (action === "use") {
      const good = docs.filter((_, i) => scores[i] >= 0.3);    // drop the poor ones
      return llm(question, good);
    }

    if (action === "fallback") {
      docs = await webSearch(question);                        // a different source
      return docs.length ? llm(question, docs) : "I could not find a reliable answer.";
    }

    query = await rewrite(query);                              // refine and try again
  }
  return "I could not find a reliable answer.";                // bounded: always exits
}`,

  "graph-rag-and-knowledge-graphs": `const edges = new Map();               // node -> [[neighbour, relation, chunkId]]

function link(from, to, relation, chunkId) {
  if (!edges.has(from)) edges.set(from, []);
  edges.get(from).push([to, relation, chunkId]);
}

function addTriple(subject, relation, obj, chunkId) {
  link(subject, obj, relation, chunkId);
  link(obj, subject, relation, chunkId);   // treat links as undirected for expansion
}

/** Entities within \`hops\` links of start, plus the chunks that justify the links. */
function expand(start, hops) {
  const visited = new Set([start]);
  const chunks = new Set();
  let frontier = [start];
  for (let i = 0; i < hops; i++) {
    const nextFrontier = [];
    for (const node of frontier) {
      for (const [neighbour, , chunkId] of edges.get(node) ?? []) {
        chunks.add(chunkId);
        if (!visited.has(neighbour)) {     // never revisit: handles cycles
          visited.add(neighbour);
          nextFrontier.push(neighbour);
        }
      }
    }
    frontier = nextFrontier;
  }
  visited.delete(start);
  return [[...visited].sort(), [...chunks].sort()];
}

addTriple("Acme", "acquired", "Beta", "c1");
addTriple("Beta", "supplies", "Gamma", "c2");
console.log(expand("Acme", 2));   // [ [ 'Beta', 'Gamma' ], [ 'c1', 'c2' ] ]`,

  "hallucination-detection-and-verification": `const stripCommas = (text) => text.replace(/(?<=\\d),(?=\\d)/g, "");   // 1,200 -> 1200
const NUMBER = /\\d+(?:\\.\\d+)?/g;

const numbersIn = (text) => new Set(stripCommas(text).match(NUMBER) ?? []);

/** Numbers the answer states that never appear in the retrieved context. */
function unsupportedNumbers(answer, context) {
  const allowed = numbersIn(context);
  return [...new Set(stripCommas(answer).match(NUMBER) ?? [])].filter((n) => !allowed.has(n));
}

async function faithfulness(claims, context, verify) {
  if (claims.length === 0) return 1;
  const verdicts = await Promise.all(claims.map((claim) => verify(claim, context)));
  const supported = verdicts.filter((v) => v === "supported").length;
  return supported / claims.length;           // divide by CLAIMS, not by passages
}

async function guardedAnswer(question, passages, { generate, splitClaims, verify }, threshold = 0.9) {
  const context = passages.join("\\n");
  const answer = await generate(question, passages);
  if (unsupportedNumbers(answer, context).length > 0) {
    return "I could not verify that figure in the documents.";
  }
  if ((await faithfulness(await splitClaims(answer), context, verify)) < threshold) {
    return "I am not confident this is fully supported by the documents.";
  }
  return answer;
}`,

  "build-a-rag-api-fastapi-pgvector": `import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import pg from "pg";
import { z } from "zod";

const pool = new pg.Pool({ connectionString: DATABASE_URL, min: 2, max: 10 });
const app = new Hono();

const QueryRequest = z.object({
  question: z.string().min(1).max(1000),      // cap what users can send
});

app.post("/query", requireUser, async (c) => {
  const parsed = QueryRequest.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid question" }, 422);
  const { question } = parsed.data;
  const user = c.get("user");

  const vector = await embed(question);       // async client: never blocks the event loop
  const { rows } = await pool.query(HYBRID_SQL, [vector, question, user.tenantId]);   // tenant from auth

  const sources = rows.map((r, i) => ({ n: i + 1, id: r.id, text: r.content }));

  // A blank line ends each event; streamSSE writes it for you.
  c.header("X-Accel-Buffering", "no");
  return streamSSE(c, async (stream) => {
    for await (const token of streamLlm(buildPrompt(question, sources))) {
      await stream.writeSSE({ event: "token", data: JSON.stringify(token) });
    }
    await stream.writeSSE({ event: "sources", data: JSON.stringify(sources.map(({ n, id }) => ({ n, id }))) });
    await stream.writeSSE({ event: "done", data: "true" });
  });
});`,

  "frameworks-parsing-and-structured-data": `const FORBIDDEN = /\\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|attach|pragma|copy|exec)\\b/i;

function isSafeSelect(sql) {
  let s = sql.trim();
  if (s.endsWith(";")) s = s.slice(0, -1).trimEnd();
  if (!s || s.includes(";")) return false;    // empty, or more than one statement
  if (!/^select\\b/i.test(s)) return false;
  return !FORBIDDEN.test(s);
}

async function answerDataQuestion(question, llm, readonlyDb) {
  const sql = await llm(\`Write one read-only SQL SELECT for: \${question}\\nSchema: \${SCHEMA}\`);
  if (!isSafeSelect(sql)) return "I could not produce a safe query for that.";
  const { rows } = await readonlyDb.query(\`\${sql} LIMIT 200\`);   // read-only role, timeout set on the connection
  return llm(\`Question: \${question}\\nSQL: \${sql}\\nRows: \${JSON.stringify(rows)}\\nAnswer briefly.\`);
}

function route(question) {
  const q = question.toLowerCase();
  return /\\b(how many|count|average|total|per|top \\d+|more than)\\b/.test(q) ? "sql" : "documents";
}`,
};
