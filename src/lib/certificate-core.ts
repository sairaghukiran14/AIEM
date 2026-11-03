/**
 * Pure certificate logic: no database, no framework imports, so it can be
 * tested on its own and shared by the server and any page.
 */

/** 32 symbols, with the look-alikes I, O, 0 and 1 removed so IDs can be read aloud or copied by hand. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const CERT_ID_PATTERN = /^AIEM-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

/**
 * Builds an ID like AIEM-7K3Q-ZB2M-X9HD from at least 12 random bytes.
 * 256 is a multiple of 32, so `byte % 32` is perfectly uniform (no modulo bias).
 */
export function certIdFromBytes(bytes: Uint8Array): string {
  if (bytes.length < 12) throw new Error("certIdFromBytes needs at least 12 bytes");
  const chars = Array.from(bytes.slice(0, 12), (b) => ALPHABET[b % 32]);
  return `AIEM-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

export function isValidCertId(id: string): boolean {
  return CERT_ID_PATTERN.test(id);
}

/** Whole-number percentage of a score, 0 when the maximum is 0. */
export function scorePercent(score: number, maxScore: number): number {
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

/** The course certificate needs every gate passed. An empty gate list never qualifies. */
export function allGatesPassed(gateIds: string[], passed: ReadonlySet<string>): boolean {
  return gateIds.length > 0 && gateIds.every((id) => passed.has(id));
}

export function formatIssueDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
