import { chromium } from "@playwright/test";
const BASE = "http://localhost:3100";
const OUT = process.env.OUT || "/private/tmp/claude-501/-Users-deepesh-Developer-Nivaaran/c3f450a9-4e21-4086-9aa2-65afa8041df7/scratchpad/shots";
import { mkdirSync } from "node:fs";
mkdirSync(OUT, { recursive: true });
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
await page.goto(BASE + "/", { waitUntil: "load" });
const btn = page.getByRole("button", { name: /left my job/i });
await btn.waitFor();
for (let i = 0; i < 20 && !/\/check/.test(page.url()); i++) { await btn.click({ timeout: 2000 }).catch(()=>{}); await page.waitForTimeout(400); }
for (let i = 0; i < 5; i++) await page.getByRole("button", { name: /^Continue$/ }).click();
await page.getByRole("button", { name: /Check my claim/i }).click();
await page.waitForURL(/\/preflight/);
await page.waitForTimeout(600);
await page.evaluate(() => document.querySelectorAll('button[aria-expanded="false"]').forEach(b => b.click()));
await page.waitForTimeout(400);

const tag = process.env.TAG || "before";
for (const w of [375, 768, 1280, 1920]) {
  await page.setViewportSize({ width: w, height: 1000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${tag}-preflight-${w}.png`, fullPage: true });
  await page.screenshot({ path: `${OUT}/${tag}-header-${w}.png`, clip: { x: 0, y: 0, width: w, height: 120 } });
}
await page.setViewportSize({ width: 1280, height: 900 });
for (const r of ["/dashboard", "/documents", "/adhaar", "/status"]) {
  await page.goto(BASE + r, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${tag}-${r.slice(1)}-1280.png`, fullPage: true });
}
await browser.close();
console.log("done", OUT);
