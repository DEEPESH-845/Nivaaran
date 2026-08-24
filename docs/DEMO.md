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
- If `OPENAI_API_KEY` is unset, everything still works — the AI surfaces say so plainly instead of failing. Setting it makes them live, the document reader included.
- **Never put a real document in the reader on camera.** Use the three synthetic specimens in `/public/samples`; the screen tells the citizen the same thing.
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

**0:34–0:46 · Five questions.**
*Tap through: last working day, exit date recorded, Aadhaar verified, years of service, amount.*
> "Five questions, plain language. No UAN password. No OTP. Notice ‘I'm not sure’ is always a real answer — for the exit-date question it's the most common one."

**0:46–0:56 · The record, read off a document.**
*On the records step, follow **“Read these from your documents instead”** to `/documents`, and read both specimens.*
> "These two rows are what the check compares. He can also just photograph the documents — this reads the four fields off them and lines them up against the record, one by one. Note what it will not read: there is no field in the schema for an Aadhaar number, a PAN or a full account number, so the model has nowhere to put one. Last four digits, and that's it."

*Point at the two different badges:*
> "And look at what it refuses to overstate. The name says **will stop your claim** — that maps to a real EPFO rule. The IFSC says only **worth knowing**, because no EPFO rule compares those; a difference there sends the money elsewhere, it does not reject the claim. It pre-fills and never commits, every value is editable, and the page says **compare**, never *verify* — we cannot tell you a document is genuine."

**0:56–1:08 · The verdict. This is the moment.**
*Tap **Check my claim**.*
> "**Four things will stop this claim. All four are his to fix — about an hour of work, free.** Filed as it is, he'd have found this out in twenty days, as five words: *Name not as per records.*"

*Point at the diff:*
> "Here's what those five words actually meant. EPFO has **RAJESH K SHARMA**. His Aadhaar says **RAJESH KUMAR SHARMA**. One initial. Twenty days."

**1:08–1:18 · Whose job, and the re-check.**
> "Every problem says whose job it is — his, his employer's, or EPFO's — how long it takes, and where the rule comes from. This one cites EPFO's own January 2025 circular, and the date we checked it."

*Open **How to fix it** → **I've done this — re-check**.*
> "One ten-minute correction, and **four becomes two** — because the bank name was measuring against the same wrong value."

**1:18–1:26 · Completion.**
*Fix the rest or switch to the third persona, file, land on confirmation, then status.*
> "File once. And a status page that tells you what's happening and whether you need to do anything — instead of the word 'Pending'."

*Tap the language toggle:*
> "All of it in Hindi. Not just the menus — the rules, the reasons, the fixes."

### Minute two — how and why

**1:26–1:38 · The engine.**
> "The core isn't AI. It's a deterministic rule engine — nine rules, each carrying the government source it came from, the date we verified it and how confident we are. It's pure: no network, no model. Eighty-four unit tests, including one asserting the same facts always give the same verdict — and one that fails the build if any citation goes 90 days without being re-checked."

**1:38–1:48 · Where AI actually earns its place.**
> "AI does three things determinism can't, and decides nothing. It reads the four fields off that document — into a schema with no room for an identifier. It rewrites any explanation into simpler language. And it decodes rejection wording we don't recognise, but only into a closed list of nine causes, so it can't invent a reason. Documented phrasings never reach a model at all. Turn AI off entirely and the journey still completes; there's a test that does exactly that."

**1:48–2:00 · End-to-end, and honesty.**
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
- **`/employer`** — the same engine read from the other side. Six of nine leavers blocked, three waiting on the employer, 46 minutes of their time; file one exit date and watch the row leave the queue. Reachable from any employer-owned blocker on the verdict page, which is how the citizen hands it over.
- **`/api`** — the endpoint documented, with a button that posts the session you are currently in to it and prints the real response. `GET /api/preflight` in a browser tab gives the raw contract.
- **Print the fix plan** (`Print this plan` on the verdict page, or ⌘P). Every fix panel and every citation expands on paper — that is the artefact a citizen carries to an HR desk.
- **`/why`** — the friction table, including the three rows where we admit we are not better.
- **`/sources`** — every citation with its verification date and confidence, and the honest note that `epfindia.gov.in` was unreachable from our network.
- **The awkward specimen.** Feed the identity slot **Identity record — Sunita**: it is deliberately photographed at an angle, grainy and lit by a window, so `quality` and `confidence` visibly do something instead of always reading "clear / high".
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
6. The document reader sends the image you choose to OpenAI. It is downscaled and re-encoded in the browser first — which also strips EXIF and GPS — held for one call and stored nowhere, but it does leave the device. The sample documents are synthetic and exist so nobody has to test that with a real one.
