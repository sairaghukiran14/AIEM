/** Pure parts of the rate limiter, kept free of the database so they can be tested directly. */

export type Policy = { name: string; limit: number; windowSec: number };

/** Start of the fixed window that contains 'now'. */
export function windowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

export type Decision = { allowed: boolean; remaining: number; retryAfterSec: number };

/** Given how many hits this window now holds (including this one), may the request proceed? */
export function decide(count: number, limit: number, windowEndMs: number, now: number): Decision {
  const allowed = count <= limit;
  return {
    allowed,
    remaining: Math.max(limit - count, 0),
    retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((windowEndMs - now) / 1000)),
  };
}

/** The key for one counter: policy, identity and the window it belongs to. */
export function counterKey(policy: Policy, id: string, now: number): string {
  const start = windowStart(now, policy.windowSec * 1000);
  return `${policy.name}:${id}:${start}`;
}

/** The caller's address as the hosting platform reports it, or 'unknown'. */
export function clientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** A short, readable wait for error messages. */
export function waitText(seconds: number): string {
  if (seconds < 90) return `${seconds} seconds`;
  return `${Math.ceil(seconds / 60)} minutes`;
}
