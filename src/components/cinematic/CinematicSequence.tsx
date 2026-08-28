"use client";

import React, { useRef } from "react";
import { FrameRenderer } from "./FrameRenderer";
import { OverlayContent } from "./OverlayContent";
import { StoryCTA } from "../story/StoryCTA"; // Re-using existing CTA without modifying it

export function CinematicSequence() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative w-full bg-black">

      {/* 
        This is the trigger container for ScrollTrigger. 
        It will be pinned by FrameRenderer, and OverlayContent will scrub its animations based on it.
      */}
      <div ref={containerRef} className="relative w-full h-[100dvh] overflow-hidden bg-black">
        <FrameRenderer scrollContainerRef={containerRef} frameCount={260} />
        <OverlayContent scrollContainerRef={containerRef} />
      </div>

      {/* Post-story CTA that scrolls naturally into view after unpin */}
      <div className="relative w-full min-h-[50vh] flex flex-col items-center justify-center bg-black py-24 z-10 border-t border-white/5">
        <StoryCTA />
      </div>
    </div>
  );
}
