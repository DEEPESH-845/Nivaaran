/**
 * Redirect targets are attacker-controlled input.
 *
 * `?next=` arrives from a link someone else may have written. Only a same-site
 * absolute path is ever followed. `//evil.example` is a protocol-relative URL
 * that a naive `startsWith("/")` check waves straight through, and a
 * backslash variant is the same trick, so both are rejected explicitly.
 *
 * Lives outside `guard.ts` because the login form needs it on the client too,
 * and a client must never import a `server-only` module.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // A control character can smuggle a second header or confuse a URL parser.
  for (let i = 0; i < next.length; i += 1) {
    const code = next.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return fallback;
  }
  return next;
}
