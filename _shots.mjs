import { chromium, devices } from "@playwright/test";
const OUT = "/private/tmp/claude-501/-Users-deepesh-Developer-Nivaaran/0cc7783d-bf62-460b-8ded-43efaf656412/scratchpad/shots";
const b = await chromium.launch();
for (const [n, o] of [["d", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }], ["m", devices["iPhone 13"]]]) {
  const p = await (await b.newContext(o)).newPage();
  await p.goto("http://localhost:3000/story", { waitUntil: "networkidle" });
  await p.waitForTimeout(3000);
  for (const f of [0.08, 0.22, 0.45, 0.62, 0.85]) {
    await p.evaluate((x) => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * x, behavior: "instant" }), f);
    await p.waitForTimeout(1600);
    await p.screenshot({ path: `${OUT}/fin-${n}-${String(f).replace(".", "")}.png` });
  }
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.42, behavior: "instant" }));
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `${OUT}/fin-${n}-landing-scenes.png` });
}
await b.close();
