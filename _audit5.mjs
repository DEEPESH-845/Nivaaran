import { chromium } from "@playwright/test";
const BASE = "http://localhost:3100";
const browser = await chromium.launch();
const PROBE = `(() => {
  const bar = document.querySelector("header > div");
  const nav = bar.querySelector("nav");
  const brand = document.querySelector('a[aria-label*="home"]');
  const links = [...bar.querySelectorAll("nav a")].map(a => ({ t: a.textContent.trim().slice(0,20), h: Math.round(a.getBoundingClientRect().height) }));
  const utils = bar.lastElementChild.previousElementSibling;
  return {
    barScrollW: bar.scrollWidth, barClientW: bar.clientWidth,
    docScrollW: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth,
    brandR: brand ? Math.round(brand.getBoundingClientRect().right) : null,
    navL: nav ? Math.round(nav.getBoundingClientRect().left) : null,
    navR: nav ? Math.round(nav.getBoundingClientRect().right) : null,
    clusterR: Math.round(bar.querySelector('.xl\\\\:flex')?.getBoundingClientRect().right ?? 0),
    wrapped: links.filter(l => l.h > 24).map(l => l.t),
    links: links.length,
  };
})()`;
for (const [email, who] of [["admin@nivaaran.app","admin"], ["employer@nivaaran.app","employer"], ["demo@nivaaran.app","citizen"]]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/login", { waitUntil: "load" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "NivaaranDemo2026!");
  for (let i = 0; i < 20 && /login/.test(page.url()); i++) {
    await page.getByRole("button", { name: /sign in/i }).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  for (const w of [1280, 1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(BASE + "/dashboard", { waitUntil: "load" });
    await page.waitForTimeout(500);
    const r = await page.evaluate(PROBE);
    const ok = r.barScrollW <= r.barClientW + 1 && r.docScrollW <= r.vw + 1 && r.wrapped.length === 0;
    console.log(`${who} @${w}: ${ok ? "OK" : "FAIL"} links=${r.links} bar=${r.barScrollW}/${r.barClientW} doc=${r.docScrollW}/${r.vw} brandGap=${r.navL - r.brandR} navR=${r.navR} wrapped=${JSON.stringify(r.wrapped)}`);
  }
  await ctx.close();
}
await browser.close();
