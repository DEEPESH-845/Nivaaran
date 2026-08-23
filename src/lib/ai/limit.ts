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

export function allow(key: string): boolean {
  const now = Date.now();
  const recent = (HITS.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
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
