"use client";

import React, { forwardRef } from "react";

const steps = [
  "Submitted",
  "Verified",
  "Processing",
  "Resolved"
];

export const StoryProgressTracker = forwardRef<HTMLDivElement, { className?: string }>(
  ({ className = "" }, ref) => {
    return (
      <div ref={ref} className={`flex flex-col gap-6 ${className}`}>
        {steps.map((step, index) => (
          <div key={index} className="progress-step flex items-center gap-4 opacity-50">
            <div className="progress-dot relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-story-border bg-story-bg z-10 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full bg-story-muted transition-colors"></div>
            </div>
            {index !== steps.length - 1 && (
              <div className="progress-line absolute left-[15px] top-[32px] w-[2px] h-[48px] bg-story-border -z-0"></div>
            )}
            <span className="text-lg font-medium tracking-wide text-story-muted transition-colors">{step}</span>
          </div>
        ))}
      </div>
    );
  }
);

StoryProgressTracker.displayName = "StoryProgressTracker";
