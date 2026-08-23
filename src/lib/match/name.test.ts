import { describe, expect, it } from "vitest";
import { compareDates, compareNames, editDistance, tokenise } from "./name";

describe("tokenise", () => {
  it("strips honorifics, punctuation and case", () => {
    expect(tokenise("Mr. Rajesh  K. Sharma")).toEqual(["RAJESH", "K", "SHARMA"]);
  });
});

describe("editDistance", () => {
  it("counts single substitutions", () => {
    expect(editDistance("SUNITA", "SUNEETA")).toBe(2);
    expect(editDistance("RAJESH", "RAJASH")).toBe(1);
    expect(editDistance("RAJESH", "RAJESH")).toBe(0);
  });
});

describe("compareNames", () => {
  it("passes identical names regardless of spacing and case", () => {
    const v = compareNames("rajesh kumar sharma", "RAJESH  KUMAR SHARMA");
    expect(v.passes).toBe(true);
    expect(v.kind).toBe("exact");
  });

  it("fails an initialised middle name — the canonical EPFO rejection", () => {
    const v = compareNames("RAJESH KUMAR SHARMA", "Rajesh K Sharma");
    expect(v.passes).toBe(false);
    expect(v.kind).toBe("initial_expansion");
    expect(v.left.find((t) => t.text === "KUMAR")?.state).toBe("initial");
  });

  it("fails a dropped middle name", () => {
    const v = compareNames("RAJESH KUMAR SHARMA", "Rajesh Sharma");
    expect(v.passes).toBe(false);
    expect(v.kind).toBe("missing_token");
  });

  it("fails a reordered name", () => {
    const v = compareNames("SHARMA RAJESH", "RAJESH SHARMA");
    expect(v.passes).toBe(false);
    expect(v.kind).toBe("order");
  });

  it("fails a one-character spelling difference", () => {
    const v = compareNames("SUNITA DEVI", "SUNEETA DEVI");
    expect(v.passes).toBe(false);
    expect(v.kind).toBe("spelling");
  });

  it("never silently passes unrelated names", () => {
    expect(compareNames("RAJESH SHARMA", "PRIYA MENON").passes).toBe(false);
  });

  it("treats an empty name as a failure, not a match", () => {
    expect(compareNames("", "").passes).toBe(false);
  });
});

describe("compareDates", () => {
  it("passes identical dates", () => {
    expect(compareDates("1994-03-08", "1994-03-08")).toEqual({
      passes: true,
      kind: "exact",
    });
  });

  it("detects a day/month swap, the biggest cause of EPS rejection", () => {
    const v = compareDates("1994-03-08", "1994-08-03");
    expect(v.passes).toBe(false);
    expect(v.kind).toBe("day_month_swap");
  });

  it("detects a year-only difference", () => {
    expect(compareDates("1994-03-08", "1993-03-08").kind).toBe("year");
  });
});
