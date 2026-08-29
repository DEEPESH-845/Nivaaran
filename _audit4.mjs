import { chromium } from "@playwright/test";
const BASE = "http://localhost:3100";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + "/login", { waitUntil: "load" });
await page.fill('input[name="email"]', "demo@nivaaran.app");
await page.fill('input[name="password"]', "NivaaranDemo2026!");
for (let i = 0; i < 20 && /login/.test(page.url()); i++) {
  await page.getByRole("button", { name: /sign in/i }).click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(400);
}
const P = `(() => {
  const p = [...document.querySelectorAll("p")].find(e => /Your share|आपका हिस्सा/.test(e.textContent));
  if (!p) return null;
  const r = p.getBoundingClientRect();
  const parent = p.parentElement.getBoundingClientRect();
  const btn = p.previousElementSibling ? p.previousElementSibling.getBoundingClientRect() : null;
  return { pW: Math.round(r.width), pH: Math.round(r.height), lines: Math.round(r.height/20), parentW: Math.round(parent.width), btnW: btn?Math.round(btn.width):null };
})()`;
for (const lang of ["en","hi"]) {
  for (const w of [375, 420, 520, 640, 720, 768, 860, 960, 1024, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(BASE + "/dashboard", { waitUntil: "load" });
    await page.waitForTimeout(450);
    if (lang==="hi") { await page.locator('button[aria-label*="Hindi"]').first().click().catch(()=>{}); await page.waitForTimeout(350); }
    const r = await page.evaluate(P);
    console.log(`[${lang}] ${w}px ->`, JSON.stringify(r));
  }
}
await browser.close();
