"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

const TOKENS = ["Paris", "Lyon", "France", "the", "a", "Berlin", "banana", "xylophone"];
const LOGITS = [6.2, 3.9, 3.4, 3.0, 2.6, 2.0, 0.6, -0.5];

function softmax(logits: number[], t: number) {
  if (t <= 0.01) {
    const best = logits.indexOf(Math.max(...logits));
    return logits.map((_, i) => (i === best ? 1 : 0));
  }
  const scaled = logits.map((l) => l / t);
  const m = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function SamplingDial() {
  const [temp, setTemp] = useState(1);
  const [topP, setTopP] = useState(1);

  const { probs, eligible, kept } = useMemo(() => {
    const probs = softmax(LOGITS, temp);
    const order = probs.map((p, i) => i).sort((a, b) => probs[b] - probs[a]);
    const eligible = new Set<number>();
    let running = 0;
    for (const i of order) {
      eligible.add(i);
      running += probs[i];
      if (running >= topP) break;
    }
    const mass = [...eligible].reduce((s, i) => s + probs[i], 0);
    const kept = probs.map((p, i) => (eligible.has(i) ? p / mass : 0));
    return { probs, eligible, kept };
  }, [temp, topP]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 flex justify-between">
            <span className="font-medium">temperature</span>
            <span className="font-mono text-accent-soft">{temp.toFixed(2)}</span>
          </span>
          <input
            type="range" min={0} max={2} step={0.05} value={temp}
            onChange={(e) => setTemp(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 flex justify-between">
            <span className="font-medium">top-p</span>
            <span className="font-mono text-accent-soft">{topP.toFixed(2)}</span>
          </span>
          <input
            type="range" min={0.05} max={1} step={0.05} value={topP}
            onChange={(e) => setTopP(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </label>
      </div>

      <div className="space-y-1.5">
        {TOKENS.map((token, i) => {
          const isIn = eligible.has(i);
          return (
            <div key={token} className="flex items-center gap-3 text-sm">
              <span className={`w-20 shrink-0 font-mono ${isIn ? "text-text" : "text-text-dim line-through"}`}>
                {token}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-bg">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded bg-text-dim/30"
                  animate={{ width: `${probs[i] * 100}%` }}
                  transition={{ type: "spring", stiffness: 160, damping: 24 }}
                />
                <motion.div
                  className="absolute inset-y-0 left-0 rounded bg-accent/80"
                  animate={{ width: `${kept[i] * 100}%` }}
                  transition={{ type: "spring", stiffness: 160, damping: 24 }}
                />
              </div>
              <span className="w-14 text-right font-mono text-xs text-text-dim">
                {(kept[i] * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-dim">
        Grey = distribution after temperature. Purple = what survives top-p and is renormalised.
        Struck-through tokens can no longer be sampled. Drag temperature to 0 for greedy decoding.
      </p>
    </div>
  );
}
