"use client";

import { useRef } from "react";

import { useLang } from "@/lib/i18n/context";
import { useCanvas, useSceneProgress } from "@/components/motion/reveal";

/**
 * One token, multiplied.
 *
 * 796 marks, one per 100,000 claims filed in FY 2024-25. 174 of them —
 * exactly 1.74 crore at that scale — fail. Nothing here is estimated or
 * rounded for effect; the figures are the ones cited on /sources.
 *
 * Canvas rather than 796 DOM nodes, DPR-capped, redrawn only while the
 * scene is on screen.
 */

const MARKS = 796; // 7.96 crore ÷ 100,000
const FAILED = 174; // 1.74 crore ÷ 100,000
/** Coprime with MARKS, so exactly FAILED marks are selected, evenly scattered. */
const SCATTER = 137;

const COPY = {
  label: { en: "FY 2024-25 · EPF claims", hi: "वित्त वर्ष 2024-25 · EPF दावे" },
  filed: { en: "filed", hi: "भरे गए" },
  rejected: { en: "rejected", hi: "ख़ारिज" },
  each: {
    en: "One mark = 100,000 claims. Every terracotta mark is somebody who needed that money and did not get it.",
    hi: "एक निशान = 1,00,000 दावे। हर गेरुआ निशान कोई ऐसा व्यक्ति है जिसे वह पैसा चाहिए था और मिला नहीं।",
  },
} as const;

/** Canvas cannot read Tailwind tokens, so lift them off the element once. */
function token(el: Element, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

export function ScaleField() {
  const { t } = useLang();
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCanvas(canvasRef, (ctx, w, h, p: number) => {
    const cv = ctx.canvas;
    const pass = token(cv, "--color-line", "#e3e3e8");
    const fail = token(cv, "--color-blocked-500", "#b4532b");

    const cols = Math.max(24, Math.ceil(Math.sqrt(MARKS * (w / Math.max(h, 1)))));
    const rows = Math.ceil(MARKS / cols);
    const cell = Math.min(w / cols, h / rows);
    const size = Math.max(2, cell * 0.56);
    const ox = (w - cols * cell) / 2 + (cell - size) / 2;
    const oy = (h - rows * cell) / 2 + (cell - size) / 2;

    let shown = 0;
    const limit = Math.round(p * FAILED);

    for (let i = 0; i < MARKS; i++) {
      const bad = (i * SCATTER) % MARKS < FAILED;
      const lit = bad && shown++ < limit;
      ctx.fillStyle = lit ? fail : pass;
      ctx.globalAlpha = lit ? 1 : 0.85;
      ctx.beginPath();
      ctx.roundRect(
        ox + (i % cols) * cell,
        oy + Math.floor(i / cols) * cell,
        size,
        size,
        1,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, 0);

  const step = useSceneProgress(sceneRef, { steps: 58, onFrame: render });
  const counted = ((1.74 * step) / 58).toFixed(2);

  return (
    <div ref={sceneRef}>
      <p className="meta text-ink-faint">{t(COPY.label)}</p>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <p className="tnum display text-ink">
          7.96<span className="ml-2 text-xl text-ink-mute">{t(COPY.filed)}</span>
        </p>
        <p className="tnum display text-blocked-700">
          {counted}
          <span className="ml-2 text-xl text-blocked-700/80">
            {t(COPY.rejected)}
          </span>
        </p>
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={
          t(COPY.label) +
          " — 7.96 crore filed, 1.74 crore rejected, about one in five."
        }
        className="mt-6 h-[190px] w-full sm:h-[260px]"
      />

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-mute">
        {t(COPY.each)}
      </p>
    </div>
  );
}
