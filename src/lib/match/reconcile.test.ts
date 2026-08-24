import { describe, expect, it } from "vitest";
import { blockingRows, readRows, reconcile } from "./reconcile";

const EPFO = {
  name: "RAJESH K SHARMA",
  dob: "1996-03-08",
  ifsc: "CORP0001234",
  accountLast4: "8842",
};

const row = (rows: ReturnType<typeof reconcile>, field: string) =>
  rows.find((r) => r.field === field)!;

describe("reconcile — against the EPFO record", () => {
  it("reads as unread until a document is actually read", () => {
    const rows = reconcile(EPFO);
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(r.identity.verdict).toBe("unread");
      expect(r.bank.verdict).toBe("unread");
      expect(r.ruleId).toBeUndefined();
    }
    expect(readRows(rows)).toHaveLength(0);
  });

  it("uses the government-strict name matcher, not string equality", () => {
    // An initial standing in for a full middle name passes no EPFO matcher.
    const rows = reconcile(EPFO, { name: "Rajesh Kumar Sharma" });
    const name = row(rows, "name");
    expect(name.identity.verdict).toBe("differs");
    expect(name.ruleId).toBe("R-NAME-AADHAAR");
    // And the token-level detail is carried through for the diff component.
    expect(name.identity.nameVerdict?.right.some((t) => t.text === "KUMAR")).toBe(true);
  });

  it("accepts a name that differs only by case and punctuation", () => {
    const rows = reconcile(EPFO, { name: "rajesh k. sharma" });
    expect(row(rows, "name").identity.verdict).toBe("agrees");
    expect(row(rows, "name").ruleId).toBeUndefined();
  });

  it("catches a swapped day and month through the date matcher", () => {
    const rows = reconcile(EPFO, { dob: "1996-08-03" });
    expect(row(rows, "dob").identity.verdict).toBe("differs");
    expect(row(rows, "dob").ruleId).toBe("R-DOB-AADHAAR");
  });

  it("maps a passbook name mismatch to the bank rule, not the Aadhaar one", () => {
    const rows = reconcile(EPFO, {}, { name: "R K Sharma" });
    expect(row(rows, "name").bank.verdict).toBe("differs");
    expect(row(rows, "name").ruleId).toBe("R-BANK-NAME");
  });

  it("puts each field only in the columns that can carry it", () => {
    const rows = reconcile(
      EPFO,
      { name: "Rajesh K Sharma", dob: "1996-03-08" },
      { name: "Rajesh K Sharma", ifsc: "CORP0001234", accountLast4: "8842" },
    );
    // A passbook has no date of birth; an identity document has no IFSC.
    expect(row(rows, "dob").bank.verdict).toBe("unread");
    expect(row(rows, "ifsc").identity.verdict).toBe("unread");
    expect(row(rows, "accountLast4").identity.verdict).toBe("unread");
  });
});

describe("reconcile — the comparisons EPFO does not run", () => {
  it("does not claim a rule for an IFSC difference, because there is none", () => {
    const rows = reconcile(EPFO, {}, { ifsc: "HDFC0000521" });
    const ifsc = row(rows, "ifsc");
    expect(ifsc.bank.verdict).toBe("differs");
    expect(ifsc.ruleId).toBeUndefined();
    expect(ifsc.note).toBeDefined();
  });

  it("does not claim a rule for an account difference either", () => {
    const rows = reconcile(EPFO, {}, { accountLast4: "1234" });
    expect(row(rows, "accountLast4").bank.verdict).toBe("differs");
    expect(row(rows, "accountLast4").ruleId).toBeUndefined();
  });

  it("reports documents disagreeing with each other without calling it a blocker", () => {
    // Both match EPFO's matcher, but not each other's spelling.
    const rows = reconcile(
      EPFO,
      { name: "Rajesh Kumar Sharma" },
      { name: "Rajesh Kumaar Sharma" },
    );
    const name = row(rows, "name");
    expect(name.documentsDisagree).toBe(true);
    // It is information, so it never adds a row to the blocking count on its own.
    const onlyDisagreement = reconcile(
      { ...EPFO, name: "RAJESH KUMAR SHARMA" },
      { name: "Rajesh Kumar Sharma" },
      { name: "Rajesh Kumar Sharma " },
    );
    expect(row(onlyDisagreement, "name").documentsDisagree).toBe(false);
    expect(blockingRows(onlyDisagreement)).toHaveLength(0);
  });

  it("does not flag a disagreement when only one document carries the field", () => {
    const rows = reconcile(EPFO, { name: "Rajesh Kumar Sharma" });
    expect(row(rows, "name").documentsDisagree).toBe(false);
  });
});

describe("blockingRows", () => {
  it("counts only differences a rule actually covers", () => {
    const rows = reconcile(
      EPFO,
      { name: "Rajesh Kumar Sharma", dob: "1996-03-08" },
      { name: "Rajesh Kumar Sharma", ifsc: "HDFC0000521", accountLast4: "1111" },
    );
    // Name differs and is covered. IFSC and account differ and are not.
    expect(blockingRows(rows).map((r) => r.field)).toEqual(["name"]);
  });

  it("counts nothing when every covered field agrees", () => {
    const rows = reconcile(
      EPFO,
      { name: "Rajesh K Sharma", dob: "1996-03-08" },
      { name: "Rajesh K Sharma", ifsc: "CORP0001234", accountLast4: "8842" },
    );
    expect(blockingRows(rows)).toHaveLength(0);
    expect(readRows(rows)).toHaveLength(4);
  });
});
