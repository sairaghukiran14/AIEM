import type { Quiz, Track } from "@/content/types";

import { lesson as vectorDatabases } from "./lessons/01-vector-databases";
import { lesson as advancedRetrieval } from "./lessons/02-advanced-retrieval";
import { lesson as ragArchitectures } from "./lessons/03-rag-architectures";
import { lesson as correctiveSelfAgentic } from "./lessons/04-corrective-self-agentic";
import { lesson as graphRag } from "./lessons/05-graph-rag";
import { lesson as hallucinationDetection } from "./lessons/06-hallucination-detection";
import { lesson as buildRagApi } from "./lessons/07-build-rag-api";
import { lesson as frameworksParsing } from "./lessons/08-frameworks-parsing-structured";

const gate: Quiz = {
  id: "ar-gate",
  kind: "gate",
  title: "Track Gate: Advanced RAG & Building It",
  blurb:
    "Ten questions drawn from the whole track, at interview difficulty. Score 70% to complete Advanced RAG and unlock Serving, Self-Hosting & Multimodal AI.",
  passPercent: 70,
  xp: 200,
  questions: [
    {
      id: "g1",
      prompt: "Your application already stores users, documents and permissions in Postgres, with a few million chunks. Which vector store is the best default?",
      options: [
        "A separate managed vector database, always",
        "pgvector in the same Postgres, because joins, transactions and one backup story outweigh the extra scale of a dedicated engine",
        "FAISS inside the web server process",
        "A spreadsheet",
      ],
      correctIndex: 1,
      explanation:
        "Keep vectors with the data they belong to until measurements show you need a specialised engine.",
    },
    {
      id: "g2",
      prompt: "A filtered pgvector HNSW query asked for 10 rows and returned 3. What is the likely cause and fix?",
      options: [
        "The embeddings are corrupted; re-embed everything",
        "The approximate index finds candidates first and the filter removes most of them; raise the search breadth, use iterative scans, or add partial indexes or partitions",
        "LIMIT is ignored with WHERE",
        "Cosine distance cannot be filtered",
      ],
      correctIndex: 1,
      explanation:
        "Post-filtering a candidate list leaves too few rows when the filter is selective.",
    },
    {
      id: "g3",
      prompt: "Chunks read `Revenue grew 3% over the previous quarter` with no company or year, so retrieval confuses companies. Which technique targets this?",
      options: [
        "Parent-child retrieval",
        "Contextual retrieval: prepend a generated description of where each chunk comes from before embedding and keyword indexing",
        "A larger chat model",
        "Lower temperature",
      ],
      correctIndex: 1,
      explanation:
        "The chunk lost its entity and period. Restoring them at indexing time lets the query match.",
    },
    {
      id: "g4",
      prompt: "In parent-child retrieval, what is embedded and what is sent to the model?",
      options: [
        "Embed parents and send children",
        "Embed small child chunks for precise matching and send their larger parents, deduplicated, for coherent context",
        "Embed the whole corpus as one vector",
        "Embed nothing and use keyword search",
      ],
      correctIndex: 1,
      explanation:
        "Search small for precision, read big for completeness.",
    },
    {
      id: "g5",
      prompt: "What does an adaptive RAG router do, and what should it have?",
      options: [
        "It picks the retrieval path per question, and needs a safe default plus logged decisions",
        "It rewrites every answer and needs no default",
        "It picks the embedding dimension at random",
        "It replaces the generator",
      ],
      correctIndex: 0,
      explanation:
        "Routing saves effort on easy questions. A wrong route is a failure mode, so default safely and log it.",
    },
    {
      id: "g6",
      prompt: "In corrective RAG, the best retrieval score falls between the lower and upper thresholds. What is the usual action?",
      options: [
        "Answer from the weak evidence as it is",
        "Refine or rewrite the query and retrieve again within a bounded number of rounds",
        "Delete the index",
        "Return an empty answer immediately",
      ],
      correctIndex: 1,
      explanation:
        "Ambiguous evidence triggers a refinement round. Poor evidence triggers another source or abstention. Always cap the rounds.",
    },
    {
      id: "g7",
      prompt: "Which question most clearly needs Graph RAG rather than plain vector RAG?",
      options: [
        "What is the refund window?",
        "What are the main themes across 5,000 support tickets, and how are the affected products connected?",
        "Find the paragraph with error code E4012",
        "What does RAG stand for?",
      ],
      correctIndex: 1,
      explanation:
        "Corpus-wide synthesis and relationships across entities are what graphs and community summaries address.",
    },
    {
      id: "g8",
      prompt: "How is answer faithfulness measured at the claim level?",
      options: [
        "Supported claims divided by the number of retrieved passages",
        "Split the answer into claims, verify each against the evidence, and divide supported claims by total claims",
        "The ratio of answer length to prompt length",
        "The retrieval score times the temperature",
      ],
      correctIndex: 1,
      explanation:
        "It measures the share of the answer's own statements that the evidence supports.",
    },
    {
      id: "g9",
      prompt: "A FastAPI RAG endpoint is `async def` and calls a synchronous embedding client. Under load every request slows down. Why?",
      options: [
        "Postgres cannot run concurrent queries",
        "The blocking call stalls the event loop, so other requests on that worker wait; use an async client or a thread pool",
        "StreamingResponse is single threaded by design",
        "The vector dimension is too large",
      ],
      correctIndex: 1,
      explanation:
        "Never run blocking code inside an async handler.",
    },
    {
      id: "g10",
      prompt: "A model writes SQL to answer data questions. Which safeguards are essential?",
      options: [
        "None, since the model is reliable",
        "A read-only database role, validation that allows a single SELECT, row limits and a statement timeout",
        "A higher temperature",
        "Running it as the database owner for speed",
      ],
      correctIndex: 1,
      explanation:
        "Generated queries are untrusted input and must be constrained before they run.",
    },
  ],
};

export const advancedRag: Track = {
  slug: "advanced-rag",
  order: 9,
  title: "Advanced RAG & Building It",
  tagline: "Beyond naive RAG, and a service you can ship",
  description:
    "Vector databases and pgvector, contextual, parent-child and multi-hop retrieval, advanced and adaptive architectures, corrective and agentic RAG, Graph RAG, hallucination detection, a FastAPI + pgvector + React build, and frameworks, parsing and text-to-SQL. Every lesson ends with interview questions.",
  level: "advanced",
  icon: "Network",
  accentVar: "--cyan",
  interviewTopics: [
    "pgvector, HNSW vs IVFFlat, filter traps",
    "FAISS, Chroma, Qdrant, Pinecone trade-offs",
    "Contextual and parent-child retrieval",
    "Naive, advanced, modular and adaptive RAG",
    "Corrective, Self-RAG and agentic RAG",
    "Graph RAG and knowledge graphs",
    "Hallucination detection and faithfulness",
    "FastAPI, SSE streaming, hybrid SQL search",
    "Text-to-SQL, parsing and frameworks",
  ],
  lessons: [
    vectorDatabases,
    advancedRetrieval,
    ragArchitectures,
    correctiveSelfAgentic,
    graphRag,
    hallucinationDetection,
    buildRagApi,
    frameworksParsing,
  ],
  gate,
  published: true,
  cheatsheet: [
    {
      heading: "Vector stores & pgvector",
      items: [
        { term: "Choosing", detail: "Library (FAISS) for experiments, Chroma for prototypes, Qdrant or Weaviate for scale and filtering, Pinecone for managed, pgvector when data already lives in Postgres." },
        { term: "Operators", detail: "`<->` L2, `<=>` cosine distance, `<#>` negative inner product. Match the index operator class: vector_cosine_ops, vector_l2_ops, vector_ip_ops." },
        { term: "Order", detail: "Distance sorts ascending, so ORDER BY embedding <=> q (not DESC). Similarity = 1 - cosine distance." },
        { term: "HNSW vs IVFFlat", detail: "HNSW: better recall and speed, no training, more memory and slower build. IVFFlat: smaller and faster to build, needs data first, tune lists and probes." },
        { term: "Filter trap", detail: "ANN finds candidates, then WHERE filters them. Selective filters can return fewer than k rows: raise ef_search, iterative scans, partial indexes or partitions." },
        { term: "Memory", detail: "raw bytes = vectors x dims x bytes per value. Add index overhead. Lower precision or fewer dimensions are the big levers." },
      ],
    },
    {
      heading: "Advanced retrieval",
      items: [
        { term: "Contextual retrieval", detail: "Prepend a generated description of document, entity and section to each chunk, then embed and keyword-index that text. Cache the shared document to control cost." },
        { term: "Parent-child", detail: "Embed small children, return the larger parents. Map hits to parents, dedupe in rank order, cap the number of parents." },
        { term: "Hierarchical", detail: "Summaries at document, section and chunk levels. Good for overview questions. Needs an offline summarisation pass and refreshing." },
        { term: "Multi-hop", detail: "Retrieve, read, decide if enough, write the next query, repeat. Cap hops, budget latency, use a router." },
        { term: "Pick by failure", detail: "Ambiguous chunks: contextual. Truncated answers: parent-child. Overview questions: hierarchical. Dependent lookups: multi-hop." },
      ],
    },
    {
      heading: "Architectures",
      items: [
        { term: "Naive", detail: "Embed, top k, stuff, generate. Simple and weak on ambiguity and noise." },
        { term: "Advanced", detail: "Pre-retrieval (rewrite, route), retrieval (hybrid, filters), post-retrieval (rerank, compress, dedupe, order)." },
        { term: "Modular", detail: "Components behind interfaces, composed by an orchestrator with branches and loops. Test and swap each part." },
        { term: "Adaptive", detail: "A router picks no retrieval, single step or multi-step per question. Safe default, logged decisions, evaluate the router." },
        { term: "Discipline", detail: "Add one technique at a time and keep it only if the measured gain beats its latency, cost and complexity." },
      ],
    },
    {
      heading: "Self-correcting patterns",
      items: [
        { term: "Corrective RAG", detail: "Grade retrieved documents. Upper threshold: use. Between: refine the query and retry. Below lower: fall back to another source or abstain." },
        { term: "Self-RAG", detail: "A model trained to emit reflection signals about whether to retrieve and whether outputs are supported. Needs a specially trained model." },
        { term: "Agentic RAG", detail: "Retrieval as a tool in an agent loop. Powerful and risky: step limit, repeat detection, budgets and an exit path." },
        { term: "Grader", detail: "Small and fast, calibrated on labelled data, and measured for its own precision and recall." },
        { term: "Always bound loops", detail: "Max rounds plus a defined fallback, or a question with no answer loops forever." },
      ],
    },
    {
      heading: "Graph RAG",
      items: [
        { term: "When", detail: "Relationship and multi-hop questions, and corpus-wide themes. Not single-passage lookups." },
        { term: "Build", detail: "LLM extracts entities and relations from chunks, resolve duplicates, build the graph with source chunk ids, detect communities, summarise them." },
        { term: "Query", detail: "Local: expand the entities' neighbourhood and read linked chunks. Global: search community summaries and combine." },
        { term: "Cost and risk", detail: "An LLM pass over every chunk, extraction errors, entity resolution, stale graphs. Keep provenance to update and cite." },
        { term: "KG RAG", detail: "A model writes graph queries (Cypher, SPARQL). Needs a clear schema, read-only access, validation and limits." },
      ],
    },
    {
      heading: "Verification",
      items: [
        { term: "Failure types", detail: "Unsupported claim, contradiction of evidence, bad citation." },
        { term: "Faithfulness", detail: "supported claims / total claims, with claims judged against the retrieved evidence." },
        { term: "Methods", detail: "Deterministic number and name checks, citation verification, NLI or LLM verifier, self-consistency, retrieval-confidence gating." },
        { term: "On failure", detail: "Regenerate, remove unsupported sentences, flag uncertainty, abstain, or send to a human." },
        { term: "Streaming", detail: "You cannot verify what is already shown: verify per sentence, buffer, or stream and flag afterwards, by risk." },
      ],
    },
    {
      heading: "The build",
      items: [
        { term: "Ingestion", detail: "Hash content for idempotency, parse, chunk, embed in batches, write the document and chunks in one transaction, run as a background job." },
        { term: "Hybrid SQL", detail: "vector top 20 and full-text top 20, both filtered by tenant, fused by RRF (1 / (60 + rank) summed), return top 5." },
        { term: "Streaming", detail: "FastAPI StreamingResponse, text/event-stream, events end with a blank line, token events then a sources event. Disable proxy buffering." },
        { term: "Async rule", detail: "Never call blocking code in an async handler. Use an async client or run_in_threadpool." },
        { term: "Security", detail: "Tenant from authentication, filter in SQL, cap question length, rate limit, treat documents as untrusted." },
      ],
    },
    {
      heading: "Frameworks, parsing, data",
      items: [
        { term: "Frameworks", detail: "LlamaIndex: data and retrieval focus. LangChain and LangGraph: orchestration and stateful agents. Borrow plumbing, own prompts, evals and routing." },
        { term: "Parsing", detail: "OCR scans, keep reading order, remove headers and footers, keep table headers with rows, describe images, keep page metadata." },
        { term: "Error product", detail: "Stage success rates multiply. Four stages at about 90% give about 62% end to end." },
        { term: "Text-to-SQL", detail: "Schema in the prompt, one SELECT, validate, read-only role, row limit, statement timeout, show the SQL." },
        { term: "Routing", detail: "Send data questions to SQL, document questions to retrieval, and mixed questions to both." },
      ],
    },
  ],
};
