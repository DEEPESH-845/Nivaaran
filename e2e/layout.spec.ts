import { expect, test, type Page } from "@playwright/test";

/**
 * Geometry regressions, measured rather than eyeballed.
 *
 * Two bugs motivated this file, and both were invisible to every other check
 * in the suite because neither throws, fails an assertion, or moves an
 * accessible name:
 *
 *  1. The action footer. `flex flex-wrap` with the helper text as `flex-1`
 *     never wraps — `flex-1` is `flex-basis: 0`, so the paragraph contributes
 *     nothing to the line and shrinks in place instead of moving under the
 *     button. Measured at 412px it was 13px wide and 169px tall: one word per
 *     line, spilling past the card.
 *
 *  2. The header. Its bar shared the body's `max-w-5xl`, so it could never
 *     use the width a wide screen gave it. The desktop navigation wanted
 *     1052px of a 992px line, which pinned the wordmark against "Dashboard"
 *     and wrapped every two-word label onto a second line.
 *
 * Both are caught here by asking the browser for numbers.
 */

const DESKTOP_WIDTHS = [1280, 1440, 1920];
/** 320 is a 1280 desktop at 400% zoom; 640 is the same at 200%. */
const ALL_WIDTHS = [320, 375, 390, 412, 640, 768, 834, 1024, 1280, 1440, 1920];

/** Routes that never intend to scroll sideways. */
const ROUTES = ["/", "/why", "/documents", "/adhaar", "/status", "/sources", "/login"];

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: /email/i }).fill("demo@nivaaran.app");
  await page.getByRole("textbox", { name: /^password$/i }).fill("NivaaranDemo2026!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("no page scrolls sideways", () => {
  for (const lang of ["English", "Hindi"] as const) {
  test(`every route fits its viewport at every width — ${lang}`, async ({ page }) => {
    if (lang === "Hindi") {
      // The choice is stored, so it is made once and then rides along.
      await page.goto("/");
      await page.getByRole("button", { name: /Switch to Hindi/i }).first().click();
      await expect(
        page.getByRole("button", { name: /Switch to English/i }).first(),
      ).toBeVisible();
    }
    for (const route of ROUTES) {
      await page.goto(route);
      for (const width of ALL_WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const { scrollW, clientW } = await page.evaluate(() => ({
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
        }));
        expect(scrollW, `${route} at ${width}px in ${lang}`).toBeLessThanOrEqual(
          clientW + 1,
        );
      }
    }
  });
  }
});

test.describe("the action footer", () => {
  test("the helper never collapses into a vertical strip", async ({ page }) => {
    await page.goto("/");
    const helper = page.getByText(/Press it to watch the engine re-run/);
    await helper.scrollIntoViewIfNeeded();

    for (const width of [375, 412, 640, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const box = (await helper.boundingBox())!;
      // A sentence of ~40 characters needs real width. The collapsed state was
      // 13px wide; anything under ~200px means the flex line failed to break.
      expect(box.width, `helper width at ${width}px`).toBeGreaterThan(200);
      // One or two lines of 13px text. The collapsed state was nine.
      expect(box.height, `helper height at ${width}px`).toBeLessThan(80);
    }
  });

  test("the action goes full-width on a phone and shares the row on a desktop", async ({
    page,
  }) => {
    await page.goto("/");
    const action = page.getByRole("button", { name: /I've corrected my name/i });
    await action.scrollIntoViewIfNeeded();

    await page.setViewportSize({ width: 375, height: 900 });
    const phone = (await action.boundingBox())!;
    expect(phone.width).toBeGreaterThan(280); // the card's full inner width

    await page.setViewportSize({ width: 1280, height: 900 });
    const desktop = (await action.boundingBox())!;
    const helper = (await page
      .getByText(/Press it to watch the engine re-run/)
      .boundingBox())!;
    expect(desktop.width).toBeLessThan(phone.width + 60); // content-sized, not stretched
    expect(helper.y).toBeLessThan(desktop.y + desktop.height); // same row
  });
});

test.describe("the header", () => {
  test("the brand keeps its distance and no label wraps", async ({ page }) => {
    await signIn(page);

    for (const lang of ["en", "hi"] as const) {
      if (lang === "hi") {
        await page.getByRole("button", { name: /Switch to Hindi/i }).click();
      }
      for (const width of DESKTOP_WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const bar = page.locator("header > div").first();
        const brand = page.getByRole("link", { name: /Nivaaran — home/ });
        const links = page.locator("header nav a");

        const where = `${lang} at ${width}px`;
        const brandBox = (await brand.boundingBox())!;
        const firstLink = (await links.first().boundingBox())!;
        expect(firstLink.x - (brandBox.x + brandBox.width), `brand gap ${where}`)
          .toBeGreaterThanOrEqual(24);

        // A wrapped nav label is two lines of 20px type, not one.
        for (const link of await links.all()) {
          const box = (await link.boundingBox())!;
          expect(box.height, `${await link.innerText()} ${where}`).toBeLessThan(28);
        }

        // The bar itself never overflows its own column.
        const { scrollW, clientW } = await bar.evaluate((el) => ({
          scrollW: el.scrollWidth,
          clientW: el.clientWidth,
        }));
        expect(scrollW, `header overflow ${where}`).toBeLessThanOrEqual(clientW + 1);
      }
    }
  });

  test("below the desktop breakpoint the drawer replaces the bar", async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 1024, height: 900 });

    await expect(page.locator("header nav a").first()).toBeHidden();

    const toggle = page.getByRole("button", { name: /Open menu/i });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();

    const drawer = page.locator("#mobile-nav");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: /^Dashboard$/ })).toBeVisible();

    // Escape closes it — a full-page panel must be dismissible from the keyboard.
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("the height is stable when the account resolves", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const anonymous = (await page.locator("header").boundingBox())!.height;
    await signIn(page);
    const authenticated = (await page.locator("header").boundingBox())!.height;
    expect(authenticated).toBe(anonymous);
  });
});
