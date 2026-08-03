// node scripts/capture-t12-mobile.mjs http://localhost:3214 shots-t12/
//
// Task 12 mobile (390x844) visual pass: reduced-motion full-page capture
// (everything renders in its settled end-state immediately, no scroll math
// needed) plus targeted section screenshots in normal motion mode at
// scroll positions chosen to let each section's own entrance/pin animation
// settle (per-section waits mirror the conventions in capture-story.mjs /
// capture-threats.mjs / capture-watch.mjs / capture-legacy.mjs).
import { chromium } from "playwright";

const [, , url = "http://localhost:3214", outDir = "shots-t12"] = process.argv;
const browser = await chromium.launch();

// --- reduced-motion: one full-page shot, everything already settled ---
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${outDir}/mobile-390-reduced-full.png`, fullPage: true });
  await browser.close();
}

const browser2 = await chromium.launch();
const page = await browser2.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(url, { waitUntil: "networkidle" });

// Act1 hero: title fully in (p~0.22-0.35 of the 400vh container)
const act1 = await page.evaluate(() => {
  const el = document.getElementById("act1");
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: r.height };
});
await page.evaluate((y) => window.scrollTo(0, y), Math.round(act1.top + act1.height * 0.28));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${outDir}/mobile-390-act1-title.png` });

// Story: scroll into the pin, wait for the scrub timeline to fully settle
const story = await page.evaluate(() => {
  const el = document.getElementById("story");
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY };
});
await page.evaluate((y) => window.scrollTo(0, y + 1400), story.top);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/mobile-390-story-panels.png` });

// Threats: Scorpion panel wipe-in settled
const threats = await page.evaluate(() => {
  const el = document.getElementById("threats");
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY };
});
await page.evaluate((y) => window.scrollTo(0, y + 300), threats.top);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/mobile-390-threats-scorpion.png` });

// Threats: Tombstone panel (longest villain name -- typography stress test)
await page.evaluate((y) => window.scrollTo(0, y), threats.top + 844 + 300);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/mobile-390-threats-tombstone.png` });

// Wildcards (Punisher/Hulk)
await page.evaluate(() => document.querySelector(".wildcards")?.scrollIntoView({ block: "start" }));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${outDir}/mobile-390-wildcards.png` });

// Watch
await page.evaluate(() => document.getElementById("watch")?.scrollIntoView({ block: "start" }));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${outDir}/mobile-390-watch.png`, fullPage: false });

// Legacy filmstrip + finale
const legacy = await page.evaluate(() => {
  const pin = document.querySelector(".legacy-pin");
  const track = document.querySelector(".legacy-track");
  const r = pin.getBoundingClientRect();
  return { top: r.top + window.scrollY, dist: Math.max(track.scrollWidth - window.innerWidth, 0) };
});
await page.evaluate((y) => window.scrollTo(0, y), legacy.top + 20);
await page.waitForTimeout(900);
await page.screenshot({ path: `${outDir}/mobile-390-legacy-filmstrip-start.png` });
await page.evaluate((y) => window.scrollTo(0, y), legacy.top + legacy.dist * 0.98);
await page.waitForTimeout(900);
await page.screenshot({ path: `${outDir}/mobile-390-legacy-filmstrip-end.png` });
await page.evaluate(() => document.querySelector(".legacy-finale")?.scrollIntoView({ block: "center" }));
await page.waitForTimeout(3200);
await page.screenshot({ path: `${outDir}/mobile-390-legacy-finale.png` });

// Footer (dedupe check)
await page.evaluate(() => document.querySelector("footer")?.scrollIntoView({ block: "end" }));
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/mobile-390-footer.png` });

await browser2.close();
console.log("done");
