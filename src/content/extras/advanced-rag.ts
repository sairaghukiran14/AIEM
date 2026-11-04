import type { LessonExtras } from "./types";

export const advancedRagExtras: LessonExtras = {
  "vector-databases-and-pgvector": {
    concept: [
      {
        type: "predict",
        title: "Predict: the nearest-neighbour query",
        prompt: "You want the five chunks closest to a query vector by cosine distance in pgvector. Which clause is right?",
        options: [
          "`ORDER BY embedding <=> query DESC LIMIT 5`",
          "`ORDER BY embedding <=> query LIMIT 5`",
          "`ORDER BY embedding <-> query DESC LIMIT 5`",
          "`WHERE embedding = query LIMIT 5`",
        ],
        answer: 1,
        why: "`<=>` is cosine distance, and a smaller distance means closer, so you sort ascending (the default). DESC would return the least similar rows.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Will 20 million vectors fit?",
        problem: "You plan 20 million chunks with 1,536-dimension float32 embeddings, and HNSW adds about 50% overhead. How much memory is that, and what changes it?",
        steps: [
          { do: "Raw size: vectors x dimensions x bytes per value.", result: "20,000,000 x 1,536 x 4 = 122,880,000,000 bytes = 122.88 GB" },
          { do: "Add 50% index overhead.", result: "122.88 x 1.5 = 184.32 GB, too large for most single machines" },
          { do: "Store values as 1 byte (int8 quantization).", result: "20,000,000 x 1,536 x 1 = 30.72 GB raw, a quarter of the size" },
          { do: "Or choose a 768-dimension model with int8.", result: "20,000,000 x 768 x 1 = 15.36 GB raw, one eighth of the original" },
        ],
        takeaway:
          "Memory is dimensions times bytes times count, so precision and dimensions are your biggest levers. Check recall after each reduction, because compression is not free.",
      },
    ],
  },

  "advanced-retrieval-techniques": {
    concept: [
      {
        type: "predict",
        title: "Predict: the missing exceptions",
        prompt: "Search finds the sentence stating a 30-day refund window, but the answer misses the exceptions written in the next paragraph. Which technique fits best?",
        options: [
          "Contextual retrieval",
          "Parent-child retrieval: match the small chunk, return its larger parent",
          "A higher temperature",
          "Multi-hop retrieval",
        ],
        answer: 1,
        why: "The right sentence was found, but the answer needs the text around it. Returning the parent chunk supplies it while search stays precise.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "What parent-child does to context size",
        problem: "Children are 200 tokens, parents 1,000 tokens. The top 8 child hits fall inside 3 distinct parents. Compare the context you send with and without expansion.",
        steps: [
          { do: "Without expansion, send the 8 child chunks.", result: "8 x 200 = 1,600 tokens" },
          { do: "With expansion, replace hits by their distinct parents.", result: "3 parents x 1,000 = 3,000 tokens" },
          { do: "Compare.", result: "3,000 / 1,600 = 1.875, so about 88% more context" },
          { do: "What did you get for it?", result: "Complete sections with their caveats instead of scattered sentences, and fewer duplicate fragments." },
        ],
        takeaway:
          "Parent-child trades extra tokens for completeness. Cap the number of parents so the budget stays predictable.",
      },
    ],
  },

  "rag-architectures-naive-to-modular": {
    concept: [
      {
        type: "predict",
        title: "Predict: the misrouted question",
        prompt: "The router sends `Compare the refund rules for UK and EU orders` down the single-retrieval path. What is the likely outcome?",
        options: [
          "A perfect answer, since one retrieval covers everything",
          "A weak or one-sided answer, because the question needed separate lookups; a bad route is a failure mode, so log and evaluate routing",
          "The system crashes",
          "The router fixes itself",
        ],
        answer: 1,
        why: "A comparison needs evidence for both sides. One retrieval often finds only one. Routing errors show up as patterns in failing cases, which is why decisions are logged.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "What routing saves on average",
        problem: "Advanced pipeline: rewrite 500 ms, retrieval 80 ms, rerank 300 ms, generation 3,000 ms. 40% of questions are chit-chat that needs only generation (3,000 ms). What is the average latency with and without a router?",
        steps: [
          { do: "Latency of the full advanced path.", result: "500 + 80 + 300 + 3,000 = 3,880 ms" },
          { do: "Without a router, every question takes that path.", result: "Average = 3,880 ms" },
          { do: "With a router, 40% take the direct path and 60% the full path.", result: "0.4 x 3,000 + 0.6 x 3,880 = 1,200 + 2,328 = 3,528 ms" },
          { do: "Saving.", result: "3,880 - 3,528 = 352 ms, about 9%, plus fewer irrelevant retrievals" },
        ],
        takeaway:
          "Routing pays when many questions are cheap. Its benefit depends on your traffic mix, so measure the mix before building it.",
      },
    ],
  },

  "corrective-self-and-agentic-rag": {
    concept: [
      {
        type: "predict",
        title: "Predict: the main risk of agentic RAG",
        prompt: "Which is the most important risk to control when retrieval runs inside an agent loop?",
        options: [
          "The vector dimension",
          "Unbounded loops and ballooning cost, so it needs step limits, repeat detection and budgets",
          "The colour of the user interface",
          "The number of database tables",
        ],
        answer: 1,
        why: "The agent chooses its own queries, so without hard limits a question with no answer can search forever.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Three cases through the corrective decision",
        problem: "Thresholds: upper 0.7, lower 0.3. Passages are scored by a grader. What happens for scores [0.82, 0.41, 0.12], [0.55, 0.35] and [0.20, 0.10]?",
        steps: [
          { do: "Case 1: the best score is 0.82.", result: "0.82 >= 0.7, so use. Keep passages scoring at least 0.3: the 0.82 and 0.41 ones, drop 0.12." },
          { do: "Case 2: the best score is 0.55.", result: "Between 0.3 and 0.7, so refine: rewrite the query and retrieve again, within the round limit." },
          { do: "Case 3: the best score is 0.20.", result: "0.20 < 0.3, so fall back to another source, or abstain if there is none." },
          { do: "What bounds all of this?", result: "A maximum number of rounds, after which the system answers with what it has or says it could not find a reliable answer." },
        ],
        takeaway:
          "Two thresholds create three behaviours. Calibrate them on labelled data instead of guessing.",
      },
    ],
  },

  "graph-rag-and-knowledge-graphs": {
    concept: [
      {
        type: "predict",
        title: "Predict: themes across the corpus",
        prompt: "A user asks `What are the main themes across all 5,000 support tickets?` Why does top-k vector search struggle?",
        options: [
          "Vectors cannot represent tickets",
          "No handful of chunks contains the answer; it needs a synthesis across the whole corpus, such as summaries of communities of related entities",
          "The tickets are too short to embed",
          "Vector search is always slow",
        ],
        answer: 1,
        why: "The question is global. Top-k returns the few most similar passages, which cannot summarise thousands of documents. Community summaries are built for this.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Expanding a small graph",
        problem: "Links: Acme-Beta, Beta-Gamma, Gamma-Delta. Starting at Acme, which entities are within 1, 2 and 3 hops?",
        steps: [
          { do: "One hop from Acme.", result: "Beta" },
          { do: "Two hops: expand Beta's neighbours (Acme is already visited).", result: "Beta, Gamma" },
          { do: "Three hops: expand Gamma's neighbours.", result: "Beta, Gamma, Delta" },
          { do: "Why keep a visited set?", result: "With a cycle such as Delta-Acme, the walk would otherwise return to Acme and repeat work forever." },
        ],
        takeaway:
          "Each hop widens the neighbourhood, and the context grows with it. Choose the hop count from your questions and cap the number of linked chunks you pull in.",
      },
    ],
  },

  "hallucination-detection-and-verification": {
    concept: [
      {
        type: "predict",
        title: "Predict: the decorative citation",
        prompt: "An answer ends with `[3]`, but passage 3 is about a different topic. Which check catches this?",
        options: [
          "A temperature check",
          "Citation verification: test whether the cited passage actually supports the claim",
          "Checking the answer length",
          "Re-running the embedding model",
        ],
        answer: 1,
        why: "A citation is only useful if it supports the claim. Citation verification judges each claim against the passage it cites.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "How many supported claims do you need?",
        problem: "An answer has 8 claims and the policy requires 90% faithfulness. The verifier marks 6, then 7, then 8 claims as supported. Which pass?",
        steps: [
          { do: "6 of 8 supported.", result: "6 / 8 = 75%, below 90%, fail" },
          { do: "7 of 8 supported.", result: "7 / 8 = 87.5%, still below 90%, fail" },
          { do: "8 of 8 supported.", result: "8 / 8 = 100%, pass" },
          { do: "Work out the minimum from the threshold.", result: "0.9 x 8 = 7.2, so with 8 claims every single one must be supported" },
        ],
        takeaway:
          "With few claims, a high threshold means almost no tolerance. Set it from labelled examples, and decide what a failure triggers.",
      },
    ],
  },

  "build-a-rag-api-fastapi-pgvector": {
    concept: [
      {
        type: "predict",
        title: "Predict: where the tenant id comes from",
        prompt: "The query endpoint filters chunks by tenant. Which source for the tenant id is safe?",
        options: [
          "A `tenant_id` field in the request body",
          "The authenticated user's identity resolved on the server",
          "A URL query parameter",
          "A value from local storage in the browser",
        ],
        answer: 1,
        why: "Anything the client sends can be forged. Deriving the tenant from authentication on the server is what makes the filter a real boundary.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Sizing an ingestion job",
        problem: "10,000 documents of 40 chunks each, embedded 64 chunks per request. Each request takes 400 ms. How long does ingestion take with 4 concurrent requests, and with 16?",
        steps: [
          { do: "Total chunks.", result: "10,000 x 40 = 400,000" },
          { do: "Number of embedding requests.", result: "400,000 / 64 = 6,250" },
          { do: "Time with 4 concurrent requests.", result: "6,250 x 0.4 s / 4 = 625 s, about 10.4 minutes" },
          { do: "Time with 16 concurrent requests, if the provider's rate limit allows.", result: "6,250 x 0.4 / 16 = 156 s, about 2.6 minutes" },
        ],
        takeaway:
          "Batching and concurrency are the levers, and rate limits are the ceiling. Make the job resumable so a failure does not restart 6,250 requests.",
      },
    ],
  },

  "frameworks-parsing-and-structured-data": {
    concept: [
      {
        type: "predict",
        title: "Predict: the empty extraction",
        prompt: "A PDF extractor returns no text for several pages that visibly contain text. What is the likely cause and fix?",
        options: [
          "The embedding model is broken",
          "The pages are scanned images with no text layer; run OCR and check the output quality",
          "The chunk size is too large",
          "The vector index is full",
        ],
        answer: 1,
        why: "A scan is a picture of text. OCR recovers text, and you should spot-check numbers and codes because recognition errors are costly.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Which stage is worth improving?",
        problem: "Stage success rates: parsing 90%, chunking 90%, retrieval 85%, generation 90%. Compare raising parsing to 99% with raising retrieval to 95%.",
        steps: [
          { do: "Today, multiply the four rates.", result: "0.90 x 0.90 x 0.85 x 0.90 = 0.620, about 62%" },
          { do: "Parsing raised to 99%.", result: "0.99 x 0.90 x 0.85 x 0.90 = 0.682, about 68.2% (+6.2 points)" },
          { do: "Retrieval raised to 95%.", result: "0.90 x 0.90 x 0.95 x 0.90 = 0.693, about 69.3% (+7.3 points)" },
          { do: "Which first?", result: "Retrieval gives slightly more here, but the cheaper fix may be parsing. Rank by gain per unit of effort, and measure each stage separately." },
        ],
        takeaway:
          "Because stage errors multiply, each stage sets a ceiling for the whole system. Measure stages one by one to find the cheapest big gain.",
      },
    ],
  },
};
