import { FastLink as Link } from "@/components/FastLink";
import { FileText } from "lucide-react";

import { tracks } from "@/content";

export const metadata = { title: "Cheatsheets" };

export default function CheatsheetsPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Cheatsheets</h1>
      <p className="mt-2 max-w-2xl text-text-muted">
        One printable page per track — the formulas, trade-offs and rules of thumb worth having
        in your head before an interview.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {tracks.map((t) =>
          t.cheatsheet.length > 0 ? (
            <Link
              key={t.slug}
              href={`/cheatsheets/${t.slug}`}
              className="card flex items-center gap-4 p-5 transition-colors hover:border-accent/60 hover:bg-bg-hover"
            >
              <FileText className="size-6 shrink-0 text-accent-soft" />
              <span>
                <span className="block font-medium">{t.title}</span>
                <span className="text-sm text-text-muted">
                  {t.cheatsheet.reduce((n, s) => n + s.items.length, 0)} entries
                </span>
              </span>
            </Link>
          ) : (
            <div key={t.slug} className="card flex items-center gap-4 p-5 opacity-50">
              <FileText className="size-6 shrink-0 text-text-dim" />
              <span>
                <span className="block font-medium">{t.title}</span>
                <span className="text-sm text-text-dim">Coming soon</span>
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
