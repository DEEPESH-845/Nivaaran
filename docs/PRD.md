# PRD — Nivaaran

**Phase 2 deliverable.** v1.0, 23 Aug 2026. Reads on from [RESEARCH.md](./RESEARCH.md).

---

## 1. One-liner

**Nivaaran** tells you whether your EPF claim will actually go through — **before** you file it — and if it won't, tells you exactly what's wrong, whose job it is to fix, and how.

> निवारण — भेजने से पहले ही पता चल जाए।

---

## 2. Problem

EPFO has solved speed. Auto-settlement clears claims up to ₹5 lakh in ~3 days with no human in the loop.

It has not solved **correctness**. In FY 2024-25, **7.96 crore claims were filed and 1.74 crore were rejected — about 1 in 5** — overwhelmingly for record-state mismatches the citizen could not see before submitting: a name spelled differently across Aadhaar and EPFO, a swapped day/month in a date of birth, an IFSC that changed when the bank merged, an exit date the employer never filed.

The citizen learns this **after** the wait, in five words with no fix path: *"Name not as per records."*

**The faster the machine gets, the more mercilessly it rejects.** Speed without pre-validation just converts a slow queue into a fast rejection.

### 2.1 The loop

```
need money → file claim → wait 10–20 days → "Rejected: name not as per records"
   → whose records? which name? → ask HR / YouTube / a paid agent
   → fix the wrong thing → refile → rejected again
```

### 2.2 The part that makes this solvable today

EPFO's circular of **16 Jan 2025** already lets Aadhaar-verified members **self-correct** name, DOB, gender, parents' names, marital status, and date of joining/leaving **online, with no documents, no employer sign-off and no EPFO approval** (Category A/B; Category C still needs a Joint Declaration).

The remedy is free, legal and live. The only missing piece is that **nobody can tell they need it.** That gap is the product — and it requires EPFO to change nothing.

---

## 3. Target user

**Primary — Ramesh, 29, Pune.** Left a manufacturing job six weeks ago; next job starts in three weeks. Has ₹1.4 lakh in EPF and rent due. Android phone, 4G that drops, English is his second language. His UAN was created in 2016 by an employer who typed his name from a handwritten form. He has never heard the words "Joint Declaration."

**Secondary — Sunita, 41, Jaipur.** Filed a claim 24 days ago. Status says *Rejected*. She does not know what to do next and is being quoted ₹2,000 by a local agent to "get it done."

**Tertiary — the employer's HR generalist**, who is the single point of failure for exit dates and does not know a claim is blocked on them. **Served by `/employer`**: the same engine, repartitioned by who can act, showing which leavers are waiting on them and what each one costs in minutes.

Non-users in v1: EPFO staff, pensioners filing 10D, international workers.

---

## 4. Product thesis

> Government portals validate you **after** you apply. Nivaaran validates you **before**.

Corollary that shapes every screen: **the form was never the problem.** We are not building a nicer Form 19. We are building the check that should run before Form 19 exists, and the repair journey that follows from it.

---

## 5. Core journey

Two entry intents, one engine, one completion.

```
                    ┌─ "I left my job and need my PF money"   ──┐
LANDING (no login) ─┤                                            ├─→ SITUATION → PREFLIGHT
                    └─ "My claim was rejected, I don't know why"─┘        (5–6 qs)     │
                                                                                       ▼
                                          ┌──────────────── verdict ────────────────┐
                                          │                                          │
                                    BLOCKED / NEEDS FIX                        WILL GO THROUGH
                                          │                                          │
                                     FIX PLAN  →  (fix)  →  re-run preflight  →  CLAIM → CONFIRM → STATUS
```

### 5.1 Screens (the Phase 4 build list, in order)

| # | Screen | Job to be done | Notes |
|---|---|---|---|
| 1 | **Landing** | State the problem in one sentence; ask for intent, not department | No login. Intent tiles in citizen language. |
| 2 | **Situation** | 5–6 minimum questions, one per screen on mobile | Progressive; "Not sure" is always a valid answer and branches to help. |
| 3 | **Documents** | Read the citizen's actual records | Upload/pick mock Aadhaar + bank passbook. AI extracts; deterministic comparator judges. |
| 4 | **Preflight** ★ | The verdict, with every blocker explained and sourced | **The product.** See §5.2. |
| 5 | **Fix Plan** | Ordered repairs: what, who, how long, free/paid, official link | Category A/B/C routing for self-correction. |
| 6 | **Claim** | The guided application, unlocked only when preflight is clear | Mocked submission, clearly labelled. |
| 7 | **Confirmation** | Reference, timeline, what happens next, what could still go wrong | |
| 8 | **Status** | Explained timeline, not a one-word code | "No action needed from you right now." |
| 9 | **Why this is better** | Before/after + friction analysis + methodology | Judge-facing, linked from footer. |
| 10 | **Sources** | Every rule, its citation, verified date, confidence | Honesty as a surface, not a footnote. |

### 5.2 The Preflight screen — spec

Three possible verdicts, never more:

- **`WILL LIKELY AUTO-SETTLE`** — no blockers. Shows expected path and timeline, with the caveat that EPFO makes the final decision.
- **`FIX N THINGS FIRST`** — blockers found, all citizen-fixable. Shows total repair time.
- **`BLOCKED ON SOMEONE ELSE`** — at least one blocker is the employer's or EPFO's. Shows exactly who, and what to say to them.

Every blocker card carries, without the user asking:

| Field | Example |
|---|---|
| What | Your name in EPFO doesn't match your Aadhaar |
| Evidence | `RAJESH KUMAR SHARMA` vs `Rajesh K Sharma` — character-level diff, shown |
| Why it matters | Auto-settlement compares these character by character; a mismatch stops it |
| Whose job | **Yours** — you can fix this without your employer |
| Effort | ~10 minutes, free, online |
| Fix | Manage → Modify Basic Details (Category A: self-approve) |
| Source | EPFO circular 16 Jan 2025 · verified 23 Aug 2026 · confidence High |

If we are not confident in a rule, the card says so and links out instead of asserting.

---

## 6. Features

### 6.1 In scope (v1)

1. Intent-first entry, no login
2. Situation questionnaire with "Not sure" branches
3. **Deterministic rules engine** — versioned, source-cited, unit-tested, AI-free
4. Document pre-check with AI extraction + deterministic comparison
5. Preflight verdict with per-blocker explanation
6. Fix Plan with Category A/B/C routing
7. Guided claim (mocked) + confirmation + explained status
8. English / हिंदी across *all* copy — errors, help, rules, CTAs — plus a **Simple language** toggle
9. Save & resume (local, clearly marked as device-local)
10. Before/after + friction analysis page
11. Sources registry page
12. **Preflight API** — the same engine as a documented public endpoint (§8)

### 6.2 Explicit non-goals

No login or real auth · no real payments, OTPs or Aadhaar · no chatbot or "ask me anything" · no admin panel · no other portals · no other EPF forms (10D, 13 transfer, 31 advance) in v1 · no native app · no user accounts on a server · no analytics dashboard · no gamification.

If it doesn't move a citizen from *"will this fail?"* to *"this will go through,"* it doesn't ship this week.

---

## 7. AI usage — four surfaces, all optional

Eligibility is **never** decided by a model. The rules engine is deterministic and runs offline. AI does only what determinism cannot:

| # | Surface | Model job | Fallback if AI is down |
|---|---|---|---|
| 1 | **Document reader** ✅ built | Structured extraction from a document image → `{docType, name, dob, ifsc, accountLast4, confidence, quality}` — deliberately no field able to hold an Aadhaar, PAN or full account number | The records already on file, unchanged; a plain line saying reading is unavailable |
| 2 | **Mismatch explainer** ✅ built | Explain *why* two name/date variants fail EPFO's matcher, in plain language | Deterministic diff + a static explanation string |
| 3 | **Rejection decoder** ✅ built | Map free-text EPFO rejection wording → our rule taxonomy | Keyword map covering the documented top-8 reasons |
| 4 | **Plain-language / Hindi** ✅ built | On-demand "What does this mean?" for any rule or term | Pre-translated static strings for every shipped rule |

All four surfaces are built. Provider: **OpenAI** (`gpt-5.x`, structured outputs; the document reader adds one image input). Server-side only; the key never reaches the client. The document reader is the only surface a citizen's own file reaches — it is downscaled and re-encoded in the browser, held for one call, and stored nowhere. See ARCHITECTURE.md §5.1. Timeouts, rate-limit handling and a visible degraded state are required, not optional — see ARCHITECTURE.md.

> **Design rule:** a judge can switch AI off entirely and the core journey still completes. That is the point.

---

## 8. End-to-end thinking (judging criterion #5)

The interface is the smallest part of the answer.

**8.1 The Preflight API.** The rules engine is exposed as `POST /api/preflight` with a documented request/response contract — deliberately shaped as something EPFO or an employer HRMS could call. Three integration points, in increasing order of impact:

| Where it runs | Catches | Who ships it |
|---|---|---|
| Inside the member portal, before *Submit* | Every citizen-fixable mismatch | EPFO |
| In the employer's HRMS at exit | The missing exit date — **at source, before the citizen is blocked** | Employer / payroll vendor |
| At UAN generation | Name/DOB divergence on day 1 | EPFO + employer |

**8.2 Rules as governed data, not code.** Each rule is versioned JSON with `source_url`, `verified_on`, `confidence` and an owner. Updating a rule is a reviewable diff, not a deploy — which is what makes a system like this maintainable by a public body rather than by us.

**8.3 The process gap we surface but cannot fix.** The employer exit-date dependency is a *process* defect: the member is penalised for an employer's omission with no visibility and no lever. Nivaaran names it, tells the citizen exactly who to contact and what to ask for, and flags it as the highest-value upstream fix. We are explicit that this needs EPFO, not us.

**8.4 Scale arithmetic (projection, labelled as such).** From published FY24-25 figures — 1.74 crore rejections. If pre-submission validation prevented even half of the citizen-fixable ones, that is on the order of **tens of lakhs of failed claims avoided per year**, plus the grievance and call-centre volume they generate. This is arithmetic on public numbers, **not a measured outcome**, and is presented that way in the product.

---

## 9. UX principles

1. **Intent before taxonomy.** Never ask a citizen to pick a form number.
2. **Tell them before, not after.** Any check the system will eventually run, run it now.
3. **Name the owner.** Every blocker says whose job it is — yours, your employer's, or EPFO's.
4. **Show your sources.** Every claim about a government rule carries a citation and a confidence level.
5. **"Not sure" is a valid answer.** It is the most honest thing a citizen can say and must never be a dead end.
6. **Progress over tasks.** Always visible: where you are, what's done, what's left, what happens next.
7. **Degrade, never collapse.** No network, no AI, no key — the journey still finishes.
8. **Look trustworthy, not official.** Distinct identity, persistent independent-prototype disclosure, no government logos.

---

## 10. Data & honesty

- **All personal data in the prototype is synthetic.** No real Aadhaar, PAN, UAN, bank or OTP data is accepted or stored; the UI actively warns against entering real values.
- **State is device-local** (browser storage). No server-side user records.
- **Every government rule is sourced.** Anything below High confidence is labelled and links to the official page rather than asserting.
- **Mocked vs real, stated in-product:** submission, status progression, EPFO record lookup, and payment are simulated. The rules engine, the document comparison, the AI calls and the Preflight API are real.
- `epfindia.gov.in` was unreachable from our network during research; EPFO figures are cited from secondary reporting of the EPFO Annual Report, and the app says so.

---

## 11. Friction analysis — method

Called **Prototype Interaction Analysis**, never "user research." Counted for one task (final settlement after leaving a job):

`screens · decisions · fields · unexplained terms · external redirects · auth interruptions · unrecoverable failure points · days until failure is known`

Our numbers are measured from our own build. The EPFO baseline is derived from the **documented public flow and official step-by-step guidance** — we did not and may not walk through a live government system. Both provenances are printed next to the numbers.

The headline metric is the one we can defend without qualification:

> **Days until you find out it failed: ~20 → 0.**

---

## 12. Success criteria

**Must:** a first-time user completes intent → preflight → fix plan → claim → status without instructions · every demoed feature works · core journey completes with AI disabled and on a throttled connection · zero fabricated government facts · limitations visible in-product · live public URL, no access request.

**Should:** Lighthouse Performance ≥ 90, Accessibility ≥ 95 · full keyboard path · English/हिंदी parity on every string · axe: zero critical violations.

**The 30-second test:** a judge who reads only the landing page can state the problem, the insight, and what we built.

---

## 13. Demo narrative (2:00)

**0:00–0:10 — The number.** 7.96 crore claims. 1.74 crore rejected. One in five.
**0:10–0:20 — The twist.** EPFO already fixed speed: ₹5 lakh, 3 days, no human. So why do 1.74 crore still fail? Because the machine only checks you *after* you apply.
**0:20–0:50 — Ramesh.** Intent tile → five questions → uploads his passbook and Aadhaar. Nivaaran reads them and stops him: **`RAJESH KUMAR SHARMA` vs `Rajesh K Sharma`.** *"This claim will be rejected on day 20. Here's why."*
**0:50–1:10 — The fix.** Whose job: his. Time: 10 minutes. Cost: free. He didn't know the rule existed — the source is right there, dated. Re-run: green.
**1:10–1:20 — Completion.** Guided claim, confirmation, a status page that explains itself.
**1:20–2:00 — How and why.** Deterministic sourced rules engine, AI only for document reading and language, OpenAI at runtime, everything mocked is labelled — and the Preflight API: the same check, shaped for EPFO's own portal and for employer HRMS at exit.

**Closing line:** *"We didn't redesign the form. The form was never the problem."*
