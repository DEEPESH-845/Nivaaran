import { chromium } from "@playwright/test";
const BASE = "http://localhost:3100";

const PROBE = `(() => {
  const clipped = [];
  const narrow = [];
  const cls = (el) => String(el.getAttribute("class") || "").slice(0, 100);
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest(".skip-link")) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    // content wider than its own padding box (a clip in the making)
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      const ov = getComputedStyle(el).overflowX;
      clipped.push({ tag: el.tagName.toLowerCase(), cls: cls(el), clientW: el.clientWidth, scrollW: el.scrollWidth, overflowX: ov });
    }
    // leaf prose squeezed into a strip
    if (!el.children.length) {
      const t = (el.textContent || "").trim();
      if (t.length >= 40 && r.width > 0 && r.width < 160 && r.height > 60) {
        narrow.push({ tag: el.tagName.toLowerCase(), cls: cls(el), w: Math.round(r.width), h: Math.round(r.height), text: t.slice(0, 45) });
      }
    }
  }
  return { clipped: clipped.slice(0, 14), narrow: narrow.slice(0, 8) };
})()`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(BASE + "/login", { waitUntil: "load" });
await page.fill('input[name="email"]', "demo@nivaaran.app");
await page.fill('input[name="password"]', "NivaaranDemo2026!");
for (let i = 0; i < 20 && /login/.test(page.url()); i++) {
  await page.getByRole("button", { name: /sign in/i }).click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(400);
}
console.log("logged in:", page.url());

const ROUTES = ["/dashboard", "/documents", "/adhaar", "/status", "/why", "/account", "/sources", "/beyond", "/api", "/governance", "/employer", "/nope-404", "/check", "/claim", "/done", "/login", "/signup", "/"];
const WIDTHS = [[375, 812], [412, 915], [768, 1024], [1024, 768], [1280, 800], [1920, 1080]];

async function scan(label) {
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(180);
    const r = await page.evaluate(PROBE);
    if (r.clipped.length || r.narrow.length) {
      console.log(`\n### ${label} @ ${w}`);
      for (const c of r.clipped) console.log("  CLIP  ", JSON.stringify(c));
      for (const n of r.narrow) console.log("  NARROW", JSON.stringify(n));
    }
  }
}

// preflight with blockers, all panels open
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(BASE + "/", { waitUntil: "load" });
const btn = page.getByRole("button", { name: /left my job/i });
await btn.waitFor();
for (let i = 0; i < 20 && !/\/check/.test(page.url()); i++) { await btn.click({ timeout: 2000 }).catch(()=>{}); await page.waitForTimeout(400); }
for (let i = 0; i < 5; i++) await page.getByRole("button", { name: /^Continue$/ }).click();
await page.getByRole("button", { name: /Check my claim/i }).click();
await page.waitForURL(/\/preflight/);
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelectorAll('button[aria-expanded="false"]').forEach(b => b.click()));
await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
await page.waitForTimeout(400);
await scan("preflight-EN-open");

// Hindi
await page.getByRole("button", { name: /हिंदी|Hindi/i }).first().click().catch(async () => {
  await page.locator('button[aria-label*="Hindi"]').first().click();
});
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelectorAll('button[aria-expanded="false"]').forEach(b => b.click()));
await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
await scan("preflight-HI-open");

for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: "load" });
  await page.waitForTimeout(350);
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  await scan(route);
}
await browser.close();
