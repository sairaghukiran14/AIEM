"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

const SEGMENTS = [
  { id: "sys", label: "System prompt written by your team", trusted: true },
  { id: "tool-defs", label: "Tool definitions registered by your code", trusted: true },
  { id: "user", label: "Message typed by the signed-in user", trusted: false, note: "Authenticated, but still free text. Treat as untrusted input to your policy." },
  { id: "web", label: "Web page fetched by a browsing tool", trusted: false },
  { id: "email", label: "Body of an inbound email the assistant summarises", trusted: false },
  { id: "doc", label: "Chunk retrieved from a shared company wiki", trusted: false, note: "Anyone who can edit the wiki can write instructions into your prompt." },
  { id: "tool-out", label: "Result returned by a tool call", trusted: false, note: "Tool output can contain text from the outside world." },
];

const CAPS = [
  { key: "private", label: "Can read private data (files, mail, CRM)" },
  { key: "untrusted", label: "Reads untrusted content (web, email, docs)" },
  { key: "exfil", label: "Can send data out (email, HTTP, links, images)" },
] as const;

export function TrustBoundary() {
  const [guess, setGuess] = useState<Record<string, boolean>>({});
  const [caps, setCaps] = useState<Record<string, boolean>>({ private: true, untrusted: true, exfil: false });
  const [revealed, setRevealed] = useState(false);

  const answered = Object.keys(guess).length;
  const correct = SEGMENTS.filter((s) => guess[s.id] === s.trusted).length;
  const all3 = caps.private && caps.untrusted && caps.exfil;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium">1. Which parts of a prompt can you trust to contain only instructions you wrote?</p>
        <ul className="space-y-1.5">
          {SEGMENTS.map((s) => {
            const g = guess[s.id];
            const ok = revealed && g === s.trusted;
            const bad = revealed && g !== undefined && g !== s.trusted;
            return (
              <li
                key={s.id}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  ok ? "border-2 border-text bg-bg-raised" : bad ? "border-dashed border-text-dim" : "border-border-base bg-bg"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{s.label}</span>
                  <span className="flex items-center gap-1.5">
                    {[true, false].map((val) => (
                      <button
                        key={String(val)}
                        disabled={revealed}
                        onClick={() => setGuess((p) => ({ ...p, [s.id]: val }))}
                        className={`btn !px-2.5 !py-1 !text-xs ${g === val ? "btn-primary" : "btn-ghost"}`}
                      >
                        {val ? "Trusted" : "Untrusted"}
                      </button>
                    ))}
                    {ok && <Check className="size-4" aria-label="correct" />}
                    {bad && <X className="size-4" aria-label="incorrect" />}
                  </span>
                </div>
                {revealed && s.note && <p className="mt-1.5 text-xs text-text-muted">{s.note}</p>}
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center gap-3">
          <button
            className="btn btn-primary"
            disabled={answered < SEGMENTS.length || revealed}
            onClick={() => setRevealed(true)}
          >
            Check answers
          </button>
          {revealed && <span className="text-sm font-medium">{correct}/{SEGMENTS.length} correct</span>}
          {revealed && (
            <button className="btn btn-ghost" onClick={() => { setGuess({}); setRevealed(false); }}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">2. The three ingredients of a data-exfiltration attack</p>
        <div className="space-y-1.5">
          {CAPS.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-base bg-bg px-3 py-2 text-sm">
              <input type="checkbox" checked={caps[c.key]}
                onChange={(e) => setCaps((p) => ({ ...p, [c.key]: e.target.checked }))}
                className="accent-[var(--accent)]" />
              {c.label}
            </label>
          ))}
        </div>
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${all3 ? "border-2 border-text font-semibold" : "border border-dashed border-border-strong text-text-muted"}`}>
          {all3
            ? "All three together: an injected instruction in untrusted content can read private data and send it out. Remove at least one."
            : "Not all three are present, so this specific attack path is closed. Remove or restrict whichever is cheapest to give up."}
        </p>
      </div>
    </div>
  );
}
