import { expect, test, type Page } from "@playwright/test";

/** Walk the five situation questions and land on the records step. */
async function answerQuestions(page: Page) {
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: /^Continue$/ }).click();
  }
  await expect(page.getByRole("heading", { name: /Now we compare your records/i })).toBeVisible();
}

async function startAs(page: Page, saying: RegExp) {
  await page.goto("/");
  await page.getByRole("button", { name: saying }).click();
  await expect(page).toHaveURL(/\/check/);
}

test.describe("the critical journey", () => {
  test("intent to verdict: a blocked member sees every blocker, sourced", async ({ page }) => {
    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await page.getByRole("button", { name: /Check my claim/i }).click();

    await expect(page).toHaveURL(/\/preflight/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/will stop this claim/i);

    // The three blockers the engine finds for this record.
    await expect(page.getByRole("heading", { name: /date of exit has not been recorded/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /name in EPFO does not match your Aadhaar/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /IFSC belongs to a bank that no longer exists/i })).toBeVisible();

    // The token-level evidence a portal never shows.
    await expect(page.getByText("KUMAR", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /name on your bank account does not match/i })).toBeVisible();

    // Every finding cites a source.
    await expect(page.getByText(/High confidence/).first()).toBeVisible();
  });

  test("fixing a blocker re-runs the check and removes it", async ({ page }) => {
    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await page.getByRole("button", { name: /Check my claim/i }).click();

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("4 things");

    const card = page
      .locator("li")
      .filter({ has: page.getByRole("heading", { name: /name in EPFO does not match/i }) });
    await card.getByRole("button", { name: /How to fix it/i }).click();
    await card.getByRole("button", { name: /I've done this/i }).click();

    // Correcting the EPFO name clears both the Aadhaar mismatch and the bank
    // name mismatch, because both were measuring against the same wrong value.
    await expect(heading).toContainText("2 things");
    await expect(
      page.getByRole("heading", { name: /name in EPFO does not match your Aadhaar/i }),
    ).toHaveCount(0);
  });

  test("a clean record files end to end and reaches a status timeline", async ({ page }) => {
    await startAs(page, /records are fine/i);
    await answerQuestions(page);
    await page.getByRole("button", { name: /Check my claim/i }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/should go through/i);
    await page.getByRole("link", { name: /File my claim/i }).click();

    await expect(page).toHaveURL(/\/claim/);
    await page.getByRole("button", { name: /Submit claim/i }).click();

    await expect(page).toHaveURL(/\/done/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/claim is in/i);
    const ref = await page.locator("p.font-mono").first().textContent();
    expect(ref).toMatch(/^PKA-[A-Z0-9]{6}$/);

    await page.getByRole("link", { name: /Track this claim/i }).click();
    await expect(page).toHaveURL(/\/status/);
    await expect(page.getByText(/Happening now/i)).toBeVisible();
  });

  test("changing an answer changes the verdict", async ({ page }) => {
    await startAs(page, /records are fine/i);
    // Question 2: say the exit date was never recorded.
    await page.getByRole("button", { name: /^Continue$/ }).click();
    await page.getByRole("button", { name: /haven't done it/i }).click();
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: /^Continue$/ }).click();
    }
    await page.getByRole("button", { name: /Check my claim/i }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/will stop this claim/i);
    await expect(page.getByRole("heading", { name: /date of exit has not been recorded/i })).toBeVisible();
  });
});

test.describe("recovery and resilience", () => {
  test("the browser back button walks back through the questions", async ({ page }) => {
    await startAs(page, /left my job/i);
    await page.getByRole("button", { name: /^Continue$/ }).click();
    await page.getByRole("button", { name: /^Continue$/ }).click();
    await expect(page).toHaveURL(/q=2/);

    await page.goBack();
    await expect(page).toHaveURL(/q=1/);
    await page.goBack();
    await expect(page).toHaveURL(/\/check\?q=0|\/check$/);
  });

  test("a refresh mid-journey keeps your progress", async ({ page }) => {
    await startAs(page, /left my job/i);
    await page.getByRole("button", { name: /^Continue$/ }).click();
    await page.getByRole("button", { name: /haven't done it/i }).click();
    await page.reload();

    await expect(page.getByRole("button", { name: /haven't done it/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("landing on a journey page with no session returns you home", async ({ page }) => {
    await page.goto("/preflight");
    await expect(page).toHaveURL("/");
  });

  test("the journey completes with the AI endpoints failing", async ({ page }) => {
    await page.route("**/api/ai/**", (route) => route.abort());
    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await page.getByRole("button", { name: /Check my claim/i }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/will stop this claim/i);
    const card = page
      .locator("li")
      .filter({ has: page.getByRole("heading", { name: /name in EPFO does not match/i }) });
    await card.getByRole("button", { name: /Explain this simply/i }).click();
    await expect(card.getByText(/isn't available right now/i)).toBeVisible();
    // The verdict itself is untouched.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/will stop this claim/i);
  });

  test("the rejection decoder resolves known wording without any model", async ({ page }) => {
    await startAs(page, /rejected/i);
    await answerQuestions(page);
    await page.getByRole("button", { name: /Check my claim/i }).click();

    await page.getByRole("button", { name: /Tell me what this means/i }).click();
    await expect(page.getByText(/Matched against documented EPFO phrasings/i)).toBeVisible();
    await expect(page.getByText(/Name mismatch between EPFO and Aadhaar/i)).toBeVisible();
  });
});

test.describe("language", () => {
  test("switching to Hindi translates the journey, not just the chrome", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Switch to Hindi/i }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("हम पहले जाँचते हैं");

    await page.getByRole("button", { name: /नौकरी छोड़ी/i }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("अंतिम कार्यदिवस");

    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: /आगे बढ़ें/ }).click();
    }
    await page.getByRole("button", { name: /मेरा दावा जाँचें/ }).click();
    // Domain content, not navigation, must be translated too.
    await expect(page.getByRole("heading", { name: /नाम आधार से मेल नहीं खाता/ })).toBeVisible();
  });

  test("the language choice survives a reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Switch to Hindi/i }).click();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("हम पहले जाँचते हैं");
  });
});
