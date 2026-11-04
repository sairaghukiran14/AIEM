import { createHash, randomBytes } from "node:crypto";

export const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

/** A new random token. Send this to the user and store only its hash. */
export function newResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
