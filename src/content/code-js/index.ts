import { advancedRag } from "./advanced-rag";
import { embeddingsAndSearch } from "./embeddings-and-search";
import { evalsAndObservability } from "./evals-and-observability";
import { fineTuning } from "./fine-tuning";
import { llmFoundations } from "./llm-foundations";
import { productionAi } from "./production-ai";
import { promptEngineering } from "./prompt-engineering";
import { ragSystems } from "./rag-systems";
import { servingAndMultimodal } from "./serving-and-multimodal";
import { toolsAndAgents } from "./tools-and-agents";

/** JavaScript code example for each lesson, keyed by lesson slug. */
export const javascriptExamples: Record<string, string> = {
  ...advancedRag,
  ...embeddingsAndSearch,
  ...evalsAndObservability,
  ...fineTuning,
  ...llmFoundations,
  ...productionAi,
  ...promptEngineering,
  ...ragSystems,
  ...servingAndMultimodal,
  ...toolsAndAgents,
};
