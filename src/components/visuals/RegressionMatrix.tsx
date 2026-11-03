"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

/** Hand-made results for three prompt versions over eight test cases. Illustrative only. */
const CASES = [
  "Refund request, polite",
  "Refund request, angry",
  "Bug report with stack trace",
  "Feature idea in one word",
  "Mentions data loss",
  "Non-English ticket",
  "Empty message",
  "Contains injected instruction",
];

const VERSIONS = [
  { name: "v1  baseline", note: "Short instruction, no examples.", pass: [1, 0, 1, 0, 0, 0, 0, 0] },
  { name: "v2  + examples", note: "Added 4 labelled examples.", pass: [1, 1, 1, 1, 0, 1, 0, 0] },
  { name: "v3  + rules", note: "Added the data-loss rule and delimiters.", pass: [1, 1, 1, 1, 1, 1, 0, 1] },
];

export function RegressionMatrix() {
  const [v, setV] = useState(2);
  const cur = VERSIONS[v];
  const prev = v > 0 ? VERSIONS[v - 1] : null;
  const rate = (p: number[]) => Math.round((p.reduce((a, b) => a + b, 0) / p.length) * 100);

  const fixes = prev ? CASES.filter((_, i) => !prev.pass[i] && cur.pass[i]) : [];
  const regress = prev ? CASES.filter((_, i) => prev.pass[i] && !cur.pass[i]) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {VERSIONS.map((ver, i) => (
          <button key={ver.name} onClick={() => setV(i)} className={`btn !text-xs ${i === v ? "btn-primary" : "btn-ghost"}`}>
            {ver.name}
          </button>
        ))}
      </div>
      <p className="text-sm text-text-muted">{cur.note}</p>

      <div className="overflow-hidden rounded-lg border border-border-base">
        <table className="w-full text-sm">
          <thead className="bg-bg-raised text-xs uppercase tracking-wide text-text-dim">
            <tr>
              <th className="px-3 py-2 text-left">Test case</th>
              <th className="px-3 py-2 text-center">Previous</th>
              <th className="px-3 py-2 text-center">This version</th>
            </tr>
          </thead>
          <tbody>
            {CASES.map((c, i) => {
              const now = cur.pass[i] === 1;
              const before = prev ? prev.pass[i] === 1 : null;
              const changed = before !== null && before !== now;
              return (
                <tr key={c} className={`border-t border-border-base ${changed ? "bg-bg-hover font-medium" : ""}`}>
                  <td className="px-3 py-2">
                    {c}
                    {changed && (
                      <span className="ml-2 text-xs uppercase tracking-wide text-text-muted">
                        {now ? "fixed" : "regressed"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-text-muted">
                    {before === null ? "–" : before ? <Check className="mx-auto size-4" /> : <X className="mx-auto size-4" />}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {now ? <Check className="mx-auto size-4" aria-label="pass" /> : <X className="mx-auto size-4" aria-label="fail" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="font-semibold">Pass rate {rate(cur.pass)}%</span>
        {prev && <span className="text-text-muted">was {rate(prev.pass)}%</span>}
        {prev && <span className="text-text-muted">{fixes.length} fixed · {regress.length} regressed</span>}
      </div>
      <p className="text-xs text-text-dim">
        Illustrative data. A rising overall rate can hide a regression, so always diff case by case.
      </p>
    </div>
  );
}
