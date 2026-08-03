// node scripts/capture-t12-fullpage.mjs http://localhost:3214 shots-t12/
//
// Task 12 mandatory verification: full-page captures at desktop 1440 and
// mobile 390, both in normal motion (scrolled through first so every
// section's entrance has fired, matching capture.mjs's convention) and in
// prefers-reduced-motion (static trees render settled immediately, single
// pass, no scroll timing needed).
import { chromium } from "playwright";

const [, , url = "http://localhost:3214", outDir = "shots-t12"] = process.argv;
const browser = await chromium.launch();

async function fullPageMotion(width, height, label) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: "networkidle" });
  const total = await page.evaluate(() => document.body.scrollHeight - innerHeight);
  // Walk down in small steps so every scroll-triggered entrance/pin fires
  // and settles (mirrors capture.mjs's point-sampling approach).
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round((total * i) / steps));
    await page.waitForTimeout(220);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/fullpage-${label}-motion.png`, fullPage: true });
  await page.close();
}

async function fullPageReduced(width, height, label) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  // Warm-up pass: Playwright's fullPage screenshot stitches via resize, not
  // real incremental scrolling, so native loading="lazy" images below the
  // fold can miss their viewport-proximity trigger and never fetch before
  // the capture. Walking scrollTop down to the bottom (in real steps, with
  // waits) forces every lazy image to actually enter the viewport at least
  // once first.
  const total = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += 600) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/fullpage-${label}-reduced.png`, fullPage: true });
  await page.close();
}

const which = process.argv[4] || "all";
if (which === "all" || which === "motion") {
  await fullPageMotion(1440, 900, "desktop-1440");
  await fullPageMotion(390, 844, "mobile-390");
}
if (which === "all" || which === "reduced") {
  await fullPageReduced(1440, 900, "desktop-1440");
  await fullPageReduced(390, 844, "mobile-390");
}

await browser.close();
console.log("done");
