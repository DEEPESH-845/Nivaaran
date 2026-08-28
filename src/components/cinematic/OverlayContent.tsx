"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { DESKTOP_QUERY, MOBILE_QUERY, SCROLL, STILL_QUERY } from "./config";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ------------------------------------------------------------------ copy */

/**
 * Each beat's window as a percentage of the pinned scroll, so the timeline
 * below reads as the storyboard it is. `in`/`out` are entry and exit marks;
 * the last beat never leaves.
 */
export const BEAT_COPY = [
  {
    key: "intro",
    in: 2,
    out: 12,
    head: ["Meet Arjun."],
    sub: "He just wants to take care of his PF.",
    alt: "Arjun at home, arms folded, at ease.",
  },
  {
    key: "beat1",
    in: 17,
    out: 32,
    head: ["Then he tries to navigate", "the EPFO process."],
    sub: "It’s a maze of forms and portals.",
    alt: "Arjun looking at his phone, working through the EPFO portal.",
  },
  {
    key: "transition",
    in: 37,
    out: 52,
    head: ["What should be simple", "becomes complicated."],
    sub: "He doesn’t know what happens next.",
    alt: "Arjun frowning at his phone, unsure what went wrong.",
  },
  {
    key: "reveal",
    in: 57,
    out: 72,
    head: ["Until he discovers", "a new way."],
    sub: "Clear, transparent, and direct.",
    alt: "Arjun holding up his phone, the Nivaaran app open on it.",
  },
  {
    key: "detail",
    in: 77,
    out: 87,
    head: ["Now he knows exactly what to do."],
    sub: "See where things stand.",
    alt: "Arjun reading a plain list of what to fix.",
  },
  {
    key: "final",
    in: 92,
    out: null,
    head: ["Your PF journey", "should feel this simple."],
    sub: "Understand. Act. Resolve.",
    alt: "Arjun, done, phone lowered.",
  },
] as const;

/* --------------------------------------------------------------- overlay */

interface OverlayContentProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function OverlayContent({ scrollContainerRef }: OverlayContentProps) {
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
            {beat.head.map((line, j) => (
              <React.Fragment key={line}>
                {j > 0 ? <br className="hidden sm:inline" /> : null}
                {j > 0 ? " " : null}
                {line}
              </React.Fragment>
            ))}
          </h2>
          <p className="mt-3 text-balance text-[clamp(0.9375rem,min(3.4vw,4vh),1.375rem)] leading-snug text-white/80 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
            {beat.sub}
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
          Scroll
        </span>
        <span className="h-8 w-px bg-gradient-to-b from-white/60 to-transparent" />
      </div>
    </div>
  );
}
