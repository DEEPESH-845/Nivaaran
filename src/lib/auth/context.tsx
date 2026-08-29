"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { Role } from "@/lib/auth/roles";
import { createStore } from "@/lib/state/store";

/**
 * Who is signed in, on the client.
 *
 * This is presentation state and nothing more. It decides which links render
 * and which greeting shows; it never decides what data is returned. Every
 * answer here originates from a server response, and every protected read is
 * re-checked on the server regardless of what this context believes.
 */

export interface ClientUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  demo: boolean;
  lang: "en" | "hi";
}

/** Machine codes the API returns; the UI maps them to bilingual sentences. */
export type AuthFieldError = string;

export interface AuthFailure {
  code: string;
  fields?: Record<string, AuthFieldError>;
  retryAfter?: number;
}

interface AuthValue {
  user: ClientUser | null;
  /** False until the first /api/auth/me settles, so nothing flashes. */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<AuthFailure | null>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    role: "citizen" | "employer";
  }) => Promise<AuthFailure | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

async function post(path: string, body?: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function toFailure(res: Response): Promise<AuthFailure> {
  try {
    const data = (await res.json()) as { error?: { code?: string; fields?: Record<string, string> } };
    return {
      code: data.error?.code ?? "INTERNAL_ERROR",
      fields: data.error?.fields,
      retryAfter: Number(res.headers.get("retry-after")) || undefined,
    };
  } catch {
    return { code: "INTERNAL_ERROR" };
  }
}

/**
 * The signed-in user is external state, owned by a cookie the client cannot
 * read. Holding it in an external store rather than component state means the
 * fetch below is a subscription to that system, not a render that schedules
 * another render on every page of the journey.
 */
interface AuthSnapshot {
  user: ClientUser | null;
  ready: boolean;
}

const EMPTY: AuthSnapshot = { user: null, ready: false };
const authStore = createStore<AuthSnapshot>(() => EMPTY, EMPTY);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSyncExternalStore(
    authStore.subscribe,
    authStore.get,
    authStore.server,
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as { user: ClientUser | null };
      authStore.set({ user: data.user ?? null, ready: true });
    } catch {
      // Offline. The signed-out view is the honest fallback: it never claims
      // access the server has not confirmed.
      authStore.set({ user: null, ready: true });
    }
  }, []);

  // Legitimate effect: synchronising with an external system, once.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      refresh,
      signIn: async (email, password) => {
        const res = await post("/api/auth/login", { email, password });
        if (!res.ok) return toFailure(res);
        const data = (await res.json()) as { user: ClientUser };
        authStore.set({ user: data.user, ready: true });
        return null;
      },
      signUp: async (input) => {
        const res = await post("/api/auth/signup", input);
        if (!res.ok) return toFailure(res);
        const data = (await res.json()) as { user: ClientUser };
        authStore.set({ user: data.user, ready: true });
        return null;
      },
      signOut: async () => {
        await post("/api/auth/logout").catch(() => null);
        authStore.set({ user: null, ready: true });
      },
    }),
    [user, ready, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
