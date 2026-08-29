import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Role } from "@/lib/auth/roles";
import type { Facts } from "@/lib/rules/types";

/**
 * The persistence layer.
 *
 * A JSON document held in memory and flushed to disk. Deliberately not a
 * database: the whole dataset is a handful of synthetic accounts and their
 * cases, and a Postgres dependency would buy nothing this build can use.
 *
 * What matters architecturally is not the storage engine — it is that every
 * read below is *scoped by owner*, so swapping this for a real database is a
 * change of one file. See the repository functions in lib/auth and lib/claims.
 *
 * ponytail: single JSON file, synchronous flush. Fine for a few KB of demo
 * data; move to a real store when concurrent writers or >1 instance appear.
 */

export type { Role };

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  /** scrypt$N$r$p$salt$hash — never leaves the server. */
  passwordHash: string;
  role: Role;
  /** Seeded account backed entirely by synthetic data. */
  demo: boolean;
  createdAt: string;
  lang: "en" | "hi";
}

export interface SessionRecord {
  /** sha256 of the token the browser holds. The token itself is never stored. */
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  /** Coarse, non-identifying. Enough to show "signed in on a phone". */
  agent: string;
}

/** The lifecycle of one citizen's claim. Impossible states are unrepresentable. */
export type ClaimState =
  | "draft"
  | "preflight_required"
  | "blocked"
  | "ready"
  | "submitted"
  | "verification"
  | "approved"
  | "payment_released";

export interface CaseRecord {
  userId: string;
  personaId?: string;
  facts?: Facts;
  /** Facts as first loaded, so a before/after comparison stays honest. */
  original?: Facts;
  resolved: string[];
  /** When the deterministic check was last run against these facts. */
  preflightAt?: string;
  claim?: {
    ref: string;
    filedAt: string;
    amount: number;
    state: ClaimState;
    /** Stage index into the simulated status timeline. */
    stage: number;
  };
  startedAt?: string;
  updatedAt: string;
}

export interface ActivityEntry {
  at: string;
  kind:
    | "signed_up"
    | "signed_in"
    | "case_started"
    | "preflight_run"
    | "fix_marked"
    | "document_compared"
    | "claim_filed"
    | "status_advanced"
    | "demo_reset";
  /** Bilingual detail is resolved at render time from `kind` + these values. */
  detail?: string;
}

interface Db {
  users: Record<string, UserRecord>;
  sessions: Record<string, SessionRecord>;
  cases: Record<string, CaseRecord>;
  activity: Record<string, ActivityEntry[]>;
}

const EMPTY: Db = { users: {}, sessions: {}, cases: {}, activity: {} };

function dataFile(): string {
  const dir =
    process.env.NIVAARAN_DATA_DIR ??
    (process.env.VERCEL ? "/tmp/nivaaran" : path.join(process.cwd(), ".data"));
  return path.join(dir, "nivaaran.json");
}

function load(): Db {
  try {
    const raw = fs.readFileSync(dataFile(), "utf8");
    return { ...EMPTY, ...(JSON.parse(raw) as Db) };
  } catch {
    return structuredClone(EMPTY);
  }
}

/**
 * Module state does not survive a hot reload in dev, and losing every session
 * on save makes the auth flow untestable. The singleton hangs off globalThis.
 */
const g = globalThis as unknown as { __nivaaran_db?: Db; __nivaaran_writable?: boolean };
g.__nivaaran_db ??= load();

export const db: Db = g.__nivaaran_db;

/** Flush to disk. A read-only filesystem degrades to memory, it never throws. */
export function flush(): void {
  if (g.__nivaaran_writable === false) return;
  try {
    const file = dataFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(db, null, 2), "utf8");
    g.__nivaaran_writable = true;
  } catch {
    // Read-only or full. The app stays correct for the life of the instance;
    // it simply will not survive a restart. Never a user-visible failure.
    g.__nivaaran_writable = false;
  }
}

/** Purge expired sessions. Called opportunistically, not on a timer. */
export function sweepSessions(now = Date.now()): void {
  let dirty = false;
  for (const [k, s] of Object.entries(db.sessions)) {
    if (Date.parse(s.expiresAt) <= now) {
      delete db.sessions[k];
      dirty = true;
    }
  }
  if (dirty) flush();
}

export function logActivity(userId: string, kind: ActivityEntry["kind"], detail?: string): void {
  const list = (db.activity[userId] ??= []);
  list.unshift({ at: new Date().toISOString(), kind, detail });
  // A citizen's own activity feed, not an audit log. Twenty is plenty.
  if (list.length > 20) list.length = 20;
  flush();
}
