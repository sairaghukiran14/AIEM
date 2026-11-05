"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { PageSkeleton } from "@/components/PageSkeletons";

/**
 * Instant feedback for every internal link click.
 *
 * Every page here is rendered per request, and Next.js does not prefetch such routes unless they have a loading.tsx.
 * A loading.tsx is not an option: it starts the response before the page can redirect or 404, which turns those into
 * 200s. So the skeleton comes from the browser instead, the moment the click happens, and server statuses are untouched.
 */

const NAVIGATE_EVENT = "aiem:navigate";
/** Below this a navigation is served from the client cache, and a skeleton would only flicker. */
const SKELETON_DELAY_MS = 60;
/** Gives the old page back if a navigation never lands, such as a redirect to the page you are already on. */
const GIVE_UP_MS = 12_000;

/** For code that navigates with router.push rather than a link. */
export function announceNavigation(href: string) {
  window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: href }));
}

/** The URL this navigation would load, or null when it stays on this page or leaves the app. */
function internalTarget(href: string): URL | null {
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname.startsWith("/api/")) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  return url;
}

function clickedHref(event: MouseEvent): string | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const link = (event.target as Element | null)?.closest?.("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return null;
  if (link.hasAttribute("download") || (link.target && link.target !== "_self")) return null;
  return link.href;
}

/** Lives in its own boundary because useSearchParams would otherwise suspend the page around it on static routes. */
function UrlWatcher({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(onChange, [pathname, search, onChange]);
  return null;
}

type Pending = { pathname: string; showSkeleton: boolean };

export function NavigationFeedback({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  /** For the narrow sign-in column, where a full page skeleton would not fit. */
  compact?: boolean;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const clear = useCallback(() => setPending(null), []);

  useEffect(() => {
    function start(href: string | null) {
      const target = href && internalTarget(href);
      if (!target) return;
      setPending((current) => ({ pathname: target.pathname, showSkeleton: current?.showSkeleton ?? false }));
    }
    const onClick = (event: MouseEvent) => start(clickedHref(event));
    const onAnnounce = (event: Event) => start((event as CustomEvent<string>).detail);
    // A full page load restored from the back/forward cache comes back exactly as it was left.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(null);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener(NAVIGATE_EVENT, onAnnounce);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAVIGATE_EVENT, onAnnounce);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const target = pending?.pathname;
  useEffect(() => {
    if (!target) return;
    const show = setTimeout(() => {
      setPending((current) => current && { ...current, showSkeleton: true });
      window.scrollTo(0, 0);
    }, SKELETON_DELAY_MS);
    const giveUp = setTimeout(() => setPending(null), GIVE_UP_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(giveUp);
    };
  }, [target]);

  const showSkeleton = Boolean(pending?.showSkeleton);

  return (
    <>
      <Suspense fallback={null}>
        <UrlWatcher onChange={clear} />
      </Suspense>
      {pending && <div aria-hidden="true" className="nav-progress" />}
      {pending && showSkeleton && <PageSkeleton pathname={pending.pathname} compact={compact} />}
      {/* Kept mounted so that typed answers survive if the navigation does not land. */}
      <div hidden={showSkeleton}>{children}</div>
    </>
  );
}
