"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  DESKTOP_QUERY,
  FRAME_COUNT,
  FRAME_WIDTH,
  MOBILE_QUERY,
  SCROLL,
  STILL_QUERY,
  type FrameSet,
  frameSetFor,
  frameSrc,
} from "./config";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ---------------------------------------------------------------- framing */

/** Below this aspect ratio the plate is fitted, not cropped. */
const FIT_AR = 1.15;
/** Zoom applied to a fitted plate so a phone is not mostly letterbox. */
const FIT_ZOOM = 1.2;
/** The subject sits right of centre through most of the sequence. */
const FOCUS_X = 0.58;
/** Heads live in the upper half; bias a vertical crop upwards. */
const FOCUS_Y = 0.4;

/**
 * Where to slide an oversized plate so `focus` lands in the middle of the
 * window. `ratio` is window/plate on that axis; at 1 or above nothing is
 * cropped and there is nothing to decide.
 */
function anchor(ratio: number, focus: number): number {
  if (ratio >= 1) return 0.5;
  return Math.min(1, Math.max(0, (focus - ratio / 2) / (1 - ratio)));
}

/**
 * Where the plate lands on the canvas. Every frame in the sequence has the
 * same intrinsic size, so this is a function of the canvas box alone — it is
 * computed once per resize and reused for all 260 frames rather than
 * recomputed inside the per-frame draw.
 *
 * A full cover crop of a 16:9 plate on a portrait phone throws away most of
 * the composition and magnifies the source far past what it can carry, so a
 * narrow viewport gets a fitted, gently zoomed frame on black instead — which
 * is also what leaves room for the caption underneath.
 */
function geometry(w: number, h: number, iw: number, ih: number) {
  const fit = w / h < FIT_AR;
  const scale = fit
    ? Math.min(w / iw, h / ih) * FIT_ZOOM
    : Math.max(w / iw, h / ih);

  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (w - dw) * (fit ? 0.5 : anchor(w / dw, FOCUS_X));
  const dy = (h - dh) * (fit ? 0.38 : anchor(h / dh, FOCUS_Y));

  // Only the slice of the plate that lands inside the canvas is sampled. A
  // cover crop hangs off the edges by design; scaling those pixels and then
  // clipping them is raster work paid for nothing.
  const slice = (d: number, size: number, box: number, intrinsic: number) => {
    const from = Math.min(Math.max(-d / scale, 0), intrinsic);
    const to = Math.min(Math.max((box - d) / scale, 0), intrinsic);
    return { s: from, sSize: to - from, d: d + from * scale, dSize: (to - from) * scale };
  };

  const x = slice(dx, dw, w, iw);
  const y = slice(dy, dh, h, ih);

  return {
    sx: x.s, sy: y.s, sw: x.sSize, sh: y.sSize,
    dx: x.d, dy: y.d, dw: x.dSize, dh: y.dSize,
  };
}

/* ---------------------------------------------------------------- renderer */

interface FrameRendererProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  frameCount?: number;
}

export function FrameRenderer({
  scrollContainerRef,
  frameCount = FRAME_COUNT,
}: FrameRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(HTMLImageElement | null)[]>([]);
  const set = useRef<FrameSet>("w768");
  const state = useRef({ target: 1, drawn: -1, w: 0, h: 0, dirty: true });
  const geo = useRef({ key: "", sx: 0, sy: 0, sw: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 });

  /* -- 1. Fetch ------------------------------------------------------------
     Order matters more than speed here. The first beat comes first so the
     canvas is never blank, then a coarse pass over the whole sequence so a
     fast flick always has *something* within a few frames, then the gaps. */
  useEffect(() => {
    set.current = frameSetFor(window.innerWidth, window.devicePixelRatio || 1);
    const src = set.current;
    frames.current = new Array(frameCount + 1).fill(null);
    let cancelled = false;

    const order: number[] = [];
    const seen = new Set<number>();
    const queue = (i: number) => {
      if (i >= 1 && i <= frameCount && !seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    };
    for (let i = 1; i <= 8; i++) queue(i);
    for (let i = 1; i <= frameCount; i += 8) queue(i);
    for (let i = 1; i <= frameCount; i++) queue(i);

    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";

        const ready = () => {
          if (!cancelled) {
            frames.current[i] = img;
            state.current.dirty = true;
          }
          resolve();
        };

        img.src = frameSrc(src, i);
        // Decode off the main thread *before* the frame joins the cache. A
        // drawImage on an undecoded bitmap decodes synchronously inside the
        // ticker, which is a dropped frame every time a new plate appears —
        // and during a scrub that is most frames.
        img
          .decode()
          .then(ready)
          .catch(() => {
            if (img.complete && img.naturalWidth) ready();
            else {
              img.onload = ready;
              img.onerror = () => resolve();
            }
          });
      });

    let next = 0;
    const worker = async () => {
      while (!cancelled && next < order.length) await load(order[next++]);
    };
    // Six in flight: enough to saturate a mobile connection, few enough that
    // the priority order still means something.
    void Promise.all(Array.from({ length: 6 }, worker));

    return () => {
      cancelled = true;
      // Up to 260 decoded plates, which at w1536 is tens of megabytes. Held
      // in a ref, nothing releases them when the reader leaves /story, so the
      // whole sequence survives the route change.
      frames.current = [];
    };
  }, [frameCount]);

  /* -- 2. Draw ----------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Never build a backing store wider than the plate can fill. At DPR 2 a
      // 1440px viewport asked for 2880×1800 and then upscaled a 1536px source
      // into it — 2.6× the fill rate for detail that does not exist. Capping
      // the canvas near the source width is both cheaper *and* sharper.
      const cssW = Math.max(rect.width, 1);
      const ceiling = (FRAME_WIDTH[set.current] * 1.15) / cssW;
      const dpr = Math.max(
        1,
        Math.min(2, window.devicePixelRatio || 1, ceiling),
      );

      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (w === state.current.w && h === state.current.h) return;

      canvas.width = w;
      canvas.height = h;
      // Resizing the backing store resets context state.
      ctx.imageSmoothingQuality = "low";
      state.current.w = w;
      state.current.h = h;
      state.current.dirty = true;
      geo.current.key = "";
    };

    const render = () => {
      const s = state.current;
      if (!s.w || !s.h) return;

      const want = Math.round(s.target);
      let img = frames.current[want] ?? null;
      let drawn = want;

      // Nothing loaded at the exact position yet: hold the nearest frame
      // that is, rather than flashing black. Backwards first — a sequence
      // reads better lagging than leading.
      if (!img) {
        for (let i = want - 1; i >= 1; i--) {
          if (frames.current[i]) {
            img = frames.current[i];
            drawn = i;
            break;
          }
        }
      }
      if (!img) {
        for (let i = want + 1; i <= frameCount; i++) {
          if (frames.current[i]) {
            img = frames.current[i];
            drawn = i;
            break;
          }
        }
      }
      if (!img) return;
      // The only work that happens on a frame where nothing moved is these
      // two comparisons.
      if (drawn === s.drawn && !s.dirty) return;

      const key = `${s.w}x${s.h}x${img.width}x${img.height}`;
      if (geo.current.key !== key) {
        geo.current = { key, ...geometry(s.w, s.h, img.width, img.height) };
        // The letterbox bars are the only pixels the plate never covers, and
        // they are the same black on every frame. Painting them once here —
        // rather than clearing the whole canvas 60 times a second — removes a
        // full-canvas fill from the per-frame path. (A context created with
        // `alpha: false` starts out opaque black, so the very first frame is
        // already correct.)
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, s.w, s.h);
      }
      const g = geo.current;

      ctx.drawImage(img, g.sx, g.sy, g.sw, g.sh, g.dx, g.dy, g.dw, g.dh);

      s.drawn = drawn;
      s.dirty = false;
    };

    resize();
    ctx.imageSmoothingQuality = "low";
    // One clock for the whole app: the ticker is already running for Lenis,
    // so this rides it rather than opening a second rAF loop.
    gsap.ticker.add(render);

    // The canvas is 100dvh: on iOS it resizes every time the URL bar moves,
    // so measure from the element rather than from window dimensions.
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("orientationchange", resize);

    return () => {
      gsap.ticker.remove(render);
      ro.disconnect();
      window.removeEventListener("orientationchange", resize);
    };
  }, [frameCount]);

  /* -- 3. Scroll --------------------------------------------------------- */
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Without this every URL-bar show/hide on iOS counts as a resize and
    // refreshes the pin mid-scroll, which reads as the page jumping.
    ScrollTrigger.config({ ignoreMobileResize: true });

    const mm = gsap.matchMedia();
    mm.add(
      { isMobile: MOBILE_QUERY, isDesktop: DESKTOP_QUERY, still: STILL_QUERY },
      (self) => {
        const { isMobile, still } = self.conditions as {
          isMobile: boolean;
          still: boolean;
        };
        // Reduced motion gets the stills fallback instead; no pin, no scrub.
        if (still) return;

        const cfg = isMobile ? SCROLL.mobile : SCROLL.desktop;
        ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: cfg.end,
          pin: true,
          pinSpacing: true,
          pinType: "transform",
          // No anticipatePin. It exists for pins that flicker because the
          // browser reports scroll late; Lenis already hands over an
          // interpolated position, so anticipating it only pins the element
          // while its top is still below the viewport — measured as a 94px
          // jump at the boundary, and the page's largest layout shift.
          scrub: cfg.scrub,
          invalidateOnRefresh: true,
          // Refresh before the caption timeline so it measures against the
          // layout the pin has already produced.
          refreshPriority: 1,
          onUpdate: (t) => {
            state.current.target = 1 + t.progress * (frameCount - 1);
          },
        });
      },
    );

    return () => mm.revert();
  }, [scrollContainerRef, frameCount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full bg-black"
    />
  );
}
