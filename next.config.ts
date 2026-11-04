import type { NextConfig } from "next";

import { WORKER_CSP } from "./src/lib/csp";

const extraDevOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

// Response headers for every page. The Content-Security-Policy is set per request in src/proxy.ts, because it carries a fresh
// nonce each time. The code-challenge worker gets its own, separate policy below.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The code sandbox is a WebAssembly engine loaded from node_modules at run time, so it is not bundled, and its
  // files are traced into the serverless function that uses it.
  serverExternalPackages: ["quickjs-emscripten", "quickjs-emscripten-core", "@jitl/quickjs-wasmfile-release-sync", "@jitl/quickjs-ffi-types"],
  outputFileTracingIncludes: {
    "/api/challenges/submit": ["./node_modules/@jitl/quickjs-wasmfile-release-sync/dist/**/*"],
    // The certificate PDF reads fallback fonts for names in other alphabets from node_modules at run time.
    "/api/certificates/[certId]/pdf": [
      "./node_modules/@fontsource/noto-serif/files/*-400-italic.woff",
      "./node_modules/@fontsource/noto-serif/files/*-700-normal.woff",
      "./node_modules/@fontsource/noto-serif-devanagari/files/*devanagari-400-normal.woff",
      "./node_modules/@fontsource/noto-serif-devanagari/files/*devanagari-700-normal.woff",
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The code-challenge worker may use eval and nothing else: no network, no other scripts.
      { source: "/code-worker.js", headers: [{ key: "Content-Security-Policy", value: WORKER_CSP }, { key: "Cache-Control", value: "public, max-age=3600" }] },
    ];
  },
  // Dev only. Next blocks dev-server requests from any host except localhost, and
  // when /_next/hmr is blocked the page renders but never hydrates, so buttons and
  // visuals do nothing. Allow the other ways of reaching this machine; add your own
  // hostnames with DEV_ALLOWED_ORIGINS (comma separated) in .env.local.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", ...extraDevOrigins],
  // Cache Components (scaffold default) is off: every page reads the session
  // cookie, so it would force a <Suspense> boundary around nearly everything.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
