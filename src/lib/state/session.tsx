"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth/context";
import { applyFix } from "@/lib/rules/apply";
import type { ClaimState } from "@/lib/claims/state";
import type { Facts } from "@/lib/rules/types";
import { createStore, hydratedStore } from "./store";

/**
 * The citizen's case, on the client.
 *
 * Two modes, one interface:
 *
 *   Anonymous — the whole journey works with no account, which is a product
 *   claim ("no login, no OTP") and not an accident. State lives in this
 *   browser and nowhere else.
 *
 *   Signed in — the same state is mirrored to the server, scoped to the
 *   session cookie's owner, so it survives a new device. The local copy stays
 *   as the render source so the deterministic engine never waits on a network
 *   round trip; the server is the durable record, not the critical path.
 *
 * Signing in mid-journey adopts the anonymous case rather than discarding it.
 */

const KEY = "nivaaran.session.v1";

export interface ActivityEntry {
  at: string;
  kind: string;
  detail?: string;
}

export interface SessionState {
  personaId?: string;
  facts?: Facts;
  /** Rule ids the citizen has marked as fixed. */
  resolved: string[];
  /** Original facts, kept so a before/after comparison stays honest. */
  original?: Facts;
  /** When the deterministic check was last run. Drives the dashboard state. */
  preflightAt?: string;
  claim?: { ref: string; filedAt: string; amount: number; state: ClaimState; stage: number };
  startedAt?: string;
  /**
   * The current records were filled by reading a document rather than typed.
   * Screens downstream of /documents say so, because a value that appears in a
   * field nobody typed into needs to explain itself. Any later edit clears it,
   * which is why it is set from the same `from` the activity feed already uses.
   */
  filledFromDocument?: boolean;
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
const activityStore = createStore<ActivityEntry[]>(() => [], []);

type Action =
  | { action: "start"; personaId?: string; facts: Facts }
  | { action: "facts"; facts: Facts; from?: "documents" }
  | { action: "preflight" }
  | { action: "fix"; ruleId: string }
  | { action: "file"; amount: number }
  | { action: "advance" }
  | { action: "reset" };

interface SessionValue {
  session: SessionState;
  /** False until React has hydrated, so we never redirect on a stale snapshot. */
  ready: boolean;
  activity: ActivityEntry[];
  begin: (personaId: string, facts: Facts) => void;
  /** `from` records *why* the facts changed, for the activity feed. */
  setFacts: (facts: Facts, from?: "documents") => void;
  markPreflightRun: () => void;
  markFixed: (ruleId: string) => void;
  fileClaim: (amount: number) => string;
  advanceStatus: () => void;
  reset: () => void;
}

const Ctx = createContext<SessionValue | null>(null);

function commit(next: SessionState) {
  persist(next);
  store.set(next);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(store.subscribe, store.get, store.server);
  const activity = useSyncExternalStore(activityStore.subscribe, activityStore.get, activityStore.server);
  const ready = useSyncExternalStore(
    hydratedStore.subscribe,
    hydratedStore.get,
    hydratedStore.server,
  );
  const { user, ready: authReady } = useAuth();

  // A ref, not state: this only ever guards the fetch below, and putting it in
  // state would re-render every page of the journey twice on sign-in.
  const syncedFor = useRef<string | null>(null);

  /**
   * Legitimate effect: synchronising with an external system. It runs once per
   * signed-in user and adopts whichever side actually has a case.
   */
  useEffect(() => {
    if (!authReady || !ready) return;

    if (!user) {
      syncedFor.current = null;
      activityStore.set([]);
      return;
    }
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/case", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          case: (SessionState & { userId: string }) | null;
          activity: ActivityEntry[];
        };
        if (cancelled) return;

        if (data.case?.facts) {
          const { ...rest } = data.case;
          commit({ ...EMPTY, ...rest });
          activityStore.set(data.activity ?? []);
        } else if (store.get().facts) {
          // Anonymous progress, now signed in. Carry it up rather than lose it.
          const local = store.get();
          await send({ action: "start", personaId: local.personaId, facts: local.facts! });
          if (local.preflightAt) await send({ action: "preflight" });
          for (const ruleId of local.resolved) await send({ action: "fix", ruleId });
        } else {
          activityStore.set(data.activity ?? []);
        }
      } catch {
        // Offline: the local copy is still complete and the journey continues.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, ready, user]);

  const signedIn = Boolean(user);

  const value = useMemo<SessionValue>(() => {
    /** Mirror a mutation server-side. Failure is never user-visible. */
    const mirror = (a: Action) => {
      if (signedIn) void send(a);
    };

    return {
      session,
      ready,
      activity,
      begin: (personaId, facts) => {
        commit({
          personaId,
          facts,
          original: structuredClone(facts),
          resolved: [],
          startedAt: new Date().toISOString(),
        });
        mirror({ action: "start", personaId, facts });
      },
      setFacts: (facts, from) => {
        commit({ ...session, facts, filledFromDocument: from === "documents" || undefined });
        mirror({ action: "facts", facts, from });
      },
      markPreflightRun: () => {
        if (session.preflightAt || !session.facts) return;
        commit({ ...session, preflightAt: new Date().toISOString() });
        mirror({ action: "preflight" });
      },
      markFixed: (ruleId) => {
        if (!session.facts || session.resolved.includes(ruleId)) return;
        commit({
          ...session,
          facts: applyFix(session.facts, ruleId),
          resolved: [...session.resolved, ruleId],
        });
        mirror({ action: "fix", ruleId });
      },
      fileClaim: (amount) => {
        if (session.claim) return session.claim.ref;
        const ref = `PKA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        commit({
          ...session,
          claim: { ref, filedAt: new Date().toISOString(), amount, state: "submitted", stage: 0 },
        });
        // The server mints its own reference and is the record of truth for a
        // signed-in claim; the local one keeps the page responsive meanwhile.
        if (signedIn) {
          void send({ action: "file", amount }).then((c) => {
            if (c?.claim) commit({ ...store.get(), claim: c.claim });
          });
        }
        return ref;
      },
      advanceStatus: () => {
        if (!session.claim) return;
        const stage = Math.min(session.claim.stage + 1, 4);
        commit({ ...session, claim: { ...session.claim, stage } });
        mirror({ action: "advance" });
      },
      reset: () => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* non-fatal */
        }
        store.set(EMPTY);
        activityStore.set([]);
        mirror({ action: "reset" });
      },
    };
  }, [session, ready, activity, signedIn]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

async function send(body: Action): Promise<SessionState | null> {
  try {
    const res = await fetch("/api/case", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { case: SessionState | null; activity: ActivityEntry[] };
    activityStore.set(data.activity ?? []);
    return data.case;
  } catch {
    return null;
  }
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside SessionProvider");
  return v;
}
