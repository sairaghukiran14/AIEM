import { FastLink as Link } from "@/components/FastLink";
import { Suspense } from "react";
import { Flame, Zap } from "lucide-react";

import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { Skeleton } from "@/components/Skeleton";
import { getCurrentUser } from "@/lib/auth";

const NAV = [
  { href: "/tracks", label: "Tracks" },
  { href: "/quiz", label: "Quiz" },
  { href: "/cheatsheets", label: "Cheatsheets" },
  { href: "/capstone", label: "Capstone" },
  { href: "/certificates", label: "Certificates" },
  { href: "/dashboard", label: "Dashboard" },
];

async function HeaderAccount() {
  const user = await getCurrentUser();

  return user ? (
    <div className="ml-auto flex items-center gap-3 text-sm sm:ml-0">
      <span className="flex items-center gap-1 text-amber" title="Experience points">
        <Zap className="size-4" />
        {user.xp}
      </span>
      <span className="flex items-center gap-1 text-pink" title="Day streak">
        <Flame className="size-4" />
        {user.streakCount}
      </span>
      <Link href="/account" className="hidden rounded-md px-2 py-1 text-xs font-medium text-text-muted hover:bg-bg-hover hover:text-text sm:inline">
        Account
      </Link>
      <LogoutButton />
    </div>
  ) : (
    <div className="ml-auto flex items-center gap-2 sm:ml-0">
      <Link href="/login" className="btn btn-ghost !px-3 !py-1.5 !text-xs">
        Sign in
      </Link>
      <Link href="/signup" className="btn btn-primary !px-3 !py-1.5 !text-xs">
        Start free
      </Link>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-base bg-bg-card print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:h-14 sm:flex-nowrap sm:py-0 sm:px-6">
        <Logo size="sm" />

        {/* On phones the links drop to their own scrollable row under the logo. */}
        <nav className="order-last -mx-2 flex w-full items-center gap-1 overflow-x-auto text-sm sm:order-none sm:mx-0 sm:w-auto sm:flex-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Suspense fallback={<Skeleton className="ml-auto h-8 w-40 sm:ml-0" />}>
          <HeaderAccount />
        </Suspense>
      </div>
    </header>
  );
}
