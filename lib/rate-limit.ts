/**
 * A deliberately small in-memory rate limiter.
 *
 * Honest about what it is: state lives in one serverless instance, so a
 * determined flooder spread across instances gets more than the stated
 * allowance. It exists to stop the ordinary case — a script hammering one
 * endpoint from one address — and to keep the mail provider's quota intact.
 * If the form ever attracts real abuse, this is the piece to replace with a
 * shared store, not the piece to tune.
 */

type Bucket = {
  count: number;
  /** Epoch ms when this bucket resets. */
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

/** Stops the map growing without bound on a long-lived instance. */
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(key: string): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= MAX_PER_WINDOW) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}
