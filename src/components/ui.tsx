"use client";

import clsx from "clsx";
import Link from "next/link";
import { forwardRef } from "react";

/* ---------------------------------------------------------------- Button */

type ButtonTone = "primary" | "secondary" | "ghost" | "quiet";
type ButtonSize = "md" | "lg";

const TONE: Record<ButtonTone, string> = {
  primary:
    "bg-indigo-600 text-paper hover:bg-indigo-700 active:bg-indigo-900 shadow-[0_1px_2px_rgba(30,30,60,0.12)]",
  secondary:
    "bg-paper-raised text-ink border border-line-strong hover:border-ink-mute hover:bg-paper-sunk",
  ghost: "bg-transparent text-indigo-600 hover:bg-indigo-50",
  quiet: "bg-paper-sunk text-ink-soft hover:bg-line-soft",
};

const SIZE: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-base",
  lg: "min-h-13 px-6 text-md",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-ctl font-medium transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none select-none";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: ButtonTone;
    size?: ButtonSize;
    full?: boolean;
  }
>(function Button(
  { tone = "primary", size = "md", full, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(base, TONE[tone], SIZE[size], full && "w-full", className)}
      {...rest}
    />
  );
});

export function ButtonLink({
  href,
  tone = "primary",
  size = "md",
  full,
  className,
  children,
  ...rest
}: React.ComponentProps<typeof Link> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  full?: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(base, TONE[tone], SIZE[size], full && "w-full", className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ Card */

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-card border border-line bg-paper-raised",
        "shadow-[0_1px_2px_rgba(30,30,60,0.05)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- Badge */

export type Tone = "neutral" | "indigo" | "blocked" | "caution" | "clear";

const BADGE: Record<Tone, string> = {
  neutral: "bg-paper-sunk text-ink-soft border-line",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  blocked: "bg-blocked-50 text-blocked-700 border-blocked-100",
  caution: "bg-caution-50 text-caution-700 border-caution-100",
  clear: "bg-clear-50 text-clear-700 border-clear-100",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-2xs font-semibold uppercase tracking-[0.055em]",
        BADGE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- Callout */

const CALLOUT: Record<Tone, string> = {
  neutral: "border-line bg-paper-sunk",
  indigo: "border-indigo-100 bg-indigo-50",
  blocked: "border-blocked-100 bg-blocked-50",
  caution: "border-caution-100 bg-caution-50",
  clear: "border-clear-100 bg-clear-50",
};

export function Callout({
  tone = "neutral",
  icon,
  title,
  children,
  className,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex gap-3 rounded-card border p-4",
        CALLOUT[tone],
        className,
      )}
    >
      {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold text-ink">{title}</p> : null}
        {children ? (
          <div className="text-sm leading-relaxed text-ink-soft">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Choice */

/**
 * A single answer option. Deliberately large: the primary user is on a phone,
 * possibly one-handed, possibly in a hurry.
 */
export function Choice({
  selected,
  label,
  hint,
  onClick,
  id,
}: {
  selected?: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        "group flex w-full items-center gap-3 rounded-card border px-4 py-3.5 text-left",
        "min-h-14 transition-all duration-150",
        selected
          ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400"
          : "border-line-strong bg-paper-raised hover:border-ink-mute hover:bg-paper-sunk",
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
          selected ? "border-indigo-600 bg-indigo-600" : "border-line-strong",
        )}
      >
        {selected ? <span className="size-1.5 rounded-full bg-paper" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-ink">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-sm text-ink-mute">{hint}</span>
        ) : null}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------ Disclosure */

export function Disclosure({
  summary,
  children,
  className,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={clsx("group", className)}>
      <summary
        className={clsx(
          "flex cursor-pointer list-none items-center gap-1.5 rounded-ctl py-2",
          "text-sm font-medium text-indigo-600 hover:text-indigo-700",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className="size-3 shrink-0 transition-transform duration-200 group-open:rotate-90"
        >
          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {summary}
      </summary>
      <div className="pb-1 pt-1 text-sm leading-relaxed text-ink-soft">
        {children}
      </div>
    </details>
  );
}

/* -------------------------------------------------------------- Sections */

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-2xs font-semibold uppercase tracking-[0.11em] text-ink-mute">
      {children}
    </p>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={clsx("border-0 border-t border-line", className)} />;
}
