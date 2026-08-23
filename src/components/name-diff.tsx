"use client";

import clsx from "clsx";
import type { NameVerdict, TokenState } from "@/lib/match/name";

const TOKEN: Record<TokenState, string> = {
  same: "text-ink",
  differs: "bg-blocked-100 text-blocked-700 ring-1 ring-blocked-200",
  initial: "bg-blocked-100 text-blocked-700 ring-1 ring-blocked-200",
  missing: "bg-blocked-50 text-blocked-500 border border-dashed border-blocked-200 line-through",
  extra: "bg-caution-100 text-caution-700 ring-1 ring-caution-200",
};

function Row({
  label,
  tokens,
}: {
  label: string;
  tokens: { text: string; state: TokenState }[];
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 sm:grid-cols-[7.5rem_1fr]">
      <span className="col-span-2 text-2xs font-semibold uppercase tracking-[0.09em] text-ink-mute sm:col-span-1">
        {label}
      </span>
      <span className="col-span-2 flex flex-wrap items-center gap-1.5 sm:col-span-1">
        {tokens.map((tk, i) => (
          <span
            key={`${tk.text}-${i}`}
            className={clsx(
              "rounded px-1.5 py-0.5 font-mono text-sm tracking-tight",
              TOKEN[tk.state],
            )}
          >
            {tk.text}
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * Shows the citizen exactly which token broke the match.
 *
 * The portal says "Name not as per records". This says which word, in which
 * record — which is the entire difference between a dead end and a fix.
 */
export function NameDiff({
  verdict,
  leftLabel,
  rightLabel,
  className,
}: {
  verdict: NameVerdict;
  leftLabel: string;
  rightLabel: string;
  className?: string;
}) {
  return (
    <div
      className={clsx("space-y-3 rounded-card bg-paper-sunk p-3.5 sm:p-4", className)}
      role="group"
      aria-label={`${leftLabel} compared with ${rightLabel}`}
    >
      <Row label={leftLabel} tokens={verdict.left} />
      <div className="h-px bg-line" />
      <Row label={rightLabel} tokens={verdict.right} />
    </div>
  );
}

export function ValueDiff({
  leftLabel,
  rightLabel,
  left,
  right,
  match,
  className,
}: {
  leftLabel: string;
  rightLabel: string;
  left: string;
  right: string;
  match?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-card bg-paper-sunk p-3.5 sm:p-4", className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: leftLabel, value: left },
          { label: rightLabel, value: right },
        ].map((cell) => (
          <div key={cell.label} className="space-y-1">
            <p className="text-2xs font-semibold uppercase tracking-[0.09em] text-ink-mute">
              {cell.label}
            </p>
            <p
              className={clsx(
                "tnum inline-block rounded px-1.5 py-0.5 font-mono text-sm",
                match
                  ? "text-ink"
                  : "bg-blocked-100 text-blocked-700 ring-1 ring-blocked-200",
              )}
            >
              {cell.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
