# DESIGN — Nivaaran

**Phase 3 deliverable.** Reads on from [PRD.md](./PRD.md).

---

## 1. Design principles

1. **Look trustworthy, not official.** The visual language borrows from Indian government *stationery* — warm paper, stamp-ink text, hairline rules, tabular figures — not from any government *brand*. No tricolour, no emblem, no departmental logo. A persistent dark notice bar states what this is, on every screen.
2. **A civic instrument, not a dashboard.** No cards floating on gradients, no glass, no neon. Borders over shadows. The page should read like a well-made form, redesigned by someone who cared.
3. **Verdicts are information, not alarms.** Blockers are terracotta, not browser red. A citizen finding out their claim will fail is receiving *useful news*; the interface should not shout at them for it.
4. **Every number is auditable.** Sources, dates and confidence are visible in-product, one tap away, never hidden in a footer.
5. **Motion earns its place.** One 320ms entry rise on the verdict, honoured `prefers-reduced-motion`, nothing else.

---

## 2. Information architecture

```
/                 Landing — problem, intent, proof
/check?q=0..5     Situation (5 questions) → Records comparison
/preflight        Verdict · findings · fixes · rejection decoder    ← the product
/claim            Guided claim (simulated)
/done             Confirmation
/status           Explained status timeline
/why              Before/after · friction analysis · end-to-end
/sources          Source registry · real vs mocked · privacy
/api/preflight    The rule engine as a public contract
/api/ai/decode    Rejection classification
/api/ai/explain   Plain-language rewriting
```

The "fix" stage has no route of its own. Fixes live inside the finding that caused them, because splitting a problem from its remedy across two screens is the exact failure we are correcting.

---

## 3. Design tokens

All tokens are defined once, in `src/app/globals.css`, under Tailwind v4's `@theme`.

### 3.1 Colour

Every value is authored in `oklch` so lightness is perceptually even across hues.

| Role | Token | Value | Intent |
|---|---|---|---|
| Surface | `paper` | `oklch(0.988 0.004 85)` | Warm off-white. Documents, not screens. |
| Surface | `paper-sunk` | `oklch(0.966 0.006 85)` | Recessed panels, evidence blocks |
| Surface | `paper-raised` | `oklch(1 0 0)` | Cards |
| Text | `ink` | `oklch(0.23 0.021 258)` | Near-black with a blue cast, like stamp ink |
| Text | `ink-soft` | `oklch(0.40 0.018 258)` | Body |
| Text | `ink-mute` | `oklch(0.49 0.014 258)` | Labels |
| Text | `ink-faint` | `oklch(0.535 0.010 258)` | Tertiary — still passes AA |
| Rules | `line` / `line-soft` / `line-strong` | `0.905 / 0.945 / 0.635` | Hairlines; `line-strong` is an interactive boundary |
| Primary | `indigo-600` | `oklch(0.44 0.150 266)` | India-ink indigo. Trust without corporate blue |
| Blocked | `blocked-*` | terracotta, hue 38–45 | An Indian pigment, not an error red |
| Caution | `caution-*` | ochre, hue 72–88 | Worth knowing, not wrong |
| Clear | `clear-*` | verdigris, hue 155–160 | Resolved |

**Light theme only.** A deliberate cut: one theme done properly beats two done adequately in five days. `body` paints an explicit background so it never borrows a host's colours.

### 3.2 Contrast — measured, not assumed

Every text token was computed against both surfaces, not eyeballed. Three tokens failed the first pass and were darkened until they cleared 4.5:1.

| Pair | Ratio | Requirement |
|---|---:|---|
| `ink` on paper | 16.32 | ✅ AA / AAA |
| `ink-soft` on paper | 8.89 | ✅ AA / AAA |
| `ink-mute` on paper-sunk | 5.67 | ✅ AA |
| `ink-faint` on paper-sunk | 4.68 | ✅ AA |
| `indigo-600` on paper | 7.75 | ✅ AA / AAA |
| `blocked-700` on `blocked-50` | 6.96 | ✅ AA |
| `caution-700` on `caution-50` | 5.23 | ✅ AA |
| `clear-700` on `clear-50` | 7.55 | ✅ AA |
| `line-strong` on paper | 3.31 | ✅ 1.4.11 non-text |

The consequence is an unusually compressed grey ramp. Hierarchy is therefore carried by **size, weight and letter-spacing**, not by fading text out — which is better practice regardless.

### 3.3 Type

| Family | Use | Loading |
|---|---|---|
| **Instrument Serif** 400 | Display headlines, large figures | `next/font`, self-hosted, `latin` |
| **Inter** variable | All UI and body text | `next/font`, self-hosted, `latin` |
| **Noto Sans Devanagari** 400/500/600 | All Hindi text | `next/font`, self-hosted, `devanagari` |

Scale (rem): `2xs 0.6875 · xs 0.75 · sm 0.8125 · base 0.9375 · md 1 · lg 1.125 · xl 1.375 · 2xl 1.75 · 3xl 2.125 · 4xl 2.75`, plus a fluid `--text-display: clamp(2.125rem, 1.35rem + 3.4vw, 3.75rem)`.

Base body size is 0.9375rem (15px) rather than 16px, with generous line height — denser without becoming small. `font-variant-numeric: tabular-nums` on every figure that sits in a column.

### 3.4 Spacing, radii, elevation

Tailwind's 4px scale throughout. Radii are squared-off and document-like: `ctl 8px`, `card 12px`, `lg 16px` — never pills. Elevation is almost entirely borders; the single lift shadow is reserved for hover on the intent tiles.

---

## 4. Components

| Component | Notes |
|---|---|
| `Button` | 4 tones, min-height 44px (`md`) / 52px (`lg`) |
| `ButtonLink` | Same surface for `next/link` |
| `Card` | Hairline border, 1px shadow |
| `Badge` | 5 tones, uppercase, tracked |
| `Callout` | Tinted block with optional icon and title |
| `Choice` | Answer option, min-height 56px, `aria-pressed`, filled radio |
| `Disclosure` | Native `<details>` — progressive disclosure with zero JS |
| `JourneyRail` | The persistent "where am I" indicator |
| `NameDiff` / `ValueDiff` | Token-level record comparison |
| `FindingCard` | Severity, owner, evidence, why, fix, source |
| `SourceChip` | Citation, publisher, verified date, confidence, caveat |
| `RejectionDecoder` | AI surface — paste a rejection, get named causes |
| `ExplainSimply` | AI surface — plain-language rewrite |
| `Shell` | Notice bar, header, skip link, footer |

### 4.1 The finding card, in detail

The card is the product's atom. Every one answers six questions without being asked:

`What` → title · `Evidence` → the exact token that differs · `Why it matters` → the mechanism · `Whose job` → citizen / employer / EPFO / time · `Effort` → minutes and cost · `Where this comes from` → citation, date, confidence.

Fix steps are collapsed by default. Opening one reveals numbered steps, queue time, any caveat, the official link, and **“I've done this — re-check”**, which re-runs the engine live.

---

## 5. Responsive behaviour

Mobile-first throughout; every layout starts single-column and adds columns at `sm`/`md`. Content is capped at `max-w-3xl` in the journey and `max-w-4xl`/`max-w-5xl` on the judge-facing pages.

The one horizontally scrolling element — the friction table — is wrapped in an `overflow-x-auto` region with `tabIndex={0}` and a label, so keyboard users can scroll it. The page body never scrolls sideways.

**Touch targets:** an automated test walks every visible button and link on a Pixel 7 viewport and fails if any is under 44px in both dimensions.

---

## 6. State design

| State | Treatment |
|---|---|
| **Loading (navigation)** | Continue is disabled while a route transition is in flight — this also fixes a real double-tap bug that skipped questions |
| **Loading (AI)** | Inline label on the button itself: "Rewriting…", "Reading…" |
| **Empty (no session)** | Journey routes redirect home rather than rendering a hollow shell |
| **AI unavailable** | A quiet line: *"Simple language isn't available right now. The explanation above is the full and correct one."* Never an error dialog |
| **Unrecognised rejection** | *"This message doesn't map cleanly to a cause we know. We won't guess."* Refusing to guess is a designed state |
| **All clear** | A single sentence and one action — the product gets out of the way |
| **Storage blocked** | Every read and write is wrapped; the journey completes, it simply is not resumable |

---

## 7. Accessibility

Enforced by tests, not intention. `e2e/a11y.spec.ts` runs axe-core with `wcag2a, wcag2aa, wcag21a, wcag21aa` on the landing, question flow, verdict, verdict-with-all-panels-open, `/why`, `/sources`, `/status` and the full Hindi rendering, on both a mobile and a desktop project. **Zero violations, or the suite fails.**

Also covered:

- Skip link is the first tab stop
- The intent step is fully operable by keyboard alone, verified by test
- Visible focus ring everywhere; never removed
- `aria-pressed` on answer options, `aria-expanded` on fix panels
- `document.documentElement.lang` follows the language switch
- Journey rail exposes done / current state to screen readers via `sr-only` text
- `prefers-reduced-motion` disables all animation
- Semantic `<table>` with scoped headers for the friction analysis

---

## 8. Language

English and हिंदी across **everything** — not just navigation. Rule titles, explanations, evidence labels, fix steps, caveats, error states and CTAs are all bilingual by construction: the engine's types make a monolingual string impossible to write (`Bi = { en: string; hi: string }`), and a unit test asserts every shipped finding carries both.

Rather than ship a third static "simple language" copy set, simplification is generated on demand by **Explain this simply** — the one place where a model genuinely does something a static string cannot, with the original always visible above it.

---

## 9. Performance

- Self-hosted fonts via `next/font`, subset per script, `display: swap`
- No icon font, no CSS framework runtime, no component library — icons are tree-shaken SVGs
- No state library; two tiny `useSyncExternalStore` stores
- Every page except the three API routes is statically prerendered
- The rule engine is pure and synchronous: the verdict needs **no network call at all**

---

## 10. What we deliberately did not build

Dark mode · a component library · a design-token pipeline · animation beyond one entry transition · a chatbot · document upload with vision extraction (the highest-value cut; see ARCHITECTURE.md §7).
