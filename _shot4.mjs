import { chromium } from "@playwright/test";
const BASE = "http://localhost:3100";
const OUT = "/private/tmp/claude-501/-Users-deepesh-Developer-Nivaaran/c3f450a9-4e21-4086-9aa2-65afa8041df7/scratchpad/shots";
const tag = process.env.TAG || "after";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
for (const w of [412, 768, 1280]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(800);
  const el = page.locator("text=/Press it to watch|इसे दबाकर/").first();
  await el.scrollIntoViewIfNeeded().catch(()=>{});
  await page.waitForTimeout(500);
  const box = await page.evaluate(() => {
    const p = [...document.querySelectorAll("p")].find(e => /Press it to watch/.test(e.textContent));
    const card = p.closest(".rounded-card") || p.closest("div").parentElement.parentElement;
    const r = card.getBoundingClientRect();
    return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: Math.min(r.width + 16, window.innerWidth), height: Math.min(r.height + 16, window.innerHeight) };
  });
  await page.screenshot({ path: `${OUT}/${tag}-enginecard-${w}.png`, clip: box });
}
await browser.close();
