/* ============================================================
   One source of truth for the scrolled frame sequence.

   The canvas and the captions are driven by two separate
   ScrollTriggers on the same element, so every number they share
   lives here — if they drift apart the text lands on the wrong
   frame and nobody notices until it is on a phone.
   ============================================================ */

export const FRAME_COUNT = 260;

/** Below this the sequence is a phone: shorter throw, tighter scrub, small plates. */
export const MOBILE_QUERY = "(max-width: 767px)";
/* gsap.matchMedia ORs a conditions object into one query, so one of the
   width branches must always match or the callback never runs at all. */
export const DESKTOP_QUERY = "(min-width: 768px)";
export const STILL_QUERY = "(prefers-reduced-motion: reduce)";

/* A phone gets roughly two-thirds of the throw. The desktop number is a
   comfortable read with a mouse wheel; on a thumb it is a chore.

   The scrub values are low on purpose. Lenis already interpolates the scroll
   position on wheel and trackpad, so a large scrub would be a second smoothing
   pass on top of the first — the input lag that makes a scrubbed sequence feel
   detached from the hand. Touch does not go through Lenis (native momentum is
   better than anything we would lerp), so the phone carries slightly more of
   the smoothing itself. */
export const SCROLL = {
  mobile: { end: "+=520%", scrub: 0.55 },
  desktop: { end: "+=800%", scrub: 0.35 },
} as const;

/**
 * The sequence ships at two widths. A phone must never pull the desktop
 * encode: at 46 kB a frame that is 12 MB of images for a screen that cannot
 * show the difference.
 */
export function frameSetFor(width: number, dpr: number): FrameSet {
  return width * Math.min(2, dpr) >= 1100 ? "w1536" : "w768";
}

export type FrameSet = "w768" | "w1536";

/** Pixel width of each encode, so the canvas never asks for detail that is not there. */
export const FRAME_WIDTH: Record<FrameSet, number> = { w768: 768, w1536: 1536 };

export function frameSrc(set: string, i: number): string {
  return `/Frames/${set}/${String(i).padStart(4, "0")}.webp`;
}

/** The six beats, and the frame each one sits on. Used by the still fallback. */
export const BEATS = [
  { frame: 18, key: "intro" },
  { frame: 64, key: "beat1" },
  { frame: 116, key: "transition" },
  { frame: 168, key: "reveal" },
  { frame: 214, key: "detail" },
  { frame: 250, key: "final" },
] as const;
