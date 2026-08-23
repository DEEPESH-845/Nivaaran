"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { applyFix } from "@/lib/rules/apply";
import type { Facts } from "@/lib/rules/types";
import { createStore, hydratedStore } from "./store";

const KEY = "nivaaran.session.v1";

export interface SessionState {
  personaId?: string;
  facts?: Facts;
  /** Rule ids the citizen has marked as fixed. */
  resolved: string[];
  /** Original facts, kept so a before/after comparison stays honest. */
  original?: Facts;
  claim?: { ref: string; filedAt: string; amount: number };
  startedAt?: string;
}

const EMPTY: SessionState = { resolved: [] };

function read(): SessionState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as SessionState) };
  } catch {
    return EMPTY;
  }
}

function persist(s: SessionState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode or a full quota — the journey still works, just not resumable */
  }
}

const store = createStore<SessionState>(read, EMPTY);

interface SessionValue {
  session: SessionState;
  /** False until React has hydrated, so we never redirect on a stale snapshot. */
  ready: boolean;
  begin: (personaId: string, facts: Facts) => void;
  setFacts: (facts: Facts) => void;
  markFixed: (ruleId: string) => void;
  fileClaim: (amount: number) => string;
  reset: () => void;
}

const Ctx = createContext<SessionValue | null>(null);

function commit(next: SessionState) {
  persist(next);
  store.set(next);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(store.subscribe, store.get, store.server);
  const ready = useSyncExternalStore(
    hydratedStore.subscribe,
    hydratedStore.get,
    hydratedStore.server,
  );

  const value = useMemo<SessionValue>(
    () => ({
      session,
      ready,
      begin: (personaId, facts) =>
        commit({
          personaId,
          facts,
          original: structuredClone(facts),
          resolved: [],
          startedAt: new Date().toISOString(),
        }),
      setFacts: (facts) => commit({ ...session, facts }),
      markFixed: (ruleId) => {
        if (!session.facts || session.resolved.includes(ruleId)) return;
        commit({
          ...session,
          facts: applyFix(session.facts, ruleId),
          resolved: [...session.resolved, ruleId],
        });
      },
      fileClaim: (amount) => {
        const ref = `PKA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        commit({ ...session, claim: { ref, filedAt: new Date().toISOString(), amount } });
        return ref;
      },
      reset: () => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* non-fatal */
        }
        store.set(EMPTY);
      },
    }),
    [session, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside SessionProvider");
  return v;
}
