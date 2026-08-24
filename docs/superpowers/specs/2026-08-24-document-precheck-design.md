# Document pre-check — design

**Date:** 24 Aug 2026 · **Horizon:** first submission, ~4 days · **Status:** Days 1–3 built · **superseded in part**

> **Superseded 24 Aug 2026.** `DocumentReader` no longer exists: §6's collapsed
> disclosure on `/check` became a door to `/documents`, and the extraction half
> became `DocumentSlot`, used twice. See
> [the reconciliation spec](2026-08-24-document-reconciliation-design.md).
> Everything in §3–§5 (the privacy design, the schema, the server) is unchanged
> and still current.

> **Built (24 Aug 2026):** `structuredVision`, `src/lib/ai/extract.ts`,
> `POST /api/ai/extract`, `allow(key, max)`, the three specimens,
> `DocumentReader` in `RecordsStep`, the unit and e2e tests in §9, and every
> doc in §10. **Two deliberate departures from this design, both noted below:**
> the specimens ship as SVG rasterised by the client's own downscale canvas
> rather than pre-rendered PNGs (§7), and bilingual completeness is enforced by
> `satisfies Record<string, Bi>` at compile time rather than by a unit test
> (§9). **Day 3 is built too:** source freshness fails the build past 90 days
> (`src/lib/rules/sources.test.ts`), the endpoint is documented and runnable at
> `/api`, and `/preflight` prints its fix plan with every panel and citation
> expanded.

Reads on from [PRD.md](../../PRD.md) §6.1.4 and §7, and [ARCHITECTURE.md](../../ARCHITECTURE.md) §10.2.

---

## 1. Why this, and why now

This is not a new feature. It is the one the build promised and cut:

| Where | What it says |
|---|---|
| `PRD.md` §6.1 item 4 | "Document pre-check with AI extraction + deterministic comparison" — **in scope for v1** |
| `PRD.md` §7 | **AI surface #1 of four.** #2, #3 and #4 shipped; #1 did not |
| `ARCHITECTURE.md` §10 item 2 | "Designed, not built — **the highest-value cut in this five-day build**" |

A judge who reads the docs can already see the hole. Closing it converts a
self-declared gap into the fourth working AI surface, and it lands on a screen
that already exists (`RecordsStep`, `src/app/check/page.tsx:14`).

## 2. Goal

Let the citizen replace a handed-to-them record with one **read from a
document**, and feed it into the deterministic comparison that already runs.

**Non-goals.** No document *verification* (we cannot and must not authenticate a
government document). No identifier capture of any kind. No storage. No new
route in the journey — this is an affordance on an existing screen.

## 3. The privacy design — the part that matters

The brief (`RESEARCH.md` §0.3) bans real Aadhaar/PAN/OTP data. `ARCHITECTURE.md`
§7 promises no personal data is collected or stored. A feature that says
"photograph your Aadhaar" collides with both.

It resolves because **the engine never needs a government ID number.** From
`Facts` in `src/lib/rules/types.ts`:

```ts
aadhaar?: { name; dob }                 // no Aadhaar number
bank?:    { name; ifsc; accountLast4 }  // last four only
panOnRecord: boolean                    // whether, not which
```

Four fields and a boolean. Five consequences, all enforced in code, not in prose:

1. **The schema is the redaction.** The Zod output type has no field capable of
   holding an identifier. Same principle as the rejection decoder's closed list
   of nine rule ids — refusal by construction, not by prompt.
2. **No free text in the response.** `quality` is an enum, not a string, so the
   model has nowhere to stash a number it was told not to return.
3. **Server-side scrub anyway.** Before the response leaves the route, `name` is
   stripped of digits and length-capped; `accountLast4` must match `/^\d{4}$/`;
   `ifsc` must match `/^[A-Z]{4}0[A-Z0-9]{6}$/`. Anything else becomes `null`.
4. **Nothing is stored.** In-memory `Blob` on the client, never written to
   `localStorage`; the route holds the image only for the duration of the call.
   No logging of image bytes.
5. **Downscale before send** — max 1600px on the longest edge, re-encoded to
   JPEG q0.8 through a canvas. Cheaper and faster, and re-encoding drops EXIF
   including any GPS tag. Worth saying out loud on the page.

**Disclosure, verbatim on the screen, bilingual:**

> Do not upload a real Aadhaar, PAN or passbook. This is a prototype — use a
> sample below. Any image you choose is sent to OpenAI to read the four fields
> we need. We never ask for, extract or store an Aadhaar, PAN or account number,
> and the image is not saved anywhere.

And the label `ARCHITECTURE.md` §10 already drafted, on every extracted value:
**"Pre-check only — EPFO performs final verification."**

## 4. Data contract

```ts
// src/lib/ai/extract.ts
export const ExtractSchema = z.object({
  docType:      z.enum(["identity", "passbook", "cheque", "unknown"]),
  name:         z.string().max(80).nullable(),
  dob:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  ifsc:         z.string().nullable(),
  accountLast4: z.string().nullable(),
  confidence:   z.enum(["high", "medium", "low"]),
  quality:      z.enum(["clear", "blurred", "cropped", "glare", "not_a_document"]),
});
```

There is deliberately no `aadhaarNumber`, no `panNumber`, no `accountNumber`,
and no free-text field.

## 5. Server

**`structuredVision()`** — a sibling of `structured()` in `src/lib/ai/client.ts`,
same `AiResult` contract, same never-throw rule, own deadline (vision is slower:
`OPENAI_VISION_TIMEOUT_MS`, default 15000). Takes a data URL and passes an image
content part alongside the text instruction.

> Build note: confirm the exact `openai.responses.parse` image-input shape
> against current SDK docs (`ctx7`) before writing it. Do not write it from
> memory.

**`POST /api/ai/extract`** — mirrors `api/ai/decode/route.ts` exactly:

```
422  invalid body            body = { image: dataUrl }, ≤ 8 MB decoded
429  rate limited            allow(`vision:${clientKey(req)}`, 5)   ← tighter bucket
200  { ok:false, reason }    not_configured | timeout | refused | unparsable | error
200  { ok:true, fields, confidence, quality, model }
```

`allow()` gains an optional `max` argument so vision gets its own, smaller
budget without touching the text endpoints' limit of 12/min.

## 6. Client

**`src/components/document-reader.tsx`**, rendered inside `RecordsStep`:

```
┌ Read these from a document instead?  ─────────────────────────┐
│  [ warning block — unmissable, above the controls ]           │
│                                                               │
│  Samples:  ( ) Identity — Rajesh   ( ) Passbook — Rajesh       │
│            ( ) Identity — Sunita (photographed)               │
│  or        [ Choose a file ]                                   │
│                                                               │
│  [ preview ]   Reading…                                        │
│                                                               │
│  Name          Rajesh Kumar Sharma        [high]   (editable)  │
│  Date of birth 1996-03-08                 [high]   (editable)  │
│  Pre-check only — EPFO performs final verification.            │
│                                                               │
│  [ Use these values ]   [ Discard ]                            │
└───────────────────────────────────────────────────────────────┘
```

- Extraction **pre-fills, never commits.** Every field is editable; the citizen
  presses *Use these values* to write them into session facts, which re-runs
  `preflight` through the existing path.
- Confidence chip per field, using the existing `Badge` tones.
- `quality !== "clear"` surfaces a plain line ("This photo is blurred — check
  the values before using them"), not an error dialog.
- Collapsed by default behind a `Disclosure`, so the screen a judge sees first
  is unchanged and the demo can skip it entirely.

**Accessibility:** real `<input type="file">` with a visible 44px label; samples
as `aria-pressed` buttons reusing `Choice`; results announced through
`aria-live="polite"`; preview carries alt text; axe stays clean.

## 7. Sample documents

Three specimens in `/public/samples`, authored as SVG in the product's own
design language and rasterised with the Playwright chromium already in
devDependencies. **Not Aadhaar look-alikes** — no emblem, no UIDAI mark, no
government layout, since the brief bans appearing official. Each is watermarked
*SPECIMEN · SYNTHETIC · NOT A GOVERNMENT DOCUMENT*.

| File | Exercises |
|---|---|
| `identity-rajesh.png` | `Rajesh Kumar Sharma` vs EPFO `RAJESH K SHARMA` → R-NAME-AADHAAR |
| `passbook-rajesh.png` | IFSC + account ending 8842 → R-IFSC, R-BANK-NAME |
| `identity-sunita.png` | DOB `1985-02-07` vs EPFO `1985-07-02` → R-DOB-AADHAAR, and rendered with rotation, noise and a glare gradient so `quality` and `confidence` demonstrably do something |

## 8. Failure handling

Non-negotiable, matching the existing contract: **every failure is a value.**
AI off, timed out, rate-limited or unparsable → a quiet line, *"Reading
documents isn't available right now. The records below are the ones we already
have,"* and the journey continues untouched. A Playwright test aborts
`**/api/ai/extract` and asserts the journey still completes, mirroring the
existing AI-failure test in `e2e/journey.spec.ts`.

## 9. Tests

| Level | What |
|---|---|
| unit | scrub: digits stripped from `name`; bad IFSC → `null`; 6-digit `accountLast4` → `null`; over-long name capped |
| unit | schema rejects a payload carrying an extra identifier-shaped key |
| unit | bilingual completeness for every new string |
| e2e | sample → extract (route stubbed) → *Use these values* → verdict changes |
| e2e | `/api/ai/extract` aborted → journey still completes |
| e2e | axe clean on the records step with the reader open |
| e2e | 44px targets on the new controls |

## 10. Docs that must change when this ships

Judges read these, and they currently say the feature does not exist.

- `ARCHITECTURE.md` §10 — remove item 2 from "what would have to change"; add a
  §5.x describing the vision surface and the redaction-by-schema design.
- `PRD.md` §7 — mark surface #1 built.
- `README.md` — move document extraction out of the roadmap; add to "what
  actually works", and add the image-transits-to-OpenAI fact to "what is mocked
  / honesty".
- `DESIGN.md` §4 — add `DocumentReader` to the component table.
- `DEMO.md` — new beat in the 2-minute script.
- `AGENTS.md` — a rule: the extraction schema may never gain an identifier field.

## 11. The four days

**Day 1 — server.** `structuredVision`, `extract.ts` schema + prompt + scrub,
`/api/ai/extract`, `allow(key, max)`. Unit tests for the scrub. Author and
rasterise the three specimens.

**Day 2 — client.** `DocumentReader` in `RecordsStep`, bilingual, a11y,
degraded state. The three e2e tests.

**Day 3 — the cheap wins** (both were already asked for in the docs):
- **Rule freshness in CI** — `sources.test.ts` fails when any
  `SOURCES[].verifiedOn` is older than 90 days, with a failure message naming
  the rule and what to re-check. Closes `ARCHITECTURE.md` §10 item 4's
  "re-verification dates enforced in CI". ~2 h.
- **`/api` docs page** — request/response shape, copy-paste `curl`, and a
  "try it with this session's facts" button. The endpoint exists and nothing
  advertises it. ~2 h.
- Print stylesheet on `/preflight` so the fix plan can be carried to HR. ~1 h.

**Day 4 — freeze.** No new features. Full suite, Lighthouse, 390/768/1440 pass,
docs in §10 updated, demo script and video.

## 12. Risks, and what gets cut first

| Risk | Response |
|---|---|
| Vision latency blows the demo | 15 s deadline, visible "Reading…", and the sample path is the demo path. If a call is slow on stage, the journey still completes. |
| Model returns an identifier anyway | It has no field to put one in, and the server scrub runs regardless. |
| Specimen documents read as fake-Aadhaar | They are deliberately not Aadhaar-shaped, and watermarked. |
| Day 3 overruns | Cut in this order: print stylesheet → `/api` page → rule freshness. The document reader is never cut; it is the deliverable. |
| Scope creep into the employer lens | Explicitly **not** in this window. It is the strongest Stage-2 candidate (7 Sep) — same engine, different lens, ~1 day — and it stays there. |

## 13. Deferred, deliberately

`/employer` view · offline service worker · bundled RBI IFSC snapshot replacing
the low-confidence demonstration set · other EPF forms (10D / 13 / 31, a stated
non-goal) · authenticated member-record read (forbidden by the brief).
