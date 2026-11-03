"use client";

import { useMemo, useState } from "react";

const PARTS = [
  {
    key: "role",
    label: "Role & context",
    tag: "context",
    text: "You are a support triage assistant for Northwind, a project-management SaaS. Tickets come from paying customers.",
    missing: "No context: the model guesses your domain, audience and stakes.",
  },
  {
    key: "task",
    label: "Task",
    tag: "task",
    text: "Classify the ticket into exactly one category and give a one-sentence reason.",
    missing: "No task: the model improvises one, usually summarising instead of classifying.",
  },
  {
    key: "constraints",
    label: "Constraints",
    tag: "rules",
    text: "Categories: billing, bug, feature_request, other. If the ticket mentions data loss, always choose bug. Never invent details that are not in the ticket.",
    missing: "No constraints: expect invented categories and edge cases decided arbitrarily.",
  },
  {
    key: "input",
    label: "Input in delimiters",
    tag: "ticket",
    text: "My invoice was charged twice this month and support has not replied for 3 days.",
    missing: "No input block: instructions and data blur together, which is also an injection risk.",
  },
  {
    key: "format",
    label: "Output format",
    tag: "format",
    text: 'Respond with JSON only: {"category": "...", "reason": "..."}',
    missing: "No output format: free-form prose that is hard to parse and varies run to run.",
  },
] as const;

export function PromptAnatomy() {
  const [on, setOn] = useState<Record<string, boolean>>({
    role: true, task: true, constraints: false, input: true, format: false,
  });

  const { prompt, score, gaps } = useMemo(() => {
    const active = PARTS.filter((p) => on[p.key]);
    return {
      prompt: active.map((p) => `<${p.tag}>\n${p.text}\n</${p.tag}>`).join("\n\n"),
      score: active.length,
      gaps: PARTS.filter((p) => !on[p.key]),
    };
  }, [on]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PARTS.map((p) => (
          <label
            key={p.key}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
              on[p.key] ? "border-text bg-bg-raised font-medium" : "border-border-base bg-bg text-text-muted"
            }`}
          >
            <input
              type="checkbox"
              checked={on[p.key]}
              onChange={(e) => setOn((s) => ({ ...s, [p.key]: e.target.checked }))}
              className="accent-[var(--accent)]"
            />
            {p.label}
          </label>
        ))}
      </div>

      <pre className="min-h-32 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border-base bg-bg p-3 font-mono text-[12.5px] leading-relaxed">
        {prompt || "(empty prompt)"}
      </pre>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-medium">Completeness: {score}/{PARTS.length}</span>
        <span className="text-text-dim">≈ {Math.ceil(prompt.length / 4)} tokens (chars ÷ 4, rough)</span>
      </div>

      {gaps.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-text-muted">
          {gaps.map((g) => (
            <li key={g.key} className="rounded-md border border-dashed border-border-strong px-3 py-2">
              <span className="font-medium text-text">Missing {g.label.toLowerCase()}.</span> {g.missing}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border-2 border-text px-3 py-2 text-sm font-medium">
          All five parts present. Still test it: a complete prompt is not the same as a correct one.
        </p>
      )}
    </div>
  );
}
