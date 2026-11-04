"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

/** The body of every error page: calm, grayscale, with a way to retry and a way out. */
export function ErrorPanel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto my-10 max-w-lg p-8 text-center">
      <TriangleAlert className="mx-auto mb-3 size-8 text-text-dim" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-text-muted">
        We could not load this page. This is usually temporary, so trying again often works. Your progress is saved.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button className="btn btn-primary" onClick={reset}>
          <RotateCcw className="size-4" /> Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Go to the home page
        </Link>
      </div>
      {error.digest && <p className="mt-5 font-mono text-[11px] text-text-dim">Reference: {error.digest}</p>}
    </div>
  );
}
