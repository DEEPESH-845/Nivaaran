import { chromium } from "@playwright/test";
const BASE = "http://localhost:3100";
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

const HEADER = `(() => {
  const bar = document.querySelector("header > div");
  if (!bar) return null;
  const br = bar.getBoundingClientRect();
  const kids = [...bar.children].map(c => {
    const r = c.getBoundingClientRect();
    return { cls: String(c.getAttribute("class")||"").slice(0,40), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) };
  });
  const links = [...bar.querySelectorAll("nav a")].map(a => {
    const r = a.getBoundingClientRect();
    return { t: a.textContent.trim().slice(0,18), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) };
  });
  const brand = document.querySelector('a[aria-label*="home"]');
  const bd = brand ? brand.getBoundingClientRect() : null;
  return {
    barL: Math.round(br.left), barR: Math.round(br.right), barW: Math.round(br.width),
    barScrollW: bar.scrollWidth, barClientW: bar.clientWidth,
    headerH: Math.round(document.querySelector("header").getBoundingClientRect().height),
    brand: bd ? { l: Math.round(bd.left), r: Math.round(bd.right), w: Math.round(bd.width) } : null,
    kids, links,
  };
})()`;

for (const lang of ["en", "hi"]) {
  for (const w of [1024, 1100, 1180, 1280, 1366, 1440, 1536, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(BASE + "/dashboard", { waitUntil: "load" });
    await page.waitForTimeout(500);
    if (lang === "hi") {
      await page.locator('button[aria-label*="Hindi"]').first().click().catch(()=>{});
      await page.waitForTimeout(400);
    }
    const h = await page.evaluate(HEADER);
    const gap = h.links.length && h.brand ? h.links[0].l - h.brand.r : null;
    console.log(`\n[${lang}] ${w}px  bar=${h.barL}..${h.barR} (w${h.barW}) scrollW=${h.barScrollW} headerH=${h.headerH} brandGap=${gap}`);
    console.log("  brand:", JSON.stringify(h.brand));
    console.log("  regions:", h.kids.map(k=>`${k.cls}|${k.l}-${k.r}`).join("  "));
    console.log("  links:", h.links.map(l=>`"${l.t}"${l.l}-${l.r}(h${l.h})`).join(" "));
  }
}
await browser.close();
