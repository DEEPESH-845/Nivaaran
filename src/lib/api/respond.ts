import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

/**
 * One error shape for the whole API.
 *
 * Callers get a stable machine code, a sentence a person can read, and a
 * request id they can quote. They never get a stack trace, a provider
 * message, a database error or an internal path — the mapping below is the
 * only route from an internal failure to a response body.
 */

export type AppErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "AI_UNAVAILABLE"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

const STATUS: Record<AppErrorCode, number> = {
  INVALID_REQUEST: 422,
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  AI_UNAVAILABLE: 503,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

/** Safe by default. A code with no entry here can never leak internals. */
const MESSAGE: Record<AppErrorCode, string> = {
  INVALID_REQUEST: "The request could not be processed. Check the highlighted fields and try again.",
  UNAUTHENTICATED: "Sign in to continue.",
  UNAUTHORIZED: "This account does not have access to that.",
  NOT_FOUND: "That does not exist, or is not yours.",
  CONFLICT: "That conflicts with something that already exists.",
  RATE_LIMITED: "Too many attempts. Wait a minute and try again.",
  PAYLOAD_TOO_LARGE: "That file is too large.",
  AI_UNAVAILABLE: "The reading service is unavailable. Every deterministic check still works.",
  SERVICE_UNAVAILABLE: "Temporarily unavailable. Nothing has been submitted.",
  INTERNAL_ERROR: "Nivaaran hit an unexpected problem. Nothing has been submitted.",
};

export interface ApiErrorBody {
  error: { code: AppErrorCode; message: string; requestId: string; fields?: Record<string, string> };
}

export function fail(
  code: AppErrorCode,
  opts: { message?: string; fields?: Record<string, string>; status?: number } = {},
): NextResponse<ApiErrorBody> {
  const requestId = randomUUID();
  return NextResponse.json(
    {
      error: {
        code,
        message: opts.message ?? MESSAGE[code],
        requestId,
        ...(opts.fields ? { fields: opts.fields } : {}),
      },
    },
    { status: opts.status ?? STATUS[code], headers: { "cache-control": "no-store" } },
  );
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, {
    ...init,
    headers: { "cache-control": "no-store", ...(init?.headers ?? {}) },
  });
}

/**
 * Read a JSON body with a hard ceiling.
 *
 * `request.json()` on an unauthenticated endpoint will happily buffer whatever
 * it is handed. Declared length is checked first, then the actual bytes,
 * because Content-Length is client-controlled.
 */
export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<unknown | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return null;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Cross-site request forgery.
 *
 * The session cookie is SameSite=Lax, which already blocks cross-site POSTs
 * from a form or fetch. This is the belt to that pair of braces: a
 * state-changing request must originate from us. Missing Origin (a same-origin
 * server-side call, or an older client) is allowed; a *wrong* Origin is not.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
