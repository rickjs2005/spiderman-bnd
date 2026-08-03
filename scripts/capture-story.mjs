// node scripts/capture-story.mjs http://localhost:3000 shots/
//
// Locates #story's own scroll range (its offsetTop through the end of the
// pin, i.e. offsetTop + own height + the "+=250%" spacer ScrollTrigger
// inserts) and samples points across it, plus a couple of frames just
// before entry and just after release, to check for pin jump.
import { chromium } from "playwright";

const [, , url = "http://localhost:3000", outDir = "shots"] = process.argv;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.goto(url, { waitUntil: "networkidle" });

// Let GSAP/ScrollTrigger finish their first refresh (pin spacer insertion)
// before measuring.
await page.waitForTimeout(500);

const range = await page.evaluate(() => {
  const el = document.getElementById("story");
  const rect = el.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  return { top, ownHeight: rect.height };
});

const start = range.top;
// The scrubbed timeline's 0..1 progress spans exactly the "+=250%" extra
// distance (end: "+=250%" in story.tsx), NOT the full pin-spacer height --
// GSAP's spacer = that extra distance PLUS the trigger's own height (the
// natural "catch-up" room for the element re-entering normal flow after
// release). Using the full spacer height here would overshoot the true
// release point by one section-height and mis-sample the entry/exit frames.
const end = start + range.ownHeight * 2.5;
const trailingExit = range.ownHeight; // natural post-release scroll-off zone
console.log(
  `#story range: start=${start.toFixed(0)} end=${end.toFixed(0)} (own=${range.ownHeight.toFixed(0)}, trailingExit=${trailingExit.toFixed(0)})`,
);

const fractions = [-0.05, 0, 0.02, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95, 1.0, 1.02, 1.1, 1.3];

for (const f of fractions) {
  const y = Math.max(0, Math.round(start + f * (end - start)));
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(900); // let scrub/damp settle (headless is slow -- known gotcha)
  const label = f < 0 ? `pre` : f > 1 ? `post` : String(Math.round(f * 100)).padStart(3, "0");
  await page.screenshot({ path: `${outDir}/${label}-f${f}.png` });
}

await browser.close();
