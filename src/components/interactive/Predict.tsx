"use client";

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";

import { RichText } from "@/components/RichText";
import type { PredictBlock } from "@/content/types";
import { seededOrder } from "@/lib/shuffle";

export function Predict({ block }: { block: PredictBlock }) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  // Fixed per block, so the correct answer is not always in the same slot.
  const order = seededOrder(block.options.length, `predict:${block.title}`);
  const answerAt = order.indexOf(block.answer);

  return (
    <figure className="card my-6 overflow-hidden">
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-sm font-semibold">{block.title}</p>
          <p className="mt-1 text-sm text-text-muted">
            <RichText text={block.prompt} />
          </p>
        </div>
        {block.code && (
          <pre className="overflow-x-auto rounded-lg border border-border-base bg-bg p-3 font-mono text-[13px] leading-relaxed">
            <code>{block.code}</code>
          </pre>
        )}
        <ul className="space-y-2">
          {order.map((original, i) => {
            const o = block.options[original];
            const right = done && i === answerAt;
            const wrong = done && picked === i && i !== answerAt;
            return (
              <li key={i}>
                <button
                  disabled={done}
                  onClick={() => setPicked(i)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    right
                      ? "border-2 border-text bg-bg-raised"
                      : wrong
                        ? "border-dashed border-text-dim"
                        : "border-border-base bg-bg hover:bg-bg-hover"
                  }`}
                >
                  <span className="mt-0.5 font-mono text-xs text-text-dim">{String.fromCharCode(65 + i)}</span>
                  <span className="min-w-0 flex-1">
                    <RichText text={o} />
                  </span>
                  {right && <Check className="mt-0.5 size-4 shrink-0" aria-label="correct" />}
                  {wrong && <X className="mt-0.5 size-4 shrink-0" aria-label="incorrect" />}
                </button>
              </li>
            );
          })}
        </ul>
        {done && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">{picked === answerAt ? "Correct. " : "Not quite. "}</span>
              <RichText text={block.why} />
            </p>
            <button className="btn btn-ghost" onClick={() => setPicked(null)}>
              <RotateCcw className="size-4" /> Try again
            </button>
          </div>
        )}
        <p className="text-xs text-text-dim">Practice only. Not scored or saved.</p>
      </div>
    </figure>
  );
}
