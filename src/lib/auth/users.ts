import "server-only";
import { randomUUID } from "node:crypto";
import type { Role } from "@/lib/auth/roles";
import { db, flush, logActivity, type UserRecord } from "@/lib/db/store";
import { hashPassword, normaliseEmail } from "./password";

/** The user repository. Every lookup here; no route reaches into `db.users`. */

export function userByEmail(email: string): UserRecord | undefined {
  const key = normaliseEmail(email);
  return Object.values(db.users).find((u) => u.email === key);
}

export function userById(id: string): UserRecord | undefined {
  return db.users[id];
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role?: Role;
  demo?: boolean;
  lang?: "en" | "hi";
}): Promise<UserRecord> {
  const user: UserRecord = {
    id: randomUUID(),
    email: normaliseEmail(input.email),
    name: input.name.trim().slice(0, 80),
    passwordHash: await hashPassword(input.password),
    role: input.role ?? "citizen",
    demo: input.demo ?? false,
    createdAt: new Date().toISOString(),
    lang: input.lang ?? "en",
  };
  db.users[user.id] = user;
  flush();
  logActivity(user.id, "signed_up");
  return user;
}

export function updateUser(id: string, patch: Partial<Pick<UserRecord, "name" | "lang">>): void {
  const user = db.users[id];
  if (!user) return;
  if (patch.name !== undefined) user.name = patch.name.trim().slice(0, 80);
  if (patch.lang !== undefined) user.lang = patch.lang;
  flush();
}
