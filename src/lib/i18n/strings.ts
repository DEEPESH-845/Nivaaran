import type { Bi } from "@/lib/rules/types";

export type UiKey = keyof typeof UI;

/** Chrome and navigation copy. Domain copy lives with the rules, already bilingual. */
export const UI = {
  brand: { en: "Nivaaran", hi: "निवारण" },
  tagline: {
    en: "Know your PF claim will go through — before you file it.",
    hi: "दावा भरने से पहले ही जान लें कि वह मंज़ूर होगा या नहीं।",
  },
  notOfficial: {
    en: "Independent hackathon prototype. Not affiliated with EPFO or the Government of India. All data here is synthetic.",
    hi: "स्वतंत्र हैकथॉन प्रोटोटाइप। EPFO या भारत सरकार से कोई संबंध नहीं। यहाँ का सारा डेटा काल्पनिक है।",
  },
  demoData: { en: "Demonstration data", hi: "प्रदर्शन डेटा" },
  langLabel: { en: "हिंदी", hi: "English" },
  back: { en: "Back", hi: "पीछे" },
  continue: { en: "Continue", hi: "आगे बढ़ें" },
  notSure: { en: "I'm not sure", hi: "मुझे निवारण नहीं पता" },
  yes: { en: "Yes", hi: "हाँ" },
  no: { en: "No", hi: "नहीं" },
  startOver: { en: "Start over", hi: "फिर से शुरू करें" },
  whyThisMatters: { en: "Why this matters", hi: "यह क्यों ज़रूरी है" },
  howToFix: { en: "How to fix it", hi: "इसे कैसे ठीक करें" },
  whoFixes: { en: "Whose job", hi: "किसका काम" },
  source: { en: "Source", hi: "स्रोत" },
  verified: { en: "Verified", hi: "सत्यापित" },
  confidence: { en: "Confidence", hi: "विश्वसनीयता" },
  explainSimply: { en: "Explain this simply", hi: "आसान भाषा में समझाएँ" },
  step: { en: "Step", hi: "चरण" },
  of: { en: "of", hi: "में से" },
  minutes: { en: "min", hi: "मिनट" },
  free: { en: "Free", hi: "निःशुल्क" },
  owner_citizen: { en: "You can fix this", hi: "आप ठीक कर सकते हैं" },
  owner_employer: { en: "Your employer must do this", hi: "यह नियोक्ता को करना होगा" },
  owner_epfo: { en: "EPFO handles this", hi: "यह EPFO करता है" },
  owner_time: { en: "Only time fixes this", hi: "इसे सिर्फ़ समय ठीक करेगा" },
  sev_blocker: { en: "Will stop your claim", hi: "आपका दावा रोक देगा" },
  sev_warning: { en: "Worth knowing", hi: "जानना ज़रूरी" },
  sev_info: { en: "Good news", hi: "अच्छी ख़बर" },

  /* ------------------------------------------------------------- Accounts */
  signIn: { en: "Sign in", hi: "साइन इन" },
  signUp: { en: "Create account", hi: "खाता बनाएँ" },
  signOut: { en: "Sign out", hi: "साइन आउट" },
  email: { en: "Email address", hi: "ईमेल पता" },
  password: { en: "Password", hi: "पासवर्ड" },
  fullName: { en: "Your name", hi: "आपका नाम" },
  showPassword: { en: "Show password", hi: "पासवर्ड दिखाएँ" },
  hidePassword: { en: "Hide password", hi: "पासवर्ड छिपाएँ" },
  signingIn: { en: "Signing you in…", hi: "साइन इन किया जा रहा है…" },
  creatingAccount: { en: "Creating your account…", hi: "आपका खाता बनाया जा रहा है…" },
  dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
  account: { en: "Account", hi: "खाता" },
  demoBadge: { en: "Demo · synthetic data", hi: "डेमो · काल्पनिक डेटा" },
  resetDemo: { en: "Reset demo data", hi: "डेमो डेटा रीसेट करें" },
  loading: { en: "Loading…", hi: "लोड हो रहा है…" },

  /* ------------------------------------------- Error codes, made readable */
  err_bad_credentials: {
    en: "That email and password do not match an account.",
    hi: "यह ईमेल और पासवर्ड किसी खाते से मेल नहीं खाते।",
  },
  err_rate_limited: {
    en: "Too many attempts. Wait about a minute, then try again.",
    hi: "बहुत ज़्यादा कोशिशें। लगभग एक मिनट रुककर फिर कोशिश करें।",
  },
  err_already_registered: {
    en: "An account already exists for this email. Sign in instead.",
    hi: "इस ईमेल से खाता पहले से है। इसके बजाय साइन इन करें।",
  },
  err_invalid_email: {
    en: "That does not look like an email address.",
    hi: "यह ईमेल पते जैसा नहीं लगता।",
  },
  err_too_short: {
    en: "Use at least 10 characters. Length matters more than symbols.",
    hi: "कम से कम 10 अक्षर लें। चिह्नों से ज़्यादा लंबाई मायने रखती है।",
  },
  err_too_long: {
    en: "That password is too long. Use 200 characters or fewer.",
    hi: "यह पासवर्ड बहुत लंबा है। 200 अक्षर या उससे कम लें।",
  },
  err_too_simple: {
    en: "That password is too easy to guess. Try a few unrelated words.",
    hi: "यह पासवर्ड बहुत आसानी से अंदाज़ा लग जाता है। कुछ असंबंधित शब्द आज़माएँ।",
  },
  err_looks_like_email: {
    en: "Your password should not contain your email name.",
    hi: "पासवर्ड में आपके ईमेल का नाम नहीं होना चाहिए।",
  },
  err_network: {
    en: "We could not reach Nivaaran. Check your connection and try again.",
    hi: "निवारण तक नहीं पहुँच सके। अपना कनेक्शन जाँचकर फिर कोशिश करें।",
  },
  err_generic: {
    en: "Something went wrong at our end. Nothing has been submitted.",
    hi: "हमारी तरफ़ कुछ गड़बड़ हुई। कुछ भी भेजा नहीं गया है।",
  },
  required: { en: "This is required.", hi: "यह ज़रूरी है।" },
} as const satisfies Record<string, Bi>;

export function pick(bi: Bi, lang: "en" | "hi"): string {
  return bi[lang] || bi.en;
}
