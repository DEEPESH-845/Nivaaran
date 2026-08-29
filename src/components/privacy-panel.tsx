"use client";

import { Check, Minus, Server, X } from "lucide-react";
import { Card, SectionLabel } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { useLang } from "@/lib/i18n/context";
import type { Bi } from "@/lib/rules/types";

/**
 * What Nivaaran holds, and where.
 *
 * Every line here is checked against the implementation, and where the
 * implementation cannot make a promise, the line says so. "We never store
 * your documents" would be a stronger sentence than "we do not write them to
 * disk and do not log them", and it would also be one we cannot stand behind
 * for the seconds an image spends inside a model provider's request.
 */

type Kind = "stays" | "sent" | "never";

const ICON: Record<Kind, { icon: typeof Check; tone: string }> = {
  stays: { icon: Check, tone: "text-clear-700" },
  sent: { icon: Server, tone: "text-caution-700" },
  never: { icon: X, tone: "text-ink-mute" },
};

interface Line {
  kind: Kind;
  what: Bi;
  detail: Bi;
}

const LINES: Line[] = [
  {
    kind: "never",
    what: { en: "Your Aadhaar, PAN, UAN or full account number", hi: "आपका आधार, PAN, UAN या पूरा खाता नंबर" },
    detail: {
      en: "Never asked for, and there is no field anywhere in the product that accepts one. The document reader is instructed to refuse them and its output schema has no place to put one — only the last four digits of an account.",
      hi: "कभी माँगे ही नहीं जाते, और उत्पाद में इन्हें लेने के लिए कोई फ़ील्ड ही नहीं है। दस्तावेज़ पढ़ने वाले को इन्हें लौटाने से मना किया गया है, और उसके स्कीमा में इन्हें रखने की जगह नहीं — सिर्फ़ खाते के आख़िरी चार अंक।",
    },
  },
  {
    kind: "stays",
    what: { en: "Your answers and your check, signed out", hi: "बिना खाते के आपके जवाब और जाँच" },
    detail: {
      en: "Held in this browser's local storage and nowhere else. The rule engine is a pure function that ships to your device, so the check itself needs no network at all.",
      hi: "सिर्फ़ इसी ब्राउज़र की लोकल स्टोरेज में, और कहीं नहीं। नियम इंजन एक शुद्ध फ़ंक्शन है जो आपके डिवाइस पर चलता है, इसलिए जाँच के लिए नेटवर्क की ज़रूरत ही नहीं।",
    },
  },
  {
    kind: "sent",
    what: { en: "Your answers and your check, signed in", hi: "खाते के साथ आपके जवाब और जाँच" },
    detail: {
      en: "Also stored on the server against your account, so it survives a new device. Readable only with your session cookie: there is no case identifier a request can name, so there is nothing to guess.",
      hi: "आपके खाते के साथ सर्वर पर भी सहेजा जाता है, ताकि नए डिवाइस पर भी मिले। सिर्फ़ आपके सत्र कुकी से पढ़ा जा सकता है: अनुरोध में कोई केस पहचानकर्ता होता ही नहीं, इसलिए अंदाज़ा लगाने को कुछ नहीं।",
    },
  },
  {
    kind: "stays",
    what: { en: "Your password", hi: "आपका पासवर्ड" },
    detail: {
      en: "Hashed with scrypt and a per-account salt before it is written. The plain text exists only for the milliseconds of the request that carried it, and the hash is never sent to a browser.",
      hi: "लिखे जाने से पहले scrypt और हर खाते के अलग सॉल्ट से हैश किया जाता है। सादा पासवर्ड सिर्फ़ उसी अनुरोध के कुछ मिलीसेकंड जीता है, और हैश कभी ब्राउज़र तक नहीं जाता।",
    },
  },
  {
    kind: "sent",
    what: { en: "A document you photograph", hi: "आपके द्वारा खींची गई दस्तावेज़ की तस्वीर" },
    detail: {
      en: "Downscaled to 1600px and re-encoded in your browser first, which drops EXIF — including the location a phone camera writes into a photo. The re-encoded copy is sent to the model provider for one read, then dropped: it is not written to disk, not logged and not returned. We cannot promise what a third party does with a request in flight, so we say provider, not nowhere.",
      hi: "पहले आपके ब्राउज़र में 1600px तक छोटा और दोबारा एन्कोड किया जाता है, जिससे EXIF हट जाता है — वह लोकेशन भी जो फ़ोन कैमरा तस्वीर में लिख देता है। यह नई प्रति मॉडल प्रदाता को एक बार पढ़ने के लिए भेजी जाती है और फिर छोड़ दी जाती है: न डिस्क पर लिखी जाती है, न लॉग होती है, न लौटाई जाती है। किसी तीसरे पक्ष के पास पहुँची चीज़ का वादा हम नहीं कर सकते, इसलिए हम “प्रदाता” कहते हैं, “कहीं नहीं” नहीं।",
    },
  },
  {
    kind: "never",
    what: { en: "Anything sent to a government system", hi: "किसी सरकारी सिस्टम को भेजी गई कोई चीज़" },
    detail: {
      en: "Nothing, at any point. Filing a claim here records it in this prototype and contacts no one. There is no EPFO integration in this build.",
      hi: "कभी कुछ नहीं। यहाँ दावा भरने पर वह इसी प्रोटोटाइप में दर्ज होता है और किसी से संपर्क नहीं होता। इस बिल्ड में EPFO का कोई एकीकरण नहीं है।",
    },
  },
];

export function PrivacyPanel() {
  const { lang, t } = useLang();
  const { user } = useAuth();

  return (
    <Card className="p-4 sm:p-5">
      <SectionLabel>
        {lang === "hi" ? "आपका डेटा कहाँ जाता है" : "Where your data goes"}
      </SectionLabel>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        {lang === "hi"
          ? "हर पंक्ति कोड से मिलाकर लिखी गई है। जहाँ हम वादा नहीं कर सकते, वहाँ साफ़ लिखा है कि नहीं कर सकते।"
          : "Every line here is checked against the implementation. Where we cannot make a promise, it says we cannot."}
      </p>

      <ul className="mt-4 space-y-3.5">
        {LINES.map((line) => {
          const { icon: Icon, tone } = ICON[line.kind];
          const relevant = line.kind !== "sent" || !line.what.en.includes("signed in") || Boolean(user);
          return (
            <li key={line.what.en} className="flex gap-3">
              <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${tone}`} strokeWidth={2} />
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-ink">
                  {t(line.what)}
                  {!relevant ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-2xs font-normal uppercase tracking-[0.06em] text-ink-faint">
                      <Minus aria-hidden className="size-3" strokeWidth={2} />
                      {lang === "hi" ? "आप पर लागू नहीं" : "not applicable to you"}
                    </span>
                  ) : null}
                </p>
                <p className="text-sm leading-relaxed text-ink-soft">{t(line.detail)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
