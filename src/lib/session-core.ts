/** The rules for whether a signed session token is still good, kept pure so they can be tested directly. */

export type SessionCheck = {
  /** The version stamped into the token when it was issued. Older tokens have none, which counts as 0. */
  tokenVersion: number | undefined;
  /** The user's current version. Bumped by a password reset and by "sign out everywhere". */
  userVersion: number | undefined;
  /** Seconds since the epoch when the token was issued. */
  issuedAt: number;
  /** When the password last changed, if ever. */
  passwordChangedAt: Date | null | undefined;
  /** Whether this exact token was signed out on its own (logout). */
  revoked: boolean;
};

export type SessionStatus = "ok" | "signed-out" | "version-changed" | "before-password-change";

export function sessionStatus(c: SessionCheck): SessionStatus {
  if (c.revoked) return "signed-out";
  if ((c.tokenVersion ?? 0) !== (c.userVersion ?? 0)) return "version-changed";
  if (c.passwordChangedAt && c.issuedAt * 1000 < Math.floor(c.passwordChangedAt.getTime() / 1000) * 1000) {
    return "before-password-change";
  }
  return "ok";
}
