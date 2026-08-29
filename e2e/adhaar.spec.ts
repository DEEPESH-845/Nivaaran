import { expect, test, type Page } from "@playwright/test";

/**
 * The specimen card.
 *
 * Three of these tests are not about the card at all — they are about the two
 * promises the card makes. That a number typed into it never leaves the
 * browser (AGENTS.md rule 13), and that the WebGL studio is an upgrade rather
 * than a requirement (rule 14). Both are the kind of claim that quietly stops
 * being true, so both are asserted rather than documented.
 */

const STAGE = { name: /Specimen Aadhaar card/i };

async function intoAdhaar(page: Page) {
  await page.goto("/adhaar");
  await page.getByRole("button", { name: /left my job/i }).click();
  await expect(page.getByRole("group", STAGE)).toBeVisible();
}

test.describe("the specimen card", () => {
  test("a typed name reaches the card, and the verdict", async ({ page }) => {
    await intoAdhaar(page);
    await page.getByLabel(/^Name$/).fill("Rajesh K Sharma");
    await expect(page.getByTestId("card-name")).toHaveText("Rajesh K Sharma");

    // The card is not an illustration of the Aadhaar side — it is the Aadhaar
    // side, and the real engine reads what it holds. Pressed straight away, so
    // this also covers the edit still in the debounce window.
    await page.getByRole("link", { name: /See what this changes/i }).click();
    await expect(page).toHaveURL(/\/preflight/);
    await expect(
      page.getByRole("heading", { name: /name in EPFO does not match your Aadhaar/i }),
    ).toHaveCount(0);
  });

  test("the number is masked, reveals on request, and does not survive a reload", async ({
    page,
  }) => {
    await intoAdhaar(page);
    await page.getByRole("button", { name: /Use a specimen number/i }).click();
    await expect(page.getByTestId("card-number")).toHaveText(/^XXXX XXXX \d{4}$/);

    await page.getByRole("button", { name: /Show the number/i }).click();
    await expect(page.getByTestId("card-number")).toHaveText(/^\d{4} \d{4} \d{4}$/);

    await page.reload();
    await expect(page.getByTestId("card-number")).toHaveText("XXXX XXXX ____");
  });

  test("a mistyped number is refused by the real checksum", async ({ page }) => {
    await intoAdhaar(page);
    const field = page.getByLabel(/Aadhaar number/i);
    await field.fill("234567890123");
    await expect(page.getByText(/not a valid Aadhaar number/i)).toBeVisible();

    await page.getByRole("button", { name: /Use a specimen number/i }).click();
    await expect(page.getByText(/not a valid Aadhaar number/i)).toHaveCount(0);
  });

  test("no request ever carries the number", async ({ page }) => {
    const bodies: string[] = [];
    page.on("request", (r) => {
      const body = r.postData();
      if (body) bodies.push(body);
    });

    await intoAdhaar(page);
    await page.getByLabel(/Aadhaar number/i).fill("234567890123");
    await page.getByLabel(/^Name$/).fill("Somebody Else");
    await page.waitForTimeout(600); // past the 300ms session debounce
    await page.goto("/preflight");

    expect(bodies.filter((b) => b.replace(/\D/g, "").includes("234567890123"))).toEqual([]);
    // And it is not in storage either.
    const stored = await page.evaluate(() => JSON.stringify(window.localStorage));
    expect(stored).not.toContain("234567890123");
  });

  test("everything works with the three.js chunk blocked", async ({ page }) => {
    // Matching the chunk by name does not work — Next hashes it, and a
    // /three/ URL filter silently matches nothing, which is a test that
    // passes without testing. Identify it by what is actually inside it.
    let blocked = 0;
    await page.route("**/_next/static/chunks/**.js", async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes("WebGLRenderer")) {
        blocked++;
        return route.abort();
      }
      return route.fulfill({ response, body });
    });

    await intoAdhaar(page);

    await page.getByLabel(/^Name$/).fill("Rajesh K Sharma");
    await expect(page.getByTestId("card-name")).toHaveText("Rajesh K Sharma");

    const stage = page.getByRole("group", STAGE);
    await stage.focus();
    await stage.press("Enter");
    await expect(stage).toHaveAttribute("data-face", "back");

    await page.waitForTimeout(2500);
    expect(blocked, "the three.js chunk was never actually blocked").toBeGreaterThan(0);
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("three.js is not in the page's first load", async ({ request }) => {
    // Timing how long the studio takes to arrive is a race on a fast machine.
    // This asserts the durable half of AGENTS.md rule 14 instead: whatever the
    // scheduling, three.js must not be among the scripts the page pulls in to
    // become interactive. Turning the dynamic import into a static one fails
    // here immediately.
    const html = await (await request.get("/adhaar")).text();
    const scripts = [
      ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/<link[^>]+href="([^"]+\.js)"/g)].map((m) => m[1]),
    ];
    expect(scripts.length, "found no scripts to check").toBeGreaterThan(2);

    for (const src of new Set(scripts)) {
      const body = await (await request.get(src)).text();
      expect(body, `${src} ships three.js in the first load`).not.toContain("WebGLRenderer");
    }
  });

  test("the keyboard alone can tilt and turn it over", async ({ page }) => {
    await intoAdhaar(page);
    const stage = page.getByRole("group", STAGE);
    await stage.focus();
    await expect(stage).toBeFocused();
    await expect(stage).toHaveAttribute("data-face", "front");

    await stage.press("ArrowRight");
    await stage.press(" ");
    await expect(stage).toHaveAttribute("data-face", "back");
    // The reverse says what it is, in words, not just in a watermark.
    await expect(page.getByText(/encodes nothing and scans as nothing/i)).toBeVisible();
  });

  test("reduced motion shows every detail, and no studio at all", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await intoAdhaar(page);
    await page.getByLabel(/^Name$/).fill("Rajesh K Sharma");
    await expect(page.getByTestId("card-name")).toHaveText("Rajesh K Sharma");
    await page.waitForTimeout(500);
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("the layers really are at different depths", async ({ page }) => {
    // `overflow: hidden` on a `preserve-3d` element silently forces it flat,
    // and a flattened card still looks fine in a screenshot — it just stops
    // being three-dimensional. Two probes at different Z must project to
    // different boxes under rotation, or the depth is a drawing of depth.
    await intoAdhaar(page);
    const gap = await page.evaluate(() => {
      const flip = document.querySelector('[data-testid="card-flip"]') as HTMLElement;
      const face = flip.querySelector("[aria-hidden='false']") as HTMLElement;
      const probe = (z: number) => {
        const d = document.createElement("div");
        d.style.cssText = `position:absolute;left:0;top:0;width:100px;height:20px;transform:translateZ(${z}px)`;
        face.appendChild(d);
        return d;
      };
      const near = probe(60);
      const flat = probe(0);
      const tilt = flip.parentElement as HTMLElement;
      const previous = tilt.style.transform;
      tilt.style.transform = "rotateY(40deg)";
      const width = near.getBoundingClientRect().width - flat.getBoundingClientRect().width;
      tilt.style.transform = previous;
      near.remove();
      flat.remove();
      return width;
    });
    expect(Math.abs(gap), "the card's layers are flattened onto one plane").toBeGreaterThan(1);
  });

  test("it keeps turning the same way instead of unwinding", async ({ page }) => {
    await intoAdhaar(page);
    const stage = page.getByRole("group", STAGE);
    await stage.focus();

    const angle = () =>
      page.evaluate(() => {
        const el = document.querySelector('[data-testid="card-flip"]') as HTMLElement;
        const m = new DOMMatrix(getComputedStyle(el).transform);
        return (Math.atan2(-m.m13, m.m11) * 180) / Math.PI;
      });

    /** Sample one turn a third of the way through, then let it settle. The
     *  settle matters: sampling a turn that starts while the previous one is
     *  still running puts both samples in the same half of the circle
     *  whichever way the card is going, which measures nothing. */
    const turn = async () => {
      await stage.press("Enter");
      await page.waitForTimeout(300);
      const at = await angle();
      await page.waitForTimeout(900);
      return at;
    };

    const first = await turn();
    await expect(stage).toHaveAttribute("data-turns", "1");
    const second = await turn();
    await expect(stage).toHaveAttribute("data-turns", "2");
    await expect(stage).toHaveAttribute("data-face", "front");

    // Continuing clockwise puts the second turn in the far half of the circle,
    // so the two samples land on opposite sides of zero. Unwinding would
    // retrace the first turn and give two samples with the same sign.
    expect(Math.sign(first), `turns sampled at ${first} and ${second}`).not.toBe(
      Math.sign(second),
    );
  });

  test("no session asks whose card to build", async ({ page }) => {
    await page.goto("/adhaar");
    await expect(
      page.getByRole("heading", { name: /Whose card are we building/i }),
    ).toBeVisible();
  });

  test("the enhanced view can be refused, and stays refused", async ({ page }) => {
    await intoAdhaar(page);
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 10_000 });

    await page.getByRole("button", { name: /Enhanced view/i }).click();
    await expect(page.locator("canvas")).toHaveCount(0);

    // Refusing it once has to mean refusing it, not refusing it until the next
    // page load — it is the escape hatch AGENTS.md rule 14 promises.
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("the studio actually paints something", async ({ page }) => {
    // It once did not. `visible = false` on the shadow caster took it out of
    // the shadow pass as well as the colour pass, and the motes were about a
    // pixel across, so three.js loaded, held a WebGL context and rendered an
    // empty canvas every frame. Nothing else in this suite noticed.
    await intoAdhaar(page);
    const stage = page.getByRole("group", STAGE);
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 10_000 });

    // The stage sits below the fold, so a viewport-relative clip misses it.
    // An element screenshot scrolls to it and frames it for us. Holding the
    // pointer at a fixed spot parks the tilt and kills the idle float, so the
    // card is in the same pose in both shots and the only thing that can
    // differ is what the studio painted around it.
    const settle = async () => {
      await stage.hover({ position: { x: 60, y: 40 } });
      await page.waitForTimeout(1200);
      return stage.screenshot();
    };

    const lit = await settle();
    await page.getByRole("button", { name: /Enhanced view/i }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    const unlit = await settle();

    // Byte-inequality is not enough — two shots of the *same* state differ by
    // a fraction of a percent from antialiasing alone, so an empty canvas
    // passes that. A cast shadow and a pool of light are a lot of gradient,
    // and they show up as a much larger PNG: measured at 1.46x when the
    // studio paints and 1.002x when it does not.
    const ratio = lit.length / unlit.length;
    expect(ratio, `studio adds only ${((ratio - 1) * 100).toFixed(1)}% of detail`).toBeGreaterThan(
      1.15,
    );
  });

  test("the card is reachable from the places a reader already is", async ({ page }) => {
    await page.goto("/documents");
    await page.getByRole("button", { name: /left my job/i }).click();
    await page.getByRole("link", { name: /build the Aadhaar side as a card/i }).click();
    await expect(page).toHaveURL(/\/adhaar/);
  });

  test("it is a step in the journey, not a page beside it", async ({ page }) => {
    // Reached the way a reader actually gets there: walking the questions.
    await page.goto("/");
    await page.getByRole("button", { name: /left my job/i }).click();
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: /^Continue$/ }).click();
    }
    await page.getByRole("link", { name: /see them on your Aadhaar card/i }).click();
    await expect(page).toHaveURL(/\/adhaar/);

    // And the rail says where that is, so the card is not a dead end.
    await expect(page.getByRole("navigation", { name: /Your progress/i })).toBeVisible();
    await expect(page.getByText(/Step 2 of 6/i)).toBeVisible();
  });

  test("the spelling people actually type redirects", async ({ page }) => {
    await page.goto("/aadhaar");
    await expect(page).toHaveURL(/\/adhaar$/);
  });
});
