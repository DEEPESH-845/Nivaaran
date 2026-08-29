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

/* ---------------------------------------------------------- ActionFooter */

/**
 * An action and the sentence that explains it.
 *
 * The naive spelling of this row — `flex flex-wrap` with the text as
 * `flex-1` — is a trap. `flex-1` is `flex-basis: 0`, so the paragraph never
 * counts towards the line's width and `flex-wrap` never fires: instead of
 * moving under the button it shrinks in place, and with `min-w-0` it will
 * shrink past its longest word into a one-character-per-line strip. Measured
 * at 412px it collapsed to 13px wide and 169px tall.
 *
 * The basis is what fixes it. The text asks for 16rem, so the flex line
 * breaks when 16rem will not fit beside the action, and the text takes the
 * next row whole. Below `sm` the action goes full-width and the two always
 * stack. The caller owns the typography inside; this owns only the geometry.
 */
export function ActionFooter({
  action,
  children,
  className,
}: {
  action: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-wrap items-center gap-x-4 gap-y-3", className)}>
      <div className="w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">{action}</div>
      <div className="min-w-0 flex-1 basis-64">{children}</div>
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
          "flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-ctl py-2",
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

/* ----------------------------------------------------------------- Field */

/**
 * A labelled input.
 *
 * The label is a real `<label>`, never a placeholder: placeholder-as-label
 * disappears the moment someone starts typing, which is exactly when a person
 * filling a government-adjacent form needs to re-read it. The error is wired
 * through `aria-describedby` and `aria-invalid` so it is announced, not just
 * coloured.
 */
export const Field = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    hint?: string;
    error?: string;
    trailing?: React.ReactNode;
  }
>(function Field({ label, hint, error, trailing, id, className, ...rest }, ref) {
  const inputId = id ?? rest.name ?? label.replace(/\s+/g, "-").toLowerCase();
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          className={clsx(
            "min-h-12 w-full rounded-ctl border bg-paper-raised px-3.5 text-md text-ink",
            "transition-colors duration-150 placeholder:text-ink-faint",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            error ? "border-blocked-500" : "border-line-strong hover:border-ink-mute",
            trailing && "pr-13",
            className,
          )}
          {...rest}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-ink-mute">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm leading-relaxed text-blocked-700">
          {error}
        </p>
      ) : null}
    </div>
  );
});

/* ----------------------------------------------------------------- Alert */

/**
 * A form-level message. `role="alert"` so a screen reader hears a failed
 * sign-in without having to go looking for it.
 */
export function Alert({ tone = "blocked", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={clsx("rounded-card border p-3.5 text-sm leading-relaxed", CALLOUT[tone], "text-ink")}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------- Skeleton */

/** Shaped like the content it replaces, so nothing jumps when it arrives. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx("animate-pulse rounded bg-line-soft motion-reduce:animate-none", className)}
    />
  );
}

/* ------------------------------------------------------------ EmptyState */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-paper-sunk/40 p-6 text-center">
      {icon ? <div className="mx-auto mb-3 w-fit text-ink-faint">{icon}</div> : null}
      <p className="font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------- Spinner */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={clsx("size-4 animate-spin motion-reduce:animate-none", className)}
    >
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
