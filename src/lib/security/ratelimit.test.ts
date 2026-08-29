import { beforeEach, describe, expect, it, vi } from "vitest";
import { BUDGETS, clientKey, rateLimit } from "./ratelimit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T00:00:00Z"));
  });

  it("allows exactly the budget, then refuses", () => {
    const id = "a.b.c.1";
    for (let i = 0; i < BUDGETS.login.max; i += 1) {
      expect(rateLimit("login", id).ok, `attempt ${i + 1}`).toBe(true);
    }
    expect(rateLimit("login", id).ok).toBe(false);
  });

  it("reports how long the caller must wait", () => {
    const id = "a.b.c.2";
    for (let i = 0; i < BUDGETS.login.max; i += 1) rateLimit("login", id);
    const denied = rateLimit("login", id);
    expect(denied.retryAfter).toBeGreaterThan(0);
    expect(denied.retryAfter).toBeLessThanOrEqual(60);
  });

  it("keeps buckets separate, so an expensive endpoint has its own budget", () => {
    const id = "a.b.c.3";
    for (let i = 0; i < BUDGETS.vision.max; i += 1) rateLimit("vision", id);
    expect(rateLimit("vision", id).ok).toBe(false);
    expect(rateLimit("ai", id).ok).toBe(true);
  });

  it("throttles one account without locking out everyone behind the same NAT", () => {
    // The login bucket is keyed by address *and* account. One person guessing
    // one password must not sign out the rest of the office.
    const ip = "203.0.113.7";
    for (let i = 0; i < BUDGETS.login.max; i += 1) rateLimit("login", `${ip}:target@example.com`);
    expect(rateLimit("login", `${ip}:target@example.com`).ok).toBe(false);
    expect(rateLimit("login", `${ip}:someone-else@example.com`).ok).toBe(true);
  });

  it("still caps a spray across many accounts from one address", () => {
    const ip = "203.0.113.8";
    for (let i = 0; i < BUDGETS.loginIp.max; i += 1) rateLimit("loginIp", ip);
    expect(rateLimit("loginIp", ip).ok).toBe(false);
  });

  it("keeps callers separate", () => {
    for (let i = 0; i < BUDGETS.login.max; i += 1) rateLimit("login", "a.b.c.4");
    expect(rateLimit("login", "a.b.c.4").ok).toBe(false);
    expect(rateLimit("login", "a.b.c.5").ok).toBe(true);
  });

  it("frees up once the window passes", () => {
    const id = "a.b.c.6";
    for (let i = 0; i < BUDGETS.login.max; i += 1) rateLimit("login", id);
    expect(rateLimit("login", id).ok).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(rateLimit("login", id).ok).toBe(true);
  });
});

describe("clientKey", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://nivaaran.app/api/auth/login", { headers });

  it("ignores a client-supplied x-forwarded-for when we are not behind a proxy", () => {
    // Honouring it on a direct connection lets an attacker mint a fresh
    // bucket per request and walk straight through the limiter.
    delete process.env.VERCEL;
    delete process.env.TRUST_PROXY;
    expect(clientKey(req({ "x-forwarded-for": "1.2.3.4" }))).toBe("anonymous");
  });

  it("trusts the first hop only when a proxy is declared", () => {
    process.env.TRUST_PROXY = "1";
    expect(clientKey(req({ "x-forwarded-for": "1.2.3.4, 9.9.9.9" }))).toBe("1.2.3.4");
    delete process.env.TRUST_PROXY;
  });

  it("falls back to a single shared bucket rather than to no limit at all", () => {
    expect(clientKey(req({}))).toBe("anonymous");
  });
});
