# The employer lens — design

**Date:** 24 Aug 2026 · **Horizon:** ~1 day · **Status:** built

Reads on from [PRD.md](../../PRD.md) §3 and §8.1, and
[ARCHITECTURE.md](../../ARCHITECTURE.md) §4.

> **Built 24 Aug 2026.** All of §5–§11 shipped as designed. On the roster the
> engine reports 6 of 9 blocked, 3 waiting on the employer, 46 minutes — and
> Sunita's Joint Declaration is billed once across her name and date of birth,
> which is what §7 was for. 98 unit tests, 66 e2e.

---

## 1. The gap

The product's central claim is that naming the owner is the product. It names
four owners — `citizen | employer | epfo | time` — and helps one of them.

The dead-end is already reachable. A Category C member (UAN never
Aadhaar-validated) gets `owner: "employer"` on `R-EXIT-DATE`,
`R-NAME-AADHAAR` and `R-DOB-AADHAAR`. That is the Sunita persona, one click
from the landing page. She is told *"Your employer must do this"* and the
product stops.

Two documents already promise the other half and nothing demonstrates it:

| Where | What it says |
|---|---|
| `PRD.md` §3 | Tertiary user: **"the employer's HR generalist, who is the single point of failure for exit dates and does not know a claim is blocked on them."** |
| `PRD.md` §8.1, `README.md` | "In the employer's HRMS at exit — the missing exit date, **at source, before the citizen is blocked**." |

## 2. Goal

Show an employer, in the unit they think in, which of their leavers will have a
claim rejected — and which of those only they can prevent.

**Non-goals.** No login, no employer accounts, no data intake of any kind (no
upload, no paste, no CSV). No second rule set. No coupling to the citizen's
session. No claim that this is an EPFO system.

## 3. The reader

An HR generalist, not a benefits specialist. They are not obstructive; they are
uninformed. Nobody has ever told them that a field they did not fill in is why
a former employee has been waiting four months for their own money.

So the screen is a work queue, not a dashboard. Every item names a person, says
how long that person has been waiting, and is small enough to do now.

## 4. Approach

**A second lens on the same engine.** `/employer` reads the same `Facts`
through the same `preflight`. Rejected alternatives:

- *An employer-specific rule set* — more faithful to what HR owns (exit-date
  deadlines, ECR compliance, KYC approval queues), but it doubles the rule
  surface, needs sources we cannot verify from this network, and breaks the one
  claim the product rests on: one engine, many readers.
- *API-only* — a batch endpoint and integration docs. Cheapest, invisible in a
  two-minute demo, and no help at all to the person in §3.

## 5. Data

`src/content/roster.ts` — nine synthetic leavers from one invented
establishment. Each is:

```ts
interface Leaver {
  id: string;
  name: string;
  uan: string;          // masked, obviously fake
  role: Bi;
  facts: Facts;         // the same shape the engine already takes
}
```

Three of the nine are the existing personas, importing `personas.ts` rather
than restating them: a judge arriving from the citizen side recognises Sunita
and Rajesh, and there is one record for each person, not two.

"Days waiting" is `facts.daysSinceExit` — already there. No exit date is
stored, so `reviewRoster` needs no clock and stays trivially testable.

## 6. The pure part

`src/lib/rules/roster.ts`:

```ts
reviewRoster(leavers: Leaver[]): RosterSummary
```

Runs `preflight` per leaver and partitions:

| Group | Rule |
|---|---|
| `yours` | at least one blocker with `owner === "employer"` |
| `theirs` | blocked, but nothing the employer can act on |
| `clear` | no blockers |

`yours` and `theirs` sort by `daysSinceExit` descending — longest wait first,
because that is the person the delay is costing.

No I/O, no clock, no model. Same contract as `preflight`.

## 7. The one engine change

Employer steps cannot be the citizen's steps: *"sign in with your UAN"* is
wrong advice for HR. So `Finding` gains an optional `employerFix?: Fix`,
populated by exactly the three rules that can be employer-owned. Domain copy
stays with the rule, as the conventions require, and `preflight` stays pure.

**And one latent bug, fixed while we are here.** Correcting a name and a date
of birth is one visit to Modify Basic Details, and one Joint Declaration covers
both fields — but `minutesToFix` sums per finding, so a member with both
mismatches is quoted double. No current persona has both on the same side, so
nothing on screen changes today. `Fix` gains an optional `fixKey`; two fixes
sharing a key are one action, and both `minutesToFix` and `reviewRoster` sum
distinct keys. Fixed in the shared function rather than in each caller.

## 8. The screen

One derived headline — *"N of your 9 leavers will have a claim rejected. M of
those are yours to prevent."* Every number computed from `preflight`; none
written down. Then the three groups from §6, then the argument in one line:
filing an exit date costs the employer minutes now, or the ex-employee about
twenty days later.

Each row expands to the employer's steps and an *"I've filed this — re-check"*
button that re-runs `preflight` through `applyFix`, exactly as the citizen's
`markFixed` does, carrying the same honest label about assuming the change
landed in EPFO.

**Reachability.** A footer link, and — the one that matters — a link from any
employer-owned finding on `/preflight`, so the citizen who was just told
"your employer must do this" can show them.

## 9. Honesty

`epfindia.gov.in` still does not resolve from our network, so employer steps
stay at the level the existing `epfo-jd-2025` citation supports — *"record the
date of exit against their UAN"*, *"attest the Joint Declaration and forward
it"* — never a click path. Each `employerFix` carries a caveat saying exact
navigation differs by establishment and portal version. The `officialUrl`
points at the employer portal, symmetric with the member portal URL the citizen
fixes already use.

The roster is synthetic and labelled as such on the page, alongside the
standing disclosure that this is not an EPFO system.

## 10. Tests

| Level | What |
|---|---|
| unit | `reviewRoster` partitions by employer ownership, orders by wait, counts correctly |
| unit | every roster record is engine-valid and produces the verdict the fixture claims |
| unit | `fixKey` de-duplicates: two findings sharing a key are billed once |
| unit | bilingual completeness for roster `role` strings (by type) |
| e2e | `/employer` shows the derived headline and employer-owned rows first |
| e2e | marking one done re-checks and moves the row out of "only you can fix" |
| e2e | axe clean on `/employer`, Hindi, 44px targets |

## 11. Files

New: `src/content/roster.ts`, `src/lib/rules/roster.ts`,
`src/lib/rules/roster.test.ts`, `src/app/employer/{page,layout}.tsx`,
`src/components/leaver-row.tsx`.

Edited: `src/lib/rules/types.ts` (`Fix.fixKey`, `Finding.employerFix`),
`src/lib/rules/rules.ts` (three `employerFix` blocks, `fixKey` tags),
`src/lib/rules/engine.ts` (`minutesToFix` de-duplication),
`src/components/shell.tsx`, `src/components/finding-card.tsx`,
`e2e/*`, and the docs in §10 of the document pre-check spec.

## 12. Deferred

Employer authentication and a real establishment roster · exit-date filing
deadlines as rules · ECR and contribution-side checks · notifying the member
when the employer acts · a batch endpoint on the Preflight API.
