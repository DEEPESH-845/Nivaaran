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

[**Live Demo**](https://nivaaran.app/) · [**Demo Script**](docs/DEMO.md) · [**Explore Architecture**](docs/ARCHITECTURE.md)

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

## Get Started

| Resource | Link / Command |
|---|---|
| **Live Demo** | [nivaaran.app](https://nivaaran.app/) *(deployment URL)* |
| **Demo Script** | [docs/DEMO.md](docs/DEMO.md) *(full demo script)* |
| **Run Locally** | `pnpm install && pnpm dev` |

Three synthetic citizens on the landing page. Pick the first one — **“I left my job two months ago and I need my PF money”** — and you are at the verdict in five taps. 

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

1. **Document reading and reconciliation:** Photograph an identity document and a passbook at **[/documents](https://nivaaran.app/documents)** and it reads the four fields the check compares. It says **compare**, not *verify*. We cannot authenticate a government document.
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

We are not proposing to replace EPFO's backend. We are proposing a **validation layer in front of the queue**. The endpoint is documented and runnable at **[/api](https://nivaaran.app/api)**.

---

## Architecture

> [!NOTE]
> Next.js 16 · React 19 · TypeScript (strict) · Tailwind v4 · Zod · OpenAI · Vitest · Playwright + axe-core · Vercel.

No database, no auth, no state library, no component library. Nothing here needed one.

| Directory | Purpose |
|---|---|
| `lib/rules/` | types · sources registry · 9 rules · engine · apply |
| `lib/match/` | name & date reconciliation with token-level diff |
| `lib/ai/` | OpenAI wrapper · pattern-first decoder · extraction schema + scrub · rate limit |
| `app/api/` | `/preflight` · `/ai/decode` · `/ai/explain` · `/ai/extract` |

📖 *Deep dive into architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).*

---

## Quality & Testing

| Metric | Score / Details |
|---|---|
| **Unit tests** | **110** — matching, rules, category routing, bilingual completeness, friction maths |
| **E2E + a11y** | **76** across mobile and desktop — full journey, back button, document reading, 44px targets |
| **axe-core** | **Zero** WCAG 2.1 A/AA violations across 12 states |
| **Lighthouse** | Performance **95** · Accessibility **100** · Best Practices **100** · SEO **100** · CLS **0** |

```bash
# How to run the entire suite locally
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm e2e
```

---

## Honesty & Scope

A judging criterion, and a page in the product: **[/sources](docs/RESEARCH.md)**.

- **What actually works:** The rule engine, name/date reconciliation, IFSC format check, document reading, employer lens, Preflight API, and citations.
- **What is mocked:** The member record, employer roster, claim submission, status progression, and any payment/authentication (none exist in this build).
- **Privacy First:** We never ask for, extract, or store an Aadhaar, PAN, or account number. Your documents are downscaled, scrubbed of EXIF data, sent to OpenAI for one read, and completely discarded.

---

## Roadmap

1. **Authenticated Access:** Read the real member record with consent.
2. **Live NPCI Directory:** Hook up the real IFSC directory instead of the mock set.
3. **Rule Governance:** Named domain owners and changelogs per rule.
4. **More Journeys:** Advances (Form 31), transfers (Form 13), pension (10D).

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
