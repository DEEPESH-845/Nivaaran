"use client";

import React, { forwardRef } from "react";

export const StoryNotification = forwardRef<HTMLDivElement, { className?: string }>(
  ({ className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-[rgba(255,255,255,0.85)] backdrop-blur-md text-ink rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden max-w-[320px] w-full border border-white/40 ${className}`}
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-white/60 border-b border-black/5">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-[10px]">
            N
          </div>
          <span className="text-xs font-semibold text-ink-mute uppercase tracking-widest">Nivaaran</span>
          <span className="text-xs text-ink-faint ml-auto">now</span>
        </div>
        <div className="px-4 py-3 pb-4">
          <h4 className="font-semibold text-sm mb-1">Your PF, made simpler.</h4>
          <p className="text-sm text-ink-soft">We found some mismatches in your record. Let&apos;s fix them before you apply.</p>
        </div>
      </div>
    );
  }
);

StoryNotification.displayName = "StoryNotification";
