# DEMO — Nivaaran

Everything needed to run the two-minute submission video and a live walkthrough.

---

## 0. Before you record

```bash
pnpm install
cp .env.example .env.local        # optional: add OPENAI_API_KEY
pnpm dev                          # http://localhost:3000
```

- **No login, no OTP, no payment, no real data** is required anywhere.
- Reviewers need no credentials. The live link opens straight into the product.
- If `OPENAI_API_KEY` is unset, everything still works — the two AI surfaces say so plainly instead of failing. Setting it makes them live.
- Clear a previous run with **Start over** at the bottom of the verdict page.

---

## 1. The 2-minute script

The brief asks for minute one as a citizen and minute two on how and why. Timings are the target, not a straitjacket.

### Minute one — as a citizen

**0:00–0:12 · The number.**
> "Last year, Indians filed 7.96 crore EPF claims. **1.74 crore were rejected.** One in five."

*(landing page on a phone-shaped window)*

**0:12–0:24 · The twist that makes it a product.**
> "EPFO already fixed speed — claims up to ₹5 lakh now settle in about three days with no human involved. So why do 1.74 crore still fail? Because the machine only checks you **after** you apply. The faster it got, the more mercilessly it rejects."

**0:24–0:34 · Intent, not taxonomy.**
> "So we start where the citizen starts."

*Read the three tiles aloud. Click **“I left my job two months ago and I need my PF money.”***

> "Not 'select a form'. Not 'login'. A sentence he'd actually say."

**0:34–0:48 · Five questions.**
*Tap through: last working day, exit date recorded, Aadhaar verified, years of service, amount.*
> "Five questions, plain language. No UAN password. No OTP. Notice ‘I'm not sure’ is always a real answer — for the exit-date question it's the most common one."

**0:48–1:00 · The verdict. This is the moment.**
*Tap **Check my claim**.*
> "**Four things will stop this claim. All four are his to fix — about an hour of work, free.** Filed as it is, he'd have found this out in twenty days, as five words: *Name not as per records.*"

*Point at the diff:*
> "Here's what those five words actually meant. EPFO has **RAJESH K SHARMA**. His Aadhaar says **RAJESH KUMAR SHARMA**. One initial. Twenty days."

**1:00–1:12 · Whose job, and the re-check.**
> "Every problem says whose job it is — his, his employer's, or EPFO's — how long it takes, and where the rule comes from. This one cites EPFO's own January 2025 circular, and the date we checked it."

*Open **How to fix it** → **I've done this — re-check**.*
> "One ten-minute correction, and **four becomes two** — because the bank name was measuring against the same wrong value."

**1:12–1:20 · Completion.**
*Fix the rest or switch to the third persona, file, land on confirmation, then status.*
> "File once. And a status page that tells you what's happening and whether you need to do anything — instead of the word 'Pending'."

*Tap the language toggle:*
> "All of it in Hindi. Not just the menus — the rules, the reasons, the fixes."

### Minute two — how and why

**1:20–1:35 · The engine.**
> "The core isn't AI. It's a deterministic rule engine — nine rules, each carrying the government source it came from, the date we verified it and how confident we are. It's pure: no network, no model. Forty-three unit tests, including one asserting the same facts always give the same verdict."

**1:35–1:45 · Where AI actually earns its place.**
> "AI does two things determinism can't. It rewrites any explanation into simpler language on demand. And it decodes rejection wording we don't recognise — but only into a closed list of nine causes, so it can't invent a reason. Documented phrasings never reach a model at all. Turn AI off entirely and the journey still completes; there's a test that does exactly that."

**1:45–2:00 · End-to-end, and honesty.**
> "The engine is a pure function, so we exposed it as an API. The same check could run inside EPFO's own portal before Submit — or inside an employer's HRMS at exit, which is where the missing exit date is actually created. We're not proposing to replace EPFO's backend; we're proposing a validation layer in front of the queue."

> "And everything mocked is labelled. There's a page listing every source, every confidence level, what's real and what isn't — including where we're honestly *not* better than the current system."

**Closing line:**
> **"We didn't redesign the form. The form was never the problem."**

---

## 2. Live walkthrough paths

| Path | Persona | What it shows | Time |
|---|---|---|---|
| **The main demo** | *"I left my job…"* (Rajesh, 29, Pune) | 4 blockers, all citizen-owned, 60 min of work; one fix clears two | ~60s |
| **The rejection** | *"I filed 24 days ago…"* (Sunita, 41, Jaipur) | Category C: a blocker owned by the **employer**, plus the rejection decoder pre-filled with real EPFO wording | ~45s |
| **The happy path** | *"I think my records are fine"* (Arun, 34, Kochi) | Clear verdict, auto-settlement note, file → confirm → track | ~40s |

**The 30-second version:** landing → Rajesh → five taps → verdict. The name diff is the whole argument.

---

## 3. Things worth showing if there is time

- **Change an answer, change the verdict.** Start Arun, answer *"No, they haven't done it"* on the exit-date question, and watch a clear verdict become blocked. It proves the engine is real, not a slideshow.
- **`GET /api/preflight`** in a browser tab — the contract, the rule ids and the source registry.
- **`/why`** — the friction table, including the three rows where we admit we are not better.
- **`/sources`** — every citation with its verification date and confidence, and the honest note that `epfindia.gov.in` was unreachable from our network.
- **Kill the network** in devtools and keep clicking. The verdict still computes.

---

## 4. Recording notes

- Record at a phone aspect ratio, or a narrow desktop window. The product is mobile-first and looks it.
- The dark notice bar at the top is deliberate — do not crop it out. It is the honesty disclosure.
- The Next.js dev-tools bubble does not appear in a production build; record against `pnpm build && pnpm start`, or the deployed URL.
- Do not enter real personal data on camera, even as a joke.

---

## 5. Known limits to state on camera

Say these out loud rather than letting a judge find them:

1. The member record is synthetic — a production version needs an authenticated read of the real EPFO record, which adds a login this prototype does not have.
2. The retired-IFSC list is a demonstration set, not the live NPCI directory.
3. Claim submission and status progression are simulated. Nothing is sent anywhere.
4. EPFO figures are cited from reporting of the EPFO Annual Report; `epfindia.gov.in` did not resolve from our network.
5. No user research was conducted. The friction analysis is a prototype interaction analysis and says so on the page.
