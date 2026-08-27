"use client";

import React, { forwardRef } from "react";
import { CheckCircle2 } from "lucide-react";

const items = [
  "UAN Details",
  "KYC Documents",
  "Bank Accounts",
  "Employment Records",
];

export const StoryVerificationUI = forwardRef<HTMLDivElement, { className?: string }>(
  ({ className = "" }, ref) => {
    return (
      <div ref={ref} className={`bg-paper border border-line rounded-ctl p-6 shadow-xl max-w-sm w-full ${className}`}>
        <h3 className="font-semibold text-lg text-ink mb-4">Your details</h3>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="verification-item flex items-center gap-3 opacity-0 translate-y-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 verification-check scale-50 opacity-0" />
              <span className="text-ink-soft text-sm font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

StoryVerificationUI.displayName = "StoryVerificationUI";
