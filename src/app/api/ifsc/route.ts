import { NextResponse } from "next/server";

// This simulates a live NPCI Directory lookup.
const RETIRED_IFSC_PREFIXES: Record<string, string> = {
  SYNB: "CNRB", // Syndicate -> Canara
  ALLA: "IDIB", // Allahabad -> Indian
  OBCI: "PUNB", // Oriental -> PNB
  UTBI: "PUNB", // United -> PNB
  CORP: "UBIN", // Corporation -> Union
  ANDB: "UBIN", // Andhra -> Union
  VJYA: "BARB", // Vijaya -> BOB
  DENA: "BARB", // Dena -> BOB
};

const IFSC_SHAPE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.toUpperCase() ?? "";

  if (!IFSC_SHAPE.test(code)) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  const prefix = code.slice(0, 4);
  if (RETIRED_IFSC_PREFIXES[prefix]) {
    return NextResponse.json(
      { valid: false, retiredTo: RETIRED_IFSC_PREFIXES[prefix] },
      { status: 200 }
    );
  }

  return NextResponse.json({ valid: true }, { status: 200 });
}
