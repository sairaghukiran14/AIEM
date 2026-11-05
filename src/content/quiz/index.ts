import { advancedRag } from "./advanced-rag";
import { agents } from "./agents";
import { debugging } from "./debugging";
import { decisions } from "./decisions";
import { evals } from "./evals";
import { fineTuning } from "./fine-tuning";
import { fundamentals } from "./fundamentals";
import { production } from "./production";
import { prompting } from "./prompting";
import { retrieval } from "./retrieval";
import { scaling } from "./scaling";
import type { Draft, QuizCategory, QuizQuestion } from "./types";

export * from "./types";

/** In the order a learner would meet them: fundamentals first, production and scaling last. */
export const quizCategories: QuizCategory[] = [
  { slug: "fundamentals", title: "LLM fundamentals", blurb: "Tokens, context, sampling and what a model can and cannot do", trackSlug: "llm-foundations" },
  { slug: "prompting", title: "Prompting and structured output", blurb: "Instructions, examples, JSON, and prompt injection", trackSlug: "prompt-engineering" },
  { slug: "retrieval", title: "Embeddings and retrieval", blurb: "Chunking, vector and hybrid search, reranking", trackSlug: "embeddings-and-search" },
  { slug: "advanced-rag", title: "Advanced RAG", blurb: "Multi-hop, graph and agentic RAG, citations, hallucination checks", trackSlug: "advanced-rag" },
  { slug: "agents", title: "Tools and agents", blurb: "Function calling, agent loops, memory, MCP and safety", trackSlug: "tools-and-agents" },
  { slug: "fine-tuning", title: "Fine-tuning", blurb: "LoRA, data quality, distillation and preference tuning", trackSlug: "fine-tuning" },
  { slug: "evals", title: "Evals and observability", blurb: "Test sets, LLM judges, experiments and monitoring", trackSlug: "evals-and-observability" },
  { slug: "production", title: "Production", blurb: "Reliability, cost, safety, privacy and rollout", trackSlug: "production-ai" },
  { slug: "scaling", title: "Serving and scaling", blurb: "Batching, GPUs, memory, caching and capacity", trackSlug: "serving-and-multimodal" },
  { slug: "decisions", title: "Decision making", blurb: "Trade-offs and judgement: what to choose, and why", },
  { slug: "debugging", title: "Debugging playbook", blurb: "Symptoms, likely causes and the first thing to check" },
];

const files: Record<string, Draft[]> = {
  fundamentals,
  prompting,
  retrieval,
  "advanced-rag": advancedRag,
  agents,
  "fine-tuning": fineTuning,
  evals,
  production,
  scaling,
  decisions,
  debugging,
};

/** The whole bank. Ids are `<category>-<position>`; only ever append to a file so ids stay stable. */
export const quizBank: QuizQuestion[] = quizCategories.flatMap((cat) =>
  (files[cat.slug] ?? []).map((q, i) => ({ ...q, id: `${cat.slug}-${i + 1}`, category: cat.slug }))
);

const byId = new Map(quizBank.map((q) => [q.id, q]));
export const getQuizQuestion = (id: string) => byId.get(id);
