import { chromium, devices } from "@playwright/test";
const BASE = "http://localhost:3000";
const THROTTLE = Number(process.env.THROTTLE || 6);

const PROBE = `
window.__probe = { long: [], cls: 0, shifts: [], frames: [] };
let __last = performance.now();
(function tick(t){ window.__probe.frames.push(t - __last); __last = t; requestAnimationFrame(tick); })(performance.now());
new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__probe.long.push(Math.round(e.duration)); })
  .observe({ type: "longtask", buffered: true });
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) {
    if (e.hadRecentInput) continue;
    window.__probe.cls += e.value;
    for (const s of e.sources || []) {
      window.__probe.shifts.push({
        v: +e.value.toFixed(3),
        y: Math.round(window.scrollY),
        node: s.node ? (s.node.tagName || "#") + "." + String(s.node.className || "").slice(0, 48) : "?",
        from: s.previousRect ? [Math.round(s.previousRect.x), Math.round(s.previousRect.y), Math.round(s.previousRect.height)] : null,
        to: s.currentRect ? [Math.round(s.currentRect.x), Math.round(s.currentRect.y), Math.round(s.currentRect.height)] : null,
      });
    }
  }
}).observe({ type: "layout-shift", buffered: true });
`;

const M = ["ScriptDuration", "LayoutDuration", "RecalcStyleDuration", "LayoutCount", "RecalcStyleCount", "TaskDuration"];
const read = async (cdp) => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.filter((m) => M.includes(m.name)).map((m) => [m.name, m.value]));

async function profile(page, cdp, route, { wheelPx = 220, ticks = 40, delay = 45 } = {}) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.evaluate(PROBE);
  await page.waitForTimeout(300);

  const a = await read(cdp);
  for (let i = 0; i < ticks; i++) { await page.mouse.wheel(0, wheelPx); await page.waitForTimeout(delay); }
  await page.waitForTimeout(900);
  for (let i = 0; i < Math.round(ticks / 2); i++) { await page.mouse.wheel(0, -wheelPx * 2); await page.waitForTimeout(delay); }
  await page.waitForTimeout(900);
  const b = await read(cdp);

  const d = (k) => +(b[k] - a[k]).toFixed(3);
  const p = await page.evaluate(() => window.__probe);
  const fr = p.frames.filter((x) => x > 0).slice(20);
  const srt = [...fr].sort((a, b) => a - b);
  const q = (x) => srt[Math.min(srt.length - 1, Math.floor(srt.length * x))] || 0;
  const pace = { p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +(srt.at(-1) || 0).toFixed(1),
                 drop: +((fr.filter((x) => x > 24).length / fr.length) * 100).toFixed(1) };
  return { pace, route, script: d("ScriptDuration"), layout: d("LayoutDuration"), style: d("RecalcStyleDuration"),
           layoutN: d("LayoutCount"), styleN: d("RecalcStyleCount"), task: d("TaskDuration"),
           long: p.long.length, cls: +p.cls.toFixed(3), shifts: p.shifts };
}

const browser = await chromium.launch();
for (const [label, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["mobile", devices["iPhone 13"]]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  for (const route of ["/", "/story"]) {
    const r = await profile(page, cdp, route, label === "mobile" ? { wheelPx: 160, ticks: 34 } : {});
    console.log(`${label.padEnd(7)} ${r.route.padEnd(7)} fps p50=${String(r.pace.p50).padStart(5)} p95=${String(r.pace.p95).padStart(6)} max=${String(r.pace.max).padStart(6)} drop=${String(r.pace.drop).padStart(5)}%  script=${String(r.script).padStart(6)}s layout=${String(r.layout).padStart(6)}s style=${String(r.style).padStart(6)}s  layouts=${String(r.layoutN).padStart(5)} styles=${String(r.styleN).padStart(5)}  task=${r.task}s long=${r.long}  CLS=${r.cls}`);
    if (r.shifts.length) {
      const top = r.shifts.sort((x, y) => y.v - x.v).slice(0, 4);
      for (const s of top) console.log(`         shift v=${s.v} @y=${s.y}  ${s.node}  ${JSON.stringify(s.from)} → ${JSON.stringify(s.to)}`);
    }
  }
  await ctx.close();
}
await browser.close();
