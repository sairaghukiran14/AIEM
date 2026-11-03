import type { Quiz, Track } from "@/content/types";

import { lesson as ragPipeline } from "./lessons/01-rag-pipeline";
import { lesson as queryUnderstanding } from "./lessons/02-query-understanding";
import { lesson as contextAssembly } from "./lessons/03-context-assembly";
import { lesson as groundingCitations } from "./lessons/04-grounding-citations";
import { lesson as failureModes } from "./lessons/05-failure-modes";
import { lesson as evaluatingRag } from "./lessons/06-evaluating-rag";

const gate: Quiz = {
  id: "rag-gate",
  kind: "gate",
  title: "Track Gate: RAG Systems",
  blurb:
    "Ten questions drawn from the whole track, at interview difficulty. Score 70% to unlock Tool Use & Agents and earn your track badge.",
  passPercent: 70,
  xp: 200,
  questions: [
    {
      id: "g1",
      prompt: "Which need is the strongest argument for RAG rather than fine-tuning?",
      options: [
        "A consistent brand voice",
        "Up-to-date answers from private documents, with sources",
        "Faster token generation",
        "A smaller model",
      ],
      correctIndex: 1,
      explanation:
        "RAG supplies fresh, private knowledge at query time and makes citations possible. Fine-tuning is better for behaviour.",
    },
    {
      id: "g2",
      prompt: "A multi-tenant RAG app retrieves first and filters by permission after generating the answer. What is wrong?",
      options: [
        "Nothing, filtering can happen at any point",
        "Restricted text already entered the prompt and can leak into the answer; filter at retrieval time",
        "It is too slow",
        "The model will refuse automatically",
      ],
      correctIndex: 1,
      explanation:
        "Once restricted chunks are in the prompt, the model can quote them. Authorise where data is selected.",
    },
    {
      id: "g3",
      prompt: "A user asks 'and what about 2023?' right after a question about a refund policy. Which technique fixes the search?",
      options: [
        "Raising the embedding dimensions",
        "Rewriting the follow-up into a standalone query using the conversation history",
        "Lowering the temperature",
        "Increasing chunk overlap",
      ],
      correctIndex: 1,
      explanation:
        "The subject lives in the earlier turn. A rewrite makes the query self-contained.",
    },
    {
      id: "g4",
      prompt: "Raising k from 5 to 20 lowers answer accuracy. What is the most likely reason?",
      options: [
        "The model has a fixed attention span of 5 chunks",
        "Irrelevant, duplicate or contradictory chunks distract the model and dilute the useful ones",
        "Embeddings degrade with larger k",
        "The reranker has a bug",
      ],
      correctIndex: 1,
      explanation:
        "More context is not better. It adds noise, and the lost-in-the-middle effect makes position matter.",
    },
    {
      id: "g5",
      prompt: "What does maximal marginal relevance (MMR) optimise?",
      options: [
        "Embedding speed",
        "A balance between relevance to the query and novelty compared with already selected results",
        "Chunk size",
        "Token cost only",
      ],
      correctIndex: 1,
      explanation:
        "Each pick maximises lambda times relevance minus (1 minus lambda) times its maximum similarity to the selected set.",
    },
    {
      id: "g6",
      prompt: "An answer cites [4] but only three sources were supplied. What is the right handling?",
      options: [
        "Show it, since the model knows best",
        "Detect it in code as an invalid citation and reject, retry or refuse rather than displaying it",
        "Replace [4] with [3] automatically",
        "Ignore citations entirely",
      ],
      correctIndex: 1,
      explanation:
        "Citations are model output and must be validated against the sources actually provided.",
    },
    {
      id: "g7",
      prompt: "The gold chunk was retrieved at rank 2 but is missing from the final prompt. Which stage failed?",
      options: ["Ingestion", "Retrieval", "Context assembly", "Generation"],
      correctIndex: 2,
      explanation:
        "It was found, then dropped by a threshold, deduplication or the token budget.",
    },
    {
      id: "g8",
      prompt: "Why measure retrieval and generation separately?",
      options: [
        "Vector databases require it",
        "They fail independently, and stage metrics show where to invest",
        "Generation metrics are free",
        "Retrieval needs no metrics",
      ],
      correctIndex: 1,
      explanation:
        "An end-to-end score hides whether retrieval, assembly or generation caused a drop.",
    },
    {
      id: "g9",
      prompt: "A faithfulness judge is given only the question and the answer. What does it actually measure?",
      options: [
        "Faithfulness to the sources",
        "How plausible the answer seems from the judge's own knowledge, not support by the context",
        "Retrieval recall",
        "Latency",
      ],
      correctIndex: 1,
      explanation:
        "Faithfulness is defined against the retrieved context, so the judge must be shown it.",
    },
    {
      id: "g10",
      prompt: "Your retrieval hit rate is 75% and generation is correct 90% of the time when evidence is present. About what answer rate should you expect on answerable questions?",
      options: ["About 90%", "About 68%", "About 75%", "About 95%"],
      correctIndex: 1,
      explanation:
        "The stages multiply: 0.75 x 0.90 is about 0.68. Retrieval is the bigger lever here.",
    },
  ],
};

export const ragSystems: Track = {
  slug: "rag-systems",
  order: 4,
  title: "RAG Systems",
  tagline: "Grounding answers in your data",
  description:
    "Build retrieval-augmented generation that you can trust: the pipeline, query understanding, context assembly, grounding and citations, debugging failure modes, and evaluating each layer. Every lesson ends with interview questions.",
  level: "intermediate",
  icon: "Library",
  accentVar: "--amber",
  interviewTopics: [
    "Retrieve-then-read pipeline",
    "RAG vs fine-tuning vs long context",
    "Query rewriting, multi-query, HyDE",
    "MMR and context packing",
    "Grounding and citation verification",
    "Faithfulness vs correctness",
    "Debugging by stage",
    "Layered RAG evaluation",
  ],
  lessons: [ragPipeline, queryUnderstanding, contextAssembly, groundingCitations, failureModes, evaluatingRag],
  gate,
  published: true,
  cheatsheet: [
    {
      heading: "Pipeline",
      items: [
        { term: "RAG", detail: "Search your own data at query time, put the best passages in the prompt, answer from them." },
        { term: "Two pipelines", detail: "Indexing (offline): load, clean, chunk, embed, store with metadata. Querying (online): rewrite, embed, retrieve, rerank, assemble, generate." },
        { term: "Use RAG for", detail: "Private, large or changing knowledge, and when answers need sources. Fine-tuning is for behaviour, not facts." },
        { term: "Access control", detail: "Filter by the user's permissions at retrieval time. Filtering after generation is too late." },
        { term: "Not found path", detail: "Design an explicit 'I could not find this' response, with a retrieval score floor." },
      ],
    },
    {
      heading: "Query understanding",
      items: [
        { term: "Rewrite", detail: "Resolve follow-ups into a standalone query using recent history. Log both queries." },
        { term: "Multi-query / HyDE", detail: "Several phrasings widen matching; HyDE embeds a hypothetical answer. Merge results, do not concatenate." },
        { term: "Decompose / route", detail: "Split compound questions; route chit-chat away from retrieval; extract metadata filters." },
        { term: "Cost", detail: "Each technique adds latency and a failure mode. Keep it only if retrieval metrics improve." },
        { term: "Drift", detail: "Rewrites can add or drop details. Search with the original too and evaluate with and without." },
      ],
    },
    {
      heading: "Context assembly",
      items: [
        { term: "Budget", detail: "window minus system, question and reserved output. Count with the generation model's tokenizer." },
        { term: "How many", detail: "Typically 3 to 10 after reranking. Choose by measuring quality as k varies." },
        { term: "MMR", detail: "pick maximising lambda x relevance - (1 - lambda) x max similarity to selected." },
        { term: "Order", detail: "Lost in the middle: avoid burying the best chunk; put the question and instructions last." },
        { term: "Other tools", detail: "Score threshold, dedupe, parent expansion, neighbour stitching, contextual compression." },
      ],
    },
    {
      heading: "Grounding & citations",
      items: [
        { term: "Four jobs", detail: "Restrict to sources, cite each claim, abstain when missing, report conflicts." },
        { term: "Verify citations", detail: "Parse [n], reject numbers outside the provided range, check claim-level support, show metadata from your own records." },
        { term: "Faithfulness vs correctness", detail: "Supported by context versus true. Measure separately; they have different fixes." },
        { term: "Model-listed sources", detail: "Never trust them. Map ids back to your own chunk records." },
        { term: "Refusals", detail: "Test unanswerable questions, and watch for over-refusal too." },
      ],
    },
    {
      heading: "Debugging",
      items: [
        { term: "Order of checks", detail: "In the corpus? Retrieved? In the prompt? Used by the model? The first failure is the stage to fix." },
        { term: "Ingestion", detail: "Missing, badly parsed or stale content. Fix before tuning anything else." },
        { term: "Retrieval", detail: "Chunking, hybrid search, rewriting, embedding model, candidate depth." },
        { term: "Assembly / generation", detail: "Thresholds, dedupe, ordering, budget; then grounding prompt, conflicts, model choice." },
        { term: "Trace", detail: "Log queries, candidate ids and scores, prompt ids, final prompt, answer and citations for every request." },
      ],
    },
    {
      heading: "Evaluation",
      items: [
        { term: "Layers", detail: "Retrieval (recall@k, MRR), grounding (faithfulness, citation validity), answer (correctness, relevance, refusal accuracy), system (latency, cost)." },
        { term: "Stages multiply", detail: "Answer rate is about retrieval hit rate x correctness given evidence. Retrieval is a ceiling." },
        { term: "Test set", detail: "Real questions, labelled evidence, hard cases and no-answer cases; review synthetic questions; keep a held-out slice." },
        { term: "Judge", detail: "Must see the sources; calibrate against human labels; beware length and style bias." },
        { term: "Operate", detail: "Run in CI, diff per case, track online signals, add production failures to the set." },
      ],
    },
  ],
};
