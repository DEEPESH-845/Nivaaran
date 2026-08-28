"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The end of the story hands the reader back to the landing page — the story
 * is the pitch, the landing page is the product.
 */
export function StoryCTA({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex w-full max-w-2xl flex-col items-center text-center ${className}`}
    >
      <h2 className="font-display text-balance text-[clamp(1.875rem,8vw,3.75rem)] leading-[1.05] tracking-[-0.02em] text-paper">
        Ready to make PF simpler?
      </h2>
      <p className="mt-4 max-w-md text-balance text-md leading-relaxed text-white/70">
        Arjun&rsquo;s record was checked before he filed. Yours can be too — it
        takes about ten minutes.
      </p>

      <div className="mt-9 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
        <Link
          href="/"
          className="group inline-flex min-h-13 items-center justify-center gap-2.5 rounded-full bg-white px-7 text-md font-medium text-black transition-[background-color,transform] duration-200 hover:bg-white/85 active:scale-[0.98]"
        >
          Experience Nivaaran
          <ArrowRight
            aria-hidden
            className="size-5 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={1.8}
          />
        </Link>
        <Link
          href="/#start"
          className="inline-flex min-h-13 items-center justify-center rounded-full border border-white/25 px-7 text-md font-medium text-white transition-colors duration-200 hover:border-white/50 hover:bg-white/5"
        >
          Check a claim
        </Link>
      </div>
    </div>
  );
}
