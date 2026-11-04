"use client";

import { useState } from "react";
import { ChevronRight, RotateCcw } from "lucide-react";

import { RichText } from "@/components/RichText";
import type { ExampleBlock } from "@/content/types";

export function Example({ block }: { block: ExampleBlock }) {
  const [shown, setShown] = useState(0);
  const finished = shown >= block.steps.length;

  return (
    <figure className="card my-6 overflow-hidden">
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">Worked example</p>
          <p className="mt-1 text-sm font-semibold">{block.title}</p>
          <p className="mt-2 rounded-lg border border-border-base bg-bg px-3 py-2.5 text-sm">
            <RichText text={block.problem} />
          </p>
        </div>

        {shown > 0 && (
          <ol className="space-y-2.5">
            {block.steps.slice(0, shown).map((s, i) => (
              <li key={i} className="rounded-lg border border-border-base px-3 py-2.5 text-sm">
                <p className="text-text-muted">
                  <span className="mr-2 font-mono text-xs text-text-dim">{i + 1}</span>
                  <RichText text={s.do} />
                </p>
                <p className="mt-1.5 font-medium">
                  <RichText text={s.result} />
                </p>
              </li>
            ))}
          </ol>
        )}

        {finished && (
          <p className="rounded-lg border-2 border-text bg-bg-raised px-3 py-2.5 text-sm">
            <span className="font-semibold">Takeaway. </span>
            <RichText text={block.takeaway} />
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {!finished && (
            <button className="btn btn-primary" onClick={() => setShown((n) => n + 1)}>
              {shown === 0 ? "Show the first step" : "Next step"} <ChevronRight className="size-4" />
            </button>
          )}
          {shown > 0 && (
            <button className="btn btn-ghost" onClick={() => setShown(0)}>
              <RotateCcw className="size-4" /> Start over
            </button>
          )}
          <span className="text-xs text-text-dim">
            {shown}/{block.steps.length} steps. Try solving it yourself before revealing each one.
          </span>
        </div>
      </div>
    </figure>
  );
}
