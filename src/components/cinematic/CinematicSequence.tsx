"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { useLang } from "@/lib/i18n/context";

import { FrameRenderer } from "./FrameRenderer";
import { BEAT_COPY, OverlayContent } from "./OverlayContent";
import { BEATS, STILL_QUERY, frameSrc } from "./config";
import { StoryCTA } from "../story/StoryCTA";

/**
 * The same six beats, told in stills. A reader who has asked for stillness
 * gets the story, not a blank pinned canvas — and this is also what a printer
 * and a crawler see.
 */
function StillSequence() {
  const { lang, t } = useLang();
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
      <ol className="space-y-16">
        {BEAT_COPY.map((beat, i) => (
          <li key={beat.key}>
            <Image
              src={frameSrc("w768", BEATS[i].frame)}
              alt={t(beat.alt)}
              width={768}
              height={432}
              className="w-full rounded-card"
              priority={i === 0}
            />
            <h2 className="mt-6 text-balance text-[clamp(1.5rem,5vw,2.25rem)] font-semibold leading-tight tracking-tight text-white">
              {beat.head[lang].join(" ")}
            </h2>
            <p className="mt-2 text-balance text-md leading-relaxed text-white/70">
              {t(beat.sub)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CinematicSequence() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Rendered on the server and on the first client paint, so the markup
  // matches; the swap happens on mount for the few readers who need it.
  const [still, setStill] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(STILL_QUERY);
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div className="relative w-full overflow-x-clip bg-black">
      {still ? (
        <StillSequence />
      ) : (
        /* The pin target. 100dvh so an iOS URL bar cannot push it taller than
           the screen and leave the caption cropped. */
        <div
          ref={containerRef}
          className="relative h-[100dvh] w-full overflow-hidden bg-black"
        >
          <FrameRenderer scrollContainerRef={containerRef} />
          <OverlayContent scrollContainerRef={containerRef} />
        </div>
      )}

      {/* Scrolls naturally into view once the sequence unpins. */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center border-t border-white/10 bg-black px-5 py-20 sm:py-28">
        <StoryCTA />
      </div>
    </div>
  );
}
