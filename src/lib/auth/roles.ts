/**
 * Roles, in a file with no server imports.
 *
 * The client needs this union to render navigation; it must not reach into a
 * `server-only` module to get it, even for a type.
 */
export type Role = "citizen" | "employer" | "admin";

export const ROLE_LABEL: Record<Role, { en: string; hi: string }> = {
  citizen: { en: "Citizen", hi: "नागरिक" },
  employer: { en: "Employer", hi: "नियोक्ता" },
  admin: { en: "Rule governance", hi: "नियम प्रशासन" },
};
