"use client";

import type { ComponentType } from "react";

import type { VisualKey } from "@/content/types";

import { AttentionGrid } from "./AttentionGrid";
import { ContextWindow } from "./ContextWindow";
import { ModelPicker } from "./ModelPicker";
import { AgentLoop } from "./AgentLoop";
import { CotCost } from "./CotCost";
import { EmbeddingSpace } from "./EmbeddingSpace";
import { RagPipeline } from "./RagPipeline";
import { FewShotBuilder } from "./FewShotBuilder";
import { NextTokenPredictor } from "./NextTokenPredictor";
import { PromptAnatomy } from "./PromptAnatomy";
import { RegressionMatrix } from "./RegressionMatrix";
import { SamplingDial } from "./SamplingDial";
import { SchemaValidator } from "./SchemaValidator";
import { Tokenizer } from "./Tokenizer";
import { TrustBoundary } from "./TrustBoundary";

/** Visuals for later tracks (embedding-space, rag-pipeline, agent-loop) are added as those tracks ship. */
const REGISTRY: Partial<Record<VisualKey, ComponentType>> = {
  "next-token-predictor": NextTokenPredictor,
  tokenizer: Tokenizer,
  "context-window": ContextWindow,
  "sampling-dial": SamplingDial,
  "attention-grid": AttentionGrid,
  "model-picker": ModelPicker,
  "prompt-anatomy": PromptAnatomy,
  "few-shot-builder": FewShotBuilder,
  "cot-cost": CotCost,
  "schema-validator": SchemaValidator,
  "trust-boundary": TrustBoundary,
  "regression-matrix": RegressionMatrix,
  "embedding-space": EmbeddingSpace,
  "rag-pipeline": RagPipeline,
  "agent-loop": AgentLoop,
};

export function Visual({ name, caption }: { name: VisualKey; caption?: string }) {
  const Component = REGISTRY[name];

  return (
    <figure className="card my-6 overflow-hidden">
      <div className="p-4 sm:p-5">
        {Component ? (
          <Component />
        ) : (
          <p className="text-sm text-text-dim">
            The &ldquo;{name}&rdquo; visual isn&apos;t built yet.
          </p>
        )}
      </div>
      {caption && (
        <figcaption className="border-t border-border-base bg-bg-raised px-4 py-2.5 text-xs text-text-muted sm:px-5">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
