"use client";

import { useMemo, useState } from "react";

const POOL = [
  { id: 1, text: "I was billed twice for May.", label: "billing" },
  { id: 2, text: "The export button crashes the app.", label: "bug" },
  { id: 3, text: "Please add dark mode.", label: "feature_request" },
  { id: 4, text: "Where is your office located?", label: "other" },
  { id: 5, text: "Refund my annual plan, I never used it.", label: "billing" },
  { id: 6, text: "Tasks vanished after the update, all my data is gone!", label: "bug" },
  { id: 7, text: "Could you support CSV import?", label: "feature_request" },
  { id: 8, text: "Thanks, great product.", label: "other" },
];

const LABELS = ["billing", "bug", "feature_request", "other"];

export function FewShotBuilder() {
  const [picked, setPicked] = useState<number[]>([1, 5]);

  const chosen = picked.map((id) => POOL.find((p) => p.id === id)!);
  const counts = useMemo(() => {
    const c: Record<string, number> = Object.fromEntries(LABELS.map((l) => [l, 0]));
    chosen.forEach((e) => (c[e.label] += 1));
    return c;
  }, [chosen]);

  const warnings: string[] = [];
  if (chosen.length === 0) warnings.push("Zero-shot: you rely entirely on the instructions. Fine for simple tasks, risky for format.");
  const distinct = LABELS.filter((l) => counts[l] > 0).length;
  if (chosen.length >= 2 && distinct === 1)
    warnings.push("Every example has the same label. Expect the model to over-predict it.");
  if (chosen.length > 0 && distinct < LABELS.length && distinct > 0 && chosen.length >= 2 && distinct > 1)
    warnings.push(`Labels without an example: ${LABELS.filter((l) => counts[l] === 0).join(", ")}. The model has no demonstration of them.`);
  if (chosen.length > 0)
    warnings.push(`The last example is "${chosen[chosen.length - 1].label}". Models lean toward the most recent label, so reorder if that is not the common case.`);
  if (chosen.length >= 6) warnings.push("Six or more examples: check that the extra tokens are actually buying accuracy.");

  const prompt =
    "Classify each ticket as billing, bug, feature_request or other.\n\n" +
    chosen.map((e) => `Ticket: ${e.text}\nCategory: ${e.label}`).join("\n\n") +
    (chosen.length ? "\n\n" : "") +
    "Ticket: {new ticket}\nCategory:";

  function toggle(id: number) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">Click examples to add or remove them. Order is the order you add them.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {POOL.map((e) => {
          const idx = picked.indexOf(e.id);
          return (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm ${
                idx >= 0 ? "border-2 border-text bg-bg-raised" : "border-border-base bg-bg hover:bg-bg-hover"
              }`}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[11px] font-semibold">
                {idx >= 0 ? idx + 1 : ""}
              </span>
              <span>
                {e.text}
                <span className="ml-2 font-mono text-xs text-text-dim">{e.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-text-muted">
        {LABELS.map((l) => (
          <span key={l} className="rounded-md bg-bg px-2 py-1 font-mono">
            {l}: {counts[l]}
          </span>
        ))}
      </div>

      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-border-base bg-bg p-3 font-mono text-[12px] leading-relaxed">
        {prompt}
      </pre>

      <ul className="space-y-1.5 text-sm text-text-muted">
        {warnings.map((w) => (
          <li key={w} className="rounded-md border border-dashed border-border-strong px-3 py-2">{w}</li>
        ))}
      </ul>
      <p className="text-xs text-text-dim">These are rules of thumb, not measurements. Confirm any example set on your own eval cases.</p>
    </div>
  );
}
