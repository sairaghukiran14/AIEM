"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";

const SCHEMA = `{
  "name":     string   (required)
  "age":      number   (required)
  "priority": "low" | "medium" | "high"   (required)
}`;

const PRESETS: Record<string, string> = {
  "Valid": '{"name": "Ada", "age": 36, "priority": "high"}',
  "Missing field": '{"name": "Ada", "priority": "high"}',
  "Wrong type": '{"name": "Ada", "age": "thirty-six", "priority": "high"}',
  "Bad enum": '{"name": "Ada", "age": 36, "priority": "urgent!!"}',
  "Prose + JSON": 'Sure! Here is the JSON you asked for:\n{"name": "Ada", "age": 36, "priority": "high"}',
  "Truncated": '{"name": "Ada", "age": 36, "priori',
};

function validate(raw: string): { stage: "parse" | "schema" | "ok"; errors: string[] } {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (e) {
    return { stage: "parse", errors: [`Not valid JSON: ${(e as Error).message}`] };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return { stage: "schema", errors: ["Expected a JSON object at the top level"] };

  const v = value as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of ["name", "age", "priority"]) if (!(key in v)) errors.push(`${key}: required`);
  if ("name" in v && typeof v.name !== "string") errors.push("name: expected string");
  if ("age" in v && typeof v.age !== "number") errors.push("age: expected number");
  if ("priority" in v && !["low", "medium", "high"].includes(String(v.priority)))
    errors.push("priority: must be one of low, medium, high");
  return { stage: errors.length ? "schema" : "ok", errors };
}

export function SchemaValidator() {
  const [raw, setRaw] = useState(PRESETS["Missing field"]);
  const result = useMemo(() => validate(raw), [raw]);

  const retry =
    result.stage === "ok"
      ? null
      : `Your previous reply was rejected.\n${result.errors.map((e) => `- ${e}`).join("\n")}\nReturn only corrected JSON that matches the schema.`;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-dim">Schema</p>
        <pre className="rounded-lg border border-border-base bg-bg p-3 font-mono text-[12px]">{SCHEMA}</pre>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim">Pretend this is the model&apos;s reply</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {Object.entries(PRESETS).map(([name, value]) => (
            <button
              key={name}
              onClick={() => setRaw(value)}
              className={`btn !px-3 !py-1 !text-xs ${raw === value ? "btn-primary" : "btn-ghost"}`}
            >
              {name}
            </button>
          ))}
        </div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          spellCheck={false}
          aria-label="Model reply"
          className="input min-h-24 font-mono text-[12.5px]"
        />
      </div>

      <div
        className={`rounded-lg border p-3 text-sm ${
          result.stage === "ok" ? "border-2 border-text bg-bg-raised" : "border-dashed border-text-dim"
        }`}
      >
        <p className="flex items-center gap-2 font-semibold">
          {result.stage === "ok" ? <Check className="size-4" /> : <X className="size-4" />}
          {result.stage === "ok"
            ? "Accepted: parses and matches the schema"
            : result.stage === "parse"
              ? "Rejected at stage 1: JSON parsing"
              : "Rejected at stage 2: schema validation"}
        </p>
        {result.errors.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 font-mono text-xs text-text-muted">
            {result.errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
      </div>

      {retry && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-dim">Retry message you would send back</p>
          <pre className="whitespace-pre-wrap rounded-lg border border-border-base bg-bg p-3 font-mono text-[12px]">{retry}</pre>
        </div>
      )}
    </div>
  );
}
