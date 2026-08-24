/**
 * Minimal in-process rate limit for the public AI endpoints.
 *
 * The live demo URL is open to anyone and there is a metered API behind it.
 * A Map is enough for a single-instance prototype; a real deployment would use
 * a shared store. Deliberately small — see docs/ARCHITECTURE.md.
 */
const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

/**
 * `max` lets an expensive endpoint carry its own, smaller budget under its own
 * key prefix — vision costs an order of magnitude more than a text call.
 */
export function allow(key: string, max = MAX_PER_WINDOW): boolean {
  const now = Date.now();
  const recent = (HITS.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= max) {
    HITS.set(key, recent);
    return false;
  }
  recent.push(now);
  HITS.set(key, recent);
  if (HITS.size > 5000) HITS.clear(); // crude ceiling; prototype only
  return true;
}

export function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous"
  );
}
