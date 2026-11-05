/** JavaScript versions of this track's lesson code examples, keyed by lesson slug. */
export const ragSystems: Record<string, string> = {
  "the-rag-pipeline": `async function answer(user, question) {
  // 1. Retrieve, restricted to what this user is allowed to read.
  const hits = await index.search(await embed(question, "query"), {
    topK: 20,
    filter: { allowedGroups: { $in: user.groups } },   // ACL at retrieval time
  });
  const chunks = (await rerank(question, hits)).slice(0, 5);

  // 2. Refuse early when nothing relevant came back.
  if (chunks.length === 0 || chunks[0].score < MIN_SCORE) {
    return { answer: "I could not find this in the documents.", sources: [] };
  }

  // 3. Assemble a grounded prompt with numbered sources.
  const sources = chunks.map((c, i) => \`[\${i + 1}] \${c.text}\`).join("\\n");
  const prompt =
    "Answer using only the sources below. Cite them like [1]. " +
    "If they do not contain the answer, say so.\\n" +
    \`<sources>\\n\${sources}\\n</sources>\\n\\nQuestion: \${question}\`;

  const reply = await llm(prompt, { temperature: 0 });
  return { answer: reply, sources: chunks.map((c) => c.metadata) };
}`,

  "query-understanding": `const rewritePrompt = (history, question) => \`Rewrite the last user message as a standalone search query.
Use the conversation for missing context. Do not add facts. Output only the query.

<conversation>
\${history}
</conversation>

Last message: \${question}\`;

async function retrieveForTurn(history, question, k = 8) {
  const standalone = (await llm(rewritePrompt(history.slice(-6).join("\\n"), question), {
    model: SMALL_MODEL, temperature: 0, maxTokens: 60,
  })).trim();

  log.info("rewrite", { original: question, rewritten: standalone });   // essential for debugging

  // Search both: the rewrite may drift, the original may lack context.
  const queries = [...new Set([standalone, question])];
  const lists = await Promise.all(queries.map((q) => search(q, k)));
  return merge(lists, k);
}

function merge(lists, limit) {
  const seenIn = new Map();
  const bestRank = new Map();
  const order = [];
  for (const list of lists) {
    list.forEach((docId, i) => {
      const rank = i + 1;
      if (!seenIn.has(docId)) order.push(docId);
      seenIn.set(docId, (seenIn.get(docId) ?? 0) + 1);
      bestRank.set(docId, Math.min(bestRank.get(docId) ?? rank, rank));
    });
  }
  // sort is stable, so remaining ties keep first-seen order
  order.sort((a, b) => seenIn.get(b) - seenIn.get(a) || bestRank.get(a) - bestRank.get(b));
  return order.slice(0, limit);
}`,

  "retrieval-and-context-assembly": `/** rel[i]: relevance of candidate i to the query. sim[i][j]: similarity between candidates. */
function mmr(rel, sim, k, lam = 0.5) {
  const selected = [];
  const remaining = rel.map((_, i) => i);
  while (remaining.length > 0 && selected.length < k) {
    const score = (i) =>
      selected.length === 0
        ? rel[i]
        : lam * rel[i] - (1 - lam) * Math.max(...selected.map((j) => sim[i][j]));
    // remaining stays in index order, so ties go to the lower index
    let best = remaining[0];
    for (const i of remaining) if (score(i) > score(best)) best = i;
    selected.push(best);
    remaining.splice(remaining.indexOf(best), 1);
  }
  return selected;
}

function pack(chunks, budget) {
  const kept = [];
  let used = 0;
  for (const text of chunks) {
    const cost = countTokens(text);          // the generation model's tokenizer
    if (used + cost <= budget) {
      kept.push(text);
      used += cost;
    }
  }
  return kept;
}`,

  "grounding-and-citations": `const GROUNDING = \`Answer the question using ONLY the sources.
- Cite every claim like [1] or [2]. Do not cite a number that is not listed.
- If the sources do not contain the answer, reply exactly: NOT_FOUND
- If sources conflict, say so and cite each one.
Never use outside knowledge.\`;

function checkCitations(answer, numSources) {
  const nums = [...answer.matchAll(/\\[(\\d+)\\]/g)].map((m) => Number(m[1]));
  const unique = (xs) => [...new Set(xs)].sort((a, b) => a - b);
  const valid = (n) => n >= 1 && n <= numSources;
  return {
    cited: unique(nums.filter(valid)),
    invalid: unique(nums.filter((n) => !valid(n))),
    hasCitation: nums.length > 0,
  };
}

async function respond(question, chunks) {
  const sources = chunks.map((c, i) => \`[\${i + 1}] \${c.text}\`).join("\\n");
  const prompt = \`\${GROUNDING}\\n\\n<sources>\\n\${sources}\\n</sources>\\n\\nQuestion: \${question}\`;
  const answer = await llm(prompt, { temperature: 0 });

  if (answer.trim() === "NOT_FOUND") {
    return { answer: "I could not find this in the documents.", sources: [] };
  }

  const report = checkCitations(answer, chunks.length);
  if (report.invalid.length > 0 || !report.hasCitation) {
    return { answer: null, error: "citation check failed", report };   // retry or refuse
  }

  const shown = report.cited.map((n) => chunks[n - 1].metadata);   // OUR metadata, not the model's
  return { answer, sources: shown };
}`,

  "rag-failure-modes": `// A trace looks like:
//   goldChunkId   the chunk that holds the answer
//   corpusIds     Set of every chunk id in the index
//   retrievedIds  candidates returned by search
//   promptIds     chunks that made it into the final prompt
//   citedIds      chunks the answer actually cited

function diagnose(t) {
  if (!t.corpusIds.has(t.goldChunkId)) return "ingestion";      // never indexed, or parsed away
  if (!t.retrievedIds.includes(t.goldChunkId)) return "retrieval";   // exists, but search missed it
  if (!t.promptIds.includes(t.goldChunkId)) return "assembly";  // retrieved, then dropped by thresholds or budget
  if (!t.citedIds.includes(t.goldChunkId)) return "generation"; // in the prompt, but not used
  return "ok";
}

// Run it over every failing eval case and count by stage: that tells you where to invest.
const counts = {};
for (const c of failingCases) {
  const stage = diagnose(traceFor(c));
  counts[stage] = (counts[stage] ?? 0) + 1;
}
console.log(counts);`,

  "evaluating-rag": `const round2 = (x) => Math.round(x * 100) / 100;

/** Each case: retrieved (ids), gold (ids), supported (boolean), correct (boolean). */
function ragScores(cases) {
  const n = cases.length;
  const share = (list, field) => list.filter((c) => c[field]).length / list.length;
  const withHit = cases.filter((c) => c.retrieved.some((id) => c.gold.includes(id)));

  return {
    retrievalHit: round2(withHit.length / n),
    groundedRate: round2(share(cases, "supported")),
    correctRate: round2(share(cases, "correct")),
    // How good is generation when retrieval did its job?
    correctGivenHit: withHit.length ? round2(share(withHit, "correct")) : 0,
  };
}

// The judge sees the SOURCES, otherwise it measures plausibility, not faithfulness.
const faithfulnessJudge = (sources, answer) => \`You are checking an answer against its sources.
List each claim in the answer. For each, say SUPPORTED or UNSUPPORTED by the sources only.

<sources>
\${sources}
</sources>

<answer>
\${answer}
</answer>\`;`,
};
