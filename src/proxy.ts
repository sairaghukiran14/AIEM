import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { buildCsp, newNonce } from "@/lib/csp";

/** Sets a Content Security Policy with a fresh nonce on every page request. */
export function proxy(request: NextRequest) {
  const nonce = newNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  // Next.js reads the policy from the request headers during rendering and puts the nonce on its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not the API, framework files, or static assets, and not link prefetches.
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|txt|xml|pdf)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
