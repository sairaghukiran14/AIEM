"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";

import type { StepperBlock } from "@/content/types";

export function Stepper({ block }: { block: StepperBlock }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = block.steps.length - 1;
  const step = block.steps[i];

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setI((n) => {
        if (n >= last) {
          setPlaying(false);
          return n;
        }
        return n + 1;
      });
    }, 1800);
    return () => clearInterval(id);
  }, [playing, last]);

  return (
    <figure className="card my-6 overflow-hidden">
      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-sm font-semibold">{block.title}</p>

        <ol className="flex flex-wrap gap-1.5" aria-label="Steps">
          {block.steps.map((s, n) => (
            <li key={n}>
              <button
                onClick={() => { setPlaying(false); setI(n); }}
                aria-label={`Step ${n + 1}: ${s.label}`}
                aria-current={n === i ? "step" : undefined}
                className={`flex size-7 items-center justify-center rounded-full border text-xs font-semibold ${
                  n === i
                    ? "border-text bg-text text-white"
                    : n < i
                      ? "border-text-dim bg-bg-raised"
                      : "border-border-strong bg-bg text-text-muted"
                }`}
              >
                {n + 1}
              </button>
            </li>
          ))}
        </ol>

        <div className="min-h-28 rounded-lg border border-border-base bg-bg p-4">
          <p className="text-xs uppercase tracking-wide text-text-dim">
            Step {i + 1} of {block.steps.length}
          </p>
          <p className="mt-1 font-semibold">{step.label}</p>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">{step.detail}</p>

          {step.items && step.items.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {step.items.map((item, n) => {
                const marked = step.mark?.includes(n);
                return (
                  <motion.span
                    key={`${i}-${n}-${item}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: n * 0.02 }}
                    className={`rounded-md border px-2 py-1 font-mono text-xs ${
                      marked ? "border-2 border-text bg-bg-raised font-semibold" : "border-border-base bg-bg-card"
                    }`}
                  >
                    {item}
                  </motion.span>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" disabled={i === 0} onClick={() => { setPlaying(false); setI(i - 1); }}>
            <ChevronLeft className="size-4" /> Back
          </button>
          <button className="btn btn-primary" disabled={i === last} onClick={() => { setPlaying(false); setI(i + 1); }}>
            Next <ChevronRight className="size-4" />
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (i >= last) setI(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? "Pause" : "Auto-play"}
          </button>
          <button className="btn btn-ghost" onClick={() => { setPlaying(false); setI(0); }}>
            <RotateCcw className="size-4" /> Reset
          </button>
        </div>
      </div>
      {block.caption && (
        <figcaption className="border-t border-border-base bg-bg-raised px-4 py-2.5 text-xs text-text-muted sm:px-5">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
