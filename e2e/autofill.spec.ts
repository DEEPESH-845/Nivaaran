import { expect, test, type Page } from "@playwright/test";

/**
 * Reading a document fills the case.
 *
 * This is the promise the whole product is an argument for: the values on the
 * paper you just handed us are not values you should have to type. It broke
 * silently — with no `OPENAI_API_KEY` every reading failed, the fallback was
 * the keyboard, and nothing in the suite noticed because nothing asserted that
 * a reading reaches anything beyond the four boxes on /documents.
 *
 * So these tests walk the whole pipe: read → normalise → facts → another page.
 */

/** Deliberately the wrong document for this record — Rajesh's case, Sunita's
 *  card. Every persona is seeded with matching values, so reading a document
 *  that agrees with the seed would pass whether the reading reached the case
 *  or not. This one cannot. */
async function readSunitaInto(page: Page, route: string) {
  await page.goto(route);
  await page.getByRole("button", { name: /left my job/i }).click();
  await page.getByRole("button", { name: /Identity record — Sunita/i }).click();
}

test.describe("a document fills the form", () => {
  test("the values reach the card without anyone typing them", async ({ page }) => {
    await readSunitaInto(page, "/documents");

    // Read, and said to be read — the screen never leaves a filled box
    // unexplained.
    await expect(page.getByText(/Read from the specimen/i).first()).toBeVisible();
    await expect(page.getByLabel(/Identity document/i).first()).toHaveValue("Sunita Devi");
    await expect(page.getByText(/Filled from your document/i).first()).toBeVisible();

    // The other half: they are in the case, not in a component. Nothing was
    // pressed, nothing was typed, and a different page shows them.
    await page.goto("/adhaar");
    await expect(page.getByTestId("card-name")).toHaveText("Sunita Devi");
    await expect(page.getByText(/came from the document you had read/i)).toBeVisible();
  });

  test("a day-first date survives the whole pipeline, in one format", async ({ page }) => {
    // The card prints 07 / 02 / 1985. Read month-first it becomes 2 July, the
    // record agrees, and the day/month swap this engine exists to catch
    // disappears. Every screen must show the same seventh of February.
    await readSunitaInto(page, "/documents");
    await expect(page.getByLabel(/Identity document/i).nth(1)).toHaveValue("1985-02-07");

    await page.goto("/adhaar");
    await expect(page.getByText("07/02/1985")).toBeVisible();

    await page.goto("/check?q=5");
    await expect(page.getByText("07/02/1985")).toBeVisible();
  });

  test("a second reading does not overwrite what the reader corrected", async ({ page }) => {
    await readSunitaInto(page, "/documents");

    const name = page.getByLabel(/Identity document/i).first();
    await name.fill("Sunita Kumari Devi");
    await name.blur();

    // Read it again. Autofill is assistance, not authority: the hand-typed
    // value stands, and the disagreement is shown rather than resolved for
    // them.
    await page.getByRole("button", { name: /Read another/i }).click();
    await page.getByRole("button", { name: /Identity record — Sunita/i }).click();
    await expect(name).toHaveValue("Sunita Kumari Devi");
    await expect(page.getByText(/disagrees with what you typed/i)).toBeVisible();
  });

  test("a reading that fails leaves the manual path open", async ({ page }) => {
    // Both the model and the specimen reader are gone. The screen must lose a
    // convenience, never the journey.
    await page.route("**/api/ai/extract", (route) => route.abort());
    await page.route("**/samples/**", (route) => route.abort());

    await readSunitaInto(page, "/documents");
    await expect(page.getByText(/isn't available right now/i).first()).toBeVisible();

    await page.getByRole("button", { name: /Type the values in instead/i }).click();
    await page.getByLabel(/Identity document/i).first().fill("Sunita Devi");
    await page.getByLabel(/Identity document/i).first().blur();
    await page.goto("/adhaar");
    await expect(page.getByTestId("card-name")).toHaveText("Sunita Devi");
  });
});
