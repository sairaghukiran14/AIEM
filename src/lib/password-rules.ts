import { z } from "zod";

/** bcrypt only reads the first 72 bytes, so a longer password would silently match its own first 72 bytes. */
export const MAX_PASSWORD_BYTES = 72;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES, {
    message: `Password must be at most ${MAX_PASSWORD_BYTES} bytes (about ${MAX_PASSWORD_BYTES} characters)`,
  });
