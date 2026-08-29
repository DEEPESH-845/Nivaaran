import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readSpecimen } from "./sample";

const sample = (file: string) => readFileSync(`public/samples/${file}`, "utf8");

describe("readSpecimen", () => {
  it("reads the identity sample exactly", () => {
    expect(readSpecimen(sample("identity-rajesh.svg"))).toEqual({
      name: "Rajesh Kumar Sharma",
      dob: "1996-03-08",
      ifsc: null,
      accountLast4: null,
    });
  });

  it("reads a day-first date as a day, which is the whole demonstration", () => {
    // Sunita's card prints 07 / 02 / 1985 against an EPFO record of
    // 1985-07-02. Read month-first it would agree, and the day/month swap the
    // engine exists to catch would vanish.
    expect(readSpecimen(sample("identity-sunita.svg")).dob).toBe("1985-02-07");
  });

  it("reads the passbook, and only the last four digits of the account", () => {
    const fields = readSpecimen(sample("passbook-rajesh.svg"));
    expect(fields).toEqual({
      name: "Rajesh Kumar Sharma",
      dob: null,
      ifsc: "CORP0001234",
      accountLast4: "8842",
    });
    // The specimen prints the account masked; nothing longer may escape.
    expect(fields.accountLast4).toHaveLength(4);
  });

  it("returns nulls rather than guesses for anything else", () => {
    expect(readSpecimen("<svg><text>HELLO</text></svg>")).toEqual({
      name: null,
      dob: null,
      ifsc: null,
      accountLast4: null,
    });
  });
});
