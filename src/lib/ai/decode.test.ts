import { describe, expect, it } from "vitest";
import { decodeDeterministic } from "./decode";

describe("decodeDeterministic", () => {
  it("decodes the single most common EPFO rejection", () => {
    expect(decodeDeterministic("Claim rejected: Name not as per records.")).toContain(
      "R-NAME-AADHAAR",
    );
  });

  it("decodes a combined name and date-of-birth rejection", () => {
    const hits = decodeDeterministic(
      "Claim rejected: Name not as per records. DOB not matching with UIDAI.",
    );
    expect(hits).toContain("R-NAME-AADHAAR");
    expect(hits).toContain("R-DOB-AADHAAR");
  });

  it("decodes a missing exit date", () => {
    expect(
      decodeDeterministic("Rejected: Date of exit not marked by the employer"),
    ).toContain("R-EXIT-DATE");
  });

  it("decodes bank and IFSC problems", () => {
    expect(decodeDeterministic("Bank details are invalid / IFSC incorrect")).toContain(
      "R-IFSC",
    );
  });

  it("decodes Form 15G and PAN messages", () => {
    expect(decodeDeterministic("Claim rejected due to non-submission of Form 15G")).toContain(
      "R-TDS-192A",
    );
  });

  it("decodes multiple UANs", () => {
    expect(decodeDeterministic("Member has multiple UAN allotted")).toContain(
      "R-MULTI-UAN",
    );
  });

  it("returns nothing for wording it does not recognise, rather than guessing", () => {
    expect(decodeDeterministic("Kindly contact the concerned field office")).toEqual([]);
  });

  it("returns nothing for empty input", () => {
    expect(decodeDeterministic("")).toEqual([]);
  });
});
