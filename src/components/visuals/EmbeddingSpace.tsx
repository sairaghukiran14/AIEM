"use client";

import { useMemo, useRef, useState } from "react";

type P = { label: string; x: number; y: number; group: "animals" | "finance" | "code" };

/** Hand-placed 2-D "embeddings". Real ones have hundreds or thousands of dimensions. */
const POINTS: P[] = [
  { label: "cat", x: 0.55, y: 0.45, group: "animals" },
  { label: "dog", x: 0.62, y: 0.38, group: "animals" },
  { label: "kitten", x: 0.48, y: 0.55, group: "animals" },
  { label: "pet guide (long doc)", x: 1.05, y: 0.88, group: "animals" },
  { label: "bank", x: -0.7, y: 0.25, group: "finance" },
  { label: "loan", x: -0.6, y: 0.38, group: "finance" },
  { label: "invoice", x: -0.78, y: 0.12, group: "finance" },
  { label: "refund", x: -0.55, y: 0.18, group: "finance" },
  { label: "python", x: 0.1, y: -0.72, group: "code" },
  { label: "bug", x: 0.22, y: -0.6, group: "code" },
  { label: "compiler", x: 0.04, y: -0.82, group: "code" },
  { label: "function", x: 0.28, y: -0.76, group: "code" },
];

const W = 440;
const H = 320;
const RANGE = 1.25;
const sx = (x: number) => ((x + RANGE) / (2 * RANGE)) * W;
const sy = (y: number) => H - ((y + RANGE * 0.73) / (2 * RANGE * 0.73)) * H;
const ix = (px: number) => (px / W) * 2 * RANGE - RANGE;
const iy = (py: number) => ((H - py) / H) * 2 * RANGE * 0.73 - RANGE * 0.73;

const cos = (a: P | { x: number; y: number }, b: { x: number; y: number }) =>
  (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y) || 1);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

export function EmbeddingSpace() {
  const [q, setQ] = useState({ x: 0.45, y: 0.4 });
  const [metric, setMetric] = useState<"cosine" | "euclid">("cosine");
  const [k, setK] = useState(3);
  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const ranked = useMemo(
    () =>
      POINTS.map((p) => ({ p, score: metric === "cosine" ? cos(p, q) : -dist(p, q), shown: metric === "cosine" ? cos(p, q) : dist(p, q) }))
        .sort((a, b) => b.score - a.score),
    [q, metric]
  );
  const top = new Set(ranked.slice(0, k).map((r) => r.p.label));

  function move(e: React.PointerEvent) {
    if (!dragging.current || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    setQ({
      x: Math.max(-RANGE, Math.min(RANGE, ix(((e.clientX - r.left) / r.width) * W))),
      y: Math.max(-RANGE * 0.73, Math.min(RANGE * 0.73, iy(((e.clientY - r.top) / r.height) * H))),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">Metric:</span>
        {(["cosine", "euclid"] as const).map((m) => (
          <button key={m} onClick={() => setMetric(m)} className={`btn !px-3 !py-1 !text-xs ${metric === m ? "btn-primary" : "btn-ghost"}`}>
            {m === "cosine" ? "Cosine (angle)" : "Euclidean (distance)"}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2">
          k = <span className="font-mono">{k}</span>
          <input type="range" min={1} max={6} value={k} onChange={(e) => setK(Number(e.target.value))} className="accent-[var(--accent)]" />
        </label>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none rounded-lg border border-border-base bg-bg"
        onPointerMove={move}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => (dragging.current = false)}
        role="img"
        aria-label="Two-dimensional embedding space. Drag the query point to change its nearest neighbours."
      >
        <line x1={sx(-RANGE)} y1={sy(0)} x2={sx(RANGE)} y2={sy(0)} stroke="var(--border)" />
        <line x1={sx(0)} y1={0} x2={sx(0)} y2={H} stroke="var(--border)" />
        <circle cx={sx(0)} cy={sy(0)} r={3} fill="var(--text-dim)" />
        <text x={sx(0) + 6} y={sy(0) + 14} fontSize="10" fill="var(--text-dim)">origin</text>

        {ranked.slice(0, k).map(({ p }) => (
          <line key={p.label} x1={sx(q.x)} y1={sy(q.y)} x2={sx(p.x)} y2={sy(p.y)} stroke="var(--text)" strokeWidth={1.5} strokeDasharray={metric === "cosine" ? "0" : "4 3"} />
        ))}
        {metric === "cosine" && (
          <line x1={sx(0)} y1={sy(0)} x2={sx(q.x)} y2={sy(q.y)} stroke="var(--text-dim)" strokeDasharray="2 3" />
        )}

        {POINTS.map((p) => {
          const hit = top.has(p.label);
          return (
            <g key={p.label}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={hit ? 7 : 5} fill={hit ? "var(--text)" : "var(--bg-card)"} stroke="var(--text)" strokeWidth={hit ? 2 : 1} />
              <text x={sx(p.x) + 9} y={sy(p.y) + 3} fontSize="10" fill="var(--text)">{p.label}</text>
            </g>
          );
        })}

        <g
          onPointerDown={(e) => { dragging.current = true; (e.currentTarget as SVGGElement).setPointerCapture?.(e.pointerId); }}
          style={{ cursor: "grab" }}
        >
          <rect x={sx(q.x) - 9} y={sy(q.y) - 9} width={18} height={18} fill="var(--text)" transform={`rotate(45 ${sx(q.x)} ${sy(q.y)})`} />
          <text x={sx(q.x) + 13} y={sy(q.y) - 8} fontSize="11" fontWeight="700" fill="var(--text)">query</text>
        </g>
      </svg>

      <ol className="grid gap-1 text-sm sm:grid-cols-2">
        {ranked.slice(0, 6).map(({ p, shown }, n) => (
          <li key={p.label} className={`flex justify-between rounded-md border px-3 py-1.5 ${n < k ? "border-text bg-bg-raised font-medium" : "border-border-base text-text-muted"}`}>
            <span>{n + 1}. {p.label}</span>
            <span className="font-mono text-xs">{metric === "cosine" ? "cos " : "dist "}{shown.toFixed(2)}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-text-dim">
        Drag the diamond. With cosine, the &ldquo;pet guide (long doc)&rdquo; stays a close neighbour because it points the same
        way, even though it is far away. With Euclidean distance it drops out. 2-D toy; real embeddings have 384 to 3072+ dimensions.
      </p>
    </div>
  );
}
