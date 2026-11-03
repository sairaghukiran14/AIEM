"use client";

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";

import type { SorterBlock } from "@/content/types";

export function Sorter({ block }: { block: SorterBlock }) {
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);

  const answered = Object.keys(picks).length;
  const correct = block.items.filter((it, i) => picks[i] === it.answer).length;

  return (
    <figure className="card my-6 overflow-hidden">
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-sm font-semibold">{block.title}</p>
          <p className="mt-1 text-sm text-text-muted">{block.prompt}</p>
        </div>

        <ul className="space-y-2">
          {block.items.map((it, i) => {
            const picked = picks[i];
            const ok = checked && picked === it.answer;
            const bad = checked && picked !== undefined && picked !== it.answer;
            return (
              <li
                key={i}
                className={`rounded-lg border px-3 py-2.5 text-sm ${
                  ok ? "border-2 border-text bg-bg-raised" : bad ? "border-dashed border-text-dim" : "border-border-base bg-bg"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1">{it.text}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {block.categories.map((c, ci) => (
                      <button
                        key={c}
                        disabled={checked}
                        onClick={() => setPicks((p) => ({ ...p, [i]: ci }))}
                        className={`btn !px-2.5 !py-1 !text-xs ${picked === ci ? "btn-primary" : "btn-ghost"}`}
                      >
                        {c}
                      </button>
                    ))}
                    {ok && <Check className="size-4" aria-label="correct" />}
                    {bad && <X className="size-4" aria-label="incorrect" />}
                  </span>
                </div>
                {checked && (
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">
                    <span className="font-semibold text-text">{block.categories[it.answer]}.</span> {it.why}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn btn-primary"
            disabled={checked || answered < block.items.length}
            onClick={() => setChecked(true)}
          >
            Check answers
          </button>
          {checked && (
            <>
              <span className="text-sm font-semibold">
                {correct}/{block.items.length} correct
              </span>
              <button className="btn btn-ghost" onClick={() => { setPicks({}); setChecked(false); }}>
                <RotateCcw className="size-4" /> Try again
              </button>
            </>
          )}
        </div>
        <p className="text-xs text-text-dim">Practice only. This exercise is not scored or saved.</p>
      </div>
      {block.caption && (
        <figcaption className="border-t border-border-base bg-bg-raised px-4 py-2.5 text-xs text-text-muted sm:px-5">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
