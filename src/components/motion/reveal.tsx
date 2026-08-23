"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

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
 * The rAF loop only runs while the scene is on screen. Under
 * `prefers-reduced-motion` the scene is parked at its finished state: the
 * story is told in stills rather than withheld.
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

    if (still || typeof IntersectionObserver === "undefined") {
      el.style.setProperty("--p", "1");
      // Deferred: settling state inside the effect body would cascade renders.
      const once = requestAnimationFrame(() => {
        latest.current?.(1);
        if (steps) setStep(steps);
      });
      return () => cancelAnimationFrame(once);
    }

    let raf = 0;
    let live = false;
    let last = -1;

    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the scene's top edge sits near the bottom of the viewport,
      // 1 by the time it has climbed near the top. Independent of scene height.
      const p = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.8)));
      el.style.setProperty("--p", p.toFixed(4));
      latest.current?.(p);
      if (steps) {
        const s = Math.round(p * steps);
        if (s !== last) {
          last = s;
          setStep(s);
        }
      }
      if (live) raf = requestAnimationFrame(measure);
    };

    const io = new IntersectionObserver(([e]) => {
      live = e.isIntersecting;
      if (live && !raf) raf = requestAnimationFrame(measure);
    });
    io.observe(el);

    return () => {
      live = false;
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
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
 */
export function useCanvas<A>(
  ref: React.RefObject<HTMLCanvasElement | null>,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, arg: A) => void,
  initial: A,
) {
  const box = useRef({ w: 0, h: 0, arg: initial, draw });

  useEffect(() => {
    box.current.draw = draw;
  });

  const render = useCallback((arg?: A) => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const s = box.current;
    if (arg !== undefined) s.arg = arg;
    if (!s.w || !s.h) return;
    ctx.clearRect(0, 0, s.w, s.h);
    s.draw(ctx, s.w, s.h, s.arg);
  }, [ref]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;

    const resize = () => {
      const rect = cv.getBoundingClientRect();
      // Capped at 2×: beyond that a field of 2px marks costs memory and
      // buys nothing a reader can see.
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      box.current.w = rect.width;
      box.current.h = rect.height;
      cv.width = Math.round(rect.width * dpr);
      cv.height = Math.round(rect.height * dpr);
      cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
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
