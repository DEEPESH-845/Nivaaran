import { describe, expect, it } from "vitest";
import { checkPassword, hashPassword, isEmail, normaliseEmail, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a password against its own hash", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery stapl", stored)).toBe(false);
  });

  it("never stores the password inside the hash", async () => {
    const stored = await hashPassword("NivaaranDemo2026!");
    expect(stored).not.toContain("NivaaranDemo2026!");
    expect(stored.startsWith("scrypt$")).toBe(true);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("the same password");
    const b = await hashPassword("the same password");
    expect(a).not.toBe(b);
  });

  it("returns false rather than throwing on a malformed record", async () => {
    for (const bad of ["", "not-a-hash", "scrypt$only-one-part", "bcrypt$a$b"]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });
});

describe("password policy", () => {
  it("accepts a long, varied password", () => {
    expect(checkPassword("NivaaranDemo2026!")).toBeNull();
    expect(checkPassword("tin roof rusted badly")).toBeNull();
  });

  it("rejects anything under ten characters", () => {
    expect(checkPassword("Sh0rt!")).toBe("too_short");
    expect(checkPassword("123456789")).toBe("too_short");
  });

  it("rejects an unbounded password, which is unbounded KDF work", () => {
    expect(checkPassword("a1B2c3D4e5".repeat(30))).toBe("too_long");
  });

  it("rejects low-variety strings that clear the length bar", () => {
    expect(checkPassword("aaaaaaaaaaaa")).toBe("too_simple");
    expect(checkPassword("abababababab")).toBe("too_simple");
  });

  it("rejects the passwords that actually appear in stuffing lists", () => {
    expect(checkPassword("password123")).toBe("too_simple");
    expect(checkPassword("qwerty12345")).toBe("too_simple");
  });

  it("rejects a password containing the account name", () => {
    expect(checkPassword("rajeshsharma99", "rajeshsharma@example.com")).toBe("looks_like_email");
  });
});

describe("email handling", () => {
  it("accepts ordinary addresses", () => {
    expect(isEmail("demo@nivaaran.app")).toBe(true);
    expect(isEmail("a.b+c@sub.example.co.in")).toBe(true);
  });

  it("rejects the obviously malformed", () => {
    for (const bad of ["", "no-at-sign", "@example.com", "a@b", "a b@c.com"]) {
      expect(isEmail(bad)).toBe(false);
    }
  });

  it("rejects an address long enough to be an attack", () => {
    expect(isEmail(`${"a".repeat(250)}@example.com`)).toBe(false);
  });

  it("normalises case and whitespace, so one person is one account", () => {
    expect(normaliseEmail("  Demo@Nivaaran.APP ")).toBe("demo@nivaaran.app");
  });
});
