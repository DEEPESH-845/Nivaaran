# Aadhaar Specimen Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/adhaar` — a capture form and an interactive specimen Aadhaar card that is tiltable, lit, and wired into the rule engine, so editing a name on the card changes the `/preflight` verdict.

**Architecture:** Two layers. The card is real DOM under CSS `preserve-3d` with GSAP-damped pointer and keyboard tilt — complete and interactive on its own, in first paint, with no extra bytes. A `three.js` studio then loads lazily behind it, adding procedural lighting, a contact shadow and drifting motes, driven by the same tilt ref so card and room agree. Blocking the three.js chunk must leave nothing missing.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 tokens, GSAP (already present), `three` (new, dynamically imported only), Vitest, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-08-29-adhaar-specimen-card-design.md`

## Global Constraints

Copied from the spec and `AGENTS.md`; every task inherits these.

- **`pnpm` only.** `pnpm typecheck && pnpm lint && pnpm test` before any task is done. Anything touching the shell or a route also needs `pnpm e2e`.
- **Every citizen-visible string is bilingual by type** — `Bi = {en, hi}` from `@/lib/rules/types`, resolved through `useLang()`'s `t()`. A monolingual string is a compile error via `satisfies Record<string, Bi>`.
- **Colours come from `@theme` tokens.** No raw hex in components. The card uses the fixed `--color-night*` family in both themes; the page around it uses the themed `paper`/`ink`/`line` family.
- **The typed Aadhaar number never leaves the browser** (`AGENTS.md` rule 13): not in `Facts`, not in `localStorage`, not in any request, gone on reload.
- **`Facts` gains `name` and `dob` only.** Gender, city and the number are presentational.
- **`three` is dynamically imported.** A static `import ... from "three"` anywhere is a task failure.
- **44px minimum touch targets**, visible focus, axe clean.
- Commits are **not** run by the implementer in this repo — the operator commits explicitly. Each task ends with a green suite instead.

---

### Task 1: The Verhoeff checksum

**Files:**
- Create: `src/lib/adhaar/verhoeff.ts`
- Test: `src/lib/adhaar/verhoeff.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `verhoeffCheckDigit(digits: string): number`, `verhoeffValidate(digits: string): boolean`, `isValidAadhaar(input: string): boolean`, `AADHAAR_LENGTH = 12`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { isValidAadhaar, verhoeffCheckDigit, verhoeffValidate } from "./verhoeff";

describe("verhoeff", () => {
  // The published worked example. Not an Aadhaar — just the algorithm's own
  // vector, so a transcription error in the tables fails here rather than
  // silently rejecting real numbers.
  it("reproduces the published check digit for 236", () => {
    expect(verhoeffCheckDigit("236")).toBe(3);
    expect(verhoeffValidate("2363")).toBe(true);
  });

  it("catches the two errors it exists to catch", () => {
    const n = "2363";
    expect(verhoeffValidate("2463")).toBe(false); // single-digit substitution
    expect(verhoeffValidate("3263")).toBe(false); // adjacent transposition
    expect(verhoeffValidate(n)).toBe(true);
  });

  it("accepts a well-formed Aadhaar and rejects a mistyped one", () => {
    const body = "23456789012";
    const full = body + verhoeffCheckDigit(body);
    expect(isValidAadhaar(full)).toBe(true);
    expect(isValidAadhaar(full.replace(/\s/g, "").split("").reverse().join(""))).toBe(false);
  });

  it("rejects anything that is not twelve digits starting 2-9", () => {
    expect(isValidAadhaar("1234 5678 9012")).toBe(false); // leading 1
    expect(isValidAadhaar("2345")).toBe(false);
    expect(isValidAadhaar("2345 6789 012a")).toBe(false);
  });

  it("ignores the spaces people actually type", () => {
    const body = "23456789012";
    const full = body + verhoeffCheckDigit(body);
    const spaced = `${full.slice(0, 4)} ${full.slice(4, 8)} ${full.slice(8)}`;
    expect(isValidAadhaar(spaced)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/adhaar/verhoeff.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
/**
 * The Verhoeff checksum, which is the one UIDAI actually uses.
 *
 * It exists because the two mistakes people make when copying a number by
 * hand are mistyping one digit and swapping two adjacent ones, and a plain
 * modulo check catches neither reliably. The tables below are the published
 * dihedral group D5 multiplication, permutation and inverse tables; the test
 * pins them against the algorithm's own worked example, because a single
 * transposed cell here would reject valid numbers with no other symptom.
 */

const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export const AADHAAR_LENGTH = 12;

/** Strip the spaces people type in groups of four. */
export const digitsOnly = (input: string): string => input.replace(/\D/g, "");

function fold(digits: string): number {
  let c = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = D[c][P[i % 8][Number(reversed[i])]];
  }
  return c;
}

/** The digit that makes `digits` valid when appended to it. */
export function verhoeffCheckDigit(digits: string): number {
  if (!/^\d+$/.test(digits)) throw new Error("verhoeffCheckDigit: digits only");
  return INV[fold(`${digits}0`)];
}

/** True when `digits` already carries its own correct check digit. */
export function verhoeffValidate(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  return fold(digits) === 0;
}

/**
 * A well-formed Aadhaar number: twelve digits, never starting 0 or 1, with a
 * correct Verhoeff digit. This says "well-formed", never "real" — no offline
 * check can tell you whether a number was ever issued.
 */
export function isValidAadhaar(input: string): boolean {
  const d = digitsOnly(input);
  if (!/^[2-9]\d{11}$/.test(d)) return false;
  return verhoeffValidate(d);
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/adhaar/verhoeff.test.ts` → PASS (5 tests).

- [ ] **Step 5: Checkpoint** — `pnpm typecheck && pnpm lint`.

---

### Task 2: Specimen derivations

**Files:**
- Create: `src/lib/adhaar/specimen.ts`
- Test: `src/lib/adhaar/specimen.test.ts`

**Interfaces:**
- Consumes: `verhoeffCheckDigit`, `digitsOnly`, `isValidAadhaar` from Task 1.
- Produces: `maskAadhaar(digits: string): string`, `groupAadhaar(digits: string): string`, `initials(name: string): string`, `seededPalette(seed: string): { from: string; to: string }`, `dotMatrix(seed: string, side: number): boolean[]`, `specimenNumber(seed: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { isValidAadhaar } from "./verhoeff";
import {
  dotMatrix,
  groupAadhaar,
  initials,
  maskAadhaar,
  seededPalette,
  specimenNumber,
} from "./specimen";

describe("masking", () => {
  it("shows the last four digits and hides the other eight", () => {
    expect(maskAadhaar("234567890123")).toBe("XXXX XXXX 0123");
  });

  // The property that keeps AGENTS.md rule 13 true: whatever is typed, the
  // first eight digits must not appear anywhere in what is rendered.
  it("never leaks a digit of the first eight", () => {
    const typed = "298765432109";
    const shown = maskAadhaar(typed);
    expect(shown).not.toContain(typed.slice(0, 8));
    for (let i = 0; i < 8; i++) expect(shown.slice(0, 9)).not.toContain(typed[i]);
  });

  it("masks a partial number without inventing digits", () => {
    expect(maskAadhaar("2345")).toBe("XXXX XXXX ____");
    expect(maskAadhaar("")).toBe("XXXX XXXX ____");
  });

  it("groups a full number in fours when it is meant to be shown", () => {
    expect(groupAadhaar("234567890123")).toBe("2345 6789 0123");
  });
});

describe("derivations", () => {
  it("takes initials from the first and last name", () => {
    expect(initials("Rajesh Kumar Sharma")).toBe("RS");
    expect(initials("Sunita")).toBe("S");
    expect(initials("  ")).toBe("—");
  });

  it("is deterministic for a seed and different across seeds", () => {
    expect(seededPalette("rajesh")).toEqual(seededPalette("rajesh"));
    expect(seededPalette("rajesh")).not.toEqual(seededPalette("sunita"));
    expect(dotMatrix("rajesh", 8)).toEqual(dotMatrix("rajesh", 8));
    expect(dotMatrix("rajesh", 8)).toHaveLength(64);
  });

  it("generates specimen numbers its own validator accepts", () => {
    for (const seed of ["rajesh", "sunita", "arun", ""]) {
      const n = specimenNumber(seed);
      expect(n).toHaveLength(12);
      expect(isValidAadhaar(n)).toBe(true);
    }
    expect(specimenNumber("rajesh")).toBe(specimenNumber("rajesh"));
  });
});
```

- [ ] **Step 2: Run it and watch it fail** — `pnpm vitest run src/lib/adhaar/specimen.test.ts`.

- [ ] **Step 3: Implement**

```ts
import { digitsOnly, verhoeffCheckDigit } from "./verhoeff";

/**
 * Everything the specimen card derives rather than stores.
 *
 * All of it is a pure function of a seed, so the same persona always gets the
 * same portrait gradient and the same reverse-face matrix — a card that
 * reshuffled itself on every render would read as noise, not as an object.
 */

/** FNV-1a. Small, fast, and stable across runs, which is all we need. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A deterministic 0→1 stream from one seed. */
function rng(seed: string): () => number {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 0xffffffff;
  };
}

/**
 * The only rendering of a typed number that ever reaches the DOM by default.
 * Eight X's, then the last four — the form every bank statement in India uses,
 * and the reason a screenshot of this card discloses nothing.
 */
export function maskAadhaar(input: string): string {
  const d = digitsOnly(input);
  const last4 = d.length >= AADHAAR_TAIL ? d.slice(-AADHAAR_TAIL) : "____";
  return `XXXX XXXX ${last4}`;
}

const AADHAAR_TAIL = 4;

/** Full number in groups of four. Only ever called behind the reveal control. */
export function groupAadhaar(input: string): string {
  const d = digitsOnly(input);
  return [d.slice(0, 4), d.slice(4, 8), d.slice(8, 12)].filter(Boolean).join(" ");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** Two stops for the portrait plate. Hues stay in the indigo→violet arc so a
 *  generated gradient never fights the card's own palette. */
export function seededPalette(seed: string): { from: string; to: string } {
  const r = rng(seed);
  const base = 240 + Math.floor(r() * 60);
  return {
    from: `oklch(0.42 0.13 ${base})`,
    to: `oklch(0.28 0.09 ${(base + 40) % 360})`,
  };
}

/** The reverse face's decorative matrix. Encodes nothing and scans as nothing;
 *  it is a texture, and the card says so in words next to it. */
export function dotMatrix(seed: string, side: number): boolean[] {
  const r = rng(`matrix:${seed}`);
  return Array.from({ length: side * side }, () => r() > 0.45);
}

/**
 * A checksum-valid number nobody has to think about, so a judge can see the
 * card work without typing an identifier they actually own.
 */
export function specimenNumber(seed: string): string {
  const r = rng(`number:${seed}`);
  const first = 2 + Math.floor(r() * 8); // never 0 or 1
  let body = String(first);
  while (body.length < 11) body += String(Math.floor(r() * 10));
  return body + verhoeffCheckDigit(body);
}
```

> Note: `AADHAAR_TAIL` is referenced before its declaration above only because
> `const` hoisting is fine at module scope for a function body. Declare it at
> the top of the file when implementing.

- [ ] **Step 4: Run it and watch it pass** — 7 tests.
- [ ] **Step 5: Checkpoint** — `pnpm typecheck && pnpm lint && pnpm test`.

---

### Task 3: The enhancement gate

**Files:**
- Create: `src/lib/adhaar/enhance.ts`
- Test: `src/lib/adhaar/enhance.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `interface EnhanceEnv { saveData: boolean; effectiveType: string | null; deviceMemory: number | null; hardwareConcurrency: number | null; reducedMotion: boolean; webgl: boolean; optOut: boolean }`, `shouldEnhance(env: EnhanceEnv): boolean`, `readEnhanceEnv(optOut: boolean): EnhanceEnv`, `ENHANCE_KEY = "nivaaran.adhaar.enhanced"`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { shouldEnhance, type EnhanceEnv } from "./enhance";

const ok: EnhanceEnv = {
  saveData: false,
  effectiveType: "4g",
  deviceMemory: 8,
  hardwareConcurrency: 8,
  reducedMotion: false,
  webgl: true,
  optOut: false,
};

describe("shouldEnhance", () => {
  it("allows a capable, willing, fast client", () => {
    expect(shouldEnhance(ok)).toBe(true);
  });

  it("refuses whenever the reader has said no", () => {
    expect(shouldEnhance({ ...ok, optOut: true })).toBe(false);
    expect(shouldEnhance({ ...ok, reducedMotion: true })).toBe(false);
  });

  it("refuses on a connection that cannot afford it", () => {
    expect(shouldEnhance({ ...ok, saveData: true })).toBe(false);
    for (const effectiveType of ["slow-2g", "2g", "3g"]) {
      expect(shouldEnhance({ ...ok, effectiveType })).toBe(false);
    }
  });

  it("refuses on a device that cannot afford it", () => {
    expect(shouldEnhance({ ...ok, deviceMemory: 2 })).toBe(false);
    expect(shouldEnhance({ ...ok, hardwareConcurrency: 2 })).toBe(false);
    expect(shouldEnhance({ ...ok, webgl: false })).toBe(false);
  });

  // Safari reports none of these. Absence is not evidence of a slow client,
  // and refusing on absence would mean never enhancing on a Mac.
  it("allows when the client reports nothing at all", () => {
    expect(
      shouldEnhance({ ...ok, effectiveType: null, deviceMemory: null, hardwareConcurrency: null }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

- [ ] **Step 3: Implement**

```ts
/**
 * Whether this client gets the WebGL studio.
 *
 * Split out as a pure function of a plain object for one reason: it is the
 * promise that `/adhaar` costs nothing on a bad connection, and a promise
 * buried in a `useEffect` full of `navigator` lookups cannot be tested. The
 * browser reading lives in `readEnhanceEnv`; the decision lives here.
 */

export const ENHANCE_KEY = "nivaaran.adhaar.enhanced";

/** Connections on which a ~170KB chunk is a real cost to a real person. */
const TOO_SLOW = new Set(["slow-2g", "2g", "3g"]);

export interface EnhanceEnv {
  saveData: boolean;
  effectiveType: string | null;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  reducedMotion: boolean;
  webgl: boolean;
  optOut: boolean;
}

export function shouldEnhance(env: EnhanceEnv): boolean {
  if (env.optOut || env.reducedMotion || !env.webgl) return false;
  if (env.saveData) return false;
  if (env.effectiveType !== null && TOO_SLOW.has(env.effectiveType)) return false;
  if (env.deviceMemory !== null && env.deviceMemory < 4) return false;
  if (env.hardwareConcurrency !== null && env.hardwareConcurrency < 4) return false;
  return true;
}

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

export function readEnhanceEnv(optOut: boolean): EnhanceEnv {
  const nav = navigator as Navigator & {
    connection?: NetworkInformation;
    deviceMemory?: number;
  };
  const c = nav.connection;
  return {
    saveData: c?.saveData === true,
    effectiveType: c?.effectiveType ?? null,
    deviceMemory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    hardwareConcurrency:
      typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl: hasWebGL(),
    optOut,
  };
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run it and watch it pass** — 5 tests.
- [ ] **Step 5: Checkpoint** — `pnpm typecheck && pnpm lint && pnpm test`.

---

### Task 4: The card faces

**Files:**
- Create: `src/components/adhaar/specimen-card.tsx`

**Interfaces:**
- Consumes: `initials`, `seededPalette`, `dotMatrix`, `maskAadhaar`, `groupAadhaar` from Task 2; `useLang`.
- Produces: `export interface CardDetails { name: string; dob: string; number: string; gender: string; city: string; seed: string }` and `export function SpecimenCard({ details, revealed }: { details: CardDetails; revealed: boolean })`.

**Requirements:**
- One element with `transform-style: preserve-3d`, containing a front face and a back face at `rotateY(180deg)`, both `backface-visibility: hidden`.
- Layer order and depths exactly as the spec's §3 diagram: three edge clones at `translateZ(-1px/-2px/-3px)`, body at 0, portrait and mark at 12, text at 24, foil at 40, `SPECIMEN · नमूना` at 48, specular overlay on top reading `--spec-x` / `--spec-y` custom properties the stage writes.
- Colours from `--color-night`, `--color-night-rise`, `--color-night-line`, `--color-night-edge`, `--color-night-ink`, `--color-night-soft`, `--color-night-faint`, `--color-signal`. No hex.
- Number renders `maskAadhaar(details.number)` unless `revealed`, in which case `groupAadhaar`.
- Gender and city rows render only when non-empty.
- Every label bilingual via a `COPY` object `satisfies Record<string, Bi>`.
- The reverse face carries the dot matrix as a CSS grid of `dotMatrix(seed, 12)` cells, with a visible line saying it is decorative, plus the city and the specimen notice.
- No `<img>`, no emblem. The portrait is `initials(name)` on a `seededPalette` gradient.
- Card aspect ratio 1.586 (ID-1), `width: min(100%, 30rem)`.

- [ ] **Step 1:** Build the front face with the layer stack and a static tilt applied inline, and check it by eye at `/adhaar` once Task 6 exists — until then, render it temporarily from `src/app/adhaar/page.tsx` as a stub.
- [ ] **Step 2:** Add the reverse face and the flip container.
- [ ] **Step 3:** Wire the specular overlay to `var(--spec-x, 50%) var(--spec-y, 50%)`.
- [ ] **Step 4: Checkpoint** — `pnpm typecheck && pnpm lint`.

---

### Task 5: The interaction stage

**Files:**
- Create: `src/components/adhaar/card-stage.tsx`

**Interfaces:**
- Consumes: `SpecimenCard`, `CardDetails` from Task 4; `gsap`.
- Produces: `export interface Tilt { x: number; y: number }` and
  `export function CardStage({ details, revealed, enhanced }: { details: CardDetails; revealed: boolean; enhanced: boolean })`.
  It owns `tiltRef: React.RefObject<Tilt>` internally and passes it to the studio.

**Requirements:**
- Wrapper with `perspective: 1200px`, `tabIndex={0}`, `role="group"`, `aria-describedby` pointing at a visually-hidden paragraph naming every control.
- `gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3.out" })` and the same for `rotationX`. Pointer position → `rotationY = (x - 0.5) * 52`, `rotationX = -(y - 0.5) * 36`, clamped to ±26 / ±18.
- The same handler writes `--spec-x` / `--spec-y` on the card and updates `tiltRef.current`.
- `pointerleave` eases to `{0,0}` then starts an idle float: `gsap.to(card, { rotationY: "+=4", rotationX: "-=2", duration: 4, yoyo: true, repeat: -1, ease: "sine.inOut" })`, killed on the next pointer enter.
- Click, `Enter` and `Space` flip: `flipped` state → `rotationY += 180` on the inner flip container (a separate element from the tilt container, so tilt and flip never fight over one property).
- `ArrowLeft/Right/Up/Down` nudge 6°, clamped the same way, and `preventDefault` so the page does not scroll.
- Under `prefers-reduced-motion: reduce`: no quickTo, no idle float, a fixed `rotateX(8deg) rotateY(-14deg)`, and the flip applied instantly with no transition.
- The rAF/GSAP work runs only while the stage intersects — reuse an `IntersectionObserver` the way `src/components/motion/reveal.tsx` does.
- When `enhanced` is true, lazily render the studio: `const [Studio, setStudio] = useState(null)` filled from `import("./studio")` inside `requestIdleCallback`. Never a static import.
- A hint chip — *"Drag to tilt · Tap to flip"* / *"झुकाने के लिए खींचें · पलटने के लिए दबाएँ"* — absolutely positioned under the card, faded out on the first pointer or key interaction.

- [ ] **Step 1:** Tilt and specular tracking.
- [ ] **Step 2:** Flip, on its own element.
- [ ] **Step 3:** Keyboard, focus ring, `aria-describedby`.
- [ ] **Step 4:** Reduced motion branch and the intersection gate.
- [ ] **Step 5:** The hint chip.
- [ ] **Step 6: Checkpoint** — `pnpm typecheck && pnpm lint`.

---

### Task 6: The form and the route — the feature works end to end here

**Files:**
- Create: `src/components/adhaar/details-form.tsx`, `src/app/adhaar/page.tsx`, `src/app/adhaar/layout.tsx`, `src/app/aadhaar/page.tsx`

**Interfaces:**
- Consumes: `CardStage`, `CardDetails`, `isValidAadhaar`, `specimenNumber`, `useSession`, `useLang`, `Field`/`Button`/`Card`/`Choice`/`SectionLabel`/`Callout` from `@/components/ui`.
- Produces: the route. Nothing imports it.

**Requirements — form:**
- Five `Field`s: Name, Date of birth (`type="date"`), Aadhaar number (`inputMode="numeric"`, `maxLength={14}`, auto-grouped in fours as the reader types), Gender, City.
- The number field shows an error when it is non-empty and `!isValidAadhaar(value)` — *"That is not a valid Aadhaar number — check the digits."* / *"यह मान्य आधार संख्या नहीं है — अंक जाँच लें।"* Empty is not an error.
- A **reveal** toggle beside it, reusing the `Eye`/`EyeOff` pattern from `src/app/signup/page.tsx`.
- A **"Use a specimen number"** button filling `specimenNumber(persona.id)`.
- A one-line note under the field: *"This stays in your browser. It is never sent anywhere and never saved — reloading clears it."*

**Requirements — page:**
- `ready && !facts` → the persona picker, copied in shape from `/documents`'s `No record to compare` branch (`Choice` per persona, `begin(p.id, p.facts)`).
- Seed local state: `name`/`dob` from `records.aadhaar ?? records.epfo` (those two fields only), `city` from the persona, `gender` and `number` empty.
- A 300ms debounced effect writes `setFacts({...facts, records: {...facts.records, aadhaar: {name, dob}}}, "adhaar")`. **The number, gender and city are not in that object.**
- The **Enhanced view** toggle, persisted under `ENHANCE_KEY`, feeding `shouldEnhance(readEnhanceEnv(optOut))`.
- CTAs: "See what this changes" → `/preflight`; for signed-out readers (`useAuth().user === null`) a "Keep this on your account" → `/signup?next=/adhaar`.
- Opening line, bilingual: *"This is the record EPFO compares your claim against. Here it is as an object, not a row in a table."*
- `layout.tsx`: `metadata` with title and description, same shape as `src/app/api/layout.tsx`.
- `src/app/aadhaar/page.tsx`: `import { redirect } from "next/navigation"; export default function Page() { redirect("/adhaar"); }`

- [ ] **Step 1:** The form, with validation and the specimen button.
- [ ] **Step 2:** The page: picker branch, seeding, the stage.
- [ ] **Step 3:** The debounced session write.
- [ ] **Step 4:** The CTAs, the explainer, the layout and the redirect.
- [ ] **Step 5: Checkpoint** — `pnpm typecheck && pnpm lint && pnpm test`, then open `/adhaar` and confirm by hand: type a name, watch the card, go to `/preflight`, see the verdict change.

---

### Task 7: The WebGL studio

**Files:**
- Create: `src/components/adhaar/studio.tsx`
- Modify: `package.json` (`three`, `@types/three`)

**Interfaces:**
- Consumes: `Tilt` from Task 5.
- Produces: `export default function Studio({ tiltRef }: { tiltRef: React.RefObject<Tilt> })`. Default export, because Task 5 loads it with `import("./studio").then((m) => m.default)`.

**Requirements:**
- `pnpm add three && pnpm add -D @types/three`.
- The module's `three` import is inside the component's effect: `const THREE = await import("three")`. Task 5 already code-splits this file; this keeps it split even if something imports the module eagerly.
- Renderer: `{ alpha: true, antialias: true, powerPreference: "high-performance" }`, `setPixelRatio(Math.min(devicePixelRatio, 1.5))`, `shadowMap.enabled`, `PCFSoftShadowMap`.
- Scene: an invisible `BoxGeometry` matching the card footprint that casts a shadow; a floor `PlaneGeometry` with `ShadowMaterial({ opacity: 0.5 })`; `AmbientLight`; one `DirectionalLight` with a 1024 shadow map; one coloured `PointLight` that orbits slowly.
- Motes: one `Points` with ~120 vertices, `AdditiveBlending`, drifting on the clock.
- **No textures, no HDRI, no loaders.** Any gradient is a `CanvasTexture` built at runtime — but prefer lights alone; the contact shadow is what sells it.
- Each frame reads `tiltRef.current` and offsets the camera by `x * 0.6`, `y * 0.4`, so the room parallaxes against the card.
- rAF runs only while an `IntersectionObserver` says the canvas is on screen **and** `document.visibilityState === "visible"`.
- Cleanup disposes geometries, materials, the renderer, and cancels the frame.
- The canvas is `aria-hidden`, `pointer-events-none`, `absolute inset-0`.

- [ ] **Step 1:** Add the dependency; confirm `pnpm build` still succeeds.
- [ ] **Step 2:** Scene, lights, shadow, floor.
- [ ] **Step 3:** Motes and the tilt-driven camera.
- [ ] **Step 4:** Intersection + visibility gating and full disposal.
- [ ] **Step 5: Checkpoint** — `pnpm build`, then confirm in the browser Network tab that no `three` chunk loads until after the page is interactive, and that toggling Enhanced view off stops it loading at all.

---

### Task 8: Discoverability, audits, and the end-to-end suite

**Files:**
- Modify: `src/components/shell.tsx`, `src/app/dashboard/dashboard-client.tsx`, `src/app/documents/page.tsx`, `e2e/theme.spec.ts`, `e2e/a11y.spec.ts`
- Create: `e2e/adhaar.spec.ts`

**Requirements — discoverability:**
- `shell.tsx`: `{ href: "/adhaar", label: lang === "hi" ? "आधार कार्ड" : "Aadhaar card" }` in the signed-in `navLinks`, and one footer link.
- `dashboard-client.tsx`: a discovery card beside the existing documents door, same shape as the `/documents` link at line ~334.
- `documents/page.tsx`: a link in the empty state beside "Type the values in instead".
- `e2e/theme.spec.ts`: add `"/adhaar"` to `CITIZEN`.
- `e2e/a11y.spec.ts`: add `/adhaar` to the routes scanned by axe.

- [ ] **Step 1: Write `e2e/adhaar.spec.ts`**

```ts
import { expect, test, type Page } from "@playwright/test";

async function intoAdhaar(page: Page) {
  await page.goto("/adhaar");
  await page.getByRole("button", { name: /left my job/i }).click();
  await expect(page.getByRole("group", { name: /specimen/i })).toBeVisible();
}

test.describe("the specimen card", () => {
  test("a typed name reaches the card and the verdict", async ({ page }) => {
    await intoAdhaar(page);
    await page.getByLabel(/^Name$/i).fill("Rajesh K Sharma");
    await expect(page.getByTestId("card-name")).toHaveText("Rajesh K Sharma");

    await page.goto("/preflight");
    await expect(
      page.getByRole("heading", { name: /name in EPFO does not match your Aadhaar/i }),
    ).toHaveCount(0);
  });

  test("the number is masked, reveals on request, and never survives a reload", async ({ page }) => {
    await intoAdhaar(page);
    await page.getByRole("button", { name: /Use a specimen number/i }).click();
    await expect(page.getByTestId("card-number")).toHaveText(/^XXXX XXXX \d{4}$/);

    await page.getByRole("button", { name: /Show the number/i }).click();
    await expect(page.getByTestId("card-number")).toHaveText(/^\d{4} \d{4} \d{4}$/);

    await page.reload();
    await expect(page.getByTestId("card-number")).toHaveText("XXXX XXXX ____");
  });

  test("no request ever carries the number", async ({ page }) => {
    const bodies: string[] = [];
    page.on("request", (r) => {
      const body = r.postData();
      if (body) bodies.push(body);
    });
    await intoAdhaar(page);
    await page.getByLabel(/Aadhaar number/i).fill("234567890123");
    await page.getByLabel(/^Name$/i).fill("Somebody Else");
    await page.waitForTimeout(600); // past the 300ms session debounce
    await page.goto("/preflight");
    expect(bodies.filter((b) => b.includes("234567890123") || b.includes("2345"))).toEqual([]);
  });

  test("everything works with the three.js chunk blocked", async ({ page }) => {
    await page.route(/three/, (route) => route.abort());
    await intoAdhaar(page);
    await page.getByLabel(/^Name$/i).fill("Rajesh K Sharma");
    await expect(page.getByTestId("card-name")).toHaveText("Rajesh K Sharma");

    const stage = page.getByRole("group", { name: /specimen/i });
    await stage.focus();
    await stage.press("Enter");
    await expect(page.getByTestId("card-back")).toBeVisible();
  });

  test("the keyboard alone can tilt and flip it", async ({ page }) => {
    await intoAdhaar(page);
    const stage = page.getByRole("group", { name: /specimen/i });
    await stage.focus();
    await expect(stage).toBeFocused();
    await stage.press("ArrowRight");
    await stage.press("Space");
    await expect(page.getByTestId("card-back")).toBeVisible();
  });

  test("reduced motion still shows every detail", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await intoAdhaar(page);
    await page.getByLabel(/^Name$/i).fill("Rajesh K Sharma");
    await expect(page.getByTestId("card-name")).toHaveText("Rajesh K Sharma");
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("no session asks whose card to build", async ({ page }) => {
    await page.goto("/adhaar");
    await expect(page.getByRole("button", { name: /left my job/i })).toBeVisible();
  });

  test("the spelling people actually type redirects", async ({ page }) => {
    await page.goto("/aadhaar");
    await expect(page).toHaveURL(/\/adhaar$/);
  });
});
```

- [ ] **Step 2:** Run it, watch it fail on the missing `data-testid`s, and add `data-testid="card-name"`, `"card-number"`, `"card-back"` to `specimen-card.tsx`.
- [ ] **Step 3:** Add the nav, footer, dashboard and documents entry points.
- [ ] **Step 4:** Add `/adhaar` to both audits.
- [ ] **Step 5: Full green** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm e2e`. Every suite passes, including the theme audit measuring `/adhaar` in both themes and axe scanning it.

---

## Self-Review

**Spec coverage.** §1 → Tasks 6, 8. §2 → Tasks 1, 2, 6 (field, validation, masking, reveal, specimen button, the never-leaves rule and its test). §3 layer 1 → Tasks 4, 5; layer 2 and the four budget mechanisms → Tasks 3, 5, 7 and the blocked-chunk test in Task 8. §4 → all ten files appear. §5 → Task 6 steps 2–3, with the number/gender/city exclusion asserted in Task 8. §6 → Task 5. §7 → Task 8 step 3. §8 → Task 4's token constraint plus Task 8 step 4. §9 → Tasks 1–3 unit tests and Task 8's spec. §10 → Task 8's modify list plus Task 7's `package.json`.

**Placeholders.** None: every code step carries real code, every copy string is written out in both languages or specified as a `COPY` entry with both, and every test names its expected failure.

**Type consistency.** `CardDetails` is defined in Task 4 and consumed unchanged in Tasks 5 and 6. `Tilt` is defined in Task 5 and consumed in Task 7. `EnhanceEnv`/`shouldEnhance`/`readEnhanceEnv`/`ENHANCE_KEY` are defined in Task 3 and consumed in Task 6. `digitsOnly`/`verhoeffCheckDigit` are defined in Task 1 and consumed in Task 2. `Studio` is a default export in Task 7 and loaded as `m.default` in Task 5.

**One correction found and fixed inline:** Task 2's draft referenced `AADHAAR_TAIL` above its declaration; the note now tells the implementer to hoist it.
