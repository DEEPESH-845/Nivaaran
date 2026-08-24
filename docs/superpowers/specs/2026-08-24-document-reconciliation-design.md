# Document reconciliation — design

**Date:** 24 Aug 2026 · **Horizon:** ~half a day · **Status:** built

Reads on from the [document pre-check spec](2026-08-24-document-precheck-design.md),
which built the extraction this page reuses.

> **Built 24 Aug 2026.** All of §4–§8 shipped as designed. 110 unit tests, 74
> e2e. One thing the tests caught that the design had not: with nothing read,
> the only navigation off the page sat inside the "something was read" branch,
> so a failed reading stranded the reader — precisely the dead end §5 was
> written to prevent. Navigation is now unconditional.

---

## 1. Why this exists

The document reader works. Almost nobody will find it: it is collapsed inside a
`<details>` on the last step of `/check`, it takes one document at a time, and
it writes into one field group. The capability is not the problem — the
placement is.

Reading one document also under-uses what we have. A citizen holds two: an
identity document and a passbook. The value of reading both is not two
extractions, it is the **table** — every field the engine compares, from every
source that carries it, side by side, with the disagreements marked.

## 2. The word we will not use

This page does not **verify** anything. We cannot authenticate a government
document: there is no API, no authority, and the brief forbids appearing
official. A citizen who reads "verified" and files anyway has been actively
misled by us.

What we do is **read and compare**. Every extracted value keeps the label the
pre-check spec established — *"Pre-check only — EPFO performs final
verification"* — and the page's own verb is "compare", never "verify".

## 3. What the engine actually compares

This constrains the table, and getting it wrong would invent problems:

| Comparison | Rule | Matcher |
|---|---|---|
| identity name → EPFO name | `R-NAME-AADHAAR` | `compareNames` |
| identity DOB → EPFO DOB | `R-DOB-AADHAAR` | `compareDates` |
| passbook name → EPFO name | `R-BANK-NAME` | `compareNames` |
| passbook IFSC → EPFO IFSC | **none** | — |
| passbook account → EPFO account | **none** | — |

`R-IFSC` judges whether an IFSC is *usable* — well-formed, and not a prefix
retired by the 2019–20 amalgamations. It does not compare the passbook's code
against EPFO's. And nothing in the engine compares account numbers.

So a difference in the last two rows is real information — *EPFO will pay the
account it has on file, not the one in your passbook* — but it is **not** a
blocker, and the headline count must not treat it as one. Rows carry a `ruleId`
only where a rule genuinely exists.

**The engine also never compares the two documents to each other**, because
EPFO does not. A three-column table invites that read, so when the identity
document and the passbook disagree, the row says so as information: *your
documents disagree with each other; EPFO does not check this, but it will
matter if you correct the wrong one.* Never a ✘.

## 4. The pure part

`src/lib/match/reconcile.ts`:

```ts
reconcile(epfo, identity, bank): ReconcileRow[]
```

One row per field. Each carries both document values, a verdict against EPFO
per source, the rule it maps to when there is one, whether the documents
disagree with each other, and the token-level `NameVerdict` for names so the
existing diff component can render it.

It calls `compareNames` and `compareDates` — the same functions the rules call.
Sharing the matcher is what makes it impossible for this table to disagree with
`/preflight`. No I/O, no clock, no model.

## 5. The screen

`/documents`. Two slots, identity and bank; each takes a sample or a file and
runs the existing downscale → `POST /api/ai/extract` → `scrub` path unchanged.
Slots read independently: one document is a valid state and the table renders
with the unread column as "not read yet", not blank.

Below the table, a derived line counting only rule-backed disagreements, then
**Use these values**, which writes the scrubbed fields into session facts and
offers the way back to the verdict.

**Cold start.** A reconciliation needs a record to compare against. With no
session the page opens with the same three persona doors the landing uses; pick
one and the EPFO column fills in.

## 6. What changes elsewhere

`DocumentReader` is deleted, not duplicated. Its acquire-and-read half becomes
`DocumentSlot`, used twice. On `/check` the collapsed disclosure becomes a
one-line door to `/documents` that returns to the records step.

Nothing new is stored: images stay in memory exactly as they do now, and only
the four scrubbed fields ever reach the session, only on a button press.

## 7. Tests

| Level | What |
|---|---|
| unit | `reconcile` — agreement, disagreement, one-sided rows, unread documents |
| unit | rows map to a rule only where a rule exists; IFSC and account carry none |
| unit | documents-disagree is reported as information and never as a blocker |
| unit | the headline count counts rule-backed rows only |
| e2e | two samples → table → use → the verdict changes |
| e2e | cold start with no session shows the persona doors |
| e2e | axe clean, Hindi, 44px |

## 8. Files

New: `src/lib/match/reconcile.ts`, `src/lib/match/reconcile.test.ts`,
`src/components/document-slot.tsx`, `src/app/documents/{page,layout}.tsx`.

Deleted: `src/components/document-reader.tsx`.

Edited: `src/app/check/page.tsx`, `e2e/*`, docs.

## 9. Deferred

Rejection-screenshot OCR — a third slot reading a photographed EPFO rejection
into the decoder's closed rule list, so Sunita stops having to retype an error
message. Its own increment, on purpose.
