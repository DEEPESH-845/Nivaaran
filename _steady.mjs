import { chromium, devices } from "@playwright/test";
const BASE = "http://localhost:3000";
const THROTTLE = Number(process.env.THROTTLE || 6);

const PROBE = `
window.__p = { frames: [], long: [], cls: 0 };
new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__p.long.push(Math.round(e.duration))}).observe({type:"longtask",buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__p.cls+=e.value}).observe({type:"layout-shift",buffered:true});
let __l = performance.now();
(function t(x){ window.__p.frames.push(x-__l); __l=x; requestAnimationFrame(t); })(performance.now());
`;

const browser = await chromium.launch({ headless: process.env.HEADED !== "1" });
for (const [label, opts, wheel] of [
  ["desktop@2x", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, 220],
  ["mobile", devices["iPhone 13"], 160],
]) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(() => performance.setResourceTimingBufferSize(2000));
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");

  await page.goto(BASE + "/story", { waitUntil: "networkidle" });
  // Wait until the whole sequence is fetched + decoded, so we measure the
  // scroll itself rather than the scroll competing with the loader.
  await page.waitForFunction(
    () => performance.getEntriesByType("resource").filter((r) => r.name.includes("/Frames/w")).length >= 260,
    null, { timeout: 180000, polling: 500 },
  );
  await page.waitForTimeout(1500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await page.evaluate(PROBE);
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__p.frames.length = 0; window.__p.long.length = 0; window.__p.cls = 0; });

  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, wheel); await page.waitForTimeout(45); }
  await page.waitForTimeout(800);
  for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, -wheel * 2); await page.waitForTimeout(45); }
  await page.waitForTimeout(800);

  const p = await page.evaluate(() => window.__p);
  const f = p.frames.filter((x) => x > 0).slice(10);
  const s = [...f].sort((a, b) => a - b);
  const q = (x) => s[Math.min(s.length - 1, Math.floor(s.length * x))] || 0;
  const bk = await page.evaluate(() => { const c = document.querySelector("canvas"); return c ? `${c.width}x${c.height}` : "-"; });
  console.log(`${label.padEnd(11)} canvas=${bk.padEnd(10)} p50=${q(0.5).toFixed(1)} p95=${q(0.95).toFixed(1)} max=${(s.at(-1)||0).toFixed(1)} drop>24ms=${((f.filter(x=>x>24).length/f.length)*100).toFixed(1)}%  long=${p.long.length}  CLS=${p.cls.toFixed(3)}`);
  await ctx.close();
}
await browser.close();
