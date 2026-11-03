"use client";

import { useState } from "react";
import { Octagon, Play, RotateCcw } from "lucide-react";

type Entry = { kind: "thought" | "action" | "observation" | "final"; text: string };

/** One cycle = one model call plus the tool run it requested. */
const CYCLES: Entry[][] = [
  [
    { kind: "thought", text: "I need the current temperature in Paris. I have a weather tool." },
    { kind: "action", text: 'get_weather(city="Paris")' },
    { kind: "observation", text: '{"temp_c": 12}' },
  ],
  [
    { kind: "thought", text: "The user wants Fahrenheit. Convert 12 C with the calculator rather than guessing." },
    { kind: "action", text: 'calculator(expression="12 * 9 / 5 + 32")' },
    { kind: "observation", text: "53.6" },
  ],
  [
    { kind: "final", text: "It is about 53.6 °F in Paris right now." },
  ],
];

const LABEL: Record<Entry["kind"], string> = {
  thought: "Thought",
  action: "Action (tool call)",
  observation: "Observation (tool result)",
  final: "Final answer",
};

export function AgentLoop() {
  const [maxCalls, setMaxCalls] = useState(5);
  const [shown, setShown] = useState(0);
  const [stopped, setStopped] = useState(false);

  const done = shown >= CYCLES.length;

  function next() {
    if (done || stopped) return;
    if (shown >= maxCalls) {
      setStopped(true);
      return;
    }
    setShown((n) => n + 1);
  }

  function reset() {
    setShown(0);
    setStopped(false);
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-border-base bg-bg px-3 py-2 text-sm">
        <span className="font-semibold">Task:</span> &ldquo;What is the weather in Paris, in Fahrenheit?&rdquo;
      </p>

      <label className="flex items-center gap-3 text-sm">
        <span className="font-medium">Step limit (max model calls)</span>
        <input
          type="range" min={1} max={5} value={maxCalls}
          onChange={(e) => { setMaxCalls(Number(e.target.value)); reset(); }}
          className="accent-[var(--accent)]"
        />
        <span className="font-mono">{maxCalls}</span>
      </label>

      <ol className="space-y-2">
        {CYCLES.slice(0, shown).map((cycle, c) => (
          <li key={c} className="rounded-lg border border-border-base bg-bg p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim">Model call {c + 1}</p>
            <ul className="space-y-1.5 text-sm">
              {cycle.map((e, n) => (
                <li key={n} className={`rounded-md px-3 py-1.5 ${e.kind === "final" ? "border-2 border-text bg-bg-raised font-medium" : e.kind === "action" ? "border border-text bg-bg-card font-mono text-[13px]" : "bg-bg-raised"}`}>
                  <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{LABEL[e.kind]}</span>
                  <span className={e.kind === "observation" ? "font-mono text-[13px]" : ""}>{e.text}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
        {stopped && (
          <li className="flex items-start gap-2 rounded-lg border-2 border-dashed border-text p-3 text-sm font-medium">
            <Octagon className="mt-0.5 size-4 shrink-0" />
            Stopped by the step limit after {maxCalls} model call{maxCalls > 1 ? "s" : ""}. No answer yet, so the app must
            return a clear failure instead of looping on.
          </li>
        )}
      </ol>

      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={next} disabled={done || stopped}>
          <Play className="size-4" /> {shown === 0 ? "Start the loop" : "Run next model call"}
        </button>
        <button className="btn btn-ghost" onClick={reset}>
          <RotateCcw className="size-4" /> Reset
        </button>
      </div>
      <p className="text-xs text-text-dim">
        Scripted trace for illustration. Lower the limit to 1 or 2 and press on: the loop is cut off before the model can
        finish. Your code, not the model, enforces that limit.
      </p>
    </div>
  );
}
