// node scripts/capture.mjs http://localhost:3000 shots/
import { chromium } from "playwright";
const [,, url = "http://localhost:3000", outDir = "shots"] = process.argv;
const points = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.goto(url, { waitUntil: "networkidle" });
const total = await page.evaluate(() => document.body.scrollHeight - innerHeight);
for (const p of points) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * p));
  await page.waitForTimeout(900); // damp assentar (headless roda lento -- gotcha kavita)
  await page.screenshot({ path: `${outDir}/${String(Math.round(p * 100)).padStart(3, "0")}.png` });
}
await browser.close();
