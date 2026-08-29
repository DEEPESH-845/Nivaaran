<div align="center">

# Nivaaran · निवारण

### Know your PF claim will go through — before you file it.

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

*Built for [Build What Moves India](https://buildwhatmovesindia.com/).*  
*An independent hackathon prototype. Not affiliated with EPFO or the Government of India.*

---

[**Live Demo**](https://nivaaran-pi.vercel.app) · [**Demo Script**](docs/DEMO.md) · [**Explore Architecture**](docs/ARCHITECTURE.md)

</div>

---

## The Problem

Last year, Indians filed **7.96 crore** EPF claims. **1.74 crore were rejected** — about one in five.

> [!WARNING]
> Almost none of those failed because a form was ugly. They failed on a mismatch inside the citizen's own record that nobody ever showed them: a name spelled differently across Aadhaar and EPFO, a swapped day and month in a date of birth, an IFSC that died when the bank merged, an exit date the employer never filed.

Here is the part that makes it a product rather than a complaint:

**EPFO has already solved speed.** Auto-settlement clears claims up to ₹5 lakh in about three days with no human reviewer. But it only fires on a perfect record. The faster the machine got, the more mercilessly it rejects.

The citizen finds out on day twenty, in five words, with no fix path:

```
Claim rejected: Name not as per records.
```

Which name? Which record? The portal does not say.

---

## The Solution

> [!NOTE]
> **Government portals validate you *after* you apply. Nivaaran validates you *before*.**

You say what you need in your own words. Five plain questions, no login, no OTP. Then Nivaaran runs every check EPFO will run and tells you exactly what will fail, **whose job it is to fix**, how long it takes, and where the rule comes from.

| Source | First Name | Middle Name | Last Name |
| :--- | :--- | :--- | :--- |
| **EPFO record** | RAJESH | K | SHARMA |
| **Your Aadhaar** | RAJESH | KUMAR | SHARMA |

*One initial. Twenty days to discover it. About ten minutes to fix — if somebody tells you.*

And somebody can, because **the fix already exists and is free**: EPFO's circular of 16 January 2025 lets Aadhaar-verified members self-correct their name, date of birth and exit date online — no documents, no employer, no EPFO approval. Almost nobody knows the rule exists, or that it is the only thing standing between them and their money.

---

## Run it in two minutes

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

No environment variables are required. Without an `OPENAI_API_KEY` every AI
feature degrades to its deterministic path and the whole journey still
completes — there is a Playwright test that aborts every AI request and proves
it.

### Demo login

Three seeded accounts, one password. Every record behind them is invented.

| Email | Password | What it opens |
|---|---|---|
| `demo@nivaaran.app` | `NivaaranDemo2026!` | **Citizen.** Four blockers in the record — the main journey. |
| `employer@nivaaran.app` | `NivaaranDemo2026!` | **Employer.** Nine leavers, sorted by who is blocked on whom. |
| `admin@nivaaran.app` | `NivaaranDemo2026!` | **Rule governance.** Every rule, its source, and how fresh that source is. |

They are also printed on **[/login](http://localhost:3000/login)** with a
one-tap *Fill this in* button, so nothing has to be typed. They are created by
a seed on first sign-in ([`src/lib/auth/seed.ts`](src/lib/auth/seed.ts)) and
hashed through the same scrypt path as any other account — a demo account with
a special-cased login would be a demo account with a bypass.

### You do not need an account

The entire citizen journey runs signed out: pick a situation on the landing
page and go. That is a product claim, not an oversight — *no login, no OTP* is
half the point. An account adds three things: your check is saved, it follows
you to another device, and you get a dashboard that remembers whose job each
remaining problem is.

Sign in mid-journey and the anonymous case is adopted rather than discarded.

### The two-minute demo

1. **`/`** — the record that fails a claim, one initial out of place.
2. **Sign in** as `demo@nivaaran.app` → **`/dashboard`**: *2 things need attention*, each with an owner, a duration and a source.
3. **Run the check** → four blockers, each with evidence, a fix, and where the rule came from.
4. **Mark the name correction done** → the engine re-runs live, four becomes two, because the bank-name check was measuring the same wrong value.
5. **Switch to `employer@nivaaran.app`** → the same engine, read from the other side: who is waiting, on whom, for how long.
6. **Type `/governance` as the citizen** → `403`. The boundary is server-side, not a hidden menu item.

Every screen has a *Reset demo data* control, so there is no path a judge can
get stuck in.

---

## How It Works

> [!IMPORTANT]
> **The core is not AI. It is a deterministic rule engine.**

```ts
// pure. no network, no model, no I/O.
preflight(facts: Facts): PreflightResult
```

Nine rules. Each one carries, as data, the government source it came from, the date we last checked it, and how confident we are — all of it visible in the product, one tap from any finding. Each finding names its **owner**: you, your employer, EPFO, or time. Employer-owned work sorts first, because it has the longest queue.

Mark a fix done and the engine re-runs live. For the demo record, one ten-minute name correction takes it from **4 blockers to 2** — because the bank-name check was measuring against the same wrong value.

### Where AI Earns Its Place

AI never decides eligibility. It does three things determinism cannot:

1. **Document reading and reconciliation:** Photograph an identity document and a passbook at **[/documents](https://nivaaran-pi.vercel.app/documents)** and it reads the four fields the check compares. It says **compare**, not *verify*. We cannot authenticate a government document.
2. **Rejection decoding:** Documented EPFO phrasings are matched by pattern. Only wording the patterns do not recognise reaches a model, and the model can only choose from a **closed list of nine rule ids**.
3. **Plain language:** Any explanation can be rewritten into the simplest possible wording, in English or Hindi, on demand.

> [!TIP]
> All three degrade to the deterministic path. **A Playwright test aborts every AI request and asserts the journey still completes.**

---

## Why It Matters

Because the engine is a pure function, it is also a public API — deliberately shaped as something that could run where the damage is actually done:

| Where the check could run | What it catches | Whose deployment |
|---|---|---|
| **Member portal** *(before Submit)* | Every citizen-fixable mismatch | EPFO |
| **Employer's HRMS** *(at exit)* | The missing exit date — **at source** | Employer / Payroll vendor |
| **UAN generation** | Name & DOB divergence on day one | EPFO with the employer |

We are not proposing to replace EPFO's backend. We are proposing a **validation layer in front of the queue**. The endpoint is documented and runnable at **[/api](https://nivaaran-pi.vercel.app/api)**.

---

## Architecture

> [!NOTE]
> Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 · Zod · OpenAI · Vitest · Playwright + axe-core · Vercel.

No component library and no state library. The one dependency added for
accounts is none: sessions use `node:crypto`, and passwords use `scrypt` from
the standard library rather than a native bcrypt build.

```
Presentation      app/ · components/
      |
Application       lib/claims/ · lib/auth/ · lib/api/
      |
Domain            lib/rules/ · lib/match/          <- pure, no I/O, no clock
      |
Infrastructure    lib/db/ · lib/ai/ · lib/security/
```

| Directory | Purpose |
|---|---|
| `lib/rules/` | types · source registry · rule registry · 9 rules · engine · apply |
| `lib/match/` | name & date reconciliation with token-level diff |
| `lib/claims/` | claim state machine · owner-scoped case repository |
| `lib/auth/` | scrypt passwords · server sessions · guards · roles · demo seed |
| `lib/api/` | one error envelope · bounded JSON reader · same-origin check |
| `lib/security/` | per-bucket rate limiting |
| `lib/db/` | the persistence layer (see the caveat below) |
| `lib/ai/` | OpenAI wrapper · pattern-first decoder · extraction schema + scrub |
| `app/api/` | `/v1/preflight` · `/auth/*` · `/case` · `/ai/*` · `/ifsc` |

📖 *Deep dive: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).*

---

## Accounts, sessions and access

**Sessions.** The browser holds an opaque 32-byte random token in an
`HttpOnly`, `SameSite=Lax`, `Secure`-in-production cookie. The server stores
only its SHA-256. A stolen database therefore yields no usable session, and no
session state is readable or forgeable by client script. There is no JWT: a
bearer token that cannot be revoked is the wrong trade for a product whose
whole claim is trustworthiness. Logging out invalidates the server record
first, then clears the cookie.

**Passwords.** `scrypt`, salted per account, with the cost parameters stored
alongside the hash so they can be raised later without invalidating anyone. A
login against an unknown address still pays for one KDF run, so a miss and a
wrong password are indistinguishable in the response *and* in the time taken.

**Authorization.** Three roles — `citizen`, `employer`, `admin`. Enforced by
`requireUser` / `requireRole` on the server, inside the layout of every
protected route. `src/proxy.ts` also redirects a cookie-less visitor before the
page renders, but it is a convenience: it cannot tell whether a cookie is
valid, and if you deleted it nothing would become accessible that is not
accessible now.

| Route | Access | Enforced in |
|---|---|---|
| `/` `/why` `/sources` `/story` `/api` `/login` `/signup` | Public | — |
| `/check` `/preflight` `/documents` `/claim` `/done` `/status` | Public by design (works signed out; saved when signed in) | — |
| `/dashboard` `/account` | Any signed-in account | `requireUser` |
| `/employer` `/employer/*` | `employer`, `admin` | `requireRole` in the layout |
| `/governance` | `admin` | `requireRole` in the layout |
| `POST /api/auth/{signup,login}` | Public, rate limited, origin-checked | route handler |
| `GET|POST /api/case` | Owner only | session → `userId` → repository |
| `POST /api/ai/*` | Public, rate limited | route handler |
| `GET|POST /api/preflight`, `/api/v1/preflight` | Public, rate limited, no PII | route handler |

**Ownership.** There is no `getCase(id)` anywhere in this codebase. Every
repository function takes the authenticated user's id as its first argument, so
there is no object to reference insecurely and directly — the shape that
produces an IDOR is one we made unwriteable.

**CSRF.** `SameSite=Lax` blocks the cross-site POST; every state-changing
handler additionally rejects a foreign `Origin`.

**Headers.** CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy` (camera, mic, geolocation and payment
all denied) and HSTS, applied to every response in `next.config.ts` and
verified against a production build.

**Redirects.** `?next=` is attacker-controlled and is filtered by `safeNext`,
which rejects absolute URLs, protocol-relative `//evil.example`, the backslash
variant, and embedded control characters. Eight tests, one per technique.

---

## What is real, and what is not

| | |
|---|---|
| **Real** | The rule engine and its 9 rules. Name and date reconciliation. IFSC format validation. Accounts, password hashing, sessions, roles, route authorization, ownership scoping, rate limiting, security headers. Document reading and field extraction (with a key). The Preflight API. Every citation. |
| **Synthetic** | Every member record, UAN, employer roster and name. Nothing here belongs to a real person. |
| **Simulated** | Claim submission and the status timeline. No government system is contacted at any point, and the product says so on both screens. |
| **Mocked** | The IFSC directory is a small fixed set of the 2019–20 PSB merger prefixes, not a live RBI feed. |
| **Future** | Reading a real member record with consent; a live bank directory; password reset (deliberately absent rather than faked — see below). |

**Password reset is not implemented.** No mail is configured in this
environment, and a flow that says *check your inbox* while sending nothing is
worse than an honest sentence. The login page carries that sentence.

### Known limitations, stated plainly

- **Persistence is a JSON document** held in memory and flushed to disk
  (`.data/nivaaran.json`, or `/tmp` on Vercel). Correct for a handful of
  synthetic accounts on one instance; it does not survive a redeploy and it
  does not scale past one. The repository interface is the part that matters —
  swapping in a real database is a change of `src/lib/db/store.ts`.
- **Rate limiting is in-process**, so it is per-instance. `src/lib/security/ratelimit.ts`
  is the only file a distributed limiter would replace.
- **`epfindia.gov.in` did not resolve from our network** during research. Rules
  resting on that circular are marked `needs_review` in `/governance` and
  corroborated against a secondary source, rather than presented as verified.

---

## Quality & Testing

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm e2e
```

| Metric | Details |
|---|---|
| **Unit & integration** | **198** — rules, matching, claim state machine, case ownership, password policy, open-redirect filter, rate limiting, API error envelope, bilingual completeness, rule-registry drift |
| **E2E + a11y** | **138** across mobile and desktop projects — full journey, auth, authorization boundaries, employer handoff, AI-unavailable, 44px touch targets, Hindi |
| **axe-core** | Zero WCAG 2.1 A/AA violations on every public page, every authenticated page signed in as its owner, the 404, the 403, and the sign-in form with an error showing — in both languages |

Security-specific tests cover: an unauthenticated protected route, a citizen
reaching for an employer route, an employer reaching for governance, a
cross-origin POST carrying a valid cookie, malformed and oversized bodies,
open-redirect payloads, and the fact that one account's case is invisible to
another.

---

## Positioning

Nivaaran is not a better EPFO website. It is a **validation layer that sits in
front of an existing queue**, and PF is the proof of concept.

```
Today                          With a preflight layer
citizen -> form                citizen -> intent
        -> submit                      -> preflight
        -> wait 20 days                -> evidence
        -> rejected                    -> owner named
        -> find out why                -> fix
        -> fix                         -> re-check
        -> submit again                -> submit once
```

The architectural insight is one sentence: **move validation upstream.**
Nothing about it is specific to provident fund. The same shape — a rule
registry, a deterministic engine, an owner on every finding — sits in front of
pension applications, scholarships, certificates, welfare claims and licensing.
That is a direction, not a claim about what is built; none of those
integrations exist here, and the product says so — on **`/beyond`**, three
times over.

Crucially, it does not require replacing a government backend. It runs in
front of one.

---

## Roadmap

1. **Read the real member record** with the citizen's consent, replacing the synthetic file.
2. **Live bank directory** in place of the fixed merger set.
3. **A real database and a distributed rate limiter** — both are one-file swaps by design.
4. **Password reset**, once mail delivery exists to make it honest.
5. **More journeys:** advances (Form 31), transfers (Form 13), pension (10D).
6. **Employer preflight at exit**, inside an HRMS, through the documented API — the highest-leverage deployment, because it catches the missing exit date at source.

---

<div align="center">
  <p><b>Explore Further:</b></p>
  <p>
    <a href="docs/RESEARCH.md">RESEARCH</a> &middot;
    <a href="docs/PRD.md">PRD</a> &middot;
    <a href="docs/DESIGN.md">DESIGN</a> &middot;
    <a href="docs/ARCHITECTURE.md">ARCHITECTURE</a> &middot;
    <a href="docs/DEMO.md">DEMO</a>
  </p>
</div>
