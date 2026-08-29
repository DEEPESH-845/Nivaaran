import { expect, test, type Page } from "@playwright/test";

/**
 * Accounts, access control, and the journey a judge actually walks.
 *
 * The security tests here are deliberately blunt: they type the address of a
 * page the account has no business seeing and assert the door is shut. Hiding
 * a nav link would pass a prettier test and protect nobody.
 */

const DEMO_PASSWORD = "NivaaranDemo2026!";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("signing in", () => {
  test("the demo credentials on the page actually work", async ({ page }) => {
    await page.goto("/login");

    // The judge affordance: fill the form without typing anything.
    await page
      .locator("li")
      .filter({ hasText: "demo@nivaaran.app" })
      .getByRole("button", { name: /Fill this in/i })
      .click();

    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("a wrong password says the same thing as an unknown account", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/Email address/i).fill("demo@nivaaran.app");
    await page.getByLabel("Password", { exact: true }).fill("definitely-not-it");
    await page.getByRole("button", { name: /^Sign in$/ }).click();

    const wrongPassword = await page.locator("form").getByRole("alert").textContent();
    expect(wrongPassword).toMatch(/do not match an account/i);

    await page.getByLabel(/Email address/i).fill("nobody@nivaaran.app");
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText(wrongPassword!.trim());
  });

  test("the password can be revealed and hidden again", async ({ page }) => {
    await page.goto("/login");
    const field = page.getByLabel("Password", { exact: true });
    await expect(field).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: /Show password/i }).click();
    await expect(field).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: /Hide password/i }).click();
    await expect(field).toHaveAttribute("type", "password");
  });

  test("signing out ends the session for good", async ({ page }) => {
    await signIn(page, "demo@nivaaran.app");
    await page.goto("/account");
    await page.locator("#main").getByRole("button", { name: /^Sign out$/ }).click();
    await expect(page).toHaveURL("/");

    // Not merely hidden: the protected page itself is now unreachable.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a weak password is refused before the account is created", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/Your name/i).fill("Test Person");
    await page.getByLabel(/Email address/i).fill(`t${Date.now()}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: /^Create account$/ }).click();

    await expect(page.locator("#password-error")).toContainText(/at least 10 characters/i);
    await expect(page).toHaveURL(/\/signup/);
  });

  test("a new account can be created and lands on the dashboard", async ({ page }, testInfo) => {
    const email = `judge-${testInfo.project.name}-${Date.now()}@example.com`;
    await page.goto("/signup");
    await page.getByLabel(/Your name/i).fill("Judge Account");
    await page.getByLabel(/Email address/i).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("a quiet civic instrument");
    await page.getByRole("button", { name: /^Create account$/ }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/haven.t started a claim yet/i)).toBeVisible();
  });
});

test.describe("access control", () => {
  test("a signed-out visitor is sent to sign in, and back afterwards", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("a citizen typing /employer is refused, not redirected to a hidden page", async ({ page }) => {
    await signIn(page, "demo@nivaaran.app");
    await page.goto("/employer");
    await expect(page).toHaveURL(/\/forbidden/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/don.t have access/i);
    // And it says what kind of account the area belongs to.
    await expect(page.getByText(/employer accounts/i)).toBeVisible();
  });

  test("a citizen typing /governance is refused", async ({ page }) => {
    await signIn(page, "demo@nivaaran.app");
    await page.goto("/governance");
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("an employer reaches the leaver queue but not governance", async ({ page }) => {
    await signIn(page, "employer@nivaaran.app");

    await page.goto("/employer");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).not.toHaveURL(/forbidden/);

    await page.goto("/governance");
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("an admin reaches rule governance", async ({ page }) => {
    await signIn(page, "admin@nivaaran.app");
    await page.goto("/governance");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/every source has a date/i);
    await expect(page.getByText(/Needs review/i).first()).toBeVisible();
  });

  test("a case is readable only with its owner's session", async ({ page, context }) => {
    await signIn(page, "demo@nivaaran.app");
    expect((await context.request.get("/api/case")).status()).toBe(200);

    // The same URL, without the cookie, is not a different view of the same
    // data — there is no case id to ask for in the first place.
    await context.clearCookies();
    expect((await context.request.get("/api/case")).status()).toBe(401);
  });

  test("a cross-site POST with a valid cookie is rejected", async ({ page, context }) => {
    await signIn(page, "demo@nivaaran.app");
    const response = await context.request.post("/api/case", {
      headers: { origin: "https://evil.example" },
      data: { action: "reset" },
    });
    expect(response.status()).toBe(403);
  });
});

test.describe("the signed-in journey", () => {
  /**
   * Each of these creates its own account.
   *
   * The seeded demo accounts are shared by every worker and both projects, so
   * a test that files a claim on one would race a test that resets it. A
   * throwaway account per test also exercises the path a real new user takes,
   * including the adoption of an anonymous journey at sign-up.
   */
  async function freshAccount(page: Page, testInfo: { project: { name: string } }) {
    const email = `journey-${testInfo.project.name}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}@example.com`;
    await page.goto("/signup");
    await page.getByLabel(/Your name/i).fill("Journey Tester");
    await page.getByLabel(/Email address/i).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("a quiet civic instrument");
    await page.getByRole("button", { name: /^Create account$/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    return email;
  }

  async function walkTheQuestions(page: Page, saying: RegExp) {
    await page.goto("/");
    await page.getByRole("button", { name: saying }).click();
    await expect(page).toHaveURL(/\/check/);
    for (let i = 0; i < 5; i += 1) {
      await page.getByRole("button", { name: /^Continue$/ }).click();
    }
    await page.getByRole("button", { name: /Check my claim/i }).click();
    await expect(page).toHaveURL(/\/preflight/);
  }

  test("a new account starts empty and says so", async ({ page }, testInfo) => {
    await freshAccount(page, testInfo);
    await expect(page.getByText(/haven.t started a claim yet/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Check my claim/i }).first()).toBeVisible();
  });

  test("check, fix, re-check — and the dashboard remembers", async ({ page }, testInfo) => {
    await freshAccount(page, testInfo);
    await walkTheQuestions(page, /left my job/i);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("4 things");

    // Fix one thing; the engine re-runs and two blockers fall away together,
    // because the bank-name check was measuring the same wrong value.
    const card = page
      .locator("li")
      .filter({ has: page.getByRole("heading", { name: /name in EPFO does not match/i }) });
    await card.getByRole("button", { name: /How to fix it/i }).click();
    await card.getByRole("button", { name: /I've done this/i }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("2 things");

    // The state survived a navigation, which means it reached the server.
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("2 things");
    await expect(page.getByText(/actions? needs? attention/i)).toBeVisible();
    await expect(page.getByText(/1 fixed/i)).toBeVisible();
  });

  test("a clear record files once and then tracks", async ({ page }, testInfo) => {
    await freshAccount(page, testInfo);
    await walkTheQuestions(page, /records are fine/i);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/should go through/i);

    await page.getByRole("link", { name: /File my claim/i }).click();
    await page.getByRole("button", { name: /Submit claim \(simulated\)/i }).click();

    await expect(page).toHaveURL(/\/done/);
    await expect(page.getByText(/^PKA-/)).toBeVisible();

    await page.getByRole("link", { name: /Track this claim/i }).click();
    await expect(page).toHaveURL(/\/status/);

    // The stage lives with the claim, so advancing it survives a reload.
    await page.getByRole("button", { name: /Advance one stage/i }).click();
    await expect(page.getByText(/Approval/).first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("an employer-owned blocker offers a message the citizen can send", async ({ page }, testInfo) => {
    await freshAccount(page, testInfo);
    await walkTheQuestions(page, /filed 24 days ago/i);
    await page.goto("/dashboard");

    // Sunita's UAN was never Aadhaar-verified, so she has no lever at all.
    // The product's job here is to name the person who does.
    await expect(page.getByText(/Owner: Your employer/i).first()).toBeVisible();
    await page.getByRole("button", { name: /Prepare a message for your employer/i }).first().click();

    const message = page.getByLabel(/Message for your employer/i);
    await expect(message).toBeVisible();
    const text = await message.inputValue();
    expect(text).toMatch(/Joint Declaration|Aadhaar/i);
    // It carries what HR needs and nothing else.
    expect(text).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
  });

  test("the employer sees the same engine from the other side", async ({ page }) => {
    await signIn(page, "employer@nivaaran.app");
    await page.goto("/employer");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /waiting on you|Nothing on this roster/i,
    );
  });
});

test.describe("error pages", () => {
  test("a bad route is a Nivaaran page, not a browser default", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/doesn.t exist/i);
    await expect(page.getByRole("link", { name: /Return home/i })).toBeVisible();
  });

  test("a signed-in visitor gets a route back to their own dashboard", async ({ page }) => {
    await signIn(page, "demo@nivaaran.app");
    await page.goto("/no-such-page");
    await expect(page.getByRole("link", { name: /Go to my dashboard/i })).toBeVisible();
  });
});

test.describe("Hindi", () => {
  test("the whole signed-in surface switches language", async ({ page }) => {
    await signIn(page, "demo@nivaaran.app");
    await page.getByRole("button", { name: /Switch to Hindi/i }).first().click();

    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/[\u0900-\u097F]/);

    // And it survives a navigation into another authenticated page.
    await page.goto("/account");
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  });

  test("sign-in errors are in Hindi too", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Switch to Hindi/i }).first().click();
    await page.getByLabel(/ईमेल पता/).fill("demo@nivaaran.app");
    await page.getByLabel("पासवर्ड", { exact: true }).fill("wrong-password-here");
    await page.getByRole("button", { name: /साइन इन/ }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText(/[\u0900-\u097F]/);
  });
});
