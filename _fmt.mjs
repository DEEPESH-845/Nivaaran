import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://localhost:3000/story", { waitUntil: "domcontentloaded" });

const bench = await page.evaluate(async () => {
  const time = async (urls) => {
    // fetch first so network is out of the measurement
    const blobs = await Promise.all(urls.map((u) => fetch(u).then((r) => r.blob())));
    const bytes = blobs.reduce((a, b) => a + b.size, 0);
    const t0 = performance.now();
    for (const b of blobs) {
      const url = URL.createObjectURL(b);
      const img = new Image();
      img.src = url;
      await img.decode();
      URL.revokeObjectURL(url);
    }
    return { ms: +(performance.now() - t0).toFixed(1), kb: Math.round(bytes / 1024) };
  };
  const n = (a, b, f) => Array.from({ length: 20 }, (_, i) => f(a + i));
  return {
    png: await time(n(60, 0, (i) => `/Frames/ezgif-frame-${String(i).padStart(3, "0")}.png`)),
    w1536: await time(n(60, 0, (i) => `/Frames/w1536/${String(i).padStart(4, "0")}.webp`)),
    w768: await time(n(60, 0, (i) => `/Frames/w768/${String(i).padStart(4, "0")}.webp`)),
  };
});
for (const [k, v] of Object.entries(bench)) {
  console.log(`${k.padEnd(7)} 20 frames: ${String(v.kb).padStart(6)} KB   decode ${String(v.ms).padStart(7)} ms   (${(v.ms / 20).toFixed(2)} ms/frame, ${(v.kb / 20).toFixed(0)} KB/frame)`);
}
await browser.close();
