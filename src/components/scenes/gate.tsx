"use client";

import { useRef } from "react";

import { useLang } from "@/lib/i18n/context";
import { useCanvas, useSceneProgress } from "@/components/motion/reveal";

/**
 * The sieve.
 *
 * EPFO already solved speed: auto-settlement clears claims up to ₹5 lakh in
 * about three days with no human reviewer. It only fires on a perfect record.
 * Everything else is deflected — which is why getting faster made rejection
 * harsher rather than rarer. The one dark act on the page, because this is the
 * moment the story is about the machine and not about the citizen.
 */

const LANES = 15;
const PER_LANE = 16;
const TOTAL = LANES * PER_LANE;
/** 21.86% — 1.74 crore of 7.96 crore. Coprime stride keeps the count exact. */
const FAIL_EVERY = 100 / 21.86;

const COPY = {
  label: { en: "EPFO auto-settlement", hi: "EPFO ऑटो-सेटलमेंट" },
  heading: {
    en: "The faster the machine got, the more mercilessly it rejects.",
    hi: "मशीन जितनी तेज़ हुई, उतनी ही बेरहमी से ख़ारिज करने लगी।",
  },
  body: {
    en: "Fully KYC-compliant claims up to ₹5 lakh are settled by the system in about three days, with no human reviewer. That is a genuinely good thing. But a machine that never looks up cannot notice that your middle name is an initial — it can only pass you or fail you. Speed without pre-validation just turns a slow queue into a fast rejection.",
    hi: "पूरी तरह KYC-अनुपालक ₹5 लाख तक के दावे सिस्टम से लगभग तीन दिन में निपट जाते हैं, बिना किसी मानवीय जाँच के। यह वाक़ई अच्छी बात है। लेकिन जो मशीन कभी नज़र नहीं उठाती, वह यह नहीं देख सकती कि आपका बीच का नाम सिर्फ़ एक अक्षर है — वह आपको बस पास या फ़ेल कर सकती है। बिना पूर्व-जाँच की तेज़ी धीमी क़तार को तेज़ ख़ारिजी में बदल देती है।",
  },
  gate: { en: "perfect record?", hi: "रिकॉर्ड परफ़ेक्ट?" },
  facts: [
    { en: "~3 days", hi: "~3 दिन" },
    { en: "no human reviewer", hi: "कोई मानवीय जाँच नहीं" },
    { en: "up to ₹5 lakh", hi: "₹5 लाख तक" },
  ],
  alt: {
    en: "Claims flowing toward an automated gate. About four in five pass through; the rest are deflected away.",
    hi: "दावे एक स्वचालित द्वार की ओर बहते हुए। लगभग पाँच में से चार पार हो जाते हैं; बाक़ी हटा दिए जाते हैं।",
  },
} as const;

function token(el: Element, name: string, fallback: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

export function Gate() {
  const { t } = useLang();
  const sceneRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCanvas(canvasRef, (ctx, w, h, p: number) => {
    const cv = ctx.canvas;
    const pass = token(cv, "--color-clear-300", "#a7d9c2");
    const fail = token(cv, "--color-blocked-300", "#e3a184");
    const unjudged = token(cv, "--color-night-edge", "#6b7180");
    const rule = token(cv, "--color-night-line", "#454b58");

    const gateX = w * 0.52;
    const laneH = h / (LANES + 1);
    const size = Math.max(2, Math.min(4, laneH * 0.3));
    const after = Math.max(w - gateX, 1);

    // The gate itself.
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(gateX, 0);
    ctx.lineTo(gateX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // A continuous stream: each mark wraps once it leaves the frame, so the
    // band is full at every scroll position and the wrap never happens on
    // screen. Before the gate every claim looks alike — that is the point.
    const span = w * 1.45;
    for (let i = 0; i < TOTAL; i++) {
      const lane = i % LANES;
      const row = Math.floor(i / LANES);
      const jitter = ((lane * 37 + row * 61) % 97) / 97;
      const t = (((i / TOTAL) * 0.9 + jitter * 0.1 + p * 1.15) % 1 + 1) % 1;
      const x = t * span - w * 0.22;
      if (x < -12 || x > w + 12) continue;

      const rejected = Math.floor(i % FAIL_EVERY) === 0;
      const y = laneH * (lane + 1);

      if (x <= gateX) {
        // Not yet read. Every claim is identical to the machine.
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = unjudged;
        ctx.beginPath();
        ctx.roundRect(x, y - size / 2, size * 2.2, size, 1);
        ctx.fill();
        continue;
      }

      const past = (x - gateX) / after;
      if (rejected) {
        // Deflected, and out of the system.
        ctx.globalAlpha = Math.max(0, 1 - past * 0.7);
        ctx.fillStyle = fail;
        ctx.beginPath();
        ctx.roundRect(x, y + past * past * h * 1.15 - size / 2, size * 2.2, size, 1);
        ctx.fill();
      } else {
        ctx.globalAlpha = 1;
        ctx.fillStyle = pass;
        ctx.beginPath();
        ctx.roundRect(x, y - size / 2, size * 2.2, size, 1);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }, 0);

  useSceneProgress(sceneRef, { onFrame: render });

  return (
    <section ref={sceneRef} className="night bleed py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4">
        <p className="meta text-night-faint">{t(COPY.label)}</p>

        <h2 className="display mt-4 max-w-3xl text-balance text-night-ink">
          {t(COPY.heading)}
        </h2>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          {COPY.facts.map((f) => (
            <li
              key={f.en}
              className="meta flex items-center gap-2 text-night-soft"
            >
              <span aria-hidden className="size-1 rounded-full bg-signal" />
              {t(f)}
            </li>
          ))}
        </ul>

        <div className="relative mt-10 pt-7">
          <p className="meta pointer-events-none absolute left-[52%] top-0 -translate-x-1/2 whitespace-nowrap text-night-faint">
            {t(COPY.gate)}
          </p>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={t(COPY.alt)}
            className="h-[220px] w-full sm:h-[300px]"
          />
        </div>

        <p className="mt-8 max-w-2xl text-md leading-relaxed text-night-soft">
          {t(COPY.body)}
        </p>
      </div>
    </section>
  );
}
