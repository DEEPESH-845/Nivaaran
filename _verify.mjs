import { chromium, devices } from "@playwright/test";
const BASE = "http://localhost:3000";
const browser = await chromium.launch({ headless: process.env.HEADED !== "1" });

/* ---- 1. landing scenes still scrub ------------------------------------- */
{
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const sample = async (frac) => {
    await page.evaluate((f) => window.scrollTo({ top: (document.body.scrollHeight - innerHeight) * f, behavior: "instant" }), frac);
    await page.waitForTimeout(700);
    return page.evaluate(() => {
      const txt = document.body.innerText;
      const rejected = txt.match(/(\d\.\d\d)\s*\n?\s*rejected/)?.[1] ?? "?";
      const day = document.querySelector(".tnum.font-mono.text-3xl")?.textContent ?? "?";
      const vars = [...document.querySelectorAll("[style*='--p']")].map((e) => e.style.getPropertyValue("--p"));
      const canvases = [...document.querySelectorAll("canvas")].map((c) => {
        const g = c.getContext("2d");
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let lit = 0;
        for (let i = 3; i < d.length; i += 4000) if (d[i] > 8) lit++;
        return lit;
      });
      return { rejected, day, vars, canvases };
    });
  };
  console.log("=== landing scenes (should advance with scroll) ===");
  for (const f of [0, 0.25, 0.4, 0.55, 0.7, 1]) {
    const s = await sample(f);
    console.log(` ${String(f).padEnd(5)} rejected=${s.rejected}  day=${s.day}  --p=[${s.vars.join(", ")}]  canvasLit=[${s.canvases}]`);
  }
  await page.close();
}

/* ---- 2. one scroll pipeline -------------------------------------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(BASE + "/story", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const { result } = await cdp.send("Runtime.evaluate", { expression: "window" });
  const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId });
  const counts = {};
  for (const l of listeners) counts[l.type] = (counts[l.type] || 0) + 1;
  console.log("\n=== window listeners on /story ===");
  console.log(" ", Object.entries(counts).filter(([t]) => /scroll|wheel|touch|resize|pointer/.test(t)).map(([t, n]) => `${t}×${n}`).join("  ") || "none");
  await page.close();
}

/* ---- 3. anchor still glides through Lenis ------------------------------ */
{
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const samples = [];
  await page.evaluate(() => { window.__y = []; const t = setInterval(() => window.__y.push(Math.round(scrollY)), 50); setTimeout(() => clearInterval(t), 2000); });
  await page.locator('header a[href="/#start"]').click();
  await page.waitForTimeout(2100);
  samples.push(...(await page.evaluate(() => window.__y)));
  const uniq = [...new Set(samples)];
  console.log("\n=== #start anchor (smooth = many intermediate positions, not a jump) ===");
  console.log(`  ${uniq.length} distinct positions, ${samples[0]} → ${samples.at(-1)}`);
  const target = await page.evaluate(() => Math.round(document.getElementById("start").getBoundingClientRect().top));
  console.log(`  #start now at viewport y=${target} (below the 94px header = not hidden under it)`);
  await page.close();
}

/* ---- 4. reduced motion + overflow across sizes ------------------------- */
{
  const ctx = await browser.newContext({ ...devices["iPhone 13"], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/story", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  console.log(`\n=== reduced motion: imgs=${await page.locator("main img").count()} canvas=${await page.locator("canvas").count()} ===`);
  await ctx.close();

  console.log("\n=== overflow / routes ===");
  for (const [name, vp] of [["320", { width: 320, height: 568 }], ["390", { width: 390, height: 844 }], ["844L", { width: 844, height: 390 }], ["768", { width: 768, height: 1024 }], ["1440", { width: 1440, height: 900 }]]) {
    const c = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
    const p = await c.newPage();
    const bad = [];
    for (const r of ["/", "/story", "/check", "/preflight", "/documents", "/employer", "/why", "/sources", "/status", "/api", "/claim", "/done", "/governance"]) {
      const res = await p.goto(BASE + r, { waitUntil: "networkidle" });
      await p.waitForTimeout(200);
      const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (o > 1 || res.status() !== 200) bad.push(`${r}(${res.status()},+${o}px)`);
    }
    console.log(`  ${name.padEnd(5)} ${bad.length ? "FAIL " + bad.join(" ") : "13 routes 200, no overflow"}`);
    await c.close();
  }
}
await browser.close();
