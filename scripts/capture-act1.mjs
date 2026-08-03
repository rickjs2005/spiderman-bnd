// node scripts/capture-act1.mjs http://localhost:3000 outDir
// Scrolls proportional to the #act1 section's OWN scrollable range (its
// height minus one viewport), not the whole document -- capture.mjs's
// points are fractions of total page scroll, which isn't the same thing
// once other sections exist alongside Act1. Temporary verification helper
// for Task 4; not referenced by any other task.
import { chromium } from "playwright";
const [, , url = "http://localhost:3000", outDir = "shots"] = process.argv;
const points = [0, 0.02, 0.05, 0.08, 0.1, 0.15, 0.2, 0.22, 0.25, 0.3, 0.33, 0.35, 0.38, 0.4, 0.42, 0.45, 0.48, 0.5];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.goto(url, { waitUntil: "networkidle" });
const { top, height } = await page.evaluate(() => {
  const el = document.getElementById("act1");
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: el.offsetHeight };
});
const scrollableRange = height - 810;
for (const p of points) {
  const y = Math.round(top + p * scrollableRange);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/act1-${String(Math.round(p * 100)).padStart(3, "0")}.png` });
}
await browser.close();
