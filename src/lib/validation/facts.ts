import { z } from "zod";

/**
 * The wire schema for a member record.
 *
 * One definition, shared by the public Preflight API and the authenticated
 * case endpoint, so the documented contract and the internal one cannot drift.
 * Every bound here is deliberate: an unbounded string on an unauthenticated
 * endpoint is an unbounded amount of work.
 */

const TriState = z.enum(["yes", "no", "unsure"]);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const BankLike = {
  ifsc: z.string().max(20),
  accountLast4: z.string().max(4),
  // Optional directory metadata: the engine still validates IFSC format
  // itself, while these values can additionally flag a retired code.
  ifscValid: z.boolean().optional(),
  ifscRetiredTo: z.string().min(1).max(120).optional(),
};

export const FactsSchema = z.object({
  intent: z.enum(["final_settlement", "decode_rejection"]).default("final_settlement"),
  daysSinceExit: z.number().int().min(0).max(20000),
  exitDateFiled: TriState,
  uanAadhaarVerified: TriState,
  uanBeforeOct2017: TriState,
  multipleUans: TriState,
  serviceYears: z.number().min(0).max(60),
  claimAmount: z.number().min(0).max(100_000_000),
  panOnRecord: z.boolean(),
  records: z.object({
    epfo: z.object({ name: z.string().min(1).max(120), dob: IsoDate, ...BankLike }),
    aadhaar: z.object({ name: z.string().min(1).max(120), dob: IsoDate }).optional(),
    bank: z.object({ name: z.string().min(1).max(120), ...BankLike }).optional(),
  }),
});

export type FactsInput = z.infer<typeof FactsSchema>;
