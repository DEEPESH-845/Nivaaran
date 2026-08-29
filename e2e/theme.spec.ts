import { expect, test, type Page } from "@playwright/test";

/**
 * The theme, audited rather than eyeballed.
 *
 * Two jobs. First: the manual toggle actually switches, persists, and beats
 * the operating system — that is the whole point of a manual control.
 *
 * Second, and the reason this file is long: every readable thing on every
 * page has to survive the switch. The palette is all tokens, so a miss is
 * always the same shape — one hardcoded colour that stayed light while its
 * surface went dark. Rather than trust that, this walks each page in both
 * themes and measures: every run of text against its real composited
 * background, and every control again while it is hovered, which is where
 * the first report came from.
 */

const DEMO_PASSWORD = "NivaaranDemo2026!";
const THEME_KEY = "nivaaran-theme";

/** WCAG AA. Large text (>=24px, or >=18.66px bold) is allowed 3:1. */
const AA_NORMAL = 4.5;
const AA_LARGE = 3;
/** A hovered control only has to stay readable, not pass AA as body copy. */
const HOVER_MIN = 3;

type Finding = { where: string; label: string; ratio: number; need: number };

/* ------------------------------------------------------------------ audit */

/** Runs in the page. Returns every text run and every control that fails its
 *  contrast threshold, measured against the background actually painted
 *  behind it. */
function auditContrast(opts: { hoveredOnly: boolean; hoverMin: number; normal: number; large: number }) {
  // getComputedStyle returns `lab(...)` for oklch tokens, so scraping digits
  // out of the string is not enough — let the canvas convert to sRGB.
  const probe = document.createElement("canvas").getContext("2d", {
    willReadFrequently: true,
  })!;
  probe.canvas.width = probe.canvas.height = 1;

  const parse = (c: string): number[] | null => {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "#000";
    probe.fillStyle = c;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (fg: number[], bg: number[]) =>
    [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
  const lum = (c: number[]) =>
    c
      .slice(0, 3)
      .map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);

  /** The colour actually painted behind `el`, or null when it is a gradient
   *  or an image — a fiction we decline to measure.
   *
   *  The stack comes from a hit test rather than the ancestor chain, because
   *  a sticky translucent bar is painted over whatever has scrolled under it,
   *  which is not its parent. Walking parents would measure the story page's
   *  floating header against <body> and invent a failure. */
  function backdrop(el: Element): number[] | null {
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
    const y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);

    const hit = document.elementsFromPoint(x, y);
    const at = hit.indexOf(el);
    // Off-screen, or something is painted over it: the parents are all we have.
    const stack: Element[] =
      at === -1
        ? (() => {
            const chain: Element[] = [];
            for (let n = el.parentElement; n; n = n.parentElement) chain.push(n);
            return chain;
          })()
        : hit.slice(at + 1);

    const layers: number[][] = [];
    if (getComputedStyle(el).backgroundImage !== "none") return null;
    for (const n of stack) {
      const s = getComputedStyle(n);
      if (s.backgroundImage !== "none") return null;
      const c = parse(s.backgroundColor);
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] >= 0.999) break;
      }
    }
    // The element's own fill sits on top of everything behind it.
    const own = parse(getComputedStyle(el).backgroundColor);
    if (own && own[3] > 0) layers.unshift(own);

    let bg = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
    return bg;
  }

  function ratio(el: Element): number | null {
    const bg = backdrop(el);
    if (!bg) return null;
    const fg = parse(getComputedStyle(el).color);
    if (!fg || fg[3] < 0.05) return null;
    const text = over(fg, bg);
    const [hi, lo] = [lum(text), lum(bg)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
  }

  function visible(el: Element): boolean {
    if (el.closest("[aria-hidden='true'], .sr-only, [hidden]")) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    // Parked off-canvas — the skip link's resting place. It is measured when
    // it is focused and on screen, which is the only time anyone sees it.
    if (r.right < 0 || r.left > innerWidth) return false;
    for (let n: Element | null = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === "none" || s.visibility !== "visible") return false;
      // Entry animations park at 0 before they play; not a colour problem.
      if (+s.opacity < 0.5) return false;
    }
    return true;
  }

  function describe(el: Element): string {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 34);
    return `${el.tagName.toLowerCase()}${text ? ` “${text}”` : ""}`;
  }

  /** Renders text itself. A wrapper's colour is its children's problem. */
  function hasOwnText(el: Element): boolean {
    return [...el.childNodes].some(
      (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim().length > 0,
    );
  }

  const out: { label: string; ratio: number; need: number }[] = [];
  let checked = 0;

  if (opts.hoveredOnly) {
    // The innermost hovered control — :hover matches the whole ancestor
    // chain, and it is the control's own fill we are asking about.
    const target = [...document.querySelectorAll(":hover")]
      .reverse()
      .find((n) => n.matches("a, button, summary, label, [role='button']"));
    if (target) {
      // Its label may live in a child span with its own colour, so measure
      // whatever actually carries text rather than the wrapper's inherited one.
      for (const el of [target, ...target.querySelectorAll("*")]) {
        if (!hasOwnText(el) || !visible(el)) continue;
        const r = ratio(el);
        if (r === null) continue;
        checked++;
        if (r < opts.hoverMin) {
          out.push({ label: describe(target), ratio: r, need: opts.hoverMin });
        }
      }
    }
    return { out, checked };
  }

  for (const el of document.querySelectorAll<HTMLElement>("body *")) {
    if (!hasOwnText(el) || !visible(el)) continue;

    const s = getComputedStyle(el);
    const px = parseFloat(s.fontSize);
    const bold = +s.fontWeight >= 700;
    const need = px >= 24 || (bold && px >= 18.66) ? opts.large : opts.normal;

    const r = ratio(el);
    if (r === null) continue;
    checked++;
    if (r < need) out.push({ label: describe(el), ratio: r, need });
  }
  return { out, checked };
}

/* ------------------------------------------------------------------ setup */

/** Pin the theme the way the toggle does — the stored choice, applied before
 *  first paint — so the audit exercises the shipped code path. */
async function useTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [THEME_KEY, theme],
  );
}

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function auditPage(page: Page, where: string, findings: Finding[]) {
  // Not `networkidle`: the dev server keeps an HMR socket open, so that state
  // never arrives and every page would burn its own timeout waiting.
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").first().waitFor({ state: "visible" });
  expect(
    await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
    "the audit must run in the designed static end-state",
  ).toBe(true);
  // Jump every entry animation to its end. Scenes deliberately start faint and
  // resolve; measuring a frame partway through would report a designed state
  // as a contrast failure, and would do it differently on every run.
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      try {
        a.finish();
      } catch {
        // An infinite animation has no end to jump to. Leave it running.
      }
    }
  });
  // The theme has to be the one we asked for before any of this means anything.
  await expect(page.locator("html")).toHaveAttribute("data-theme", /light|dark/);

  const text = await page.evaluate(auditContrast, {
    hoveredOnly: false,
    hoverMin: HOVER_MIN,
    normal: AA_NORMAL,
    large: AA_LARGE,
  });
  for (const f of text.out) findings.push({ where, ...f });
  let checked = text.checked;

  const controls = page.locator(
    "a:visible, button:visible, summary:visible, label:visible",
  );
  const n = Math.min(await controls.count(), 80);
  for (let i = 0; i < n; i++) {
    await controls.nth(i).hover({ force: true, timeout: 2000 }).catch(() => {});
    const hovered = await page.evaluate(auditContrast, {
      hoveredOnly: true,
      hoverMin: HOVER_MIN,
      normal: AA_NORMAL,
      large: AA_LARGE,
    });
    for (const f of hovered.out) findings.push({ where: `${where} (hovered)`, ...f });
    checked += hovered.checked;
  }

  // A page that measured nothing is a green tick over an empty audit.
  expect(checked, `${where}: nothing was measured`).toBeGreaterThan(15);
  return checked;
}

function report(findings: Finding[]) {
  return findings.map(
    (f) => `${f.where}: ${f.label} — ${f.ratio.toFixed(2)}:1, needs ${f.need}:1`,
  );
}

/* ----------------------------------------------------------------- routes */

const PUBLIC = [
  "/",
  "/story",
  "/why",
  "/beyond",
  "/sources",
  "/api",
  "/login",
  "/signup",
  "/forbidden",
  // The not-found page is a Nivaaran page too, and nobody ever looks at it.
  "/no-such-page",
];
const CITIZEN = ["/dashboard", "/check", "/preflight", "/claim", "/status", "/done", "/documents", "/adhaar", "/account"];
const EMPLOYER = ["/employer"];
const ADMIN = ["/governance"];

/* ------------------------------------------------------------ the toggle */

test.describe("the theme toggle", () => {
  test("switches the page, and keeps the choice across a reload", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");

    const toggle = page.getByRole("button", { name: /Dark mode|Light mode/ }).first();
    await toggle.click();
    const after = await html.getAttribute("data-theme");
    expect(after).toMatch(/^(light|dark)$/);
    expect(after).not.toBe(before);

    // Survives navigation and a full reload, without a flash of the old theme:
    // the inline script applies it before React ever runs.
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", after!);
    await page.goto("/why");
    await expect(html).toHaveAttribute("data-theme", after!);
  });

  test("a chosen theme overrules the operating system", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    const page = await ctx.newPage();
    await useTheme(page, "light");
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // Light paper, despite the OS asking for dark.
    const light = await page.evaluate((c) => {
      const p = document.createElement("canvas").getContext("2d")!;
      p.fillStyle = c;
      p.fillRect(0, 0, 1, 1);
      const d = p.getImageData(0, 0, 1, 1).data;
      return (d[0] + d[1] + d[2]) / 3;
    }, bg);
    expect(light).toBeGreaterThan(200);
    await ctx.close();
  });

  test("with no stored choice, the operating system still decides", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /./);
    const mid = await page.evaluate(() => {
      const c = getComputedStyle(document.body).backgroundColor;
      const p = document.createElement("canvas").getContext("2d")!;
      p.fillStyle = c;
      p.fillRect(0, 0, 1, 1);
      const d = p.getImageData(0, 0, 1, 1).data;
      return (d[0] + d[1] + d[2]) / 3;
    });
    expect(mid).toBeLessThan(80);
    await ctx.close();
  });
});

/* ------------------------------------------------------------- the audit */

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    test("every page reads, signed out", async ({ page }) => {
      // Every control on every page, hovered one at a time. Slow by nature.
      test.setTimeout(240_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await useTheme(page, theme);
      const findings: Finding[] = [];
      let checked = 0;
      for (const path of PUBLIC) {
        await page.goto(path);
        checked += await auditPage(page, `${theme} ${path}`, findings);
      }
      expect(report(findings)).toEqual([]);
      expect(checked).toBeGreaterThan(400);
    });

    test("every page reads, signed in", async ({ page }) => {
      test.setTimeout(300_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await useTheme(page, theme);
      const findings: Finding[] = [];

      let checked = 0;

      await signIn(page, "demo@nivaaran.app");
      for (const path of CITIZEN) {
        await page.goto(path);
        checked += await auditPage(page, `${theme} ${path}`, findings);
      }

      await signIn(page, "employer@nivaaran.app");
      for (const path of EMPLOYER) {
        await page.goto(path);
        checked += await auditPage(page, `${theme} ${path}`, findings);
      }

      await signIn(page, "admin@nivaaran.app");
      for (const path of ADMIN) {
        await page.goto(path);
        checked += await auditPage(page, `${theme} ${path}`, findings);
      }

      expect(report(findings)).toEqual([]);
      expect(checked).toBeGreaterThan(400);
    });

    test("the mobile menu reads", async ({ page }) => {
      test.skip(test.info().project.name !== "mobile", "mobile viewport only");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await useTheme(page, theme);
      const findings: Finding[] = [];

      // A surface with its own overlay background, only ever seen open.
      await page.goto("/");
      await page.getByRole("button", { name: /Open menu/i }).click();
      await expect(page.getByRole("link", { name: /Experience/i }).first()).toBeVisible();
      await auditPage(page, `${theme} mobile menu`, findings);

      expect(report(findings)).toEqual([]);
    });
  });
}
