# The Aadhaar specimen card — design

**Date:** 29 Aug 2026 · **Route:** `/adhaar` · **Status:** designed, not built

Reads on from [the reconciliation spec](2026-08-24-document-reconciliation-design.md),
which established `records.aadhaar` as the citizen-side half of every name and
date-of-birth comparison. This spec fills that same slot by hand instead of by
photograph. It also adds `AGENTS.md` rules 13 and 14, and narrows the Motion
System's flat "no WebGL" line to the landing narrative it was written for.

---

## 1. Why this, and why now

`/documents` fills `records.aadhaar` from a photograph. It is the only way to
fill it, and it depends on a model, a network call and a legible scan.

There is also a comprehension problem the reconciliation spec named and did not
solve: `/documents` shows a **table** of four fields. A table is the right shape
for a comparison and the wrong shape for the question underneath it — *what is
EPFO actually comparing my record against?* The answer is a card the reader has
in their wallet, and nothing in the product has ever shown it to them.

So this route does two things at once, and neither is decoration:

1. It is the **manual path** into `records.aadhaar` — no model, no upload.
2. It makes the abstract concrete. Tilt the card, change a letter in the name,
   and `/preflight` changes its verdict. The card *is* the Aadhaar side.

---

## 2. Identity on this screen

The card is an unmistakable **specimen**: Nivaaran's own mark, no national
emblem, no UIDAI artwork, no Government of India lockup, and a
`SPECIMEN · नमूना` diagonal at the top of the paint order so it cannot be
cropped out of a screenshot. The portrait is a generated monogram, not an
upload. The reverse-face matrix is decorative — seeded dots that encode
nothing and scan as nothing.

**The number field is included** (this reverses an earlier draft). A specimen
card without a number teaches nothing, and the input is where a reader learns
what the product does with an identifier. It is a real 12-digit field with the
real **Verhoeff checksum**, so it can say "that is not a valid Aadhaar number"
rather than accepting anything shaped like digits.

What happens to it is the whole point, and it is fixed by `AGENTS.md` rule 13:

| The number is | The number is never |
|---|---|
| Held in component state for this page view | Written to `Facts` |
| Rendered masked to the last four (`XXXX XXXX 1234`) | Put in `localStorage` |
| Revealed on an explicit press, like the password field on `/signup` | Sent to any route, `/api/ai/extract` least of all |
| Checksum-validated in the browser | Persisted across a reload |

Losing it on reload is the design, not a gap. The page says so in one line, and
a **"Use a specimen number"** button generates a checksum-valid demo number so
nobody needs to type a real one to see the feature work.

Rule 9 governs what the *model* may return. Rule 13 governs what a *person* may
hand us. Both answers are the same, and now both are written down.

---

## 3. Rendering: a finished DOM card, then a WebGL studio on top

Two layers, and the order matters.

**Layer 1 — the card. Always present, zero extra bytes.**
CSS `preserve-3d` on a `perspective: 1200px` stage:

```
└── transform-style: preserve-3d
    ├── z −3, −2, −1   three darker clones      → a real edge when tilted
    ├── z   0          card body                → gradient ground, noise
    ├── z  12          portrait + Nivaaran mark
    ├── z  24          text block               → real DOM, real fonts
    ├── z  40          holographic foil         → conic-gradient, hue by tilt
    └── z  48          SPECIMEN · नमूना
    + specular overlay  radial-gradient, soft-light, follows the pointer
```

Depth is genuine — the layers parallax against each other under rotation
rather than being painted to look as though they do. Text stays real DOM, which
is what keeps it sharp at any zoom, selectable, translatable through `useLang`,
instant to repaint on a keystroke, legible to a screen reader, and visible to
`e2e/theme.spec.ts`, which measures the contrast of every text run on every
route in both themes.

**Layer 2 — the studio. Lazy, gated, and never load-bearing.**
A `three.js` scene *behind* the card: a procedurally generated environment, two
moving area lights, a soft contact shadow, a reflection plane under the card,
and slow drifting motes. The camera and the light vector are driven by the
**same tilt state** as the DOM card, from one `useRef`, so the specular gradient
on the card and the lights in the scene agree — the card looks lit by the room
it is sitting in rather than by a gradient that happens to be nearby.

**Why not a card mesh.** Making the card itself a `MeshPhysicalMaterial` turns
its face into a canvas texture, and that costs the five properties in the
paragraph above — including the contrast audit, which skips canvases, leaving
the card as the one surface in the product with no contrast guarantee. Real
clearcoat is not worth text a screen reader cannot read. Putting three.js
behind the card instead buys the physical lighting and keeps every one of them.

**The budget** (`AGENTS.md` rule 14, all four non-negotiable):

| Rule | Mechanism |
|---|---|
| Absent from first load | `await import("three")` — its own chunk, never a static import |
| Never loads when it shouldn't | One pure `shouldEnhance()`: `saveData`, `effectiveType`, `deviceMemory`, `hardwareConcurrency`, `prefers-reduced-motion` |
| Fetches nothing | The environment map is generated at runtime from a canvas gradient through PMREM — no HDRI, no texture files, zero extra requests |
| Can always be refused | A visible **Enhanced view** toggle, remembered in `localStorage` |

Loading happens in `requestIdleCallback` after the page is interactive, so the
chunk never competes with first paint. The render loop is capped at DPR 1.5,
and runs only while the canvas intersects and the tab is visible — the same
rule the narrative's canvases already follow.

On a 2G connection, a data-saver phone, or a reader who has asked for
stillness, the studio simply never arrives and nothing is missing.

---

## 4. Components

Ten new files. The three in `src/lib/adhaar/` are pure and carry the unit
tests; everything else is markup, motion or route.

| File | Does | Depends on |
|---|---|---|
| `src/lib/adhaar/verhoeff.ts` | The real Aadhaar checksum, both directions | nothing |
| `src/lib/adhaar/specimen.ts` | Masked rendering, monogram initials, deterministic palette and dot matrix | `verhoeff.ts` |
| `src/lib/adhaar/enhance.ts` | `shouldEnhance(env)` — the one gate in §3 | nothing |
| `src/components/adhaar/specimen-card.tsx` | The two faces. Pure presentation, no state | `specimen.ts`, `useLang` |
| `src/components/adhaar/card-stage.tsx` | Perspective, pointer and keyboard interaction, GSAP damping, flip, reduced motion, owns the shared tilt ref | `specimen-card.tsx`, `gsap` |
| `src/components/adhaar/studio.tsx` | The WebGL scene. Lazily imported, mounts only behind the gate | `three` (dynamic), the tilt ref |
| `src/components/adhaar/details-form.tsx` | Capture. Five fields, existing `Field` component | `ui.tsx`, `verhoeff.ts` |
| `src/app/adhaar/page.tsx` | Session wiring, persona fallback, the explainer, the CTAs | all of the above, `useSession` |
| `src/app/adhaar/layout.tsx` | Metadata | — |
| `src/app/aadhaar/page.tsx` | `redirect("/adhaar")` — people will type the correct spelling | — |

The stage owns motion, the card owns pixels, the studio owns light. That
boundary is what lets the studio be absent without the card noticing, and what
keeps the tilt maths out of a file full of layout classes.

---

## 5. What is captured, and where it goes

| Field | Card | Leaves the component? |
|---|---|---|
| Name | Front | → `records.aadhaar.name` |
| Date of birth | Front | → `records.aadhaar.dob` |
| Aadhaar number | Front, masked | **No.** §2 |
| Gender | Front, omitted when unset | **No** |
| City | Reverse, omitted when unset | **No** |

`Facts` stays pure and minimal: it gains `name` and `dob` and nothing else,
because those are the only two fields any rule evaluates. Gender, city and the
number are presentational. Growing `Facts` for them would put fields in front
of `preflight()` that it cannot evaluate, and `AGENTS.md` rule 1 exists to stop
exactly that.

**Data flow.** Local state drives the card, so it repaints on the keystroke. A
300ms debounce writes `records.aadhaar` into the session — without it, a
fifteen-character name is fifteen `JSON.stringify` plus `localStorage.setItem`
round trips, each recomputing the verdict, while a 60fps tilt is running. The
card stays instant; the session settles.

Seeding: `records.aadhaar` when it exists, otherwise `name` and `dob` off
`records.epfo` — those two fields only, never the banking ones — so the card
arrives populated rather than as an empty template. City seeds from the
persona; gender and the number start empty.

No session at all: the persona picker, exactly as `/documents` does it (its
`No record to compare` branch). A comparison needs two sides, and so does a card.

---

## 6. Interaction

| Input | Behaviour |
|---|---|
| Pointer over the stage | `rotateY ±26°`, `rotateX ±18°` from cursor position |
| Pointer leaves | Eases to rest, then a slow idle float |
| Click / Enter / Space | Flip 180° |
| Arrow keys | Nudge the tilt 6° per press, within the same limits |
| Touch drag / tap | Tilt / flip |
| Reveal control | Toggles the number between masked and full, like `/signup`'s password eye |
| Enhanced view toggle | Turns the WebGL studio on or off, remembered |

Damping is GSAP `quickTo` at ~0.6s `power3.out`, so the card trails the cursor
instead of snapping to it — the difference between an object with mass and a
`transform` bound to `mousemove`. The stage is `tabIndex={0}` with a
`role="group"` and an `aria-describedby` naming the controls, plus the project's
standard focus ring.

**Reduced motion** gets a fixed three-quarter pose, no idle float, no damping,
an instant flip, and no studio at all. Every detail stays readable — the same
principle as the story's `StillSequence`.

---

## 7. Discoverability

Four entry points and one in-place hint:

1. **A hint chip on the stage** — *"Drag to tilt · Tap to flip"* — that fades
   on the first interaction, modelled on the story's scroll cue.
2. **Nav and footer** in `shell.tsx`, in the signed-in list beside Documents.
3. **A discovery card on `/dashboard`**, next to the existing documents door.
4. **A cross-link from `/documents`**, in the empty state beside *"Type the
   values in instead"* — the manual path offered next to the photographed one,
   on the screen a reader lands on when a read fails.

The page's first line answers *what is this for* before the card appears: this
is the record EPFO compares your claim against, as an object rather than a row.

---

## 8. Theming

The card is a fixed dark object in both themes, built from the existing
`--color-night*` tokens, sitting on a themed page ground — the same treatment
the story page gets, and the reason those tokens exist. Fixed colours on the
card, theme tokens on the page. `e2e/theme.spec.ts` measures both. The studio
canvas is `aria-hidden` and carries no information, so theme and screen-reader
parity are properties of the DOM layer alone.

---

## 9. Testing

**Unit**

- `verhoeff.test.ts` — the checksum accepts known-valid numbers, rejects a
  single-digit change and a transposition (the two errors Verhoeff exists to
  catch), and the generator only ever emits numbers its own validator accepts.
- `specimen.test.ts` — masking exposes exactly the last four digits and
  **never the other eight**; monogram, palette and dot matrix are deterministic.
- `enhance.test.ts` — `shouldEnhance()` refuses on `saveData`, on `slow-2g`/`2g`,
  on `deviceMemory < 4`, on reduced motion, and allows when the connection API
  is absent entirely. This is the slow-network promise, asserted rather than
  hoped for.

**End to end** (`e2e/adhaar.spec.ts`)

- Typing a name reaches the card face; editing it changes the `/preflight`
  verdict — the §5 wiring proved through the real rule engine.
- The number renders masked, reveals on press, and a reload leaves it empty.
- **No request carries the number.** The spec routes `**/api/**`, types a
  number, and asserts no request body contains those digits.
- **Everything still works with the three.js chunk blocked at the network
  layer** — every detail readable, tilt, flip and both faces reachable. This is
  rule 14's guarantee, and the test blocks the route glob to prove it.
- No `three` chunk is requested before the page is interactive.
- Keyboard alone: focus the stage, flip it, read the reverse.
- Reduced motion renders every detail with no animation and no studio.
- No session shows the persona picker.

**Audits** — `/adhaar` added to the route list in `e2e/theme.spec.ts` and to
the axe scan in `e2e/a11y.spec.ts`, so it is measured in both themes and by
axe from the first commit.

---

## 10. Blast radius

Additive except for five edits, all small:

| File | Edit |
|---|---|
| `AGENTS.md` | **Done.** Rules 13 and 14, a fourth surface, the narrowed WebGL line, three directory rows |
| `package.json` | `three` + `@types/three`, dynamically imported only |
| `src/components/shell.tsx` | One nav entry, one footer link |
| `src/app/dashboard/dashboard-client.tsx` | One discovery card |
| `src/app/documents/page.tsx` | One cross-link |
| `e2e/theme.spec.ts`, `e2e/a11y.spec.ts` | One route each |

`Facts` is unchanged, the rule engine is unchanged, `ExtractSchema` is
unchanged, and `records.aadhaar` is written through the same `setFacts` call
`/documents` already uses. The full unit and e2e suites run before this is
called done.
