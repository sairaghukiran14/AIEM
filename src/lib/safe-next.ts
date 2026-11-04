/**
 * Where to send someone after signing in. Only same-site paths are allowed.
 * Browsers read a backslash like a slash, so "/\evil.example" would leave the site just as
 * "//evil.example" does, and control characters can be used to confuse URL parsing.
 */
export function safeNext(next: string | undefined | null, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  if (next.length > 500) return fallback;
  return next;
}
