"use client";

import { useMemo, useState } from "react";

import type { CalculatorBlock } from "@/content/types";

type Fmt = NonNullable<CalculatorBlock["outputs"][number]["format"]>;

function format(n: number, f: Fmt | undefined): string {
  if (!Number.isFinite(n)) return "n/a";
  switch (f) {
    case "usd":
      return n >= 100 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(n < 1 ? 4 : 2)}`;
    case "pct":
      return `${(n * 100).toFixed(1)}%`;
    case "ms":
      return n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${Math.round(n)} ms`;
    case "fixed1":
      return n.toFixed(1);
    case "fixed2":
      return n.toFixed(2);
    case "int":
    default:
      return Math.round(n).toLocaleString();
  }
}

export function Calculator({ block }: { block: CalculatorBlock }) {
  const [values, setValues] = useState<Record<string, number>>(
    () => Object.fromEntries(block.inputs.map((i) => [i.key, i.value]))
  );

  // Formulas are authored in this repo (see CalculatorBlock), compiled once.
  const compiled = useMemo(() => {
    const keys = block.inputs.map((i) => i.key);
    return block.outputs.map((o) => {
      try {
        return new Function(...keys, "Math", `"use strict"; return (${o.formula});`) as (...a: unknown[]) => number;
      } catch {
        return null;
      }
    });
  }, [block]);

  const args = block.inputs.map((i) => values[i.key]);

  return (
    <figure className="card my-6 overflow-hidden">
      <div className="space-y-5 p-4 sm:p-5">
        <p className="text-sm font-semibold">{block.title}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {block.inputs.map((inp) => (
            <label key={inp.key} className="block text-sm">
              <span className="mb-1 flex justify-between">
                <span className="font-medium">{inp.label}</span>
                <span className="font-mono">
                  {values[inp.key].toLocaleString()}
                  {inp.unit ? ` ${inp.unit}` : ""}
                </span>
              </span>
              <input
                type="range"
                min={inp.min}
                max={inp.max}
                step={inp.step}
                value={values[inp.key]}
                onChange={(e) => setValues((v) => ({ ...v, [inp.key]: Number(e.target.value) }))}
                className="w-full accent-[var(--accent)]"
              />
            </label>
          ))}
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          {block.outputs.map((o, n) => {
            let text = "n/a";
            try {
              const fn = compiled[n];
              if (fn) text = format(fn(...args, Math), o.format);
            } catch {
              /* leave n/a */
            }
            return (
              <div key={o.label} className="rounded-lg border border-border-base bg-bg p-3">
                <dt className="text-xs text-text-dim">{o.label}</dt>
                <dd className="mt-0.5 text-xl font-semibold tabular-nums">{text}</dd>
              </div>
            );
          })}
        </dl>

        {block.note && (
          <p className="rounded-lg border border-dashed border-border-strong px-3 py-2 text-sm text-text-muted">
            {block.note}
          </p>
        )}
      </div>
      {block.caption && (
        <figcaption className="border-t border-border-base bg-bg-raised px-4 py-2.5 text-xs text-text-muted sm:px-5">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
