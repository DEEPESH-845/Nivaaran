import { describe, expect, it } from "vitest";
import { fail, readJson, sameOrigin } from "./respond";

describe("fail", () => {
  it("maps each code to its status", async () => {
    expect(fail("UNAUTHENTICATED").status).toBe(401);
    expect(fail("UNAUTHORIZED").status).toBe(403);
    expect(fail("NOT_FOUND").status).toBe(404);
    expect(fail("CONFLICT").status).toBe(409);
    expect(fail("INVALID_REQUEST").status).toBe(422);
    expect(fail("RATE_LIMITED").status).toBe(429);
    expect(fail("INTERNAL_ERROR").status).toBe(500);
  });

  it("gives every response a distinct request id to quote", async () => {
    const a = (await fail("INTERNAL_ERROR").json()) as { error: { requestId: string } };
    const b = (await fail("INTERNAL_ERROR").json()) as { error: { requestId: string } };
    expect(a.error.requestId).not.toBe(b.error.requestId);
  });

  it("never returns an empty message, whatever the code", async () => {
    const body = (await fail("SERVICE_UNAVAILABLE").json()) as { error: { message: string } };
    expect(body.error.message.length).toBeGreaterThan(10);
  });

  it("is never cached", () => {
    expect(fail("RATE_LIMITED").headers.get("cache-control")).toBe("no-store");
  });
});

describe("readJson", () => {
  const post = (body: string, headers: Record<string, string> = {}) =>
    new Request("https://nivaaran.app/api/case", { method: "POST", body, headers });

  it("parses a well-formed body", async () => {
    expect(await readJson(post(JSON.stringify({ a: 1 })))).toEqual({ a: 1 });
  });

  it("returns null rather than throwing on malformed JSON", async () => {
    expect(await readJson(post("{not json"))).toBeNull();
    expect(await readJson(post(""))).toBeNull();
  });

  it("refuses a body over the ceiling", async () => {
    expect(await readJson(post(JSON.stringify({ a: "x".repeat(200) })), 64)).toBeNull();
  });

  it("refuses on a declared length over the ceiling, before reading a byte", async () => {
    expect(await readJson(post("{}", { "content-length": "999999" }), 1024)).toBeNull();
  });

  it("does not trust a understated content-length", async () => {
    // Content-Length is client-controlled; the real bytes are what count.
    expect(await readJson(post(JSON.stringify({ a: "x".repeat(500) }), { "content-length": "2" }), 64)).toBeNull();
  });
});

describe("sameOrigin", () => {
  const post = (origin?: string) =>
    new Request("https://nivaaran.app/api/case", {
      method: "POST",
      headers: origin ? { origin } : {},
    });

  it("accepts our own origin", () => {
    expect(sameOrigin(post("https://nivaaran.app"))).toBe(true);
  });

  it("refuses another site posting with our cookie", () => {
    expect(sameOrigin(post("https://evil.example"))).toBe(false);
    expect(sameOrigin(post("http://nivaaran.app.evil.example"))).toBe(false);
  });

  it("allows a missing Origin, which a same-origin server call has", () => {
    expect(sameOrigin(post())).toBe(true);
  });

  it("refuses an unparseable Origin rather than waving it through", () => {
    expect(sameOrigin(post("not a url"))).toBe(false);
  });
});
