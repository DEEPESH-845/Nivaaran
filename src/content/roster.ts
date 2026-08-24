import { personaById } from "@/content/personas";
import type { Bi, Facts } from "@/lib/rules/types";

/**
 * One establishment's leavers, for the employer lens.
 *
 * Every name, UAN and record here is invented, exactly as in personas.ts. No
 * real establishment, employee or identifier appears anywhere in this
 * repository.
 *
 * Three of the nine are the citizen personas, imported rather than restated:
 * a reader arriving from the citizen side meets the same people, and there is
 * one record per person rather than two that can drift apart.
 */
export interface Leaver {
  id: string;
  name: string;
  /** Masked and obviously fake, like every UAN in this build. */
  uan: string;
  role: Bi;
  /** The same shape the engine already takes. No employer-specific type. */
  facts: Facts;
}

const persona = (id: string): Facts => personaById(id)!.facts;

/** A record with nothing wrong, as a base for the leavers who are fine. */
const settled = (over: Partial<Facts> = {}): Facts => ({
  intent: "final_settlement",
  daysSinceExit: 90,
  exitDateFiled: "yes",
  uanAadhaarVerified: "yes",
  uanBeforeOct2017: "no",
  multipleUans: "no",
  serviceYears: 6,
  claimAmount: 210000,
  panOnRecord: true,
  records: {
    epfo: { name: "PLACEHOLDER", dob: "1990-01-01", ifsc: "HDFC0000521", accountLast4: "1234" },
    aadhaar: { name: "Placeholder", dob: "1990-01-01" },
    bank: { name: "Placeholder", ifsc: "HDFC0000521", accountLast4: "1234" },
  },
  ...over,
});

export const ROSTER: Leaver[] = [
  /* ---- Blocked on the employer: Category C, cannot self-correct ---- */
  {
    // Sunita, from the citizen side. Her claim was already rejected once.
    id: "sunita",
    name: "Sunita Devi",
    uan: "1001 XXXX 9036",
    role: { en: "Machine operator", hi: "मशीन ऑपरेटर" },
    facts: persona("sunita"),
  },
  {
    id: "imran",
    name: "Imran Qureshi",
    uan: "1004 XXXX 2261",
    role: { en: "Warehouse supervisor", hi: "गोदाम पर्यवेक्षक" },
    facts: settled({
      daysSinceExit: 154,
      exitDateFiled: "no",
      uanAadhaarVerified: "no",
      uanBeforeOct2017: "yes",
      serviceYears: 11,
      claimAmount: 395000,
      records: {
        epfo: { name: "IMRAN QURESHI", dob: "1982-11-30", ifsc: "SBIN0007213", accountLast4: "5518" },
        aadhaar: { name: "Imran Qureshi", dob: "1982-11-30" },
        bank: { name: "Imran Qureshi", ifsc: "SBIN0007213", accountLast4: "5518" },
      },
    }),
  },
  {
    id: "meera",
    name: "Meera Pillai",
    uan: "1007 XXXX 4482",
    role: { en: "Quality inspector", hi: "गुणवत्ता निरीक्षक" },
    facts: settled({
      daysSinceExit: 71,
      exitDateFiled: "yes",
      uanAadhaarVerified: "no",
      uanBeforeOct2017: "yes",
      serviceYears: 5,
      claimAmount: 176000,
      records: {
        epfo: { name: "MEERA R PILLAI", dob: "1993-04-17", ifsc: "HDFC0000521", accountLast4: "9074" },
        aadhaar: { name: "Meera Rajan Pillai", dob: "1993-04-17" },
        bank: { name: "Meera Rajan Pillai", ifsc: "HDFC0000521", accountLast4: "9074" },
      },
    }),
  },

  /* ---- Blocked, but on themselves. HR's job here is a message. ---- */
  {
    id: "rajesh",
    name: "Rajesh Kumar Sharma",
    uan: "1002 XXXX 4417",
    role: { en: "Line technician", hi: "लाइन तकनीशियन" },
    facts: persona("rajesh"),
  },
  {
    id: "fatima",
    name: "Fatima Sheikh",
    uan: "1009 XXXX 6630",
    role: { en: "Accounts assistant", hi: "लेखा सहायक" },
    facts: settled({
      daysSinceExit: 83,
      serviceYears: 4,
      claimAmount: 128000,
      records: {
        epfo: { name: "FATIMA SHEIKH", dob: "1995-09-02", ifsc: "ANDB0001199", accountLast4: "4407" },
        aadhaar: { name: "Fatima Sheikh", dob: "1995-09-02" },
        bank: { name: "Fatima Sheikh", ifsc: "ANDB0001199", accountLast4: "4407" },
      },
    }),
  },
  {
    id: "vikram",
    name: "Vikram Rathore",
    uan: "1011 XXXX 8125",
    role: { en: "Shift lead", hi: "शिफ़्ट प्रमुख" },
    facts: settled({
      daysSinceExit: 46,
      serviceYears: 3,
      claimAmount: 164000,
      records: {
        epfo: { name: "VIKRAM RATHORE", dob: "1988-06-05", ifsc: "HDFC0000521", accountLast4: "3312" },
        aadhaar: { name: "Vikram Rathore", dob: "1988-05-06" },
        bank: { name: "Vikram Rathore", ifsc: "HDFC0000521", accountLast4: "3312" },
      },
    }),
  },

  /* ---- Nothing blocking ---- */
  {
    id: "arun",
    name: "Arun Menon",
    uan: "1013 XXXX 7755",
    role: { en: "Maintenance engineer", hi: "रखरखाव अभियंता" },
    facts: persona("arun"),
  },
  {
    id: "lata",
    name: "Lata Bhosale",
    uan: "1016 XXXX 3390",
    role: { en: "Stores clerk", hi: "भंडार लिपिक" },
    facts: settled({
      daysSinceExit: 112,
      serviceYears: 8,
      claimAmount: 264000,
      records: {
        epfo: { name: "LATA BHOSALE", dob: "1986-02-21", ifsc: "HDFC0000521", accountLast4: "7719" },
        aadhaar: { name: "Lata Bhosale", dob: "1986-02-21" },
        bank: { name: "Lata Bhosale", ifsc: "HDFC0000521", accountLast4: "7719" },
      },
    }),
  },
  {
    id: "devendra",
    name: "Devendra Naik",
    uan: "1018 XXXX 5064",
    role: { en: "Packaging operator", hi: "पैकेजिंग ऑपरेटर" },
    facts: settled({
      daysSinceExit: 64,
      serviceYears: 7,
      claimAmount: 191000,
      records: {
        epfo: { name: "DEVENDRA NAIK", dob: "1991-12-11", ifsc: "HDFC0000521", accountLast4: "8830" },
        aadhaar: { name: "Devendra Naik", dob: "1991-12-11" },
        bank: { name: "Devendra Naik", ifsc: "HDFC0000521", accountLast4: "8830" },
      },
    }),
  },
];

export const ESTABLISHMENT: Bi = {
  en: "Pragati Components Pvt Ltd · Pune (synthetic)",
  hi: "प्रगति कॉम्पोनेंट्स प्रा. लि. · पुणे (काल्पनिक)",
};
