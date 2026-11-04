"use client";

import { ErrorPanel } from "@/components/ErrorPanel";

// Catches errors on pages outside the main site layout, such as sign in and sign up.
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <ErrorPanel error={error} reset={reset} />
    </div>
  );
}
