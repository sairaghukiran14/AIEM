"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Play } from "lucide-react";

/** A hand-made toy "model": candidate next words keyed by the last word. */
const TABLE: Record<string, [string, number][]> = {
  is: [["Paris", 0.78], ["a", 0.08], ["located", 0.06], ["Lyon", 0.04], ["the", 0.04]],
  Paris: [[".", 0.52], [",", 0.31], ["and", 0.09], ["is", 0.05], ["!", 0.03]],
  ".": [["<eos>", 0.7], ["The", 0.18], ["It", 0.12]],
  ",": [["which", 0.4], ["the", 0.3], ["and", 0.2], ["a", 0.1]],
  which: [["is", 0.6], ["has", 0.25], ["was", 0.15]],
  the: [["capital", 0.5], ["city", 0.3], ["largest", 0.2]],
  capital: [[".", 0.5], ["of", 0.5]],
};
const FALLBACK: [string, number][] = [["<eos>", 0.6], [".", 0.3], ["and", 0.1]];

const START = ["The", "capital", "of", "France", "is"];

export function NextTokenPredictor() {
  const [tokens, setTokens] = useState<string[]>(START);
  const last = tokens[tokens.length - 1];
  const done = last === "<eos>" || tokens.length > 14;
  const candidates = TABLE[last] ?? FALLBACK;

  function step(sample: boolean) {
    if (done) return;
    let pick = candidates[0][0];
    if (sample) {
      let r = Math.random();
      for (const [word, p] of candidates) {
        r -= p;
        if (r <= 0) {
          pick = word;
          break;
        }
      }
    }
    setTokens((t) => [...t, pick]);
  }

  return (
    <div className="space-y-4">
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-lg border border-border-base bg-bg p-3 font-mono text-sm">
        <AnimatePresence initial={false}>
          {tokens.map((t, i) => (
            <motion.span
              key={`${i}-${t}`}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`rounded px-1.5 py-0.5 ${
                i < START.length
                  ? "bg-bg-hover text-text"
                  : "bg-accent-dim text-accent-soft"
              }`}
            >
              {t}
            </motion.span>
          ))}
        </AnimatePresence>
        {!done && <span className="animate-pulse text-text-dim">▍</span>}
      </div>

      {!done ? (
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-wide text-text-dim">
            Next-token distribution after &ldquo;{last}&rdquo;
          </p>
          {candidates.map(([word, p]) => (
            <div key={word} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 font-mono text-text-muted">{word}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-bg">
                <motion.div
                  className="h-full rounded bg-accent/70"
                  initial={false}
                  animate={{ width: `${p * 100}%` }}
                  transition={{ type: "spring", stiffness: 140, damping: 22 }}
                />
              </div>
              <span className="w-12 text-right font-mono text-xs text-text-dim">
                {(p * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          Generation stopped — the model emitted <code>&lt;eos&gt;</code> or hit a length limit.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={done} onClick={() => step(false)}>
          <Play className="size-4" /> Greedy step
        </button>
        <button className="btn btn-ghost" disabled={done} onClick={() => step(true)}>
          Sample step
        </button>
        <button className="btn btn-ghost" onClick={() => setTokens(START)}>
          <RotateCcw className="size-4" /> Reset
        </button>
      </div>
      <p className="text-xs text-text-dim">
        Toy model with hand-written probabilities, for illustration. Greedy always takes the
        top bar; sampling draws from the whole distribution.
      </p>
    </div>
  );
}
