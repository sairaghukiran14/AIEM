/**
 * Placeholder blocks shown while data loads. Plain gray shapes that pulse in
 * opacity (no gradients, no hues). Each skeleton group is announced once as
 * "Loading" and the blocks themselves are hidden from assistive tech.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`skeleton h-3.5 ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`card space-y-3 p-4 ${className}`}>
      <div className="skeleton h-4 w-1/3" />
      <SkeletonText lines={2} />
    </div>
  );
}

/** Wraps a loading screen: one polite "Loading" announcement for the whole region. */
export function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Stand-in for a challenge result while a submission is being graded. */
export function ResultSkeleton() {
  return (
    <LoadingRegion label="Checking your answer">
      <div aria-hidden="true" className="space-y-2 rounded-xl border border-border-strong p-4">
        <div className="skeleton h-5 w-1/2" />
        <div className="skeleton h-3.5 w-1/3" />
      </div>
    </LoadingRegion>
  );
}
