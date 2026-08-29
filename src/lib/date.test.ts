import { describe, expect, it } from "vitest";
import { formatDate, formatDateForInput, parseDate } from "./date";

describe("parseDate", () => {
  it("keeps ISO as the canonical value", () => {
    expect(parseDate("1996-03-08")).toBe("1996-03-08");
    expect(parseDate("1996-3-8")).toBe("1996-03-08");
  });

  it("reads day-first, never month-first", () => {
    // The whole reason this module exists: `new Date("01/02/2000")` is
    // February in one browser and January in another.
    expect(parseDate("01/02/2000")).toBe("2000-02-01");
    expect(parseDate("02/01/2000")).toBe("2000-01-02");
    expect(parseDate("10/10/2000")).toBe("2000-10-10");
    expect(parseDate("31/12/2000")).toBe("2000-12-31");
    expect(parseDate("08-03-1996")).toBe("1996-03-08");
    expect(parseDate("08 / 03 / 1996".replace(/ /g, ""))).toBe("1996-03-08");
  });

  it("refuses days that are not on the calendar", () => {
    expect(parseDate("29/02/2024")).toBe("2024-02-29"); // leap
    expect(parseDate("29/02/2023")).toBeNull();
    expect(parseDate("29/02/1900")).toBeNull(); // century, not a leap year
    expect(parseDate("29/02/2000")).toBe("2000-02-29"); // 400, and it is
    expect(parseDate("31/04/2001")).toBeNull();
    expect(parseDate("13/13/2001")).toBeNull();
    expect(parseDate("00/01/2001")).toBeNull();
  });

  it("is null rather than a guess", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(parseDate("8 March 1996")).toBeNull();
    expect(parseDate("96-03-08")).toBeNull();
  });
});

describe("formatDate", () => {
  it("prints one format, day first", () => {
    expect(formatDate("1996-03-08")).toBe("08/03/1996");
    expect(formatDate("2024-02-29")).toBe("29/02/2024");
  });

  it("round-trips through the parser", () => {
    for (const iso of ["1996-03-08", "2000-02-01", "2000-01-02", "1985-07-02"]) {
      expect(parseDate(formatDate(iso))).toBe(iso);
    }
  });

  it("shows an unformattable value rather than hiding it", () => {
    expect(formatDate("sometime in 1996")).toBe("sometime in 1996");
    expect(formatDate("")).toBe("");
  });
});

describe("formatDateForInput", () => {
  it("hands a date control ISO, or nothing at all", () => {
    expect(formatDateForInput("08/03/1996")).toBe("1996-03-08");
    expect(formatDateForInput("nonsense")).toBe("");
  });
});
