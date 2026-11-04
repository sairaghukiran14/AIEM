import { LogoMark } from "@/components/Logo";
import { formatIssueDate } from "@/lib/certificate-core";
import type { CertificateView } from "@/lib/certificates";

type Badge = { kind: "track" | "course"; number?: number; level?: string };

/** A five-point star as an SVG path, centred on 0,0. */
function star(R: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : R * 0.42;
    const a = -Math.PI / 2 + (Math.PI * i) / 5;
    pts.push(`${(rad * Math.cos(a)).toFixed(2)} ${(rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

const around = (n: number, r: number, cx: number, cy: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

/** A faint rosette behind the text. More petals for later tracks, so each track looks different. */
function Rosette({ petals }: { petals: number }) {
  const c = 204;
  const r = 92;
  return (
    <svg viewBox="0 0 408 408" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full text-border-base">
      <g fill="none" stroke="currentColor" strokeWidth="0.9">
        {around(petals, r, c, c).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={r} />
        ))}
        <circle cx={c} cy={c} r={r * 2 + 8} />
        <circle cx={c} cy={c} r={r * 2 + 16} strokeWidth="0.6" />
        <circle cx={c} cy={c} r="14" />
      </g>
    </svg>
  );
}

/** The seal with its two ribbon tails: a scalloped edge, rings, and the track number or a star. */
function Seal({ badge }: { badge: Badge }) {
  const cx = 60;
  const cy = 60;
  const r = 46;
  return (
    <svg viewBox="0 0 120 138" role="img" aria-label={badge.kind === "course" ? "Course complete seal" : `Track ${badge.number ?? ""} seal`} className="h-32 w-auto">
      <polygon points="24,82 52,94 52,140 38,128 24,140" className="fill-[#333]" transform="translate(0 -2)" />
      <polygon points="96,82 68,94 68,140 82,128 96,140" className="fill-text" transform="translate(0 -2)" />
      {around(36, r, cx, cy).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={r * 0.1} className="fill-text" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.97} className="fill-text" />
      <circle cx={cx} cy={cy} r={r * 0.9} fill="none" stroke="#fff" strokeWidth="1.1" />
      {around(72, r * 0.82, cx, cy).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="0.6" fill="#fff" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.74} fill="none" stroke="#fff" strokeWidth="0.6" />
      {badge.kind === "course" ? (
        <>
          <path d={star(r * 0.34)} transform={`translate(${cx} ${cy - 1})`} fill="#fff" />
          <text x={cx} y={cy - r * 0.44 + 2} textAnchor="middle" fontSize="6" letterSpacing="1.4" fill="#fff" fontWeight="700">COURSE</text>
          <text x={cx} y={cy + r * 0.52 + 1} textAnchor="middle" fontSize="5.2" letterSpacing="0.8" fill="#fff" fontWeight="700">COMPLETE</text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - r * 0.4 + 2} textAnchor="middle" fontSize="5.8" letterSpacing="1.4" fill="#fff" fontWeight="700">TRACK</text>
          <text x={cx} y={cy + 9} textAnchor="middle" fontSize={r * 0.54} fill="#fff" fontWeight="700" fontFamily="Georgia, 'Times New Roman', serif">
            {String(badge.number ?? "").padStart(2, "0")}
          </text>
          {badge.level && (
            <text x={cx} y={cy + r * 0.5 + 1} textAnchor="middle" fontSize="4.6" letterSpacing="0.5" fill="#fff" fontWeight="700">
              {badge.level.toUpperCase()}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

/** A rule with a diamond in the middle. */
function Flourish() {
  return (
    <div className="mx-auto mt-3 flex w-3/5 items-center gap-2" aria-hidden="true">
      <span className="h-px flex-1 bg-border-strong" />
      <span className="size-2 rotate-45 bg-text" />
      <span className="h-px flex-1 bg-border-strong" />
    </div>
  );
}

/** A quarter-circle ornament for one corner. */
function Corner({ className }: { className: string }) {
  return (
    <span aria-hidden="true" className={`absolute size-9 border-text-dim ${className}`} />
  );
}

/** On-screen certificate, in the same grayscale style as the PDF. Prints cleanly. */
export function CertificateCard({ cert, subtitle, badge }: { cert: CertificateView; subtitle: string; badge: Badge }) {
  const course = badge.kind === "course";
  return (
    <figure
      className={`mx-auto w-full max-w-3xl bg-bg-card p-1.5 print:max-w-none ${course ? "border border-text" : ""}`}
      aria-label={`Certificate: ${cert.title}, awarded to ${cert.holderName}`}
    >
      <div className="border-[3px] border-text p-1.5">
        <div className="border border-text p-1.5">
          <div className="relative overflow-hidden border border-dotted border-text-dim">
            <Corner className="left-1.5 top-1.5 rounded-tl-full border-l border-t" />
            <Corner className="right-1.5 top-1.5 rounded-tr-full border-r border-t" />
            <Corner className="bottom-1.5 left-1.5 rounded-bl-full border-b border-l" />
            <Corner className="bottom-1.5 right-1.5 rounded-br-full border-b border-r" />

            <div className="relative flex flex-col items-center px-5 py-10 text-center sm:px-14 sm:py-14">
              <Rosette petals={12 + (badge.number ?? 0)} />

              <div className="relative z-10 flex w-full flex-col items-center">
                <div className="flex w-full items-center justify-center gap-3" aria-hidden="true">
                  <span className="hidden h-px flex-1 bg-border-strong sm:block" />
                  <LogoMark size="lg" />
                  <span className="hidden h-px flex-1 bg-border-strong sm:block" />
                </div>

                <p className="mt-6 font-serif text-3xl font-bold uppercase tracking-[0.22em] sm:text-5xl sm:tracking-[0.3em]">
                  Certificate
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.38em] text-text-muted sm:text-xs">
                  {course ? "Of course completion" : "Of completion"}
                </p>

                <p className="mt-8 font-serif text-base italic text-text-muted">This certifies that</p>
                <h2 className="mt-2 max-w-full break-words font-serif text-3xl italic leading-tight sm:text-5xl">{cert.holderName}</h2>
                <Flourish />

                <p className="mt-6 font-serif text-base italic text-text-muted">has successfully completed</p>
                <p className="mt-2 font-serif text-xl font-bold leading-snug sm:text-3xl">{cert.title}</p>
                <p className="mt-2 text-sm text-text-muted">{subtitle}</p>

                <div className="mt-8">
                  <Seal badge={badge} />
                </div>

                <div className="mt-4 flex w-full flex-wrap items-end justify-between gap-4 text-left">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-text-dim">Date of issue</p>
                    <p className="font-serif text-lg font-bold">{formatIssueDate(cert.issuedAt)}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-text-dim">Certificate ID</p>
                    <p className="font-mono text-sm font-bold">{cert.certId}</p>
                  </div>
                </div>

                <p className="mt-6 max-w-md text-[10px] leading-relaxed text-text-dim">
                  Issued by AIEM (AI Engineering Mastery) for completing its course material and passing its
                  assessments. Not an accredited qualification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
