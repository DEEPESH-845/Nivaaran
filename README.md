<div align="center">

# Nivaaran · निवारण

### Know your PF claim will go through — before you file it.

*Built for [Build What Moves India](https://buildwhatmovesindia.com/).
An independent hackathon prototype. Not affiliated with EPFO or the Government of India.*

</div>

---

## The problem

Last year Indians filed **7.96 crore** EPF claims. **1.74 crore were rejected** — about one in five.

Almost none of those failed because a form was ugly. They failed on a mismatch inside the citizen's own record that nobody ever showed them: a name spelled differently across Aadhaar and EPFO, a swapped day and month in a date of birth, an IFSC that died when the bank merged, an exit date the employer never filed.

Here is the part that makes it a product rather than a complaint:

> **EPFO has already solved speed.** Auto-settlement clears claims up to ₹5 lakh in about three days with no human reviewer. But it only fires on a perfect record.
>
> **The faster the machine got, the more mercilessly it rejects.**

The citizen finds out on day twenty, in five words, with no fix path:

```
Claim rejected: Name not as per records.
```

Which name? Which record? The portal does not say.

---

## The solution

**Government portals validate you *after* you apply. Nivaaran validates you *before*.**

You say what you need in your own words. Five plain questions, no login, no OTP. Then Nivaaran runs every check EPFO will run and tells you exactly what will fail, **whose job it is to fix**, how long it takes, and where the rule comes from.

```
EPFO record   RAJESH   K       SHARMA
Your Aadhaar  RAJESH   KUMAR   SHARMA
```

*One initial. Twenty days to discover it. About ten minutes to fix — if somebody tells you.*

And somebody can, because **the fix already exists and is free**: EPFO's circular of 16 January 2025 lets Aadhaar-verified members self-correct their name, date of birth and exit date online — no documents, no employer, no EPFO approval. Almost nobody knows the rule exists, or that it is the only thing standing between them and their money.

---

## Demo

| | |
|---|---|
| **Live** | *(deployment URL)* |
| **Video** | *(2-minute link)* |
| **Run it** | `pnpm install && pnpm dev` |

Three synthetic citizens on the landing page. Pick the first one — **“I left my job two months ago and I need my PF money”** — and you are at the verdict in five taps.

Full script in [docs/DEMO.md](docs/DEMO.md).

---

## How it works

**The core is not AI. It is a deterministic rule engine.**

```ts
preflight(facts: Facts): PreflightResult    // pure. no network, no model, no I/O.
```

Nine rules. Each one carries, as data, the government source it came from, the date we last checked it, and how confident we are — all of it visible in the product, one tap from any finding. Each finding names its **owner**: you, your employer, EPFO, or time. Employer-owned work sorts first, because it has the longest queue.

Mark a fix done and the engine re-runs live. For the demo record, one ten-minute name correction takes it from **4 blockers to 2** — because the bank-name check was measuring against the same wrong value.

### Where AI earns its place

AI never decides eligibility. It does two things determinism cannot:

1. **Rejection decoding.** Documented EPFO phrasings are matched by pattern — free, instant, offline. Only wording the patterns do not recognise reaches a model, and the model can only choose from a **closed list of nine rule ids**. It cannot invent a cause. When nothing fits, it says so rather than guessing.
2. **Plain language.** Any explanation can be rewritten into the simplest possible wording, in English or Hindi, on demand — with the original always visible above it and the model instructed never to add or remove a fact.

Both degrade to the deterministic path. **A Playwright test aborts every AI request and asserts the journey still completes.**

---

## Why it matters

The interface is the smallest part of the answer. Because the engine is a pure function, it is also a public API — deliberately shaped as something that could run where the damage is actually done:

| Where the same check could run | What it catches | Whose deployment |
|---|---|---|
| In the member portal, before **Submit** | Every citizen-fixable mismatch, while it still costs ten minutes instead of twenty days | EPFO |
| In an employer's HRMS, at exit | The missing exit date — **at source**, before a member is ever blocked by it | Employer / payroll vendor |
| At UAN generation | Name and date-of-birth divergence on day one | EPFO with the employer |

We are not proposing to replace EPFO's backend. We are proposing a validation layer in front of the queue.

**Scale, as arithmetic on published figures:** 1.74 crore rejections a year. If pre-submission validation prevented even half of the citizen-fixable ones, that is tens of lakhs of failed claims avoided annually, plus the grievance and call-centre volume they generate. *A projection, not a measured outcome — and labelled that way in the product.*

---

## Architecture

Next.js 16 · React 19 · TypeScript (strict) · Tailwind v4 · Zod · OpenAI · Vitest · Playwright + axe-core · Vercel.

No database, no auth, no state library, no component library. Nothing here needed one.

```
lib/rules/     types · sources registry · 9 rules · engine · apply
lib/match/     name & date reconciliation with token-level diff
lib/ai/        OpenAI wrapper · pattern-first decoder · rate limit
app/api/       /preflight  ·  /ai/decode  ·  /ai/explain
```

Details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Quality

| | |
|---|---|
| **Unit tests** | **43** — matching, every rule, category routing, ordering, determinism, bilingual completeness, decoder, friction maths |
| **E2E + a11y** | **43** across mobile and desktop — full journey, answer changes, back button, refresh, deep links, AI failure, Hindi, keyboard-only, 44px targets |
| **axe-core** | **Zero** WCAG 2.1 A/AA violations across 8 states, including all-panels-open and full Hindi |
| **Lighthouse** | Performance **95** · Accessibility **100** · Best Practices **100** · SEO **100** · CLS **0** |
| **Contrast** | Every token computed, not eyeballed. Three failed the first pass and were darkened until they cleared 4.5:1 |

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm e2e
```

---

## Honesty

A judging criterion, and a page in the product: **[/sources](docs/RESEARCH.md)**.

**What actually works:** the rule engine · name and date reconciliation and the diff you are shown · the IFSC format check · the public Preflight API · every citation, date and confidence level.

**What is mocked:** the member record (synthetic, not read from EPFO) · claim submission (nothing is sent anywhere) · status progression (stepped by hand, and labelled) · the retired-IFSC list (a demonstration set, not the live NPCI directory) · any payment, OTP or authentication (none exists in this build).

**What we do not claim:** no user research was conducted, and the friction analysis says so on its own page — it is a *prototype interaction analysis*, with its formula printed so you can disagree with it. `epfindia.gov.in` did not resolve from our network during research, so EPFO figures are cited from reporting of the EPFO Annual Report, and the product says so. **Where we could not verify a rule, we labelled it and linked out rather than inventing one.**

`/why` includes a section titled *“Where we are honestly not better”* — including that we use **more** screens than EPFO, not fewer.

---

## Roadmap

1. An authenticated, consented read of the real member record — the single biggest change, and the one that adds back the login we currently avoid.
2. Document extraction from a photographed Aadhaar or passbook, labelled *pre-check only; EPFO performs final verification*.
3. The live NPCI/RBI IFSC directory in place of the demonstration set.
4. Rule governance: a named domain owner, a changelog per rule, re-verification dates enforced in CI.
5. More journeys on the same engine — advances (Form 31), transfers (Form 13), pension (10D).

---

## Safety and scope

No live government system was accessed, tested or interfered with. No scraping, no private APIs, no government infrastructure. No government logo is used and nothing here is presented as official. No real Aadhaar, PAN, UAN, bank detail, password or OTP is requested or stored anywhere, and the UI warns against entering one.

## Documents

[RESEARCH](docs/RESEARCH.md) · [PRD](docs/PRD.md) · [DESIGN](docs/DESIGN.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [DEMO](docs/DEMO.md)
