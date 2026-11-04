"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

/** Generic tiers with relative figures — deliberately not tied to any vendor's current pricing. */
const TIERS = [
  { name: "Small / fast", quality: 2, latency: 300, costIdx: 1, context: 128, selfHost: false, good: "classification, routing, extraction" },
  { name: "Mid-tier", quality: 3, latency: 900, costIdx: 5, context: 200, selfHost: false, good: "chat, summarisation, RAG answers" },
  { name: "Frontier", quality: 5, latency: 2500, costIdx: 25, context: 1000, selfHost: false, good: "multi-step reasoning, agents, hard code" },
  { name: "Open weights (self-hosted)", quality: 3, latency: 600, costIdx: 3, context: 128, selfHost: true, good: "private data, extreme volume, fine-tuning" },
];

export function ModelPicker() {
  const [maxLatency, setMaxLatency] = useState(3000);
  const [maxCost, setMaxCost] = useState(30);
  const [minContext, setMinContext] = useState(100);
  const [mustSelfHost, setMustSelfHost] = useState(false);

  const results = useMemo(
    () =>
      TIERS.map((t) => {
        const reasons: string[] = [];
        if (t.latency > maxLatency) reasons.push("too slow");
        if (t.costIdx > maxCost) reasons.push("too expensive");
        if (t.context < minContext) reasons.push("window too small");
        if (mustSelfHost && !t.selfHost) reasons.push("data can leave? no");
        return { ...t, reasons, viable: reasons.length === 0 };
      }),
    [maxLatency, maxCost, minContext, mustSelfHost]
  );

  const best = results.filter((r) => r.viable).sort((a, b) => b.quality - a.quality)[0];

  const slider = (
    label: string, value: number, set: (n: number) => void,
    min: number, max: number, step: number, fmt: (n: number) => string
  ) => (
    <label className="block text-sm">
      <span className="mb-1 flex justify-between">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-accent-soft">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full accent-[var(--accent)]" />
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {slider("Max time-to-answer", maxLatency, setMaxLatency, 200, 3000, 100, (n) => `${n} ms`)}
        {slider("Max relative cost", maxCost, setMaxCost, 1, 30, 1, (n) => `${n}×`)}
        {slider("Min context window", minContext, setMinContext, 4, 1000, 4, (n) => `${n}k tokens`)}
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" checked={mustSelfHost} onChange={(e) => setMustSelfHost(e.target.checked)}
            className="size-4 accent-[var(--accent)]" />
          Data must not leave our infrastructure
        </label>
      </div>

      <div className="space-y-2">
        {results.map((r) => (
          <motion.div
            key={r.name}
            layout
            animate={{ opacity: r.viable ? 1 : 0.4 }}
            className={`rounded-lg border p-3 ${
              best?.name === r.name ? "border-accent bg-accent-dim/40" : "border-border-base bg-bg"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {r.name}
                {best?.name === r.name && (
                  <span className="chip ml-2 !border-accent !text-accent-soft">best viable</span>
                )}
              </span>
              <span className="font-mono text-xs text-text-dim">
                quality {"★".repeat(r.quality)} · ~{r.latency}ms · {r.costIdx}× · {r.context}k
              </span>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {r.viable ? `Good for: ${r.good}` : `Ruled out: ${r.reasons.join(", ")}`}
            </p>
          </motion.div>
        ))}
      </div>
      {!best && (
        <p className="text-sm text-red">Nothing satisfies every constraint — relax one.</p>
      )}
      <p className="text-xs text-text-dim">
        Relative, illustrative numbers for generic tiers — not real vendor pricing. Measure on
        your own eval set.
      </p>
    </div>
  );
}
