/**
 * In-memory throttle — first layer of brute-force / signup-spam protection.
 *
 * Serverless note: each instance has its own counter map.  This is intentional
 * (cheap deterrent) and is sufficient until traffic warrants a shared Redis limiter.
 * Keys are namespaced (e.g. "signup:ip", "login:ip|email") to allow different
 * policies per endpoint.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

/* ── Per-policy limits ──────────────────────────────────────────────── */
const POLICIES: Record<string, { window: number; max: number }> = {
  /** Login: 8 failures per 15 min */
  login:  { window: 15 * 60 * 1000, max: 8 },
  /** Signup: 5 attempts per 60 min (harsher — prevents account-farm bots) */
  signup: { window: 60 * 60 * 1000, max: 5 },
  /** Artist profile update: 30 per 5 min */
  profile: { window: 5 * 60 * 1000, max: 30 },
  /** Upload: 20 per 5 min */
  upload: { window: 5 * 60 * 1000, max: 20 },
  /** Default (fallback) */
  default: { window: 15 * 60 * 1000, max: 8 },
};

const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (buckets.size < 512) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

function policyFor(key: string) {
  const prefix = key.split(":")[0] ?? "default";
  return POLICIES[prefix] ?? POLICIES.default!;
}

export function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  const { max } = policyFor(key);
  return Boolean(b && b.resetAt > now && b.count >= max);
}

export function recordFailure(key: string) {
  const now = Date.now();
  const { window } = policyFor(key);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + window });
  else b.count += 1;
}

/** Also used for non-failure increments (e.g. all signup attempts, not just failed ones). */
export function recordAttempt(key: string) {
  recordFailure(key); // same logic — count any attempt
}

export function clearFailures(key: string) {
  buckets.delete(key);
}

/** Remaining seconds until the bucket resets (for Retry-After headers). */
export function retryAfterSeconds(key: string): number {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) return 0;
  return Math.ceil((b.resetAt - now) / 1000);
}

/** Best-effort client identity behind a proxy (Netlify/Vercel set x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? "unknown").trim();
}
