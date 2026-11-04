import { PlacementRunner } from "@/components/assessment/PlacementRunner";
import { placementQuestions } from "@/content/assessment";
import { tracks } from "@/content";

export const metadata = { title: "Placement check" };

export default function AssessPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">Skill assessment</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Where should you start?</h1>
        <p className="mt-3 text-lg text-text-muted">
          {placementQuestions.length} questions, two for each of the {tracks.length} tracks, from fundamentals to
          advanced. You get a suggested starting track and a picture of your strengths. It takes about ten minutes.
        </p>
        <p className="mt-3 text-sm text-text-dim">
          It is advisory: it is not scored, saved or counted toward a certificate, and it does not unlock tracks.
          Those still depend on passing each gate.
        </p>
      </header>
      <PlacementRunner
        questions={placementQuestions}
        tracks={tracks.map((t) => ({ slug: t.slug, order: t.order, title: t.title }))}
      />
    </div>
  );
}
