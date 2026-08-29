"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useLang } from "@/lib/i18n/context";
import type { Bi } from "@/lib/rules/types";

import { DESKTOP_QUERY, MOBILE_QUERY, SCROLL, STILL_QUERY } from "./config";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ------------------------------------------------------------------ copy */

/** A headline is written as its own lines, so a beat breaks where the writer
 *  meant it to rather than wherever the viewport happens to run out. */
type BeatHead = { en: readonly string[]; hi: readonly string[] };

/**
 * Each beat's window as a percentage of the pinned scroll, so the timeline
 * below reads as the storyboard it is. `in`/`out` are entry and exit marks;
 * the last beat never leaves.
 */

export const BEAT_COPY: readonly {
  key: string;
  in: number;
  out: number | null;
  head: BeatHead;
  sub: Bi;
  alt: Bi;
}[] = [
  {
    key: "intro",
    in: 2,
    out: 12,
    head: { en: ["Meet Arjun."], hi: ["मिलिए अर्जुन से।"] },
    sub: {
      en: "He just wants to take care of his PF.",
      hi: "वह बस अपने PF का काम निपटाना चाहता है।",
    },
    alt: {
      en: "Arjun at home, arms folded, at ease.",
      hi: "अर्जुन घर पर, बाँहें बाँधे, आराम से।",
    },
  },
  {
    key: "beat1",
    in: 17,
    out: 32,
    head: {
      en: ["Then he tries to navigate", "the EPFO process."],
      hi: ["फिर वह EPFO की प्रक्रिया से", "गुज़रने की कोशिश करता है।"],
    },
    sub: {
      en: "It’s a maze of forms and portals.",
      hi: "फ़ॉर्म और पोर्टल की भूलभुलैया है।",
    },
    alt: {
      en: "Arjun looking at his phone, working through the EPFO portal.",
      hi: "अर्जुन अपने फ़ोन पर EPFO पोर्टल खंगालते हुए।",
    },
  },
  {
    key: "transition",
    in: 37,
    out: 52,
    head: {
      en: ["What should be simple", "becomes complicated."],
      hi: ["जो आसान होना चाहिए", "वह उलझ जाता है।"],
    },
    sub: {
      en: "He doesn’t know what happens next.",
      hi: "उसे पता नहीं आगे क्या होगा।",
    },
    alt: {
      en: "Arjun frowning at his phone, unsure what went wrong.",
      hi: "अर्जुन फ़ोन देखकर परेशान, समझ नहीं आ रहा कहाँ चूक हुई।",
    },
  },
  {
    key: "reveal",
    in: 57,
    out: 72,
    head: {
      en: ["Until he discovers", "a new way."],
      hi: ["जब तक उसे मिलता है", "एक नया रास्ता।"],
    },
    sub: { en: "Clear, transparent, and direct.", hi: "साफ़, पारदर्शी और सीधा।" },
    alt: {
      en: "Arjun holding up his phone, the Nivaaran app open on it.",
      hi: "अर्जुन फ़ोन उठाए हुए, उस पर निवारण खुला है।",
    },
  },
  {
    key: "detail",
    in: 77,
    out: 87,
    head: {
      en: ["Now he knows exactly what to do."],
      hi: ["अब उसे ठीक-ठीक पता है कि क्या करना है।"],
    },
    sub: { en: "See where things stand.", hi: "देखिए बात कहाँ तक पहुँची है।" },
    alt: {
      en: "Arjun reading a plain list of what to fix.",
      hi: "अर्जुन सादा सूची पढ़ रहा है कि क्या ठीक करना है।",
    },
  },
  {
    key: "final",
    in: 92,
    out: null,
    head: {
      en: ["Your PF journey", "should feel this simple."],
      hi: ["आपका PF का सफ़र", "इतना ही आसान होना चाहिए।"],
    },
    sub: { en: "Understand. Act. Resolve.", hi: "समझें। कदम उठाएँ। निपटाएँ।" },
    alt: { en: "Arjun, done, phone lowered.", hi: "अर्जुन, काम पूरा, फ़ोन नीचे।" },
  },
];

const CUE: Bi = { en: "Scroll", hi: "स्क्रॉल करें" };

/* --------------------------------------------------------------- overlay */

interface OverlayContentProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function OverlayContent({ scrollContainerRef }: OverlayContentProps) {
  const { lang, t } = useLang();
  const beatsRef = useRef<(HTMLDivElement | null)[]>([]);
  const cueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add({ isMobile: MOBILE_QUERY, isDesktop: DESKTOP_QUERY, still: STILL_QUERY }, (self) => {
      const { isMobile, still } = self.conditions as {
        isMobile: boolean;
        still: boolean;
      };
      if (still) return;

      const beats = beatsRef.current.filter(Boolean) as HTMLDivElement[];
      // A phone travels a shorter distance for the same story, so the beats
      // move a shorter distance too — 50px of lift on a 640px-tall stage
      // reads as a jolt.
      const lift = isMobile ? 24 : 50;
      // opacity + transform only, so a beat never touches layout. will-change
      // is set here rather than in CSS so it lands on exactly the six elements
      // that are actually scrubbed, and is cleared again on revert.
      gsap.set(beats, {
        opacity: 0,
        y: lift,
        force3D: true,
        willChange: "transform, opacity",
      });
      if (cueRef.current) gsap.set(cueRef.current, { opacity: 1 });

      const cfg = isMobile ? SCROLL.mobile : SCROLL.desktop;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: cfg.end,
          scrub: cfg.scrub,
          invalidateOnRefresh: true,
        },
      });

      // The timeline is exactly 100 units long, so every position below is
      // literally a percentage of the pinned scroll.
      BEAT_COPY.forEach((beat, i) => {
        const node = beatsRef.current[i];
        if (!node) return;
        tl.to(node, { opacity: 1, y: 0, duration: 3, ease: "none" }, beat.in);
        if (beat.out !== null) {
          tl.to(
            node,
            { opacity: 0, y: -lift, duration: 3, ease: "none" },
            beat.out,
          );
        }
      });

      if (cueRef.current) {
        tl.to(cueRef.current, { opacity: 0, duration: 2, ease: "none" }, 1);
      }

      tl.to({}, { duration: 1 }, 99);

      return () => {
        gsap.set(beats, { clearProps: "all" });
        // The cue is faded out by the timeline above. Without clearing it too,
        // crossing the mobile/desktop breakpoint reverts into a scene whose
        // scroll hint is permanently invisible.
        if (cueRef.current) gsap.set(cueRef.current, { clearProps: "all" });
      };
    });

    return () => mm.revert();
  }, [scrollContainerRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid overflow-hidden">
      {/* Scrim. The plate is fitted on a phone so the caption sits on black
          anyway; on a wide screen it sits on the image and needs the help. */}
      <div
        aria-hidden
        className="col-start-1 row-start-1 bg-[linear-gradient(to_top,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.6)_28%,rgba(0,0,0,0.12)_62%,transparent_100%)]"
      />

      {BEAT_COPY.map((beat, i) => (
        <div
          key={beat.key}
          ref={(n) => {
            beatsRef.current[i] = n;
          }}
          className="col-start-1 row-start-1 mx-auto w-full max-w-2xl self-end px-5 pb-[max(14vh,5rem)] text-center text-white md:self-center md:px-8 md:pb-0"
        >
          <h2 className="text-balance text-[clamp(1.75rem,min(7vw,9vh),3.75rem)] font-semibold leading-[1.08] tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
            {beat.head[lang].map((line, j) => (
              <React.Fragment key={`${beat.key}-${j}`}>
                {j > 0 ? <br className="hidden sm:inline" /> : null}
                {j > 0 ? " " : null}
                {line}
              </React.Fragment>
            ))}
          </h2>
          <p className="mt-3 text-balance text-[clamp(0.9375rem,min(3.4vw,4vh),1.375rem)] leading-snug text-white/80 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
            {t(beat.sub)}
          </p>
        </div>
      ))}

      {/* Scroll cue. Fades out as soon as the reader takes the hint. */}
      <div
        ref={cueRef}
        aria-hidden
        className="col-start-1 row-start-1 flex flex-col items-center gap-2 self-end justify-self-center pb-[max(5vh,1.5rem)] text-white/60"
      >
        <span className="text-[0.6875rem] font-medium uppercase tracking-[0.14em]">
          {t(CUE)}
        </span>
        <span className="h-8 w-px bg-gradient-to-b from-white/60 to-transparent" />
      </div>
    </div>
  );
}
