import { describe, expect, it } from "vitest";
import { safeNext } from "./redirect";

/**
 * `?next=` is attacker-controlled. Every case below is a real open-redirect
 * technique; each must fall back rather than be followed.
 */
describe("safeNext", () => {
  it("follows a same-site absolute path", () => {
    expect(safeNext("/preflight")).toBe("/preflight");
    expect(safeNext("/employer?tab=yours")).toBe("/employer?tab=yours");
  });

  it("falls back when there is nothing to follow", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(undefined)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
  });

  it("refuses an absolute URL to another origin", () => {
    expect(safeNext("https://evil.example/steal")).toBe("/dashboard");
    expect(safeNext("http://evil.example")).toBe("/dashboard");
  });

  it("refuses a protocol-relative URL, which looks like a path", () => {
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example/path")).toBe("/dashboard");
  });

  it("refuses the backslash variant browsers normalise to a slash", () => {
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
  });

  it("refuses a scheme that is not a path at all", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNext("data:text/html,<script>")).toBe("/dashboard");
  });

  it("refuses embedded control characters", () => {
    expect(safeNext("/dash\nSet-Cookie: x=1")).toBe("/dashboard");
    expect(safeNext("/dash\r\nLocation: https://evil.example")).toBe("/dashboard");
    expect(safeNext("/dash\u007f")).toBe("/dashboard");
  });

  it("honours a caller-supplied fallback", () => {
    expect(safeNext("https://evil.example", "/")).toBe("/");
  });
});
