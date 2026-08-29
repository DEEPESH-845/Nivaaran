import type { AuthFailure } from "./context";
import type { UiKey } from "@/lib/i18n/strings";

/**
 * API codes → bilingual UI keys.
 *
 * The server sends machine codes and an English fallback sentence; the client
 * decides the wording, so a Hindi reader never gets an English error. Anything
 * unrecognised lands on a safe generic message rather than being rendered raw.
 */

const KNOWN = new Set<string>([
  "bad_credentials",
  "rate_limited",
  "already_registered",
  "invalid_email",
  "too_short",
  "too_long",
  "too_simple",
  "looks_like_email",
  "network",
  "generic",
]);

function key(reason: string): UiKey {
  return (KNOWN.has(reason) ? `err_${reason}` : "err_generic") as UiKey;
}

/** The message that belongs above the form, if any. */
export function formMessage(failure: AuthFailure): UiKey | null {
  if (failure.code === "RATE_LIMITED") return "err_rate_limited";
  if (failure.fields?.form) return key(failure.fields.form);
  if (failure.code === "UNAUTHENTICATED") return "err_bad_credentials";
  if (failure.code === "INVALID_REQUEST" && !failure.fields) return "err_generic";
  if (failure.code === "INTERNAL_ERROR") return "err_generic";
  return null;
}

/** The message that belongs under one input, if any. */
export function fieldMessage(failure: AuthFailure | null, field: string): UiKey | null {
  const reason = failure?.fields?.[field];
  return reason ? key(reason) : null;
}
