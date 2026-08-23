import type { Facts } from "@/lib/rules/types";

/**
 * Synthetic citizens for the demo.
 *
 * Every name, number and date here is invented. No real UAN, Aadhaar, PAN or
 * bank account appears anywhere in this repository.
 */
export interface Persona {
  id: string;
  name: string;
  age: number;
  city: string;
  /** One line the citizen would actually say. */
  saying: { en: string; hi: string };
  situation: { en: string; hi: string };
  /** Masked, obviously-fake identifiers. */
  uan: string;
  facts: Facts;
  /** Only set for the rejected-claim entry point. */
  rejectionText?: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "rajesh",
    name: "Rajesh Kumar Sharma",
    age: 29,
    city: "Pune",
    saying: {
      en: "I left my job two months ago and I need my PF money.",
      hi: "मैंने दो महीने पहले नौकरी छोड़ी है और मुझे अपना PF का पैसा चाहिए।",
    },
    situation: {
      en: "Four problems in his record. All four are his to fix, and he does not know any of them exist.",
      hi: "उसके रिकॉर्ड में चार दिक़्क़तें हैं। चारों वह ख़ुद ठीक कर सकता है, और उसे किसी का पता नहीं।",
    },
    uan: "1002 XXXX 4417",
    facts: {
      intent: "final_settlement",
      daysSinceExit: 68,
      exitDateFiled: "no",
      uanAadhaarVerified: "yes",
      uanBeforeOct2017: "yes",
      multipleUans: "no",
      serviceYears: 3,
      claimAmount: 142000,
      panOnRecord: true,
      records: {
        epfo: {
          name: "RAJESH K SHARMA",
          dob: "1996-03-08",
          ifsc: "CORP0001234",
          accountLast4: "8842",
        },
        aadhaar: { name: "Rajesh Kumar Sharma", dob: "1996-03-08" },
        bank: { name: "Rajesh Kumar Sharma", ifsc: "CORP0001234", accountLast4: "8842" },
      },
    },
  },
  {
    id: "sunita",
    name: "Sunita Devi",
    age: 41,
    city: "Jaipur",
    saying: {
      en: "I filed 24 days ago. It says rejected. Nobody will tell me why.",
      hi: "मैंने 24 दिन पहले दावा भरा था। लिखा है ख़ारिज। कोई बताता ही नहीं क्यों।",
    },
    situation: {
      en: "Her UAN was never Aadhaar-verified, so she cannot fix her own record. A local agent has quoted her ₹2,000.",
      hi: "उसका UAN कभी आधार-सत्यापित नहीं हुआ, इसलिए वह अपना रिकॉर्ड ख़ुद नहीं सुधार सकती। एक एजेंट ने ₹2,000 माँगे हैं।",
    },
    uan: "1001 XXXX 9036",
    rejectionText: "Claim rejected: Name not as per records. DOB not matching with UIDAI.",
    facts: {
      intent: "decode_rejection",
      daysSinceExit: 120,
      exitDateFiled: "no",
      uanAadhaarVerified: "no",
      uanBeforeOct2017: "yes",
      multipleUans: "no",
      serviceYears: 8,
      claimAmount: 310000,
      panOnRecord: false,
      records: {
        epfo: {
          name: "SUNEETA DEVI",
          dob: "1985-07-02",
          ifsc: "SBIN0007213",
          accountLast4: "3390",
        },
        aadhaar: { name: "Sunita Devi", dob: "1985-02-07" },
        bank: { name: "Sunita Devi", ifsc: "SBIN0007213", accountLast4: "3390" },
      },
    },
  },
  {
    id: "arun",
    name: "Arun Menon",
    age: 34,
    city: "Kochi",
    saying: {
      en: "I think my records are fine. I just want to be sure before I file.",
      hi: "मेरे रिकॉर्ड शायद ठीक हैं। बस भरने से पहले निवारण कर लेना चाहता हूँ।",
    },
    situation: {
      en: "Nothing wrong. Nivaaran should say so in one screen and get out of the way.",
      hi: "कुछ ग़लत नहीं है। निवारण को एक ही स्क्रीन में यह बताकर रास्ता छोड़ देना चाहिए।",
    },
    uan: "1013 XXXX 7755",
    facts: {
      intent: "final_settlement",
      daysSinceExit: 95,
      exitDateFiled: "yes",
      uanAadhaarVerified: "yes",
      uanBeforeOct2017: "no",
      multipleUans: "no",
      serviceYears: 9,
      claimAmount: 486000,
      panOnRecord: true,
      records: {
        epfo: {
          name: "ARUN MENON",
          dob: "1991-11-19",
          ifsc: "HDFC0000521",
          accountLast4: "6104",
        },
        aadhaar: { name: "Arun Menon", dob: "1991-11-19" },
        bank: { name: "Arun Menon", ifsc: "HDFC0000521", accountLast4: "6104" },
      },
    },
  },
];

export const personaById = (id: string) => PERSONAS.find((p) => p.id === id);
