"use client";

import clsx from "clsx";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useEffect, useRef, useState } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ------------------------------------------------------------------ Reveal */

/**
 * One observer for the whole page. Elements reveal once and are released —
 * a landing page with thirty reveals should not carry thirty observers.
 */
let shared: IntersectionObserver | null = null;

function observer(): IntersectionObserver | null {
  if (shared) return shared;
  if (typeof IntersectionObserver === "undefined") return null;
  shared = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.setAttribute("data-reveal", "in");
        shared?.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
  );
  return shared;
}

type Tag = "div" | "section" | "li" | "figure" | "p" | "header";

/**
 * Enters on scroll. The hidden state lives in CSS behind
 * `prefers-reduced-motion: no-preference`, so a reader who has asked for
 * stillness — or whose script never runs — sees the finished page, not a
 * blank one.
 */
export function Reveal({
  as: Tag = "div",
  delay,
  className,
  style,
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: Tag; delay?: number }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = observer();
    if (!io) {
      el.setAttribute("data-reveal", "in");
      return;
    }
    io.observe(el);
    return () => io.unobserve(el);
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-reveal="pending"
      className={className}
      style={
        delay
          ? ({ ...style, "--reveal-delay": `${delay}ms` } as React.CSSProperties)
          : style
      }
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* --------------------------------------------------------- Scene progress */

interface SceneOptions {
  /** Quantise progress into N steps and re-render only when the step changes. */
  steps?: number;
  /** Called every frame with 0→1. Use for canvas; never triggers a render. */
  onFrame?: (p: number) => void;
}

/**
 * Scroll progress for one scene, 0 → 1, written straight onto `ref`'s element
 * as `--p` so CSS can drive transforms without React re-rendering per frame.
 *
 * The ref is passed in rather than returned: a hook that hands back a ref
 * inside an object defeats the compiler's ref analysis at every call site.
 *
 * This used to run its own rAF loop per scene, each one calling
 * getBoundingClientRect() every frame — three scenes on the landing page meant
 * three loops and three forced layouts per frame, and they kept running while
 * the page sat still. It is now one more ScrollTrigger on the app's single
 * pipeline: ScrollTrigger already caches the scene's start and end as pixel
 * offsets and only recomputes them on refresh, and it only calls back when the
 * position actually moved.
 *
 * The window is unchanged: 0 when the scene's top edge sits near the bottom of
 * the viewport, 1 by the time it has climbed near the top.
 *
 * Under `prefers-reduced-motion` the scene is parked at its finished state:
 * the story is told in stills rather than withheld.
 */
export function useSceneProgress(
  ref: React.RefObject<HTMLElement | null>,
  { steps = 0, onFrame }: SceneOptions = {},
) {
  const [step, setStep] = useState(0);
  const latest = useRef(onFrame);

  useEffect(() => {
    latest.current = onFrame;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const still =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (still) {
      el.style.setProperty("--p", "1");
      // Deferred: settling state inside the effect body would cascade renders.
      const once = requestAnimationFrame(() => {
        latest.current?.(1);
        if (steps) setStep(steps);
      });
      return () => cancelAnimationFrame(once);
    }

    let lastVar = "";
    let lastStep = -1;

    const write = (p: number) => {
      // Custom properties inherit, so every write invalidates style for the
      // subtree. Three decimals is finer than any of these scenes can show,
      // and skipping the identical write skips the recalc entirely.
      const v = p.toFixed(3);
      if (v !== lastVar) {
        lastVar = v;
        el.style.setProperty("--p", v);
      }
      latest.current?.(p);
      if (steps) {
        const n = Math.round(p * steps);
        if (n !== lastStep) {
          lastStep = n;
          setStep(n);
        }
      }
    };

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      end: "top 10%",
      invalidateOnRefresh: true,
      onUpdate: (self) => write(self.progress),
      // Fires on creation and after every refresh, so a scene that is already
      // past the window on load is drawn at its finished state rather than
      // waiting for a scroll event that may never come.
      onRefresh: (self) => write(self.progress),
    });

    return () => st.kill();
  }, [ref, steps]);

  return step;
}

/* ------------------------------------------------------------------ Canvas */

/**
 * A DPR-capped canvas that redraws on resize and on demand.
 *
 * The scrub value is passed *through* `render(arg)` into `draw` rather than
 * read from a ref inside the draw closure — same result, and it keeps the
 * drawing function honestly pure with respect to React.
 *
 * A repeated `arg` is a no-op. Scenes are scrubbed by scroll, so the same
 * value arrives again and again while the reader is still or moving slowly;
 * redrawing 796 marks to produce an identical frame is pure fill rate.
 */
export function useCanvas<A>(
  ref: React.RefObject<HTMLCanvasElement | null>,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, arg: A) => void,
  initial: A,
) {
  const box = useRef({ w: 0, h: 0, arg: initial, draw, stale: true });

  useEffect(() => {
    box.current.draw = draw;
  });

  const render = useCallback((arg?: A) => {
    const s = box.current;
    if (arg !== undefined) {
      if (!s.stale && Object.is(arg, s.arg)) return;
      s.arg = arg;
    }
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx || !s.w || !s.h) return;
    ctx.clearRect(0, 0, s.w, s.h);
    s.draw(ctx, s.w, s.h, s.arg);
    s.stale = false;
  }, [ref]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;

    const resize = () => {
      const rect = cv.getBoundingClientRect();
      // Capped at 2×: beyond that a field of 2px marks costs memory and
      // buys nothing a reader can see.
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      // Reassigning width/height clears the canvas, so only do it when the
      // box actually changed — a ResizeObserver fires on every layout pass.
      if (cv.width === w && cv.height === h && !box.current.stale) return;
      box.current.w = rect.width;
      box.current.h = rect.height;
      cv.width = w;
      cv.height = h;
      cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      box.current.stale = true;
      render();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [ref, render]);

  return render;
}

/* ------------------------------------------------------------------- Misc */

export function Meta({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={clsx("meta", className)}>{children}</p>;
}
