"use client";

import { useMemo, useState } from "react";

const WORDS = ["The", "animal", "didn't", "cross", "the", "street", "because", "it", "was", "tired"];

/** Hand-shaped, illustrative weights — not extracted from a real model. */
function buildWeights(): number[][] {
  const n = WORDS.length;
  const rows: number[][] = [];
  for (let i = 0; i < n; i++) {
    const raw = Array.from({ length: n }, (_, j) => {
      if (j > i) return -Infinity; // causal mask
      let s = 0.4 - (i - j) * 0.05; // mild recency bias
      if (j === 0) s += 0.3; // first-token "sink"
      if (WORDS[i] === "it" && WORDS[j] === "animal") s += 3; // coreference
      if (WORDS[i] === "it" && WORDS[j] === "street") s += 1.2;
      if (WORDS[i] === "tired" && WORDS[j] === "it") s += 2;
      if (WORDS[i] === "street" && WORDS[j] === "cross") s += 1.5;
      if (WORDS[i] === "the" && j === i - 1) s += 0.5;
      return s;
    });
    const m = Math.max(...raw);
    const exps = raw.map((r) => (r === -Infinity ? 0 : Math.exp(r - m)));
    const sum = exps.reduce((a, b) => a + b, 0);
    rows.push(exps.map((e) => e / sum));
  }
  return rows;
}

export function AttentionGrid() {
  const weights = useMemo(() => buildWeights(), []);
  const [active, setActive] = useState(7);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {WORDS.map((w, i) => (
          <button
            key={i}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            className="rounded-md px-2.5 py-1.5 font-mono text-sm transition-colors"
            style={{
              background:
                i === active
                  ? "var(--accent)"
                  : i < active
                    ? `rgba(10,10,10,${(0.06 + weights[active][i] * 0.8).toFixed(3)})`
                    : "var(--bg)",
              color:
                i === active
                  ? "#fff"
                  : i > active
                    ? "var(--text-dim)"
                    : weights[active][i] > 0.45
                      ? "#fff"
                      : "var(--text)",
              border: "1px solid var(--border)",
            }}
            title={i <= active ? `${(weights[active][i] * 100).toFixed(0)}%` : "masked"}
          >
            {w}
          </button>
        ))}
      </div>
      <p className="text-sm text-text-muted">
        <span className="font-mono text-text">&ldquo;{WORDS[active]}&rdquo;</span> attends to
        earlier tokens only. Tokens to its right are masked (greyed out).
      </p>

      <div className="inline-block overflow-x-auto rounded-lg border border-border-base bg-bg p-2">
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: `repeat(${WORDS.length}, 1.9rem)` }}
        >
          {weights.flatMap((row, i) =>
            row.map((w, j) => (
              <div
                key={`${i}-${j}`}
                className="h-7 rounded-sm"
                style={{
                  background:
                    j > i
                      ? "transparent"
                      : `rgba(10,10,10,${(0.05 + w * 0.95).toFixed(3)})`,
                  outline: i === active ? "1px solid var(--accent-soft)" : "none",
                  opacity: i === active || active === -1 ? 1 : 0.55,
                }}
                onMouseEnter={() => setActive(i)}
              />
            ))
          )}
        </div>
      </div>
      <p className="text-xs text-text-dim">
        Rows = the token doing the looking; columns = the tokens it looks at. The empty upper
        triangle is the causal mask. Weights are hand-shaped for illustration — try &ldquo;it&rdquo;
        to see a coreference pattern.
      </p>
    </div>
  );
}
