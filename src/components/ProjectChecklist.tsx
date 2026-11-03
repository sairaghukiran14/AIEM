"use client";

import { useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";

import type { ProjectBrief } from "@/content/projects";

const EVENT = "aiem-project-checklist";
const EMPTY = "[]";

const keyFor = (id: string) => `aiem:project:${id}`;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange); // another tab
  window.addEventListener(EVENT, onChange); // this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** Storage can be unavailable (private windows, blocked site data), so every access is guarded. */
function read(id: string): string {
  try {
    return window.localStorage.getItem(keyFor(id)) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(id: string, value: number[]) {
  try {
    window.localStorage.setItem(keyFor(id), JSON.stringify(value));
  } catch {
    /* progress just will not persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

function parse(raw: string): number[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

export function ProjectChecklist({
  project,
  trackTitles,
}: {
  project: ProjectBrief;
  trackTitles: string[];
}) {
  // The server snapshot is "nothing ticked", so server and first client render agree.
  const raw = useSyncExternalStore(
    subscribe,
    () => read(project.id),
    () => EMPTY
  );
  const done = new Set(parse(raw));
  const count = project.requirements.filter((_, i) => done.has(i)).length;

  function toggle(i: number) {
    const next = new Set(done);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    write(project.id, [...next].sort((a, b) => a - b));
  }

  return (
    <details className="card group open:border-text">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">{project.title}</h3>
          <p className="mt-1 text-sm text-text-muted">{project.summary}</p>
          <p className="mt-2 text-xs text-text-dim">Uses: {trackTitles.join(" · ")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="chip" aria-label={`${count} of ${project.requirements.length} requirements ticked`}>
            {count}/{project.requirements.length}
          </span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </div>
      </summary>

      <div className="space-y-6 border-t border-border-base p-5 text-sm">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim">Requirements</h4>
          <ul className="space-y-2">
            {project.requirements.map((req, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-3 leading-relaxed">
                  <input
                    type="checkbox"
                    checked={done.has(i)}
                    onChange={() => toggle(i)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span className={done.has(i) ? "text-text-muted line-through" : ""}>{req}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim">Stretch goals</h4>
          <ul className="list-disc space-y-1 pl-5 text-text-muted">
            {project.stretch.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim">Put in your README</h4>
          <ul className="list-disc space-y-1 pl-5 text-text-muted">
            {project.show.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-dashed border-border-strong p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide">Expect these questions</h4>
          <ul className="list-disc space-y-1 pl-5 text-text-muted">
            {project.probes.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      </div>
    </details>
  );
}
