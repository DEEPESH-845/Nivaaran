import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const STANDARD = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: Page) {
  // Titles are applied after client-side navigation settles; scanning before
  // that lands reports a false document-title violation.
  await expect(page).toHaveTitle(/Nivaaran/);

  // The landing narrative reveals scenes on scroll. Scanning without walking
  // the page first would only ever audit the first viewport, so drive it to
  // the bottom and back: axe then sees the page a reader actually gets.
  await page.evaluate(async () => {
    const step = Math.max(320, window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });

  // Entry animations fade content in. Colour contrast measured mid-fade is
  // meaningless, so wait for every animation to settle before scanning.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
  return new AxeBuilder({ page }).withTags(STANDARD).analyze();
}

async function intoJourney(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /left my job/i }).click();
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: /^Continue$/ }).click();
  }
  await page.getByRole("button", { name: /Check my claim/i }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
}

/** The documents page, with one document read and the comparison rendered. */
async function intoOpenReader(page: Page) {
  await page.route("**/api/ai/extract", (route) =>
    route.fulfill({
      json: {
        ok: true,
        docType: "passbook",
        fields: {
          name: "Rajesh Kumar Sharma",
          dob: null,
          ifsc: "CORP0001234",
          accountLast4: "8842",
        },
        confidence: "medium",
        quality: "glare",
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /left my job/i }).click();
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: /^Continue$/ }).click();
  }
  await page.getByRole("link", { name: /Read these from your documents instead/i }).click();
  await page.getByRole("button", { name: /Bank passbook — Rajesh/i }).click();
  await expect(page.getByRole("button", { name: /Use these values/i })).toBeVisible();
}

/** Sign in, so an authenticated page can be scanned as itself. */
async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("NivaaranDemo2026!");
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

const PUBLIC = [
  "/", "/why", "/sources", "/status", "/api", "/documents",
  "/login", "/signup", "/forbidden", "/no-such-page",
];

for (const path of PUBLIC) {
  test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await scan(page);
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
  });
}

/**
 * Scanned signed in, as the account that owns them.
 *
 * `/employer` used to sit in the public list above, and once it grew an
 * authorization boundary that scan was silently auditing the sign-in page
 * instead. An authenticated surface has to be scanned authenticated.
 */
const PRIVATE: [string, string][] = [
  ["/dashboard", "demo@nivaaran.app"],
  ["/account", "demo@nivaaran.app"],
  ["/employer", "employer@nivaaran.app"],
  ["/governance", "admin@nivaaran.app"],
];

for (const [path, email] of PRIVATE) {
  test(`no WCAG A/AA violations on ${path}, signed in`, async ({ page }) => {
    await signIn(page, email);
    await page.goto(path);
    await expect(page).not.toHaveURL(/\/login|\/forbidden/);
    const { violations } = await scan(page);
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
  });
}

test("no WCAG A/AA violations on the dashboard in Hindi", async ({ page }) => {
  await signIn(page, "demo@nivaaran.app");
  await page.getByRole("button", { name: /Switch to Hindi/i }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  const { violations } = await scan(page);
  expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test("no WCAG A/AA violations on sign-in with an error showing", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/Email address/i).fill("demo@nivaaran.app");
  await page.getByLabel("Password", { exact: true }).fill("definitely-not-it");
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await expect(page.locator("form").getByRole("alert")).toBeVisible();
  const { violations } = await scan(page);
  expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test("no WCAG A/AA violations on the question flow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /left my job/i }).click();
  await expect(page).toHaveURL(/\/check/);
  const { violations } = await scan(page);
  expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test("no WCAG A/AA violations on the preflight verdict", async ({ page }) => {
  await intoJourney(page);
  const { violations } = await scan(page);
  expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test("no WCAG A/AA violations with every fix panel open", async ({ page }) => {
  await intoJourney(page);
  for (const btn of await page.getByRole("button", { name: /How to fix it/i }).all()) {
    await btn.click();
  }
  const { violations } = await scan(page);
  expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test("no WCAG A/AA violations in Hindi", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Switch to Hindi/i }).click();
  const { violations } = await scan(page);
  expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test("no WCAG A/AA violations on the documents comparison", async ({ page }) => {
  await intoOpenReader(page);
  const { violations } = await scan(page);
  expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test("the document pre-check is operable by keyboard, file input included", async ({ page }) => {
  await intoOpenReader(page);
  // A visually hidden <input type="file"> still has to be reachable by Tab;
  // its visible label is the target, not a replacement for it.
  const file = page.locator("#document-file-identity");
  await file.focus();
  await expect(file).toBeFocused();
  await expect(page.getByText(/Choose a file/i)).toBeVisible();
});

test("every document pre-check control meets the 44px minimum on mobile", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "mobile viewport only");
  await intoOpenReader(page);
  const controls = await page
    .locator("main")
    .locator("button:visible, a:visible, summary:visible, label:visible")
    .all();
  const undersized: string[] = [];
  for (const c of controls) {
    const box = await c.boundingBox();
    if (box && box.height < 44 && box.width < 44) {
      undersized.push(`${(await c.textContent())?.trim().slice(0, 40)} — ${box.width}×${box.height}`);
    }
  }
  expect(undersized).toEqual([]);
});

test("the whole intent step is reachable and operable by keyboard alone", async ({ page }) => {
  await page.goto("/");
  const tile = page.getByRole("button", { name: /left my job/i });
  await tile.focus();
  await expect(tile).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/check/);

  // And the first answer can be selected without a pointer.
  const choice = page.getByRole("button", { name: /Less than a month ago/i });
  await choice.focus();
  await page.keyboard.press("Enter");
  await expect(choice).toHaveAttribute("aria-pressed", "true");
});

test("the skip link is the first thing a keyboard user reaches", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /Skip to main content/i })).toBeFocused();
});

/** Scoped to our own chrome so the Next dev-tools overlay is not measured. */
async function undersizedTargets(page: Page): Promise<string[]> {
  const controls = await page
    .locator("header, main, footer")
    .locator("button:visible, a:visible")
    .all();
  const undersized: string[] = [];
  for (const c of controls) {
    const box = await c.boundingBox();
    if (box && box.height < 44 && box.width < 44) {
      undersized.push(`${(await c.textContent())?.trim().slice(0, 40)} — ${box.width}x${box.height}`);
    }
  }
  return undersized;
}

test("every interactive target meets the 44px minimum on mobile", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "mobile viewport only");
  await intoJourney(page);
  expect(await undersizedTargets(page)).toEqual([]);
});

test("sign-in is thumb-sized on mobile", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "mobile viewport only");
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /^Sign in$/ })).toBeVisible();
  expect(await undersizedTargets(page)).toEqual([]);
});

test("the dashboard is thumb-sized on mobile, and never scrolls sideways", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "mobile viewport only");
  await signIn(page, "demo@nivaaran.app");
  expect(await undersizedTargets(page)).toEqual([]);

  // Wide content scrolls inside its own container; the page body never does.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
