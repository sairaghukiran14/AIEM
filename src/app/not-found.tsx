import Link from "next/link";
import { Compass } from "lucide-react";
import { connection } from "next/server";

import { Logo } from "@/components/Logo";

export const metadata = { title: "Page not found" };

export default async function NotFound() {
  await connection(); // render per request, so the page gets a nonce like every other page
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border-base bg-bg-card">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-4 sm:px-6">
          <Logo size="sm" />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="card max-w-lg p-8 text-center">
          <Compass className="mx-auto mb-3 size-8 text-text-dim" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-dim">404</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="mt-2 text-sm text-text-muted">
            That address does not lead anywhere. It may have moved, or the link may have been typed or copied wrongly.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/tracks" className="btn btn-primary">
              Browse the tracks
            </Link>
            <Link href="/" className="btn btn-ghost">
              Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
