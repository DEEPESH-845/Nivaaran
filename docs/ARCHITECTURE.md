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
| Unit tests | **Vitest** | 43 tests over the engine, the matchers, the decoder and the friction maths |
| E2E / a11y | **Playwright** + **axe-core** | 43 tests across mobile and desktop projects |
| Hosting | **Vercel** | Static pages on the CDN, three function routes |

**Not used, deliberately:** no state library (two `useSyncExternalStore` stores), no component library, no database, no auth, no ORM, no queue, no container. Nothing here needed one.

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

---

## 6. Failure handling

| Failure | Behaviour |
|---|---|
| No `OPENAI_API_KEY` | Deterministic paths only; AI surfaces say so plainly |
| OpenAI slow | 9s deadline, one retry, then fall back |
| OpenAI rate-limited / 429 | Fall back; our own 12-req/min per-IP limit sits in front |
| Model refuses or returns unparsable output | Fall back |
| Network offline | Landing, questions and the entire verdict still work — the engine needs no network |
| `localStorage` blocked or full | Every access wrapped; journey completes but is not resumable |
| Deep link with no session | Redirect home rather than render a hollow page |
| Browser back / refresh | Step lives in the URL; answers live in storage; both tested |
| Double-tap on Continue | Navigation runs in a transition and the button disables — this was a real bug that skipped questions |
| Invalid API payload | 422 with per-field Zod issues |

---

## 7. Security and privacy

- **The API key is server-only.** `client.ts` imports `server-only`; the key is never in a client bundle.
- **No personal data is collected or stored.** No accounts, no server-side user records, no analytics, no cookies. Session state is `localStorage` on the citizen's own device.
- **No real identifiers anywhere in the repository.** Every persona is synthetic; UANs are masked and obviously fake. The UI warns against entering real values.
- **No live government system is touched.** No scraping, no private APIs, no government infrastructure. Official URLs are plain outbound links opened with `rel="noopener noreferrer"`.
- **Rate limiting** on both AI routes. In-process `Map` — honest for a single-instance prototype, and named as a limitation in the code.

> `epfindia.gov.in` did not resolve from our network during research, so EPFO figures are cited from secondary reporting of the EPFO Annual Report. The product says so on `/sources` rather than implying a direct read.

---

## 8. Testing

| Suite | Count | Covers |
|---|---:|---|
| `vitest` | **43** | Name/date matching incl. the canonical rejection cases · every rule · category A/B/C routing · ordering · determinism · bilingual completeness · the rejection decoder · friction maths and its caps |
| `playwright` (mobile + desktop) | **43** | Intent → verdict → fix → re-check → file → confirm → track · changing an answer changes the verdict · back button · refresh · deep link with no session · AI endpoints failing · decoder without a model · Hindi across domain content · axe on 8 states, zero violations · keyboard-only operation · skip link · 44px touch targets |

`npm run typecheck && npm run lint && npm test && npm run build && npm run e2e` is the gate.

---

## 9. Deployment

Static prerender for all nine pages; three function routes. `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`) as environment variables. No database, no migrations, no secrets beyond the one key. Without the key the site still deploys and the core journey still works.

---

## 10. What would have to change for this to be real

Honest list, roughly in order of difficulty:

1. **An authenticated read of the member record.** Everything here compares a record we were handed. Production needs a consented, authenticated read — which is the single biggest change, and the one that adds the login we currently avoid.
2. **Document extraction.** Reading name, DOB, account and IFSC from a photographed Aadhaar or passbook, with an explicit *"pre-check only, EPFO performs final verification"* label. Designed, not built — the highest-value cut in this five-day build.
3. **The live IFSC directory.** Replace the hardcoded demonstration set with the NPCI/RBI source.
4. **Rule governance.** A named domain owner, a review process and a changelog per rule, with re-verification dates enforced in CI.
5. **A shared rate limiter and real observability** in place of the in-process `Map`.
6. **Legal review of every rule** before anyone acts on it. Today the product handles this by showing its sources and its confidence and telling the citizen when we are unsure.
