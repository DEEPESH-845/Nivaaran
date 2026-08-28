"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* ============================================================
   The one scroll pipeline:

     wheel/touch → Lenis → gsap.ticker → ScrollTrigger → timelines

   Lenis owns the scroll position. GSAP's ticker owns the clock.
   ScrollTrigger reads both. Nothing else in the app may add a rAF
   loop or a scroll listener — a second source of truth is what
   produces drift, double smoothing and stutter.
   ============================================================ */

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      // The GSAP ticker drives it; a second internal rAF would be a
      // competing loop.
      autoRaf: false,
      // lerp, not duration: frame-rate independent and it settles without
      // overshoot, so the timeline never oscillates when scrolling stops.
      lerp: 0.12,
      smoothWheel: true,
      // Touch keeps the platform's own momentum. Smoothing it here would be
      // the double smoothing that makes a phone feel laggy.
      syncTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Hash links go through the same pipeline instead of the browser's
      // `scroll-behavior: smooth`, which would fight Lenis for the position.
      // Lenis reads the target's scroll-margin-top, so the `scroll-mt-*` the
      // sections already carry keeps clearing the sticky header — no offset
      // here, or it counts twice.
      anchors: { duration: 0.9 },
      // Kill leftover inertia when leaving the page, so the next route does
      // not inherit a moving scroll.
      stopInertiaOnNavigate: true,
    });
    lenisRef.current = lenis;

    // Single direction: Lenis writes the position, ScrollTrigger reads it.
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    // Lag smoothing would let GSAP fake the clock after a long frame, which
    // desyncs the scrubbed timelines from the real scroll position.
    gsap.ticker.lagSmoothing(0);

    // ScrollTrigger caches every start/end as a pixel offset. Anything that
    // changes layout after first paint invalidates that cache: a swapped
    // webfont re-flows text, a late image changes a section's height.
    // ScrollTrigger already handles resize on its own — adding a listener
    // here would just duplicate it.
    let queued = 0;
    const refresh = () => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(() => {
        lenis.resize();
        ScrollTrigger.refresh();
      });
    };

    document.fonts?.ready.then(refresh).catch(() => {});
    if (document.readyState !== "complete") {
      window.addEventListener("load", refresh, { once: true });
    }

    return () => {
      cancelAnimationFrame(queued);
      window.removeEventListener("load", refresh);
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // A route change replaces the whole document body. The new page's
  // components create their triggers in their own effects, which run before
  // this one, so by the time we get here there is something to measure.
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    const id = requestAnimationFrame(() => {
      lenis.resize();
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return <>{children}</>;
}
