"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface OverlayContentProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function OverlayContent({ scrollContainerRef }: OverlayContentProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Refs for individual text elements
  const introRef = useRef<HTMLDivElement>(null);
  const beat1Ref = useRef<HTMLDivElement>(null);
  const transitionRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollContainerRef.current || !overlayRef.current) return;

    // Set initial states
    const elements = [introRef, beat1Ref, transitionRef, revealRef, detailRef, finalRef];
    elements.forEach(ref => {
      if (ref.current) gsap.set(ref.current, { opacity: 0, y: 30 });
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainerRef.current,
        start: "top top",
        end: "+=800%", // Must match FrameRenderer's end value
        scrub: 0.5,    // Aligned with FrameRenderer's scrub value
        // No pinning here, FrameRenderer or CinematicSequence handles the pin.
      }
    });

    // The timeline represents 0% to 100% of the scroll progress.
    // Total duration of the timeline in GSAP abstract time can be anything, say 100 seconds.
    // So 0-15s is 0-15%.

    // 0-15% -> Introduction
    tl.to(introRef.current, { opacity: 1, y: 0, duration: 3 }, 2) // In at 2%
      .to(introRef.current, { opacity: 0, y: -30, duration: 3 }, 12); // Out at 12%

    // 15-35% -> First beat
    tl.to(beat1Ref.current, { opacity: 1, y: 0, duration: 3 }, 17)
      .to(beat1Ref.current, { opacity: 0, y: -30, duration: 3 }, 32);

    // 35-55% -> Transition
    tl.to(transitionRef.current, { opacity: 1, y: 0, duration: 3 }, 37)
      .to(transitionRef.current, { opacity: 0, y: -30, duration: 3 }, 52);

    // 55-75% -> Primary reveal
    tl.to(revealRef.current, { opacity: 1, y: 0, duration: 3 }, 57)
      .to(revealRef.current, { opacity: 0, y: -30, duration: 3 }, 72);

    // 75-90% -> Detail
    tl.to(detailRef.current, { opacity: 1, y: 0, duration: 3 }, 77)
      .to(detailRef.current, { opacity: 0, y: -30, duration: 3 }, 87);

    // 90-100% -> Final state
    tl.to(finalRef.current, { opacity: 1, y: 0, duration: 3 }, 92);
    // Stays visible at the end

    // Ensure total timeline duration is exactly 100 so absolute times match percentages
    tl.to({}, { duration: 5 }, 95); 

    return () => {
      tl.kill();
    };
  }, [scrollContainerRef]);

  return (
    <div ref={overlayRef} className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center p-6 md:p-12">
      
      {/* 0-15% */}
      <div ref={introRef} className="absolute max-w-2xl text-center text-white">
        <h2 className="text-4xl md:text-6xl font-semibold tracking-tight mb-4 drop-shadow-lg">Meet Arjun.</h2>
        <p className="text-xl md:text-2xl text-white/80 drop-shadow-md">He just wants to take care of his PF.</p>
      </div>

      {/* 15-35% */}
      <div ref={beat1Ref} className="absolute max-w-2xl text-center text-white">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 drop-shadow-lg">Then he tries to navigate<br />the EPFO process.</h2>
        <p className="text-lg md:text-xl text-white/80 drop-shadow-md">It's a maze of forms and portals.</p>
      </div>

      {/* 35-55% */}
      <div ref={transitionRef} className="absolute max-w-2xl text-center text-white">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 drop-shadow-lg">What should be simple<br />becomes complicated.</h2>
        <p className="text-lg md:text-xl text-white/80 drop-shadow-md">He doesn't know what happens next.</p>
      </div>

      {/* 55-75% */}
      <div ref={revealRef} className="absolute max-w-2xl text-center text-white">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 drop-shadow-lg">Until he discovers<br />a new way.</h2>
        <p className="text-lg md:text-xl text-white/80 drop-shadow-md">Clear, transparent, and direct.</p>
      </div>

      {/* 75-90% */}
      <div ref={detailRef} className="absolute max-w-2xl text-center text-white">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 drop-shadow-lg">Now he knows exactly what to do.</h2>
        <p className="text-lg md:text-xl text-white/80 drop-shadow-md">See where things stand.</p>
      </div>

      {/* 90-100% */}
      <div ref={finalRef} className="absolute max-w-2xl text-center text-white">
        <h2 className="text-4xl md:text-7xl font-semibold tracking-tight mb-4 drop-shadow-lg">Your PF journey<br/>should feel this simple.</h2>
        <p className="text-xl text-white/80 tracking-wide uppercase text-sm drop-shadow-md">Understand. Act. Resolve.</p>
      </div>

    </div>
  );
}
