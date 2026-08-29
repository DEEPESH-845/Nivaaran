import { chromium } from "@playwright/test";
const BASE = "http://localhost:3100";
const OUT = "/private/tmp/claude-501/-Users-deepesh-Developer-Nivaaran/c3f450a9-4e21-4086-9aa2-65afa8041df7/scratchpad/shots";
const tag = process.env.TAG || "before";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const MEASURE = `(() => {
  const p = [...document.querySelectorAll("p")].find(e => /Press it to watch|इसे दबाकर/.test(e.textContent));
  if (!p) return null;
  const r = p.getBoundingClientRect();
  const rowEl = p.closest("div").parentElement.querySelector("button") ? p.closest("div").parentElement : p.parentElement;
  const row = rowEl.getBoundingClientRect();
  const b = rowEl.querySelector("button").getBoundingClientRect();
  return { pW: Math.round(r.width), pH: Math.round(r.height), rowW: Math.round(row.width), btnW: Math.round(b.width) };
})()`;
for (const w of [375, 412, 640, 768, 834, 1024, 1280, 1920]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(700);
  const el = page.locator("text=/Press it to watch|इसे दबाकर/").first();
  await el.scrollIntoViewIfNeeded().catch(()=>{});
  await page.waitForTimeout(500);
  console.log(w, JSON.stringify(await page.evaluate(MEASURE)));
  const card = page.locator("div").filter({ has: el }).last();
  await card.screenshot({ path: `${OUT}/${tag}-engine-${w}.png` }).catch(async () => {
    await page.screenshot({ path: `${OUT}/${tag}-engine-${w}.png` });
  });
}
await browser.close();
