import { AlertTriangle, Info, KeyRound, MessagesSquare } from "lucide-react";

import { Calculator } from "@/components/interactive/Calculator";
import { Sorter } from "@/components/interactive/Sorter";
import { Stepper } from "@/components/interactive/Stepper";
import { RichText } from "@/components/RichText";
import { Visual } from "@/components/visuals";
import type { Block } from "@/content/types";

const TONES = {
  info: { icon: Info, box: "border-cyan/40 bg-cyan/5", text: "text-cyan" },
  warn: { icon: AlertTriangle, box: "border-amber/40 bg-amber/5", text: "text-amber" },
  key: { icon: KeyRound, box: "border-accent/50 bg-accent-dim/40", text: "text-accent-soft" },
  interview: { icon: MessagesSquare, box: "border-green/40 bg-green/5", text: "text-green" },
} as const;

export function CodeBlock({
  code,
  language,
  caption,
}: {
  code: string;
  language: string;
  caption?: string;
}) {
  return (
    <figure className="my-5 overflow-hidden rounded-xl border border-border-base bg-bg-card">
      <div className="flex items-center justify-between border-b border-border-base bg-bg-raised px-4 py-2 text-xs text-text-dim">
        <span className="font-mono uppercase">{language}</span>
        {caption && <span className="ml-4 truncate text-right">{caption}</span>}
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-text">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose-lesson">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p key={i}>
                <RichText text={block.text} />
              </p>
            );
          case "h":
            return (
              <h3 key={i} className="mt-8 mb-3 text-lg font-semibold tracking-tight text-text">
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <RichText text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <RichText text={item} />
                  </li>
                ))}
              </ol>
            );
          case "callout": {
            const tone = TONES[block.tone];
            const Icon = tone.icon;
            return (
              <aside key={i} className={`my-5 rounded-xl border p-4 ${tone.box}`}>
                <div className={`mb-1.5 flex items-center gap-2 text-sm font-semibold ${tone.text}`}>
                  <Icon className="size-4" />
                  {block.title}
                </div>
                <p className="!mb-0 text-sm">
                  <RichText text={block.text} />
                </p>
              </aside>
            );
          }
          case "code":
            return (
              <CodeBlock key={i} code={block.code} language={block.language} caption={block.caption} />
            );
          case "visual":
            return <Visual key={i} name={block.key} caption={block.caption} />;
          case "stepper":
            return <Stepper key={i} block={block} />;
          case "calculator":
            return <Calculator key={i} block={block} />;
          case "sorter":
            return <Sorter key={i} block={block} />;
          case "table":
            return (
              <div key={i} className="my-5 overflow-x-auto rounded-xl border border-border-base">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-raised text-xs uppercase tracking-wide text-text-dim">
                    <tr>
                      {block.headers.map((h) => (
                        <th key={h} className="px-4 py-2.5 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r} className="border-t border-border-base">
                        {row.map((cell, c) => (
                          <td key={c} className="px-4 py-2.5 align-top">
                            <RichText text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "quote":
            return (
              <blockquote key={i} className="my-5 border-l-2 border-accent pl-4 italic">
                <RichText text={block.text} />
                {block.attribution && (
                  <footer className="mt-1 text-xs not-italic text-text-dim">— {block.attribution}</footer>
                )}
              </blockquote>
            );
        }
      })}
    </div>
  );
}
