import type { LessonExtras } from "./types";
import { foundationsExtras } from "./llm-foundations";
import { promptExtras } from "./prompt-engineering";
import { embeddingsExtras } from "./embeddings-and-search";
import { ragExtras } from "./rag-systems";
import { agentExtras } from "./tools-and-agents";
import { evalExtras } from "./evals-and-observability";
import { fineTuningExtras } from "./fine-tuning";
import { productionExtras } from "./production-ai";
import { advancedRagExtras } from "./advanced-rag";
import { servingExtras } from "./serving-and-multimodal";

export const extras: LessonExtras = {
  ...foundationsExtras,
  ...promptExtras,
  ...embeddingsExtras,
  ...ragExtras,
  ...agentExtras,
  ...evalExtras,
  ...fineTuningExtras,
  ...productionExtras,
  ...advancedRagExtras,
  ...servingExtras,
};
