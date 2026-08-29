# ARCHITECTURE — Nivaaran

Practical notes on how this is put together and what would have to change for it to be real.

---

## 1. Stack, and why

| Layer | Choice | Why this one |
|---|---|---|
| Framework | **Next.js 16** (App Router) + React 19 | One deployable for the UI and the API; static prerendering for every page that does not need a server |
| Language | **TypeScript**, strict | The bilingual `Bi` type makes a monolingual citizen-facing string a compile error |
| Styling | **Tailwind v4** with `@theme` tokens | Tokens live in CSS custom properties, so the palette is one file and auditable |
| Validation | **Zod v4** | The public API's contract is the schema |
| AI | **OpenAI** (`gpt-5.x`, structured outputs) | Server-side only; never decides eligibility |
| Accounts | **`node:crypto`** — scrypt, random tokens | Password hashing and sessions with no dependency and no native build step |
| Persistence | **A JSON document**, flushed to disk | A handful of synthetic accounts; a Postgres dependency would buy nothing this build can use |
| Unit tests | **Vitest** | 196 tests over the engine, the matchers, the decoder, the claim state machine, case ownership, the password policy and the redirect filter |
| E2E / a11y | **Playwright** + **axe-core** | Journey, authorization, mobile and Hindi, across mobile and desktop projects |
| Hosting | **Vercel** | Static pages on the CDN, the rest as functions |

**Not used, deliberately:** no state library (`useSyncExternalStore` stores), no
component library, no ORM, no queue, no container, no auth SDK, no JWT. Nothing
here needed one.

**Added since the first build:** accounts. The original version had none, which
was right for a two-day prototype and wrong the moment a citizen's check had to
survive a second device. See §11.

---

## 2. Shape

```
src/
  app/
    page.tsx                 Landing — intent-first entry
    check/                   Situation questions → record comparison
    preflight/               The verdict                      ← the product
    claim/ done/ status/     File, confirm, track
    why/ sources/            Judge-facing: analysis and disclosure
    api/
      preflight/route.ts     The rule engine as a public contract
      ai/decode/route.ts     Rejection classification
      ai/explain/route.ts    Plain-language rewriting
  lib/
    rules/
      types.ts               Facts, Finding, Source, Bi
      sources.ts             The source registry
      rules.ts               The 9 rules — deterministic, each citing one source
      engine.ts              preflight(facts) → PreflightResult
      apply.ts               Effect of a completed fix, for the re-check loop
    match/name.ts            Name and date reconciliation + token diff
    ai/
      client.ts              OpenAI wrapper: timeouts, failures as values
      decode.ts              Pattern matching first, model second
      limit.ts               Rate limit for the public AI routes
    i18n/ state/             Language and session stores
  content/
    personas.ts              Three synthetic member records
    friction.ts              The friction analysis, as data
```

---

## 3. The rule engine

The core is one pure function:

```ts
preflight(facts: Facts, now?: Date): PreflightResult
```

**No network. No model. No I/O. No clock dependence** beyond the timestamp it stamps on the result. The same facts always produce the same verdict — a unit test asserts exactly that. That property is what makes the engine auditable, testable, cacheable, and safe to expose as an API.

Each rule is a `(facts) => Finding | null` that carries, in data:

```ts
{
  ruleId, gate, severity, owner,        // owner ∈ citizen | employer | epfo | time
  title: Bi, why: Bi,                   // bilingual by type
  evidence?: Evidence,                  // the token-level diff the portal never shows
  fix: { summary, steps, minutes, cost, waitDays?, officialUrl?, caveat? },
  sourceId,                             // → SOURCES registry
}
```

Findings sort by severity, then by owner — **employer- and EPFO-owned work first**, because those have the longest queue time and the citizen should start them today.

### 3.1 Rules as governed data

Every rule points at exactly one entry in `SOURCES`, and every entry carries `url`, `verifiedOn`, `confidence` and an optional honest `note`. All of it renders on `/sources` and inside each finding.

The consequence that matters for a public body: **changing a rule is a reviewable diff, not a code change dressed up as one.** A domain owner at EPFO could read `rules.ts` and argue with it. That is deliberate.

### 3.2 Name reconciliation

`compareNames` reproduces the judgement a strict government matcher makes — normalise, tokenise, demand an exact match — but reports *why* it failed: `initial_expansion`, `missing_token`, `extra_token`, `order`, `spelling`, `unrelated`. `compareDates` additionally detects the documented `day_month_swap`.

The verdict is deterministic. A model is only ever asked to *phrase* it.

---

## 4. The Preflight API

Documented and runnable at [`/api`](../src/app/api/page.tsx) — request shape,
response shape, copy-paste `curl`, and a button that POSTs the reader's own
in-progress session to the live endpoint and prints what comes back.

`GET /api/preflight` returns the contract, the rule ids, the source registry and a worked example.
`POST /api/preflight` validates against a Zod schema and returns the full result with each finding's citation inlined.

```
$ curl -s -X POST /api/preflight -H 'content-type: application/json' -d @member.json

verdict: fixable | blockers: 4 | minutesToFix: 35 | owners: [citizen]
  [blocker] R-EXIT-DATE     owner=citizen  Your date of exit has not been recorded
  [blocker] R-NAME-AADHAAR  owner=citizen  Your name in EPFO does not match your Aadhaar
  [blocker] R-BANK-NAME     owner=citizen  The name on your bank account does not match…
  [blocker] R-IFSC          owner=citizen  That IFSC belongs to a bank that no longer exists
  [warning] R-TDS-192A      owner=citizen  Tax will be deducted from this withdrawal
```

Deliberately **unauthenticated, stateless and side-effect free**: it stores nothing, logs no payload, and needs no identifier — only the *shape* of a record. Invalid input returns 422 with per-field issues.

This is the end-to-end answer. The same function could run:

| Where | Catches | Whose deployment |
|---|---|---|
| In the member portal, before *Submit* | Every citizen-fixable mismatch, while it still costs ten minutes | EPFO |
| In an employer's HRMS, at exit | The missing exit date, **at source** | Employer / payroll vendor |
| At UAN generation | Name and DOB divergence on day one | EPFO + employer |

---

## 5. The AI layer

Four principles, enforced in code rather than promised:

1. **Never decides eligibility.** No rule consults a model. The engine runs with `OPENAI_API_KEY` unset.
2. **Deterministic first.** `/api/ai/decode` runs pattern matching over the documented EPFO phrasings and returns immediately when it matches — free, instant, offline. The model is reached only for wording the patterns do not recognise.
3. **Closed output.** The decoder's schema is an enum of nine rule ids plus an `unrecognised` flag. The model cannot invent a cause. The explainer is instructed never to add a fact, number, timeline or caveat.
4. **Failures are values, not exceptions.** `structured()` returns `{ok:false, reason}` for `not_configured | timeout | rate_limited | refused | unparsable | error`. Every caller degrades to the original wording.

```
citizen taps "Explain this simply"
   → POST /api/ai/explain  → rate limit → key present?
        no  → return the original text, resolvedBy: "unavailable"
        yes → OpenAI, 9s deadline, 1 retry, structured output
                ok    → simplified text, labelled as model-written
                not   → return the original text, resolvedBy: "unavailable"
```

A Playwright test aborts every `/api/ai/**` request and asserts the journey still completes and the verdict is unchanged.

### 5.1 The document pre-check — redaction by schema

`POST /api/ai/extract` reads a document image and returns the four fields the
engine compares. It is the only place a model sees an image, and the only place
a citizen's own document reaches us at all.

The privacy design is not a prompt, it is the type. `Facts` needs
`aadhaar: {name, dob}`, `bank: {name, ifsc, accountLast4}` and
`panOnRecord: boolean` — four fields and a flag. So `ExtractSchema` has exactly
those four fields plus two enums, and **no field capable of holding an Aadhaar
number, a PAN, a UAN, a full account number or free text.** The model has
nowhere to put an identifier even if it reads one. Same principle as the
decoder's closed list of nine rule ids: refusal by construction.

Five consequences, all in code:

1. **The schema is the redaction.** No identifier-shaped field exists; a
   payload carrying one fails `safeParse`, and a unit test asserts that.
2. **No free text in the response.** `quality` and `confidence` are enums, so
   there is no string field to smuggle a number into.
3. **`scrub()` runs on the server regardless.** `name` is stripped of digits
   and capped at 80 characters; `accountLast4` must match `/^\d{4}$/`; `ifsc`
   must match `/^[A-Z]{4}0[A-Z0-9]{6}$/`; `dob` must be a plausible ISO date.
   Anything else becomes `null` rather than being shown to a citizen as fact.
4. **Nothing is stored.** The image is an in-memory `Blob` on the client, never
   written to `localStorage`. The route holds it for the duration of one call
   and logs no bytes.
5. **Downscaled before it is sent** — 1600px longest edge, re-encoded to JPEG
   q0.8 through a canvas. Cheaper and faster, and the re-encode drops EXIF
   including any GPS tag. The screen says so.

Extraction **pre-fills, never commits**: every value lands in an editable input
carrying a confidence chip and the label *"Pre-check only — EPFO performs final
verification."* Nothing reaches `Facts` until the citizen presses a button, and
the verdict still comes from `preflight`, unchanged.

```
citizen picks a sample or a file
   → downscale + re-encode in the browser (EXIF gone)
   → POST /api/ai/extract → 5/min per-IP vision budget → key present?
        no  → "Reading documents isn't available right now", journey untouched
        yes → OpenAI vision, 15s deadline, structured output
                ok  → scrub() → four fields, pre-filled and editable
                not → the same quiet line
```

---

### 5.1.1 Reconciliation — `/documents`

Extraction alone is not the product; the comparison is. `/documents` reads an
identity document and a passbook into two independent `DocumentSlot`s and
renders `reconcile()` over both.

```ts
reconcile(epfo, identity, bank): ReconcileRow[]   // pure
```

It calls the same `compareNames` and `compareDates` the rules call. That is not
tidiness — if this table and `/preflight` could disagree, one of them would be
lying to a citizen about whether their claim will be paid.

**The constraint that shapes the screen: only some of these comparisons are
ones EPFO runs.**

| Comparison | Rule |
|---|---|
| identity name → EPFO | `R-NAME-AADHAAR` |
| identity DOB → EPFO | `R-DOB-AADHAAR` |
| passbook name → EPFO | `R-BANK-NAME` |
| passbook IFSC → EPFO | none |
| passbook account → EPFO | none |

`R-IFSC` judges whether a code is *usable*, not whether it matches. Nothing
compares account numbers. So a row carries a `ruleId` only where a rule exists;
the other differences render as "worth knowing" with a plain consequence —
*EPFO pays the account it has on file* — and never count toward the blocker
headline. Inventing a rejection that will not happen is the same failure as
missing one.

The engine also never compares the two documents to each other, because EPFO
does not. A three-way view invites that read, so a document-to-document
disagreement is reported as information, never as a ✘.

The page's verb is **compare**, never *verify*. We cannot authenticate a
government document, and a citizen who reads "verified" and files anyway has
been misled by us.

---

### 5.2 The employer lens

`/employer` is the same engine with a different reader. It runs `preflight`
over the same `Facts` and re-partitions the findings by who can act:

```
reviewRoster(leavers)          pure — no I/O, no clock
  → blockedOnYou    ≥1 blocker with owner "employer" AND an employerFix
  → blockedOnThem   blocked, but nothing the employer can act on
  → clear
```

No second rule set and no employer-specific record type — the roster is a fixed
synthetic fixture, not an intake, and the page says so. The route itself is
behind `requireRole(["employer", "admin"])`: an employer console holds an
employer's view of their former staff, and a citizen account has no business
there even when the data behind it is invented. `Finding`
gains one optional field, `employerFix`, on the three rules that can be
employer-owned: the citizen's steps ("sign in with your UAN") are wrong advice
for an HR desk, and domain copy stays with the rule rather than migrating into
a component.

Ownership alone is not enough to put a finding in the employer's queue — it
also needs an `employerFix`. Naming an owner we have no instructions for is the
dead end this lens exists to remove.

**One latent bug fixed with it.** `minutesToFix` summed per finding, so a member
needing both a name and a date-of-birth correction was quoted twice for one
visit to Modify Basic Details. `Fix.fixKey` marks fixes that are one action;
`billableMinutes()` counts distinct keys, and both the citizen total and the
employer total go through it. No persona currently has both mismatches on the
same side, so nothing on screen changed — which is the point of fixing it in
the shared function rather than at a call site.

---

## 6. Failure handling

| Failure | Behaviour |
|---|---|
| No `OPENAI_API_KEY` | Deterministic paths only; AI surfaces say so plainly |
| OpenAI slow | 9s deadline for text, 15s for vision, one retry, then fall back |
| OpenAI rate-limited / 429 | Fall back; our own per-IP limit sits in front — 12/min for text, 5/min for vision |
| Model refuses or returns unparsable output | Fall back |
| Network offline | Landing, questions and the entire verdict still work — the engine needs no network |
| `localStorage` blocked or full | Every access wrapped; journey completes but is not resumable |
| Deep link with no session | Redirect home rather than render a hollow page |
| Browser back / refresh | Step lives in the URL; answers live in storage; both tested |
| Double-tap on Continue | Navigation runs in a transition and the button disables — this was a real bug that skipped questions |
| Invalid API payload | 422 with per-field Zod issues |
| Document unreadable, or not a document | Returned as a `quality` value and shown as a plain line; the citizen edits the fields or discards them |
| Image over 8 MB decoded | 422 before any model call |

---

## 7. Security and privacy

- **The API key is server-only.** `client.ts` imports `server-only`; the key is never in a client bundle.
- **No personal data is collected or stored.** No accounts, no server-side user records, no analytics, no cookies. Session state is `localStorage` on the citizen's own device.
- **Document images transit to OpenAI and are kept nowhere.** The one place a citizen's own file leaves the browser is `/api/ai/extract`. It is downscaled and re-encoded first — which drops EXIF, GPS included — held for one call, never written to disk or storage, and never logged. The screen says all of this before the file picker, and points at synthetic specimens instead.
- **No identifier can be extracted.** See §5.1: the extraction schema has no field able to hold one, and a server-side scrub runs anyway.
- **No real identifiers anywhere in the repository.** Every persona is synthetic; UANs are masked and obviously fake. The UI warns against entering real values.
- **No live government system is touched.** No scraping, no private APIs, no government infrastructure. Official URLs are plain outbound links opened with `rel="noopener noreferrer"`.
- **Rate limiting** on both AI routes. In-process `Map` — honest for a single-instance prototype, and named as a limitation in the code.

> `epfindia.gov.in` did not resolve from our network during research, so EPFO figures are cited from secondary reporting of the EPFO Annual Report. The product says so on `/sources` rather than implying a direct read.

---

## 8. Testing

| Suite | Count | Covers |
|---|---:|---|
| `vitest` | **110** | Name/date matching incl. the canonical rejection cases · every rule · category A/B/C routing · ordering · determinism · bilingual completeness · the rejection decoder · the extraction scrub and its schema · every source's shape, age and citation map · roster partitioning and de-duplicated effort · document reconciliation and which comparisons carry a rule · friction maths and its caps |
| `playwright` (mobile + desktop) | **76** | Intent → verdict → fix → re-check → file → confirm → track · changing an answer changes the verdict · back button · refresh · deep link with no session · AI endpoints failing · decoder without a model · Hindi across domain content · document pre-check pre-filling, committing and changing the verdict · the extraction route failing · the employer lens partitioning, acting and re-checking · two-document reconciliation, a photographed file through the real file input, the cold start and the degraded read · axe on 12 states, zero violations · keyboard-only operation incl. the file input · skip link · 44px touch targets |

`npm run typecheck && npm run lint && npm test && npm run build && npm run e2e` is the gate.

**Source freshness is part of that gate.** `src/lib/rules/sources.test.ts` fails
the build when any `SOURCES[].verifiedOn` is more than 90 days old. The failure
names the source, the rules that depend on it, the URL to re-check and the
caveat we already recorded, so re-verifying is a task rather than an
investigation. The rule→source map it reports is read off the engine — the test
runs a record that trips all nine rules and asserts all nine fired, so a new
rule cannot quietly escape the check.

---

## 9. Deployment

Static prerender for all twelve pages; four function routes. `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`, `OPENAI_VISION_TIMEOUT_MS`) as environment variables. No database, no migrations, no secrets beyond the one key. Without the key the site still deploys and the core journey still works.

---

## 10. What would have to change for this to be real

Honest list, roughly in order of difficulty:

1. **An authenticated read of the member record.** Everything here compares a record we were handed. Production needs a consented, authenticated read — which is the single biggest change, and the one that adds the login we currently avoid.
2. **The live IFSC directory.** Replace the hardcoded demonstration set with the NPCI/RBI source.
3. **Rule governance.** Re-verification dates are now enforced in CI (§8). What is still missing is the human half: a named domain owner, a review process, and a changelog per rule.
4. **A shared rate limiter and real observability** in place of the in-process `Map`.
5. **Legal review of every rule** before anyone acts on it. Today the product handles this by showing its sources and its confidence and telling the citizen when we are unsure.

---

## 11. Accounts, sessions and access

The first build had no login and no server state, and said so everywhere. That
was the right call for the journey it shipped — *no login, no OTP* is half the
product's argument — and the wrong one for a check a person is meant to come
back to. Accounts were added **alongside** the anonymous journey, never in
front of it: every page of the citizen flow still works signed out, and signing
in mid-journey adopts the anonymous case rather than discarding it.

### Sessions

```
browser                     server
-------                     ------
HttpOnly cookie             db.sessions[sha256(token)]
  nivaaran_session=<token>    -> { userId, createdAt, expiresAt }
```

The browser holds 32 random bytes. The server holds only their SHA-256, so a
dump of the store yields nothing a person can sign in with. `SameSite=Lax`,
`Secure` in production, seven-day expiry, rolled forward when a session is more
than a day old.

There is no JWT here on purpose. A stateless bearer token cannot be revoked
before it expires, and "sign out everywhere, now" is not a feature to trade
away in a product about money stuck in a government process.

### Passwords

`scrypt` from the standard library, salted per account, stored in a
self-describing form (`scrypt$salt$hash`) so the cost parameters can be raised
later without invalidating anyone. A login for an address that does not exist
still runs one KDF against a throwaway hash, so a miss and a wrong password
cost the same wall-clock time — otherwise the endpoint is an account
enumeration oracle with a stopwatch.

### Authorization

Three roles: `citizen`, `employer`, `admin`. Enforced by `requireUser` and
`requireRole` on the server, inside the layout of every protected route, before
any user-owned data is read.

`src/proxy.ts` also redirects a visitor with no session cookie, but it is a
convenience and is documented as one: it cannot tell whether a cookie is valid,
whose it is, or what role it carries. If the file were deleted, nothing would
become reachable that is not reachable now.

### Ownership

There is no `getCase(id)` in this codebase, and that is deliberate. Every
function in `lib/claims/repo.ts` takes the authenticated user's id as its first
argument, so the client never names an object and there is no insecure direct
object reference to find. The shape that produces the bug is one we made
impossible to write.

### What would have to change for this to be real

| Today | Production |
|---|---|
| JSON document flushed to disk | A real database. `lib/db/store.ts` is the only file that knows |
| In-process rate limiter | A shared store. `lib/security/ratelimit.ts` is the only file that knows |
| No password reset | Mail delivery first; a reset flow that sends nothing is worse than none |
| Synthetic member record | The real record, read with the citizen's consent |
| One instance | Sessions already live server-side, so horizontal scaling needs only the store swap |
