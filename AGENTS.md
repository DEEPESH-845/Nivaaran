# Nivaaran — agent guide

Pre-filing validator for EPFO (PF) claims. The citizen answers five plain
questions; a deterministic rule engine tells them exactly what will get their
claim rejected, **whose job it is to fix**, and which official rule says so.
Hackathon prototype, synthetic data only, no login and no database.

Deeper context: `README.md` (problem), `docs/ARCHITECTURE.md` (how it fits
together), `docs/DESIGN.md` (design system), `docs/PRD.md`, `docs/DEMO.md`.

## Commands

```bash
pnpm dev          # next dev
pnpm test         # vitest — engine, matchers, decoder, friction maths
pnpm e2e          # playwright + axe (mobile + desktop projects)
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
```

pnpm only. Run `pnpm typecheck && pnpm lint && pnpm test` before calling
anything done. Touching the landing page or the shell also means `pnpm e2e` —
that suite is the only thing standing between us and an accessibility
regression.

## Where things live

```
src/lib/rules/        the engine — types, sources, the 9 rules, engine.ts, apply.ts
src/lib/match/        name + date reconciliation and token diff
src/lib/ai/           server-only OpenAI wrapper, rejection decoder, rate limit
src/lib/i18n/         UI chrome strings + language store
src/lib/state/        session store (useSyncExternalStore, no state library)
src/content/          synthetic personas, friction analysis as data
src/components/       shared UI (ui.tsx), journey components
src/components/motion/  Reveal, useSceneProgress, useCanvas — the motion primitives
src/components/scenes/  the landing narrative's six scenes
src/app/              landing → check → preflight → claim/done/status, why/sources
src/app/api/          preflight, ai/decode, ai/explain
```

## Two products in one repo

Keep these straight; the rules differ.

**The journey** (`/check`, `/preflight`, `/claim`, `/done`, `/status`) is a
civic instrument. It is quiet, dense, fast, and almost motionless. Someone is
using it because they need ₹1.4 lakh, on a phone, on 4G that drops. Nothing
here should ever be described as "delightful".

**The landing page** (`/`) is an argument. It has to make a stranger — a judge,
a journalist, an EPFO official — understand the problem, why the current
approach fails, and what changes, in one scroll. It is allowed to be
cinematic. It is not allowed to be slow, inaccessible, or untrue.

## Rules that are not negotiable

1. **`preflight(facts)` stays pure.** No network, no model, no I/O, no clock
   beyond the injected `now`. Same facts → same verdict; a test asserts it.
2. **AI never decides eligibility.** It classifies a pasted rejection message
   and rewrites copy into simpler language. Nothing else. Every AI failure is a
   value (`AiResult`), never a thrown error — callers fall back to the
   deterministic path silently.
3. **Every citizen-visible string is bilingual by type** (`Bi = {en, hi}`).
   A monolingual string is a compile error, not a TODO. Domain copy lives with
   the rule; chrome copy lives in `src/lib/i18n/strings.ts`. This applies to
   the landing narrative too — a scene with English-only copy is not finished.
4. **Every finding cites a source.** New rule → add to `SOURCES` first with a
   real URL, `verifiedOn` date, confidence, and an honest `note` caveat.
5. **Every finding names an `owner`** (`citizen | employer | epfo | time`) and
   a `fix` with realistic `minutes` / `waitDays`. Naming who fixes it is the
   product.
6. **Colours come from the `@theme` tokens in `src/app/globals.css`.** No raw
   hex in components. Canvas is the one exception — it cannot read CSS custom
   properties, so scenes lift them with `getComputedStyle` and carry a hex
   fallback; keep both in sync with the token.
7. **Accessibility is not optional** — axe passes clean, 44px touch targets,
   no timing-dependent interactions. Don't ship a regression past `pnpm e2e`.
8. **No new runtime dependencies.** The narrative layer was deliberately built
   with `IntersectionObserver`, `requestAnimationFrame`, inline SVG and one
   canvas rather than GSAP, ScrollTrigger, Lenis or Three.js. That is ~90KB
   gzipped we do not ship, and the Lighthouse and CLS numbers in the README
   depend on it. If you think a library is required, first write the twenty
   lines that make it unnecessary.
9. **Never imply this is official.** The "independent prototype / synthetic
   data" disclosure stays on every page.
10. **Never invent a number.** Every figure on the landing page traces to
    `docs/RESEARCH.md` or `SOURCES`. 7.96 crore and 1.74 crore are published
    figures. 796 and 174 marks are those figures ÷ 100,000. The 2,880× ratio is
    20 days ÷ 10 minutes. If you cannot derive it, do not draw it.

## The landing narrative

One continuous argument in eight beats, in `src/app/page.tsx`:

```
01 the record   the mismatch, scanned            MismatchScan
02 the door     three personas — the citizen exits here
03 the scale    that token, 1.74 crore times     ScaleField   (canvas)
04 the silence  twenty days, then five words     SilenceTrack (scrubbed)
05 the machine  why speed made it worse          Gate         (canvas, night)
06 the turn     the fix already exists, free     — typography only
07 the check    the engine, running live         EngineLive
08 the place    where this belongs
   the close    the same record, resolved        MismatchScan resolved
```

**The visual metaphor is the mismatch**: two parallel rows and the gap between
them. It mutates — a name, then two bars, then two tracks, then before/after a
gate — but it is always the same primitive. Do not introduce a second
metaphor. If a new section cannot be expressed as two rows and a gap, the
section is probably not part of this argument.

**The citizen exits at beat 02.** The persona tiles stay within one scroll of
the top, always. Judges get the film; Ramesh gets the door on arrival. Never
push the tiles below beat 03 to make the story flow better.

**`MismatchScan` renders the real matcher.** It calls `compareNames`, not a
hardcoded diff. `EngineLive` calls the real `preflight` and `applyFix`. Both
would break if the engine broke, which is the point — the landing page is a
live demonstration, not a screenshot of one.

## The motion system

Durations and easings are tokens in `@theme` (`--dur-*`, `--ease-entry`,
`--ease-cinematic`). Never hand-tune a timing inline.

Three primitives, all in `src/components/motion/reveal.tsx`:

| Primitive | Use |
|---|---|
| `Reveal` | Enter-on-scroll. One shared `IntersectionObserver` for the whole page; elements unobserve after firing. |
| `useSceneProgress(ref, opts)` | 0→1 scroll progress written to the element as `--p` so CSS drives transforms with no React render. `steps` quantises it for anything that needs a number. |
| `useCanvas(ref, draw, initial)` | DPR-capped canvas, redraws on resize and on demand. The scrub value is passed *through* `render(arg)` into `draw` — never read from a ref inside the draw closure. |

Both hooks **take a ref rather than returning one**. A hook that hands back a
ref inside an object defeats the React Compiler's ref analysis at every call
site and `pnpm lint` will fail. Same reason the "latest ref" assignment happens
in an effect, not during render.

Rules for adding motion:

- **Every scene needs a designed static end-state.** Under
  `prefers-reduced-motion: reduce`, `useSceneProgress` parks at `p = 1` and CSS
  keyframes are neutered by the global rule. The story is told in stills, not
  switched off. Check it: `matchMedia` emulation, then read the page.
- **Animate `transform` and `opacity`.** Not `top`/`left`/`width`/`box-shadow`.
- **The hidden state of a reveal lives behind
  `@media (prefers-reduced-motion: no-preference)`** and is undone under
  `@media (scripting: none)`, so a reader who has asked for stillness — or
  whose script never runs — never gets a blank page.
- **rAF loops run only while the scene intersects.** Nothing animates off screen.
- **No scroll hijacking, no custom cursor, no WebGL.** All three were
  considered and rejected: they cost touch and keyboard parity and buy nothing
  this argument needs.

## The night act

Beat 05 is full-bleed `--color-night`. This is **not** dark mode — it is one
designed section, the same surface as the notice bar, and the rest of the site
stays light on purpose. The `night-*` tokens were contrast-measured, not
eyeballed (values are commented in `globals.css`). Because a dark section runs
under the sticky header, that header is opaque `bg-paper`, not frosted; making
it translucent again lets the dark act's text bleed through it.

## Gotchas

- `OPENAI_API_KEY` is optional. Unset, the AI routes degrade quietly and the
  rest of the app works — keep it that way.
- `src/lib/ai/client.ts` imports `server-only`. Don't pull it into a client
  component.
- `e2e/a11y.spec.ts`'s `scan()` walks the page top to bottom before running
  axe, because scroll-revealed content is at `opacity: 0` until it is reached.
  If you add a reveal, you get that coverage for free; if you replace the
  scroll walk, you silently stop auditing seven of the eight beats.
- Adding a second set of persona tiles to `/` will break `pnpm e2e`:
  `getByRole("button", { name: /left my job/i })` becomes ambiguous under
  Playwright's strict mode. The close CTA is an anchor to `#start` for exactly
  this reason.
- The Next.js block below is regenerated by `next dev`. Commit it with your
  work rather than deleting it.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
