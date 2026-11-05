/** JavaScript versions of this track's lesson code examples, keyed by lesson slug. */
export const embeddingsAndSearch: Record<string, string> = {
  "what-embeddings-are": `// Pseudocode for the call; every provider has an equivalent.
async function embed(texts, kind) {
  // kind is "query" or "document": many models want to know which.
  const resp = await embeddingsClient.create({ model: EMBED_MODEL, input: texts, input_type: kind });
  return resp.data.map((item) => item.embedding);
}

function normalise(v) {
  const norm = Math.hypot(...v);
  return v.map((x) => x / Math.max(norm, 1e-12));   // avoid dividing by zero
}

const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

const docs = ["Refund policy: money back within 30 days.",
              "How to reset your password.",
              "Our office is in Berlin."];
const docVecs = (await embed(docs, "document")).map(normalise);   // index once, store
const queryVec = normalise((await embed(["how do I get my money back"], "query"))[0]);

const scores = docVecs.map((v) => dot(v, queryVec));   // unit vectors: dot product == cosine similarity
const best = scores.indexOf(Math.max(...scores));
console.log(docs[best], scores[best]);`,

  "similarity-metrics": `const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const norm = (v) => Math.hypot(...v);

function cosine(a, b) {
  const denom = norm(a) * norm(b);
  return denom ? dot(a, b) / denom : 0;
}

const a = [3, 4];
const b = [4, 3];
const tenB = b.map((x) => 10 * x);

console.log(cosine(a, b));                // 0.96
console.log(cosine(a, tenB));             // 0.96   scaling does not change the angle
console.log(dot(a, b), dot(a, tenB));     // 24 vs 240   dot product does change

const ua = a.map((x) => x / norm(a));
const ub = b.map((x) => x / norm(b));
console.log(dot(ua, ub));                 // 0.96 : dot == cosine for unit vectors
const l2Squared = ua.reduce((sum, x, i) => sum + (x - ub[i]) ** 2, 0);
console.log(l2Squared, 2 - 2 * dot(ua, ub));   // 0.08  0.08 : L2^2 == 2 - 2cos`,

  "chunking-strategy": `/** sections: list of [heading, text]. Returns chunks ready to embed. */
function chunkDocument(title, sections, maxTokens = 400, overlap = 60) {
  const chunks = [];
  for (const [heading, text] of sections) {
    const tokens = tokenizer.encode(text);          // the EMBEDDING model's tokenizer
    const step = maxTokens - overlap;
    let start = 0;
    while (true) {
      const body = tokenizer.decode(tokens.slice(start, start + maxTokens));
      chunks.push({
        // A context header repairs chunks whose subject is implied elsewhere.
        text: \`\${title} > \${heading}\\n\${body}\`,
        metadata: { title, section: heading, startToken: start },
      });
      if (start + maxTokens >= tokens.length) break;
      start += step;
    }
  }
  return chunks;
}`,

  "vector-indexes-and-ann": `const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

/** Brute force on unit vectors: dot product == cosine. Ground truth for recall. */
function exactTopK(query, vectors, k) {
  return vectors
    .map((v, i) => [dot(v, query), i])
    .sort((x, y) => y[0] - x[0])
    .slice(0, k)
    .map(([, i]) => i);
}

/** Fraction of the true top-k that the approximate index also returned. */
function recallAtK(approxIds, exactIds, k) {
  const truth = new Set(exactIds.slice(0, k));
  return new Set(approxIds.slice(0, k).filter((id) => truth.has(id))).size / k;
}

// Example with a hypothetical ANN index object:
//   annIndex.search(query, k) -> list of ids
const queries = vectors.slice(0, 100);    // vectors: your unit-length embeddings
const recalls = queries.map((q) => recallAtK(annIndex.search(q, 10), exactTopK(q, vectors, 10), 10));   // your HNSW / IVF index
console.log("mean recall@10:", recalls.reduce((sum, r) => sum + r, 0) / recalls.length);`,

  "hybrid-search-and-reranking": `/** Fuse ranked id lists. Ranks start at 1; scores are ignored, only order matters. */
function rrf(rankedLists, k = 60) {
  // A Map remembers insertion order, and sort is stable: that is the tie-break.
  const scores = new Map();
  for (const list of rankedLists) {
    list.forEach((docId, i) => {
      const rank = i + 1;
      scores.set(docId, (scores.get(docId) ?? 0) + 1 / (k + rank));
    });
  }
  return [...scores.keys()].sort((a, b) => scores.get(b) - scores.get(a));
}

const dense = ["A", "B", "C"];
const keyword = ["B", "C", "A"];
console.log(rrf([dense, keyword]));   // [ 'B', 'A', 'C' ]

// Two-stage retrieval:
//   const candidates = rrf([denseSearch(q, 100), bm25Search(q, 100)]).slice(0, 100);
//   const top = crossEncoderRerank(q, candidates).slice(0, 5);`,

  "choosing-and-evaluating-embeddings": `const mean = (xs) => xs.reduce((sum, x) => sum + x, 0) / xs.length;
const round2 = (x) => Math.round(x * 100) / 100;

/** results[query] = ranked list of doc ids; relevant[query] = Set of ids that are correct. */
function evaluate(results, relevant, k) {
  const recalls = [];
  const rrs = [];
  for (const [q, ranked] of Object.entries(results)) {
    const rel = relevant[q];
    if (rel.size === 0) continue;                 // skip queries with no labels
    const found = ranked.slice(0, k).filter((d) => rel.has(d)).length;
    recalls.push(found / rel.size);

    const firstHit = ranked.findIndex((d) => rel.has(d));
    rrs.push(firstHit === -1 ? 0 : 1 / (firstHit + 1));   // rank starts at 1
  }
  return { recallAtK: round2(mean(recalls)), mrr: round2(mean(rrs)) };
}

const results = { q1: ["a", "b"], q2: ["x", "y", "z", "d"], q3: ["m", "n"] };
const relevant = { q1: new Set(["a"]), q2: new Set(["d"]), q3: new Set(["zzz"]) };
console.log(evaluate(results, relevant, 3));   // { recallAtK: 0.33, mrr: 0.42 }`,
};
