import type { NextConfig } from "next";

const extraDevOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
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
