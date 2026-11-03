import type { Quiz, Track } from "@/content/types";

import { lesson as whatEmbeddingsAre } from "./lessons/01-what-embeddings-are";
import { lesson as similarity } from "./lessons/02-similarity";
import { lesson as chunking } from "./lessons/03-chunking";
import { lesson as vectorIndexes } from "./lessons/04-vector-indexes";
import { lesson as hybridRerank } from "./lessons/05-hybrid-rerank";
import { lesson as choosingEvaluating } from "./lessons/06-choosing-evaluating";

const gate: Quiz = {
  id: "es-gate",
  kind: "gate",
  title: "Track Gate: Embeddings & Vector Search",
  blurb:
    "Ten questions drawn from the whole track, at interview difficulty. Score 70% to unlock RAG Systems and earn your track badge.",
  passPercent: 70,
  xp: 200,
  questions: [
    {
      id: "g1",
      prompt: "What does it mean that two texts have nearby embeddings?",
      options: [
        "They share many identical words",
        "The model judged them similar in meaning, so their vectors are close in its space",
        "They have the same length",
        "They were written by the same author",
      ],
      correctIndex: 1,
      explanation:
        "Embedding models are trained so semantic similarity maps to vector closeness. Shared words are neither necessary nor sufficient.",
    },
    {
      id: "g2",
      prompt: "Which pairing breaks retrieval without raising an error?",
      options: [
        "Normalising vectors before indexing",
        "Embedding documents with one model and queries with another",
        "Using HNSW instead of IVF",
        "Adding a reranker",
      ],
      correctIndex: 1,
      explanation:
        "Each model has its own space. Mixed-model similarity scores look plausible and mean nothing.",
    },
    {
      id: "g3",
      prompt: "For unit-length vectors, which statement is true?",
      options: [
        "Dot product equals cosine similarity, and squared Euclidean distance equals 2 minus 2 times cosine",
        "Cosine is always 0",
        "Euclidean distance is unrelated to cosine",
        "Dot product is always larger than cosine",
      ],
      correctIndex: 0,
      explanation:
        "With both lengths equal to 1 the three measures give the same ranking.",
    },
    {
      id: "g4",
      prompt: "Your filter keeps documents where 'cosine distance >= 0.8'. What does it keep?",
      options: [
        "The most similar documents",
        "The least similar documents, because distance is the opposite of similarity",
        "Only exact duplicates",
        "Nothing, the comparison is invalid",
      ],
      correctIndex: 1,
      explanation:
        "Distance is small for close items, so keeping large distances keeps the farthest ones.",
    },
    {
      id: "g5",
      prompt: "Why do very large chunks often retrieve poorly?",
      options: [
        "Vector indexes cap chunk size at 100 tokens",
        "Pooling blends several topics into one vector that matches specific queries weakly",
        "They are not stored",
        "They always exceed the model's token limit",
      ],
      correctIndex: 1,
      explanation:
        "A multi-topic chunk's vector is a compromise between its topics, close to none of them.",
    },
    {
      id: "g6",
      prompt: "You measure recall@10 of an ANN index at 0.88 against exact search. What does this tell you?",
      options: [
        "The embedding model is 88% accurate",
        "On average the index returns 88% of the true top-10 neighbours, so about one in eight is missed",
        "88% of queries are answered perfectly",
        "The index uses 88% of memory",
      ],
      correctIndex: 1,
      explanation:
        "Recall is measured against exact search. It says nothing about the embedding model's quality, only about what the index misses.",
    },
    {
      id: "g7",
      prompt: "Which query is the best argument for adding keyword search to a vector search system?",
      options: [
        "how can I get my money back",
        "error ERR_CONN_4092 on checkout",
        "tips for onboarding a new team",
        "what does your company do",
      ],
      correctIndex: 1,
      explanation:
        "A rare literal identifier is matched exactly by keyword search and often blurred by embeddings.",
    },
    {
      id: "g8",
      prompt: "Why use reciprocal rank fusion instead of adding BM25 and cosine scores?",
      options: [
        "RRF is faster to compute",
        "The scores are on different scales, so raw addition lets one signal dominate; RRF uses only ranks",
        "BM25 scores are always negative",
        "Cosine scores cannot be sorted",
      ],
      correctIndex: 1,
      explanation:
        "Rank-based fusion needs no score calibration across retrievers.",
    },
    {
      id: "g9",
      prompt: "The correct document is at rank 60 of first-stage retrieval, and the reranker only takes the top 50. What is the result?",
      options: [
        "The reranker finds it anyway",
        "It never reaches the reranker, so recall is lost before reranking can help",
        "The document is promoted automatically",
        "The reranker raises an error",
      ],
      correctIndex: 1,
      explanation:
        "A reranker only reorders what it is given. Increase candidate depth or improve first-stage retrieval.",
    },
    {
      id: "g10",
      prompt: "What is the safest way to move production search to a new embedding model?",
      options: [
        "Re-embed only the newest documents",
        "Build a new index in parallel, dual-write, backfill, shadow-compare on your eval set, cut over behind a flag and keep a rollback",
        "Replace the model and rebuild overnight with no comparison",
        "Mix old and new vectors in one index",
      ],
      correctIndex: 1,
      explanation:
        "Vectors from different models are incompatible, so migration means a second index and a verified cutover.",
    },
  ],
};

export const embeddingsAndSearch: Track = {
  slug: "embeddings-and-search",
  order: 3,
  title: "Embeddings & Vector Search",
  tagline: "Meaning as geometry",
  description:
    "How text becomes vectors and how to search them well: similarity metrics, chunking, ANN indexes, hybrid search with reranking, and choosing and evaluating embedding models on your own data. Every lesson ends with interview questions.",
  level: "intermediate",
  icon: "Radar",
  accentVar: "--green",
  interviewTopics: [
    "What embeddings are and how they are trained",
    "Cosine vs dot product vs L2",
    "Chunking strategy",
    "HNSW, IVF and PQ trade-offs",
    "Hybrid search & RRF",
    "Cross-encoder reranking",
    "Recall@k and MRR",
    "Embedding model migration",
  ],
  lessons: [whatEmbeddingsAre, similarity, chunking, vectorIndexes, hybridRerank, choosingEvaluating],
  gate,
  published: true,
  cheatsheet: [
    {
      heading: "Embeddings",
      items: [
        { term: "Definition", detail: "A fixed-length vector from an embedding model such that similar meaning means nearby vectors. Trained contrastively on positive pairs with in-batch and hard negatives." },
        { term: "Same model everywhere", detail: "Each model has its own space. Queries and documents need the same model and version; changing it means re-embedding the corpus." },
        { term: "Input limit", detail: "Models cap input tokens, which is why documents are chunked." },
        { term: "Weak spots", detail: "Negation, exact numbers, rare identifiers, very short queries. Add keyword search and a reranker." },
        { term: "Storage", detail: "vectors x dimensions x bytes per value. 5M x 1024 x 4 bytes is about 20 GB raw." },
      ],
    },
    {
      heading: "Similarity",
      items: [
        { term: "Cosine", detail: "(a.b) / (|a||b|). Direction only. Range -1 to 1." },
        { term: "Dot product", detail: "|a||b|cos(theta). Direction and length. Equals cosine for unit vectors." },
        { term: "Euclidean (L2)", detail: "Straight-line gap, smaller is closer. For unit vectors L2^2 = 2 - 2cos." },
        { term: "Practice", detail: "Normalise once, use the dot product, set the same metric on the index (changing it needs a rebuild)." },
        { term: "Thresholds", detail: "Score scales vary by model and domain. Tune per model on labelled data, or prefer rank-based cut-offs." },
      ],
    },
    {
      heading: "Chunking",
      items: [
        { term: "Trade-off", detail: "Small chunks are precise but lose context; large chunks keep context but blur topics into one vector." },
        { term: "Starting point", detail: "300 to 500 tokens, 10 to 20 percent overlap, structure-aware splits. Then measure." },
        { term: "Count tokens", detail: "Use the embedding model's tokenizer, not characters." },
        { term: "Context header", detail: "Prefix each chunk with document title and section path; keep metadata for filters and citations." },
        { term: "Parent-child", detail: "Match on small chunks, send the larger parent to the LLM." },
      ],
    },
    {
      heading: "Indexes",
      items: [
        { term: "Flat", detail: "Exact brute force. Fine up to hundreds of thousands of vectors; the ground truth for recall." },
        { term: "HNSW", detail: "Layered neighbour graph. High recall, low latency, more memory. efSearch trades recall for latency." },
        { term: "IVF", detail: "Cluster, then search the nprobe nearest clusters. Boundary queries are the weakness." },
        { term: "PQ", detail: "Compress vectors into short codes. Large memory savings, lossy." },
        { term: "Filters", detail: "Post-filtering can return fewer than k; pre-filtering can hurt graph recall. Test with real filters." },
      ],
    },
    {
      heading: "Hybrid & rerank",
      items: [
        { term: "Complementary", detail: "Dense handles paraphrase; BM25 handles exact terms, IDs and rare words." },
        { term: "RRF", detail: "score = sum over lists of 1 / (k + rank), k = 60, rank from 1. Rank-based, so no score calibration." },
        { term: "Bi- vs cross-encoder", detail: "Bi-encoder: separate encoding, precomputable, fast. Cross-encoder: joint encoding per candidate, accurate, slow." },
        { term: "Two stages", detail: "Wide fast retrieval for recall, reranker on the top 50 to 200 for precision." },
        { term: "Depth", detail: "A document missed in stage one cannot be recovered by the reranker." },
      ],
    },
    {
      heading: "Evaluation & operations",
      items: [
        { term: "Recall@k", detail: "Relevant items in the top k divided by total relevant, averaged over queries." },
        { term: "MRR", detail: "Mean of 1 / (rank of first relevant). Rewards putting a right answer near the top." },
        { term: "Build an eval", detail: "50 to 200 real questions with labelled relevant chunks; compare candidate models on identical data; read the failures." },
        { term: "Migrate safely", detail: "New index, dual-write, backfill, shadow-compare, flag cutover, rollback window." },
        { term: "Drift", detail: "Pin model versions, store model id with the index, re-run the eval on a schedule." },
      ],
    },
  ],
};
