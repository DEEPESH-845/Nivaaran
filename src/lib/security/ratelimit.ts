/**
 * Fixed-window rate limiting.
 *
 * One implementation for every endpoint that needs one, keyed by
 * `bucket:identity`. The buckets differ wildly in cost — a login attempt runs
 * a deliberately slow KDF, a vision call costs real money — so each names its
 * own budget rather than sharing a global number.
 *
 * ponytail: in-process Map, correct for one instance only. The interface is
 * the part that matters; swapping in Redis/Upstash is a change of this file
 * alone. Documented as a known limitation in the README.
 */

const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;

export interface Budget {
  /** Requests permitted per window. */
  max: number;
}

/**
 * A budget, overridable per deployment.
 *
 * The defaults are the policy. The override exists because the right number
 * genuinely differs by environment — a CI run signs in more often in a minute
 * than any real person, and an office behind one NAT more often than a home.
 * Set `RATE_LIMIT_LOGIN`, `RATE_LIMIT_SIGNUP` and so on to change one.
 */
function budget(name: string, fallback: number): Budget {
  const raw = Number(process.env[`RATE_LIMIT_${name.toUpperCase()}`]);
  return { max: Number.isFinite(raw) && raw > 0 ? raw : fallback };
}

export const BUDGETS = {
  /**
   * Keyed by address *and* account, not by address alone.
   *
   * A shared NAT — an office, a college, a cyber cafe, which is exactly where
   * this product's users are — puts hundreds of people behind one IP. A pure
   * per-IP login limit locks all of them out because one of them mistyped.
   * Throttling per account stops the attack that matters (guessing one
   * password) without that collateral, and `loginIp` below still caps the
   * spray across many accounts.
   */
  login: budget("login", 20),
  loginIp: budget("loginip", 60),
  signup: budget("signup", 6),
  ai: budget("ai", 12),
  vision: budget("vision", 5),
  write: budget("write", 60),
  publicApi: budget("publicapi", 30),
} satisfies Record<string, Budget>;

export type BucketName = keyof typeof BUDGETS;

export interface LimitResult {
  ok: boolean;
  /** Seconds until the window frees up, for a Retry-After header. */
  retryAfter: number;
}

export function rateLimit(bucket: BucketName, identity: string): LimitResult {
  const { max } = BUDGETS[bucket];
  const key = `${bucket}:${identity}`;
  const now = Date.now();
  const recent = (HITS.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= max) {
    HITS.set(key, recent);
    return { ok: false, retryAfter: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) };
  }

  recent.push(now);
  HITS.set(key, recent);
  if (HITS.size > 5000) HITS.clear(); // crude ceiling; prototype only
  return { ok: true, retryAfter: 0 };
}

/**
 * The caller's identity for limiting purposes.
 *
 * Only the *first* hop of x-forwarded-for is read, and only when a trusted
 * proxy is in front of us. A client can send any x-forwarded-for it likes; on
 * a direct connection, honouring it would let an attacker mint a fresh bucket
 * per request and walk straight through the limiter.
 */
export function clientKey(request: Request): string {
  const behindProxy = process.env.VERCEL || process.env.TRUST_PROXY === "1";
  if (behindProxy) {
    const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (fwd) return fwd;
  }
  return request.headers.get("x-real-ip") ?? "anonymous";
}
