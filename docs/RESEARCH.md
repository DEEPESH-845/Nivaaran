# RESEARCH — Build What Moves India

**Phase 1 deliverable.** Compiled 23 Aug 2026. Submission deadline: **28 Aug 2026, 20:00 IST** (~5 days).

---

## 0. Two findings that change strategy before anything else

### 0.1 Codex / OpenAI is a hard requirement

From the official FAQ, verbatim:

> **Is Codex mandatory?** *Yes, for the prototype submitted to this hackathon.* Codex should be meaningfully involved in the build. You may use other development tools and libraries, but your submission should explain how Codex contributed.

And from the Builder Brief:

> your prototype should be **built with Codex or powered by an OpenAI model.**

**Compliance path taken: runtime.** Every AI call in the product goes to an **OpenAI model** (`gpt-5.x` family, structured outputs). This satisfies "powered by an OpenAI model" literally and verifiably — reviewers can read it in `lib/ai/`, in the environment contract, and see it in the network tab. The AI layer is not decorative: it performs document extraction and cross-script name reconciliation that the deterministic engine cannot do (§4.1).

Operationally this needs `OPENAI_API_KEY` in `.env.local` and in the Vercel project environment before the live link goes out. Until it is set, every AI surface degrades to a recorded fixture plus the deterministic engine, so the core journey never depends on it (§6).

### 0.2 The judging rubric has a criterion almost every team will fail

Verbatim criteria:

| # | Criterion | Question asked |
|---|---|---|
| 1 | Problem | Is this a real and important user problem? |
| 2 | Working build | Does the main journey actually work? |
| 3 | Usability | Is the experience simpler, clearer and more accessible? |
| 4 | Product thinking | Are the choices thoughtful and well explained? |
| 5 | **End-to-end thinking** | **Does the solution address the backend, infrastructure and processes, not just the interface?** |
| 6 | Honesty | Are limitations, mock data and dependencies clearly disclosed? |

**#5 is the differentiator.** A field of ~250+ submissions redesigning government front-ends will be dominated by prettier forms. #5 explicitly rewards a team that understands the *process* behind the form. #6 rewards a team that shows its seams instead of hiding them.

This directly shapes the product: we should pick a problem whose root cause is **process, not layout**, and we should make our sourcing and our limitations *visible product surfaces*, not footnotes.

### 0.3 Other binding constraints from the brief

- Live public URL, opens without requesting access. No mobile app.
- 2-minute video: minute 1 = citizen demo, minute 2 = how/why you built it.
- <250-word summary.
- Mock/synthetic data only. **Never** real Aadhaar/PAN/OTP/payment/passwords.
- Must not appear official or endorsed; no government logos implying approval. Label as an **independent hackathon prototype**.
- Must not touch live government systems, private APIs, or scrape restricted data.
- "Every feature you demo must work." A static design is explicitly not enough.
- Stage 2: top 250 → one week of mentorship → resubmit 7 Sep → 10 finalists → Bengaluru finale 12 Sep.

---

## 1. Portal selection — weighted decision matrix

Weights derive from the rubric above (Problem 20, Working build/feasibility 20, Usability delta 15, End-to-end depth 15, Demonstrability 15, Memorability 15 — normalised below). Scores 1–10. This is **our judgement**, not measured data; it is documented so it can be argued with.

| Criterion | Wt | Parivahan (DL) | **EPFO (PF claim)** | CPGRAMS | Income Tax | IRCTC | Cybercrime portal | UMANG | GST/MCA |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Pain severity (money/time at stake) | 15 | 6 | **10** | 7 | 5 | 6 | 9 | 4 | 6 |
| Frequency × affected population | 15 | 8 | **9** | 5 | 7 | 9 | 5 | 6 | 4 |
| Root cause is *process*, not layout (rubric #5) | 15 | 5 | **10** | 8 | 4 | 3 | 7 | 3 | 6 |
| Demonstrability in 60s | 12 | 8 | **9** | 5 | 6 | 7 | 6 | 4 | 3 |
| Build feasibility in 5 days | 12 | 8 | **8** | 8 | 6 | 5 | 7 | 6 | 4 |
| Verifiable public facts to build on | 10 | 6 | **9** | 6 | 7 | 5 | 4 | 4 | 6 |
| Genuine, non-decorative AI value | 10 | 6 | **9** | 8 | 5 | 2 | 6 | 4 | 6 |
| Judge memorability / low copycat risk | 11 | 5 | **8** | 6 | 3 | 2 | 8 | 3 | 5 |
| **Weighted total /10** | | **6.6** | **9.0** | **6.6** | **5.5** | **5.4** | **6.8** | **4.3** | **5.0** |

### Why the runners-up lose

- **Parivahan / DL renewal** (the brief's default hypothesis in our directive): genuinely painful and highly relatable — Trustpilot 1.7/5, documented broken photo/signature upload logic, payment failures. But the pain is *wayfinding and flakiness*. Our fix would be "a clearer wizard." That is criterion #3 only; it scores poorly on #5 and is copyable in a weekend. Kept as the fallback if EPFO research had collapsed.
- **IRCTC**: highest traffic, but the pain is *contention* (Tatkal seat scarcity), which a prototype cannot fix, and there are dozens of mature third-party apps. Also the single most predictable submission in the field — Varun's launch post tagged @IRCTCofficial, so expect heavy duplication.
- **Income Tax e-filing**: seasonal (once a year), and ClearTax/Quicko already solved the citizen layer commercially. Weak "why doesn't this exist" answer.
- **CPGRAMS**: strong #5 story (grievance mis-routing), but the outcome is inherently uncertain, so we cannot demo a *completed* journey — which the brief requires.
- **Cybercrime portal**: excellent pain and memorability, real "golden hour" urgency. Rejected on population scale and because a fraud-victim demo is emotionally heavy for a 2-minute video, and the correct fix is mostly institutional speed, not citizen-side UX.
- **UMANG / GST / MCA**: aggregator (too broad) or business-user (not "citizen").

**Selected: EPFO — the PF claim journey, focused on claim rejection.**

---

## 2. The chosen problem, stated precisely

### 2.1 The number

| Fact | Value | Source | Confidence |
|---|---|---|---|
| EPF claims filed, FY 2024-25 | **796 lakh (7.96 crore)** | EPFO Annual Report via Business Today, 7 Jul 2026 | High |
| Claims **rejected**, FY 2024-25 | **174 lakh (1.74 crore)** | same | High |
| Rejection rate FY25 | **~22%** (≈1 in 5) | same | High |
| 5-year average rejection rate | **~26%** | same | Medium |
| Rejection rate FY 2021-22 | **~29%** | same | Medium |
| Active contributing subscribers FY24 | **7.37 crore** (up from 6.85 cr FY23) | Business Standard | Medium |
| Auto-settlement claim ceiling | **raised ₹1 lakh → ₹5 lakh** | 2025-26 EPFO rule change, widely reported | Medium |
| Auto-settled claims target time | **~3 days**, no human involvement, **requires full KYC compliance** | same | Medium |

> Primary source note: `epfindia.gov.in` did not resolve from our network during research (connection timeout; `unifiedportal-mem.epfindia.gov.in` responded 200). Every EPFO figure above is therefore cited from **secondary reporting of the EPFO Annual Report**, and is labelled as such in the product. We do not present any of it as directly scraped from EPFO. This limitation ships visibly in the app's Sources page.

### 2.2 The paradox that is the actual product insight

EPFO has largely **solved speed**. Auto-settlement now clears claims up to ₹5 lakh in ~3 days with no human in the loop.

But auto-settlement only fires when the member's record is **perfectly consistent**. So:

> **The faster the machine got, the more mercilessly it rejects imperfect records.**
> ~1.74 crore claims a year still fail — not because the form is ugly, but because of data mismatches the citizen **cannot see before they submit**.

Documented rejection causes (all *record-state* problems, none of them a UI problem):

1. Name spelling differs across EPFO / Aadhaar / PAN (e.g. `RAJESH KUMAR SHARMA` vs `Rajesh K Sharma`)
2. Date-of-birth mismatch — cited as the single biggest cause of EPS pension rejection; a swapped day/month is enough
3. Bank account or IFSC wrong — very commonly a **stale IFSC after a bank merger**
4. KYC not *verified* (present ≠ verified)
5. Multiple UANs from previous jobs, not merged
6. **Employer never filed the exit date** — the member cannot fix this alone
7. Employer approval still pending on KYC / exit / claim
8. EPS service records not linked, or EPS contributions made when ineligible

### 2.3 The loop we are killing

```
Citizen needs money  →  logs in  →  fills claim  →  submits
        →  waits 10–20 days
        →  "Claim Rejected: Name not as per records"   ← cryptic, no fix path
        →  citizen doesn't know what "as per records" means, or whose records
        →  asks HR / a friend / a YouTube video / a paid agent
        →  fixes the wrong thing
        →  resubmits  →  rejected again
```

Every arrow after "submits" is dead time on money the citizen already owns — often needed for a medical emergency, a wedding, or rent after a layoff.

**Where the time goes is the whole point: the government validates you *after* you apply.**

### 2.4 The fix is already legal — and nobody knows it exists

EPFO circular dated **16 Jan 2025** (press release 19 Jan 2025) simplified the Joint Declaration process and sorted members into three categories:

- **Category A** — UAN generated from Aadhaar on/after 1 Oct 2017 → **self-correct online, no documents, no employer, no EPFO approval**
- **Category B** — UAN before 1 Oct 2017 but Name/DOB/Gender Aadhaar-validated by UIDAI → self-service with limits
- **Category C** — no UAN, Aadhaar not validated, or deceased member → full Joint Declaration with employer

Correctable fields for A/B: name, DOB, gender, nationality, father/mother's name, marital status, spouse name, **date of joining, date of leaving**.

> This is the crux. **The correction path exists and is free.** The citizen just has no way to learn (a) that they need it, (b) which category they're in, or (c) that it is the thing standing between them and their money. That gap is a product, and it is a product that helps at national scale without EPFO changing a single backend system.

Source: EPFO Circular 16 Jan 2025 (supersedes SOP v3.0 of 31 Jul 2024); official PR `EPFOSimplifiesOnlineProcessForMemberProfileUpdation_19012025.pdf`; corroborated by Deloitte India tax alert (31 Jan 2025) and KEA circular 012/2025. Confidence: **High** on existence and category structure; **Medium** on the exact current field list, which is labelled as such in the app.

---

## 3. Current experience — friction audit

Method: **prototype interaction analysis** — a structured walkthrough of the documented public flow and published step-by-step guides. **Not** user testing; no users were observed. Labelled as such wherever a number appears in the product.

| Dimension | Current EPFO claim journey |
|---|---|
| Entry point | Login-first. You must have a UAN + password + OTP *before* the system tells you anything. |
| Vocabulary | Form 19 / Form 31 / Form 10C / 10D, "Joint Declaration", "EPS service", "DOE", "PMMY". None map to a citizen's sentence. |
| Intent mismatch | Citizen thinks *"I left my job and need my money."* Portal asks *"Select claim form."* |
| Pre-submission feedback | **None.** No check tells you your claim will fail. |
| Failure feedback | Post-hoc, terse, uncoded for humans ("Name not as per records"). |
| Fix path | Not linked from the rejection. Lives in a different menu (Manage → Modify Basic Details) under a name the citizen has never heard. |
| Employer dependency | Invisible. The member cannot tell that a missing exit date is the employer's job, not theirs. |
| Mobile | Portal is desktop-era; heavy tables, small targets. |
| Language | English-dominant for the parts that matter (errors, help). |
| Recovery | Session timeouts lose form state. |

### 3.1 Competitive landscape

| Experience | Discovery | Guidance | Pre-check | Forms | Status | Accessibility |
|---|---|---|---|---|---|---|
| EPFO Unified Member Portal | Login-gated | Statutory wording | **None** | Official | Terse code | Weak |
| UMANG app | Buried in 100s of services | Thin | None | Mirrors EPFO | Mirrors EPFO | Medium |
| YouTube / blog guides (Kustodian, RTI Wiki, CitizenNest…) | Good (SEO) | **Good** | Generic, not personal | n/a | n/a | n/a |
| Paid "PF consultants" / agents | Word of mouth | Personal | Manual, human | They fill it | They chase | n/a |
| **Us** | Intent-first, no login | Personalised | **Deterministic, pre-submission, cited** | Guided | Explained | WCAG-targeted, bilingual |

The entire third-party market is **content** (generic advice) or **humans** (agents charging for what is free). Nobody runs the citizen's *own record state* against the rules **before** submission. That is the open lane.

---

## 4. Product decision

**Name: `Nivaaran`** — Hindi/Urdu, pan-Indian: *certain, confirmed, solid, will-definitely-happen.* It is literally the question an Indian asks before submitting anything important: *"nivaaran na?"* It names the outcome the citizen wants (certainty), not the mechanism. One word, memorable in a room of 250 projects, warm, non-corporate, and it scales beyond EPF.

*Runner-up considered: **Milaan** (मिलान, "matching/reconciliation") — precise about the mechanism, more dignified, less emotionally immediate. Recorded here in case we want to switch.*

**Thesis:**

> Government portals validate you **after** you apply. `Nivaaran` validates you **before** — so the 1 in 5 claims that die in a 20-day rejection loop never get filed in the first place.

**Positioning line for the video:** *"We didn't redesign the form. The form was never the problem."*

**Scope: one journey, end to end.** *"I left my job and need my PF money."* (Form 19 + 10C final settlement.) Secondary entry point, which the government portal has no answer for at all: *"My claim was rejected and I don't know why."*

### 4.1 What makes it technically credible (and hard to copy in a weekend)

1. **A deterministic, versioned, source-cited rules engine.** Every rule is `{id, gate, predicate, severity, citizen_explanation, fix_path, source_url, verified_on, confidence}`. Eligibility is **never** decided by an LLM. The engine is unit-tested and runs with the AI completely offline.
2. **Every verdict shows its source.** Tap any rule → the citation, the date we verified it, and our confidence. This turns rubric #6 (Honesty) from a disclaimer into a feature, and it is exactly what a government reviewer would demand before trusting the output.
3. **AI used surgically, only where determinism can't reach:** document reading (structured outputs), cross-script/format name reconciliation, plain-language + Hindi explanation, and decoding a pasted rejection message. All degrade gracefully to the deterministic path.
4. **The end-to-end answer (rubric #5):** we ship a `Preflight API` contract — the same engine expressed as the endpoint EPFO or an employer HRMS could call — plus the employer-side gap (exit date) and what fixing this upstream does to grievance volume. We are not proposing to replace EPFO's backend; we are proposing a validation layer that runs *before* the queue.

---

## 5. User research status — honest disclosure

**No user interviews were conducted.** With ~5 days, fabricating interview quotes would be both dishonest and against rubric #6. What we have instead, clearly separated in the product and docs:

- **Observed (documented, citable):** rejection volumes and rates; the published taxonomy of rejection causes; the Jan-2025 self-correction rules; Trustpilot/complaint-board evidence of portal friction; auto-settlement thresholds.
- **Hypothesis (ours, labelled):** that citizens cannot self-diagnose a rejection reason; that they don't know the self-correction route exists; that the wait-then-reject loop is the dominant time cost. These are marked **Hypothesis** wherever they appear.

If we reach the top 250, the mentorship week is the moment to convert hypotheses into 5–8 real conversations before the 7 Sep resubmission.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| **Codex requirement not met** | §0.1 — OpenAI models at runtime + operator runs Codex on the rules engine/tests; log it in `docs/CODEX.md`. **Open — needs Deepesh.** |
| Stating a government rule that is wrong | Every rule carries a source + verified date + confidence, surfaced in the UI. Anything below High confidence is labelled and linked out. Nothing is invented. |
| Looking like an official EPFO product | Persistent "independent prototype, not affiliated with EPFO or GoI" banner. No government logos. Distinct visual identity. |
| Scope explosion (Hindi, docs AI, status, admin) | One journey. Feature freeze after Phase 4. Priority order in the directive §43 is binding. |
| OpenAI API down during judging | Deterministic engine is the product; AI is additive and every AI surface has a static fallback. Judges can toggle it. |
| "This is just a form wizard" | Lead the demo with the rejection, not the form. The 20-day loop is the story. |
| EPFO is a crowded pick (tagged in the launch post) | Our angle is the differentiator, not the portal. The contrast with 10 other EPFO redesigns *helps* us. |

---

## 7. Sources

| # | Claim | URL | Verified | Confidence |
|---|---|---|---|---|
| S1 | Hackathon brief, rules, judging criteria, deadline | https://buildwhatmovesindia.com/brief | 2026-08-23 | High |
| S2 | Hackathon FAQ (Codex mandatory, mock data, no live systems) | https://buildwhatmovesindia.com/faq | 2026-08-23 | High |
| S3 | 796 lakh claims / 174 lakh rejected / ~22% FY25 | https://www.businesstoday.in/personal-finance/news/story/epfos-instant-pf-withdrawal-promise-has-a-catch-one-in-five-claims-still-gets-rejected-541466-2026-07-07 | 2026-08-23 | High |
| S4 | EPFO simplifies member profile updation (self-correction) — official PR | https://www.epfindia.gov.in/site_docs/PDFs/EPFO_PRESS_RELEASES/EPFOSimplifiesOnlineProcessForMemberProfileUpdation_19012025.pdf | 2026-08-23 (host unreachable from our network; content corroborated) | Medium-High |
| S5 | Joint Declaration simplification, Category A/B/C | https://www.deloitte.com/content/dam/assets-zone1/in/en/docs/services/tax/2025/in-tax-alert-ges-simplification-of-joint-declaration-process-key-updates-noexp.pdf | 2026-08-23 | High |
| S6 | Rejection cause taxonomy | https://www.outlookmoney.com/retirement/pension/epf-claim-settlement-why-epfo-rejects-the-claims-and-what-subscribers-can-do | 2026-08-23 | Medium |
| S7 | Subscriber base 7.37 cr contributing (FY24) | https://www.business-standard.com/economy/news/epfo-s-investible-corpus-more-than-doubled-in-5-years-to-rs-24-75-trillion-124120301152_1.html | 2026-08-23 | Medium |
| S8 | Parivahan/Sarathi rated 1.7/5 (rejected-option evidence) | https://www.trustpilot.com/review/sarathi.parivahan.gov.in | 2026-08-23 | Medium |
| S9 | Hackathon announcement / OpenAI partnership | https://www.storyboard18.com/digital/varun-mayya-openai-launch-hackathon-for-indias-public-services-ws-l-107276.htm | 2026-08-23 | High |
| S10 | EPFO member portal (reachability check only — not accessed further) | https://unifiedportal-mem.epfindia.gov.in/memberinterface/ | 2026-08-23 | High |

No live government system was accessed, tested, or interfered with. Reachability was checked with a single unauthenticated HEAD-equivalent request; no data was retrieved beyond HTTP status.

---

## 8. What happens next

Phase 2 → `docs/PRD.md`. Phase 3 → IA + design system. Phase 4 → the eight core screens. Nothing else until those work.
