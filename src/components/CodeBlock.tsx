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
