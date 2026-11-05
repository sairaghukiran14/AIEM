"use client";

import { CodeBlock } from "@/components/CodeBlock";
import { useDraft } from "@/components/challenges/useDraft";

type Tab = "python" | "javascript";

const TABS: { id: Tab; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
];

/** A lesson's code example in Python and JavaScript. The chosen language is remembered across lessons. */
export function CodeExample({
  code,
  language,
  javascript,
  caption,
}: {
  code: string;
  language: string;
  javascript?: string;
  caption?: string;
}) {
  const [tab, setTab] = useDraft<Tab>("aiem:code-language", "python");

  if (!javascript) return <CodeBlock code={code} language={language} caption={caption} />;

  return (
    <div>
      <div role="group" aria-label="Code language" className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`btn !px-3 !py-1.5 !text-xs ${tab === t.id ? "btn-primary" : "btn-ghost"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <CodeBlock
        code={tab === "javascript" ? javascript : code}
        language={tab === "javascript" ? "javascript" : language}
        caption={caption}
      />
      <p className="text-xs text-text-dim">
        Code challenges in this course are written in JavaScript. These examples show the idea and may call helpers
        they do not define, so some will not run as they are.
      </p>
    </div>
  );
}
