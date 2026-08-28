import { chromium } from "@playwright/test";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(BASE + "/story", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

console.log(await page.evaluate(() => {
  const st = window.ScrollTrigger || (window.gsap && window.gsap.core && null);
  const el = document.querySelector('div[class*="h-[100dvh]"]');
  const sp = el?.parentElement;
  const cv = document.querySelector("canvas");
  return {
    pinnedEl: el?.className.slice(0, 40),
    spacer: sp?.className || sp?.getAttribute("class") || sp?.tagName,
    spacerStyle: sp ? { pad: getComputedStyle(sp).paddingBottom, h: getComputedStyle(sp).height, pos: getComputedStyle(sp).position } : null,
    elStyle: el ? { pos: getComputedStyle(el).position, top: getComputedStyle(el).top, h: getComputedStyle(el).height } : null,
    canvasBacking: cv ? `${cv.width}x${cv.height}` : null,
    canvasCss: cv ? `${Math.round(cv.getBoundingClientRect().width)}x${Math.round(cv.getBoundingClientRect().height)}` : null,
    dpr: window.devicePixelRatio,
    docTop: el ? el.getBoundingClientRect().top + window.scrollY : null,
  };
}));

// Walk the pin boundary one step at a time and report document-space top.
const trace = await page.evaluate(async () => {
  const el = document.querySelector('div[class*="h-[100dvh]"]');
  const out = [];
  for (let y = 60; y <= 140; y += 4) {
    window.scrollTo({ top: y, behavior: "instant" });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = el.getBoundingClientRect();
    out.push({ y, vp: Math.round(r.top), doc: Math.round(r.top + window.scrollY), pos: getComputedStyle(el).position });
  }
  return out;
});
console.log("\nscrollY  viewportTop  documentTop  position");
let prev = null;
for (const t of trace) {
  const jump = prev !== null && Math.abs(t.doc - prev) > 2 ? `   <== JUMP ${t.doc - prev}px` : "";
  console.log(`${String(t.y).padStart(5)} ${String(t.vp).padStart(11)} ${String(t.doc).padStart(12)}  ${t.pos}${jump}`);
  prev = t.doc;
}
await browser.close();
