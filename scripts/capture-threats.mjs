// node scripts/capture-threats.mjs http://localhost:3000 shots-t9/ [mobile|reduced]
//
// Same technique as capture-story.mjs, extended for THREE independent
// self-pinning panels (one per VILLAIN) instead of one. Each ".threat-panel"
// pins itself ("top top" -> "+=100%"), so per panel i, with panelTop_i and
// ownHeight_i measured after GSAP's first refresh (spacers already
// inserted, so these are correct even read at scrollY=0):
//   - scrub (wipe + Ken Burns) runs while y in [panelTop_i, panelTop_i + ownHeight_i]
//   - release/catch-up runs while y in [panelTop_i + ownHeight_i, panelTop_i + 2*ownHeight_i]
//   - panelTop_i + 2*ownHeight_i == panelTop_(i+1) (seamless handoff, no gap/overlap)
// See story.tsx's PIN_END comment / capture-story.mjs for the "%  is a
// fraction of the trigger's own height" derivation this reuses.
//
// Third CLI arg selects a variant instead of the main desktop sequence:
//   mobile  -- 390x844 viewport, a handful of representative shots
//   reduced -- prefers-reduced-motion: reduce, static stacked layout, no scroll math needed
import { chromium } from "playwright";

const [, , url = "http://localhost:3000", outDir = "shots-t9", variant = ""] = process.argv;

const browser = await chromium.launch();

if (variant === "reduced") {
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const { top, wildcardsTop } = await page.evaluate(() => {
    const el = document.getElementById("threats");
    const wc = document.querySelector("#threats .grid.grid-cols-1.gap-6.sm\\:grid-cols-2");
    return {
      top: el.getBoundingClientRect().top + window.scrollY,
      wildcardsTop: wc ? wc.getBoundingClientRect().top + window.scrollY : null,
    };
  });
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, top - 40));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/reduced-top.png` });
  await page.evaluate((y) => window.scrollTo(0, y), top + 900);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/reduced-mid.png` });
  await page.evaluate((y) => window.scrollTo(0, y), (wildcardsTop ?? top + 1800) - 40);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/reduced-wildcards.png` });
  await browser.close();
  console.log(`reduced-motion shots done: threatsTop=${top.toFixed(0)}`);
  process.exit(0);
}

if (variant === "mobile") {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const { top, ownHeight } = await page.evaluate(() => {
    const el = document.querySelector(".threat-panel");
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, ownHeight: rect.height };
  });
  const wildcardsTop = await page.evaluate(() => {
    const el = document.querySelector(".wildcards");
    return el.getBoundingClientRect().top + window.scrollY;
  });
  const points = [
    { label: "mobile-v0-wipe", y: top + ownHeight * 0.08 },
    { label: "mobile-v0-mid", y: top + ownHeight * 0.5 },
    { label: "mobile-wildcards", y: wildcardsTop + 200 },
  ];
  for (const { label, y } of points) {
    await page.evaluate((yy) => window.scrollTo(0, yy), Math.round(y));
    await page.waitForTimeout(2000); // see main-sequence comment: cold clip-path rasterization on instant jumps
    await page.screenshot({ path: `${outDir}/${label}.png` });
  }
  await browser.close();
  console.log(`mobile shots done: panelTop=${top.toFixed(0)} ownHeight=${ownHeight.toFixed(0)}`);
  process.exit(0);
}

// --- main desktop sequence ---
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(500); // let GSAP's first ScrollTrigger.refresh() insert pin spacers

const measurements = await page.evaluate(() => {
  const threatsTop = document.getElementById("threats").getBoundingClientRect().top + window.scrollY;
  const panels = [...document.querySelectorAll(".threat-panel")].map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, ownHeight: r.height };
  });
  const wc = document.querySelector(".wildcards").getBoundingClientRect();
  return {
    threatsTop,
    panels,
    wildcardsTop: wc.top + window.scrollY,
    wildcardsHeight: wc.height,
  };
});

console.log(
  `#threats: top=${measurements.threatsTop.toFixed(0)} panels=${measurements.panels
    .map((p) => `[top=${p.top.toFixed(0)} h=${p.ownHeight.toFixed(0)}]`)
    .join(" ")} wildcardsTop=${measurements.wildcardsTop.toFixed(0)} wildcardsHeight=${measurements.wildcardsHeight.toFixed(0)}`,
);

const names = ["scorpion", "tombstone", "unseen"];
const points = [{ label: "pre-entry", y: measurements.threatsTop - 60 }];

measurements.panels.forEach((p, i) => {
  const name = names[i] ?? `v${i}`;
  points.push({ label: `${name}-wipe`, y: p.top + p.ownHeight * 0.06 });
  points.push({ label: `${name}-mid`, y: p.top + p.ownHeight * 0.5 });
  points.push({ label: `${name}-late`, y: p.top + p.ownHeight * 0.92 });
  if (i === 0) {
    // Only need to verify the pin release/catch-up handoff once -- it's
    // the same mechanic for every panel.
    points.push({ label: `${name}-release`, y: p.top + p.ownHeight * 1.4 });
  }
});

points.push({ label: "wildcards-enter", y: measurements.wildcardsTop - 40 });
points.push({ label: "wildcards-settled", y: measurements.wildcardsTop + measurements.wildcardsHeight * 0.6 });

for (const { label, y } of points) {
  const clampedY = Math.max(0, Math.round(y));
  await page.evaluate((yy) => window.scrollTo(0, yy), clampedY);
  // 2000ms, not 900: an instant scroll jump straight into a freshly-pinned
  // panel (as opposed to a gradual real-scroll) makes headless Chromium
  // rasterize a large newly-revealed clip-path region cold -- verified by
  // hand that 900ms still showed solid black on a point whose computed
  // style (clip-path, opacity, img.complete) was already fully correct,
  // and that waiting longer (no code change) made it render. Not a real
  // user-facing bug: real scroll repaints incrementally every frame.
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outDir}/${label}.png` });
}

await browser.close();
