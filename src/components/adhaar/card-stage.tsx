"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { SpecimenCard, type CardDetails } from "./specimen-card";
import { useLang } from "@/lib/i18n/context";
import type { Bi } from "@/lib/rules/types";

/**
 * The stage: perspective, pointer, keyboard, and the light that follows both.
 *
 * Everything here is motion. The card itself knows nothing about tilt — it
 * reads two custom properties for the specular highlight and is otherwise
 * static markup, which is what lets the whole thing render correctly with
 * this file's animation disabled.
 *
 * Tilt and flip live on **two different elements** on purpose. Both want
 * `rotationY`; sharing one element means the flip fights the pointer and the
 * card jitters at 180°.
 *
 * There is nothing behind the card. There used to be: a WebGL studio painting
 * a pool of light, a contact shadow and drifting motes, on a ticker that ran
 * for as long as the stage was on screen. It was beautiful and it was in the
 * way — the card is the subject of this page, and a lit room around it made
 * the page heavier than the one object it exists to show. What replaced it is
 * the card's own shadow, one static declaration, and everything that moves now
 * moves because a finger or a key moved it.
 */

interface Tilt {
  x: number;
  y: number;
}

const MAX_Y = 26;
const MAX_X = 18;
const NUDGE = 6;

const COPY = {
  label: { en: "Specimen Aadhaar card", hi: "नमूना आधार कार्ड" },
  how: {
    en: "Drag to tilt · Tap to flip",
    hi: "झुकाने के लिए खींचें · पलटने के लिए दबाएँ",
  },
  described: {
    en: "An interactive specimen card. Move the pointer over it to tilt it, or use the arrow keys. Press Enter or Space to turn it over.",
    hi: "एक इंटरैक्टिव नमूना कार्ड। झुकाने के लिए इस पर पॉइंटर घुमाएँ या तीर बटन दबाएँ। पलटने के लिए Enter या Space दबाएँ।",
  },
} as const satisfies Record<string, Bi>;

const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeStill = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const stillNow = () => window.matchMedia(REDUCED).matches;
/** The server cannot know, and must not guess in the markup. */
const stillOnServer = () => false;

export function CardStage({ details, revealed }: { details: CardDetails; revealed: boolean }) {
  const { t } = useLang();
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltEl = useRef<HTMLDivElement>(null);
  const flipEl = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<Tilt>({ x: 0, y: 0 });
  const setters = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null);

  // Turns, not a boolean: the card always continues the way it was already
  // going, so a second press carries on clockwise instead of unwinding the
  // first. A rewinding card reads as an undo; a continuing one reads as an
  // object being turned over in the hand.
  const [turns, setTurns] = useState(0);
  const [touched, setTouched] = useState(false);
  const flipped = turns % 2 === 1;

  const still = useSyncExternalStore(subscribeStill, stillNow, stillOnServer);

  /* ----------------------------------------------------------- the tilt */

  const apply = useCallback((ry: number, rx: number) => {
    const y = clamp(ry, MAX_Y);
    const x = clamp(rx, MAX_X);
    tiltRef.current = { x, y };

    const card = tiltEl.current;
    if (card) {
      // The specular highlight reads these, so the pointer position drives
      // the one lighting cue the card has.
      card.style.setProperty("--spec-x", `${50 + (y / MAX_Y) * 38}%`);
      card.style.setProperty("--spec-y", `${50 - (x / MAX_X) * 38}%`);
    }

    if (setters.current) {
      setters.current.y(y);
      setters.current.x(x);
    } else if (card) {
      card.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
    }
  }, []);

  // gsap.quickTo is set up once: it is a pre-compiled setter, and rebuilding
  // it per pointer event would throw away the interpolation it exists for.
  useEffect(() => {
    const card = tiltEl.current;
    if (!card || still) {
      // A designed static pose, not a flat rectangle: stillness should still
      // read as an object sitting on a desk.
      if (card) card.style.transform = "rotateX(8deg) rotateY(-14deg)";
      return;
    }
    const opts = { duration: 0.6, ease: "power3.out" };
    setters.current = {
      y: gsap.quickTo(card, "rotationY", opts),
      x: gsap.quickTo(card, "rotationX", opts),
    };
    return () => {
      setters.current = null;
      gsap.killTweensOf(card);
    };
  }, [still]);

  // Back to rest, and then nothing. There was an endless four-second breath
  // here to keep an untouched card "alive"; a loop that never stops is a frame
  // budget spent on a page where nobody is doing anything.
  const rest = useCallback(() => {
    if (still) return;
    apply(0, 0);
  }, [apply, still]);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (still) return;
    const box = e.currentTarget.getBoundingClientRect();
    // Guarded: this fires on every pointer move, and an unguarded setState
    // here re-renders the whole card sixty times a second.
    if (!touched) setTouched(true);
    apply(
      ((e.clientX - box.left) / box.width - 0.5) * MAX_Y * 2,
      -((e.clientY - box.top) / box.height - 0.5) * MAX_X * 2,
    );
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const { x, y } = tiltRef.current;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setTouched(true);
      setTurns((n) => n + 1);
      return;
    }
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-NUDGE, 0],
      ArrowRight: [NUDGE, 0],
      ArrowUp: [0, NUDGE],
      ArrowDown: [0, -NUDGE],
    };
    const move = step[e.key];
    if (!move) return;
    e.preventDefault();
    setTouched(true);
    apply(y + move[0], x + move[1]);
  }

  /* ----------------------------------------------------------- the flip */

  const settled = useRef(false);

  useEffect(() => {
    const el = flipEl.current;
    if (!el) return;
    const target = turns * 180;

    if (still || !settled.current) {
      // First paint, or a reader who asked for stillness: land on the pose
      // rather than animating into it.
      settled.current = true;
      gsap.set(el, { rotationY: target, scale: 1 });
      return;
    }

    // The lift is what makes it read as elegant rather than mechanical: the
    // card comes up off the surface, turns, and settles back — one gesture,
    // not a rectangle spinning in place.
    const tl = gsap.timeline();
    tl.to(el, { rotationY: target, duration: 0.9, ease: "power2.inOut" }, 0)
      .to(el, { scale: 1.05, duration: 0.45, ease: "power2.out" }, 0)
      .to(el, { scale: 1, duration: 0.45, ease: "power2.in" }, 0.45);
    return () => {
      tl.kill();
    };
  }, [turns, still]);

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      role="group"
      aria-label={t(COPY.label)}
      aria-describedby="adhaar-stage-help"
      data-face={flipped ? "back" : "front"}
      data-turns={turns}
      onPointerMove={onPointerMove}
      onPointerLeave={rest}
      onKeyDown={onKeyDown}
      onClick={() => {
        setTouched(true);
        setTurns((n) => n + 1);
      }}
      // The one entrance on this page: eight pixels and an opacity, once, on
      // arrival. It runs on the stage rather than on anything inside it — a
      // CSS animation outranks an inline transform, so on the tilt element its
      // final `transform: none` would win against every pointer move for good,
      // and on a wrapper in between it would flatten the 3D context the card
      // is built out of.
      className="card-enter relative isolate mx-auto w-full max-w-lg cursor-pointer rounded-card px-4 py-14 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 sm:py-16"
      style={{ perspective: "1200px" }}
    >
      {/* No wrapper between the perspective and the tilt: an element without
          `preserve-3d` in the middle flattens the whole card onto one plane. */}
      <div ref={tiltEl} className="relative z-10" style={{ transformStyle: "preserve-3d" }}>
        <div ref={flipEl} data-testid="card-flip" style={{ transformStyle: "preserve-3d" }}>
          <SpecimenCard details={details} revealed={revealed} face={flipped ? "back" : "front"} />
        </div>
      </div>

      <p
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-2 z-10 text-center text-2xs font-medium uppercase tracking-[0.14em] text-ink-mute transition-opacity duration-500 ${
          touched ? "opacity-0" : "opacity-100"
        }`}
      >
        {t(COPY.how)}
      </p>

      <p id="adhaar-stage-help" className="sr-only">
        {t(COPY.described)}
      </p>
    </div>
  );
}
