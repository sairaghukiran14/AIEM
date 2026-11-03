"use client";

import { useState } from "react";
import { motion } from "framer-motion";

function Slider({
  label, value, set, min, max, step, fmt,
}: {
  label: string; value: number; set: (n: number) => void;
  min: number; max: number; step: number; fmt: (n: number) => string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex justify-between">
        <span className="font-medium">{label}</span>
        <span className="font-mono">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
    </label>
  );
}

export function CotCost() {
  const [direct, setDirect] = useState(20);
  const [reasoning, setReasoning] = useState(300);
  const [samples, setSamples] = useState(1);
  const [price, setPrice] = useState(15);
  const [tps, setTps] = useState(60);

  const baseTokens = direct;
  const cotTokens = (direct + reasoning) * samples;
  const cost = (t: number) => (t / 1e6) * price;
  const latency = (t: number, parallel: boolean) => (parallel ? (direct + reasoning) : t) / tps;

  const rows = [
    { name: "Direct answer", tokens: baseTokens, cost: cost(baseTokens), secs: baseTokens / tps },
    { name: `Chain-of-thought × ${samples} sample${samples > 1 ? "s" : ""}`, tokens: cotTokens, cost: cost(cotTokens), secs: latency(cotTokens, true) },
  ];
  const maxTokens = Math.max(...rows.map((r) => r.tokens));
  const mult = cotTokens / baseTokens;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Answer tokens" value={direct} set={setDirect} min={5} max={200} step={5} fmt={(n) => `${n}`} />
        <Slider label="Reasoning tokens" value={reasoning} set={setReasoning} min={0} max={2000} step={50} fmt={(n) => `${n}`} />
        <Slider label="Samples (self-consistency)" value={samples} set={setSamples} min={1} max={10} step={1} fmt={(n) => `${n}×`} />
        <Slider label="Output price / 1M tokens" value={price} set={setPrice} min={1} max={75} step={1} fmt={(n) => `$${n}`} />
        <Slider label="Decode speed" value={tps} set={setTps} min={20} max={200} step={10} fmt={(n) => `${n} tok/s`} />
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-medium">{r.name}</span>
              <span className="font-mono text-xs text-text-muted">
                {r.tokens.toLocaleString()} tok · ${r.cost.toFixed(5)} / call · ≈{r.secs.toFixed(1)}s
              </span>
            </div>
            <div className="h-5 overflow-hidden rounded bg-bg">
              <motion.div
                className="h-full rounded bg-text"
                animate={{ width: `${(r.tokens / maxTokens) * 100}%` }}
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="rounded-lg border border-dashed border-border-strong px-3 py-2 text-sm text-text-muted">
        Reasoning costs <strong className="text-text">{mult.toFixed(1)}×</strong> the output tokens of a
        direct answer. At 100,000 calls a day that is{" "}
        <strong className="text-text">${(cost(cotTokens) * 100000).toFixed(0)}</strong> versus{" "}
        <strong className="text-text">${(cost(baseTokens) * 100000).toFixed(0)}</strong> in output cost.
        Samples are assumed to run in parallel, so they multiply cost but not wall-clock time.
      </p>
    </div>
  );
}
