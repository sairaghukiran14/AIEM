"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";

import { RichText } from "@/components/RichText";
import type { CompareBlock } from "@/content/types";
import { seededOrder } from "@/lib/shuffle";

export function Compare({ block }: { block: CompareBlock }) {
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const done = picked !== null;
  // Fixed per block, so the better version is not always on the same side.
  const swapped = seededOrder(2, `compare:${block.title}`)[0] === 1;
  const sides = (swapped ? [block.b, block.a] : [block.a, block.b]) as readonly [typeof block.a, typeof block.b];
  const betterAt = (swapped ? 1 - block.better : block.better) as 0 | 1;

  return (
    <figure className="card my-6 overflow-hidden">
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-sm font-semibold">{block.title}</p>
          <p className="mt-1 text-sm text-text-muted">
            <RichText text={block.prompt} />
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sides.map((side, i) => {
            const idx = i as 0 | 1;
            const best = done && idx === betterAt;
            return (
              <div
                key={i}
                className={`flex min-w-0 flex-col rounded-lg border p-3 ${
                  best ? "border-2 border-text bg-bg-raised" : "border-border-base bg-bg"
                }`}
              >
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-dim">
                  {side.label}
                  {best && <Check className="size-3.5" aria-label="the better version" />}
                </p>
                <pre className="flex-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">
                  {side.text}
                </pre>
                <button
                  disabled={done}
                  onClick={() => setPicked(idx)}
                  className={`btn mt-3 !text-xs ${picked === idx ? "btn-primary" : "btn-ghost"}`}
                >
                  {picked === idx ? "Your pick" : "This one is better"}
                </button>
              </div>
            );
          })}
        </div>
        {done && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">
                {picked === betterAt ? "Right. " : `Not this time: ${sides[betterAt].label} is better. `}
              </span>
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
