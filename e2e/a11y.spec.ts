import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const STANDARD = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: Page) {
  // Titles are applied after client-side navigation settles; scanning before
  // that lands reports a false document-title violation.
  await expect(page).toHaveTitle(/Nivaaran/);
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

for (const path of ["/", "/why", "/sources", "/status"]) {
  test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await scan(page);
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
  });
}

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

test("every interactive target meets the 44px minimum on mobile", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "mobile viewport only");
  await intoJourney(page);
  // Scoped to our own chrome so the Next dev-tools overlay is not measured.
  const controls = await page
    .locator("header, main, footer")
    .locator("button:visible, a:visible")
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
