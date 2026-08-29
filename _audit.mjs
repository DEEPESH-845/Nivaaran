import { chromium } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:3100";
const VIEWPORTS = [
  [375, 812], [390, 844], [412, 915],
  [768, 1024], [834, 1112], [1024, 768],
  [1280, 800], [1366, 768], [1440, 900], [1536, 864], [1920, 1080],
];

const OVERFLOW_PROBE = `(() => {
  const root = document.documentElement;
  const vw = root.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      const p = el.parentElement;
      const pr = p ? p.getBoundingClientRect() : null;
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || "")).slice(0, 110),
        left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
        parentW: pr ? Math.round(pr.width) : null,
      });
    }
  }
  return { vw, scrollW: root.scrollWidth, bodyScrollW: document.body.scrollWidth, offenders: out.slice(0, 12) };
})()`;

// find any text-bearing element whose width collapsed absurdly narrow
const NARROW_PROBE = `(() => {
  const out = [];
  for (const el of document.querySelectorAll("p, h1, h2, h3, span, a, li, dd, dt")) {
    if (el.children.length) continue;
    const t = (el.textContent || "").trim();
    if (t.length < 40) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    // rough: chars per line. many lines & narrow box = collapsed column
    if (r.width < 130) out.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), text: t.slice(0, 50), cls: String(el.className||"").slice(0,80) });
  }
  return out.slice(0, 10);
})()`;

async function walk(page) {
  // demo journey: land on /preflight with 4 blockers
  await page.goto(BASE + "/", { waitUntil: "load" });
  const btn = page.getByRole("button", { name: /left my job/i });
  await btn.waitFor();
  for (let i = 0; i < 20 && !/\/check/.test(page.url()); i++) {
    await btn.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.waitForURL(/\/check/);
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: /^Continue$/ }).click();
  await page.getByRole("button", { name: /Check my claim/i }).click();
  await page.waitForURL(/\/preflight/);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// sign in so the authenticated navbar is what we measure
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
try {
  await page.fill('input[name="email"]', "demo@nivaaran.app");
  await page.fill('input[name="password"]', "NivaaranDemo2026!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 8000 });
} catch (e) { console.log("LOGIN FAILED:", String(e).slice(0, 200)); }
console.log("after login:", page.url());

await walk(page);
// open every fix panel so the action footer is measured
await page.evaluate(() => {
  document.querySelectorAll('button[aria-expanded="false"]').forEach((b) => b.click());
});
await page.waitForTimeout(300);

const ROUTES = ["/preflight", "/dashboard", "/documents", "/adhaar", "/status", "/claim", "/why", "/account", "/sources", "/nope-404"];

for (const [w, h] of VIEWPORTS) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(120);
  const r = await page.evaluate(OVERFLOW_PROBE);
  const narrow = await page.evaluate(NARROW_PROBE);
  const bad = r.scrollW > r.vw + 1;
  console.log(`\n--- preflight ${w}x${h} vw=${r.vw} scrollW=${r.scrollW} ${bad ? "OVERFLOW" : "ok"}`);
  for (const o of r.offenders) console.log("   over:", JSON.stringify(o));
  for (const n of narrow) console.log("   narrow:", JSON.stringify(n));
}

// now the other routes at 3 key widths
for (const route of ROUTES) {
  for (const [w, h] of [[375, 812], [768, 1024], [1280, 800], [1920, 1080]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(BASE + route, { waitUntil: "load" });
    await page.waitForTimeout(250);
    const r = await page.evaluate(OVERFLOW_PROBE);
    if (r.scrollW > r.vw + 1 || r.offenders.length) {
      console.log(`\n--- ${route} ${w}x${h} vw=${r.vw} scrollW=${r.scrollW}`);
      for (const o of r.offenders) console.log("   over:", JSON.stringify(o));
    }
  }
}

await browser.close();
