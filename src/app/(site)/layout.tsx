import { FastLink as Link } from "@/components/FastLink";

import { Logo } from "@/components/Logo";
import { NavigationFeedback } from "@/components/NavigationFeedback";
import { SiteHeader } from "@/components/SiteHeader";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <NavigationFeedback>{children}</NavigationFeedback>
      </main>
      <footer className="border-t border-border-base bg-bg-card print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <div className="space-y-2">
            <Logo size="sm" />
            <p className="text-xs text-text-dim">AI Engineering Mastery — learn it, build it, get hired with it.</p>
          </div>
          <nav className="flex gap-5 text-sm text-text-muted">
            <Link href="/tracks" className="hover:text-text">Tracks</Link>
            <Link href="/cheatsheets" className="hover:text-text">Cheatsheets</Link>
            <Link href="/signup" className="hover:text-text">Sign up</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
