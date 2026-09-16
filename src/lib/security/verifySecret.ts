import { createHash, timingSafeEqual } from "crypto";

/**
 * Constant-time check of a request secret against OPTIMIZELY_REVALIDATE_SECRET.
 * Fails closed when the env var is unset, so a missing config never authorizes.
 * Both sides are hashed first so timingSafeEqual gets equal-length buffers and the
 * comparison leaks nothing about the secret's length.
 */
export function isValidRevalidateSecret(provided: string | null | undefined): boolean {
  const expected = process.env.OPTIMIZELY_REVALIDATE_SECRET;
  if (!expected || !provided) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}
