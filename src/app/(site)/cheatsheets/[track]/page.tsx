import { FastLink as Link } from "@/components/FastLink";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintButton } from "@/components/PrintButton";
import { RichText } from "@/components/RichText";
import { getTrack } from "@/content";

type Props = { params: Promise<{ track: string }> };

export async function generateMetadata({ params }: Props) {
  const track = getTrack((await params).track);
  return { title: track ? `${track.title} cheatsheet` : "Cheatsheet" };
}

export default async function CheatsheetPage({ params }: Props) {
  const track = getTrack((await params).track);
  if (!track || track.cheatsheet.length === 0) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/cheatsheets" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
          <ArrowLeft className="size-3.5" /> All cheatsheets
        </Link>
        <PrintButton />
      </div>

      <header>
        <p className="text-xs uppercase tracking-wide text-text-dim">Cheatsheet</p>
        <h1 className="text-3xl font-semibold tracking-tight">{track.title}</h1>
      </header>

      <div className="columns-1 gap-6 md:columns-2">
        {track.cheatsheet.map((section) => (
          <section key={section.heading} className="card mb-6 break-inside-avoid p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent-soft">
              {section.heading}
            </h2>
            <dl className="space-y-3">
              {section.items.map((item) => (
                <div key={item.term}>
                  <dt className="text-sm font-medium">{item.term}</dt>
                  <dd className="text-sm leading-relaxed text-text-muted">
                    <RichText text={item.detail} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
