import { expect, test, type Page } from "@playwright/test";

/** Walk the five situation questions and land on the records step. */
async function answerQuestions(page: Page) {
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: /^Continue$/ }).click();
  }
  await expect(page.getByRole("heading", { name: /Now we compare your records/i })).toBeVisible();
}

/** Walk from the records step through to the documents page. */
async function intoDocuments(page: Page) {
  await page.getByRole("link", { name: /Read these from your documents instead/i }).click();
  await expect(page).toHaveURL(/\/documents/);
  await expect(page.getByRole("button", { name: /Identity record — Rajesh/i })).toBeVisible();
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

test.describe("the document pre-check", () => {
  /** One clean reading of each specimen. The model is never called. */
  const IDENTITY = {
    ok: true,
    docType: "identity",
    fields: { name: "Rajesh K Sharma", dob: "1996-03-08", ifsc: null, accountLast4: null },
    confidence: "high",
    quality: "clear",
  };
  const PASSBOOK = {
    ok: true,
    docType: "passbook",
    fields: { name: "Rajesh Kumar Sharma", dob: null, ifsc: "CORP0001234", accountLast4: "8842" },
    confidence: "medium",
    quality: "glare",
  };

  const stub = (page: Page, byKind: Record<string, unknown>) =>
    page.route("**/api/ai/extract", (route) => {
      // Both slots hit the same endpoint; hand back whichever has not been used.
      const next = Object.keys(byKind)[0];
      const json = byKind[next];
      delete byKind[next];
      return route.fulfill({ json });
    });

  test("reads two documents and reconciles every field against the record", async ({ page }) => {
    await stub(page, { identity: IDENTITY, bank: PASSBOOK });
    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await intoDocuments(page);

    await page.getByRole("button", { name: /Identity record — Rajesh/i }).click();
    await expect(page.getByLabel(/^Identity document$/).first()).toHaveValue("Rajesh K Sharma");

    await page.getByRole("button", { name: /Bank passbook — Rajesh/i }).click();
    await expect(page.getByLabel(/^Bank passbook$/).first()).toHaveValue("Rajesh Kumar Sharma");

    // The identity name matches EPFO after normalisation; the passbook name
    // does not — and only the covered comparisons count as blockers.
    await expect(page.getByText(/1 will stop your claim/i)).toBeVisible();

    // The two documents disagree with each other, which EPFO never checks.
    await expect(page.getByText(/Your two documents disagree with each other/i)).toBeVisible();
    await expect(page.getByText(/Pre-check only/i)).toBeVisible();
  });

  test("an IFSC difference is reported as worth knowing, never as a blocker", async ({ page }) => {
    await stub(page, {
      bank: {
        ok: true,
        docType: "passbook",
        fields: { name: "RAJESH K SHARMA", dob: null, ifsc: "HDFC0000521", accountLast4: "8842" },
        confidence: "high",
        quality: "clear",
      },
    });
    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await intoDocuments(page);
    await page.getByRole("button", { name: /Bank passbook — Rajesh/i }).click();

    await expect(page.getByText(/Nothing here will stop your claim/i)).toBeVisible();
    await expect(page.getByText(/it sends the money somewhere else/i)).toBeVisible();
  });

  test("using the values changes the verdict, in one press", async ({ page }) => {
    await stub(page, { identity: IDENTITY });
    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await intoDocuments(page);
    await page.getByRole("button", { name: /Identity record — Rajesh/i }).click();
    // One button, not "use these" followed by "see what this changes": saving
    // the values and seeing what they change were always one intention.
    await page.getByRole("button", { name: /Use these and re-run my check/i }).click();

    await expect(page).toHaveURL(/\/preflight/);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("3 things");
    await expect(
      page.getByRole("heading", { name: /name in EPFO does not match your Aadhaar/i }),
    ).toHaveCount(0);
  });

  test("a document that cannot be read is a quiet line, not a dead end", async ({ page }) => {
    // Both readers gone: the model, and the direct read of the specimen we
    // ship. Blocking only the model now leaves a sample perfectly readable.
    await page.route("**/api/ai/extract", (route) => route.abort());
    await page.route("**/samples/**", (route) => route.abort());
    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await intoDocuments(page);
    await page.getByRole("button", { name: /Identity record — Rajesh/i }).click();

    await expect(page.getByText(/isn't available right now/i).last()).toBeVisible();
    await page.getByRole("button", { name: /Back to the check/i }).click();
    await page.getByRole("button", { name: /Check my claim/i }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/will stop this claim/i);
  });

  test("a reading puts the reader on the comparison, not on a badge", async ({ page }) => {
    // The answer renders below the fold. Without this the slot shows a badge
    // and the comparison the reader came for stays off-screen.
    await stub(page, { identity: IDENTITY });
    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await intoDocuments(page);
    await page.getByRole("button", { name: /Identity record — Rajesh/i }).click();

    const comparison = page.getByRole("heading", { name: /What we read, against what EPFO has/i });
    await expect(comparison).toBeFocused();
    await expect(comparison).toBeInViewport();
  });

  test("when the reader fails you can still type the values in", async ({ page }) => {
    // The slot promises exactly this. Until now there was nothing below to
    // type into: the comparison only rendered once something had been read.
    await page.route("**/api/ai/extract", (route) => route.abort());
    await page.route("**/samples/**", (route) => route.abort());
    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await intoDocuments(page);
    await page.getByRole("button", { name: /Identity record — Rajesh/i }).click();
    await expect(page.getByText(/isn't available right now/i).last()).toBeVisible();

    await page.getByRole("button", { name: /Type the values in instead/i }).click();
    await page.getByLabel(/^Identity document$/).first().fill("Rajesh K Sharma");
    await page.getByRole("button", { name: /Use these and re-run my check/i }).click();

    // Typed by hand, and it reaches the engine exactly as a reading would.
    await expect(page).toHaveURL(/\/preflight/);
    await expect(
      page.getByRole("heading", { name: /name in EPFO does not match your Aadhaar/i }),
    ).toHaveCount(0);
  });

  test("a document read alone names the one still missing", async ({ page }) => {
    await stub(page, { identity: IDENTITY });
    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await intoDocuments(page);
    await page.getByRole("button", { name: /Identity record — Rajesh/i }).click();

    await expect(page.getByText(/passbook carries the other two/i)).toBeVisible();
  });

  test("landing on /documents with no session asks whose record to compare", async ({ page }) => {
    await page.goto("/documents");
    await expect(
      page.getByRole("heading", { name: /Whose record are we comparing against/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /left my job/i }).click();
    await expect(page.getByRole("heading", { name: /Read your documents/i })).toBeVisible();
  });

  test("a photographed file is downscaled, re-encoded and read", async ({ page }) => {
    // The sample buttons load an SVG; a real user hands us camera bytes. This
    // is the only test that exercises <input type="file"> end to end, and the
    // only one that proves the image is re-encoded before it is sent.
    let sent = "";
    await page.route("**/api/ai/extract", (route) => {
      sent = JSON.parse(route.request().postData() || "{}").image ?? "";
      return route.fulfill({ json: IDENTITY });
    });

    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await intoDocuments(page);
    await page
      .locator("#document-file-identity")
      .setInputFiles("e2e/fixtures/photographed-identity.jpg");

    await expect(page.getByLabel(/^Identity document$/).first()).toHaveValue("Rajesh K Sharma");
    // Re-encoded through the canvas, which is also what strips EXIF and GPS.
    expect(sent.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(sent.length).toBeGreaterThan(1000);
  });

  test("the warning against uploading a real document is unmissable", async ({ page }) => {
    await startAs(page, /left my job/i);
    await answerQuestions(page);
    await intoDocuments(page);
    await expect(page.getByText(/Do not upload a real Aadhaar, PAN or passbook/i)).toBeVisible();
    await expect(page.getByText(/the image is not saved anywhere/i)).toBeVisible();
    // And the page never claims to verify anything.
    await expect(page.getByText(/This is not verification/i)).toBeVisible();
  });
});

test.describe("the employer lens", () => {
  /** The employer console holds an employer's data, so it needs their account. */
  async function signInAsEmployer(page: Page) {
    await page.goto("/login");
    await page.getByLabel(/Email address/i).fill("employer@nivaaran.app");
    await page.getByLabel("Password", { exact: true }).fill("NivaaranDemo2026!");
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  }

  test("shows who is blocked, and who is blocked on the employer", async ({ page }) => {
    await signInAsEmployer(page);
    await page.goto("/employer");

    // Scoped to #main throughout: /employer has a loading.tsx, so React
    // streams the content in and it also exists, briefly, in the out-of-order
    // placeholder React later moves into place.
    const main = page.locator("#main");

    // The headline is arithmetic on the engine, not a written-down number.
    await expect(main.getByRole("heading", { level: 1 })).toContainText(
      /6 of your 9 leavers will have a claim rejected\. 3 of them are waiting on you\./i,
    );
    await expect(main.getByText(/46 minutes, in total/i)).toBeVisible();

    // The queue at a glance, computed from the same engine. Exact, because the
    // headline sentence ends with the same three words.
    await expect(main.getByText("Waiting on you", { exact: true })).toBeVisible();

    // Longest wait first: Imran has been waiting 154 days.
    const yours = main.locator("section", {
      has: page.getByRole("heading", { name: /Only you can fix these/i }),
    });
    await expect(yours.locator("li h3").first()).toHaveText("Imran Qureshi");

    // The other group is the one nobody has told.
    await expect(
      main.getByRole("heading", { name: /They can fix these — nobody has told them/i }),
    ).toBeVisible();
    await expect(main.getByText(/A synthetic roster/i)).toBeVisible();
  });

  test("filing an exit date re-runs the check and empties that queue", async ({ page }) => {
    await signInAsEmployer(page);
    await page.goto("/employer");
    const heading = page.locator("#main").getByRole("heading", { level: 1 });
    await expect(heading).toContainText("3 of them are waiting on you");

    const imran = page.locator("li").filter({ has: page.getByRole("heading", { name: "Imran Qureshi" }) });
    await imran.getByText("What to do").click();
    await imran.getByRole("button", { name: /I've filed this — re-check/i }).click();

    // He drops out of the employer's queue; the two who need a Joint
    // Declaration do not, because the employer has not attested one.
    await expect(heading).toContainText("2 of them are waiting on you");
    await expect(
      page
        .locator("section", { has: page.getByRole("heading", { name: /Only you can fix these/i }) })
        .getByRole("heading", { name: "Imran Qureshi" }),
    ).toHaveCount(0);
  });

  test("a citizen blocked on their employer gets a message to send them", async ({ page }) => {
    await startAs(page, /rejected/i);
    await answerQuestions(page);
    await page.getByRole("button", { name: /Check my claim/i }).click();

    const card = page
      .locator("li")
      .filter({ has: page.getByRole("heading", { name: /date of exit has not been recorded/i }) });
    await card.getByRole("button", { name: /How to fix it/i }).click();

    // The citizen cannot open the employer console — that is the employer's
    // data. What they get is the artefact that actually moves this.
    await card.getByRole("button", { name: /Prepare a message for your employer/i }).click();

    const message = card.getByLabel(/Message for your employer/i);
    await expect(message).toBeVisible();

    const text = await message.inputValue();
    expect(text).toMatch(/date of exit/i);
    expect(text).toMatch(/Source:/);
    // It carries the issue and the source, and no identifiers HR does not need.
    expect(text).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);

    await expect(card.getByRole("button", { name: /Copy message/i })).toBeVisible();
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

  test("the story's scroll captions switch language, not just the chrome", async ({ page }) => {
    // The captions were written into the component as English strings and
    // resolved once, so the toggle moved the navbar and left the story alone.
    await page.goto("/story");
    await expect(page.getByRole("heading", { name: /Meet Arjun/i })).toBeVisible();

    await page.getByRole("button", { name: /Switch to Hindi/i }).click();
    await expect(page.getByRole("heading", { name: /मिलिए अर्जुन से/ })).toBeVisible();
    await expect(page.getByText(/वह बस अपने PF का काम निपटाना चाहता है/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Meet Arjun/i })).toHaveCount(0);
  });

  test("the still story switches language too", async ({ page }) => {
    // A reader who asked for stillness gets a different component entirely,
    // with its own copy and its own alt text.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/story");
    await page.getByRole("button", { name: /Switch to Hindi/i }).click();

    await expect(page.getByRole("heading", { name: /मिलिए अर्जुन से/ })).toBeVisible();
    await expect(page.getByAltText(/अर्जुन घर पर/)).toBeVisible();
  });

  test("the language choice survives a reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Switch to Hindi/i }).click();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("हम पहले जाँचते हैं");
  });
});
