// node scripts/capture-legacy.mjs http://localhost:3000 shots-t11/ [mobile|reduced|share]
//
// Captures src/components/act2/legacy.tsx: the horizontal-scrub filmstrip
// of TIMELINE cards (pinned, "top top" -> "+=dist" where
// dist = trackScrollWidth - innerWidth, re-measured on ScrollTrigger's
// refresh -- see legacy.tsx's horizontal-scrub effect comment) followed by
// the finale (webs draw in from the corners, poster mask rises, headline +
// share button + credits + disclaimer).
//
// Third CLI arg selects a variant instead of the main desktop sequence:
//   mobile  -- 390x844 viewport, same horizontal scrub (only reduced-motion
//              drops the filmstrip to a vertical stack, not mobile)
//   reduced -- prefers-reduced-motion: reduce, static vertical stack +
//              fully-settled finale, no scroll math needed
//   share   -- exercises the share button's clipboard-fallback path
//              (navigator.share stubbed absent so the fallback fires) with
//              clipboard permissions granted, asserts the "Link copied!"
//              toast appears and auto-dismisses
import { chromium } from "playwright";

const [, , url = "http://localhost:3000", outDir = "shots-t11", variant = ""] = process.argv;

const browser = await chromium.launch();

if (variant === "reduced") {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  const { legacyTop, finaleTop } = await page.evaluate(() => {
    const legacy = document.getElementById("legacy").getBoundingClientRect();
    const finale = document.querySelector(".legacy-finale").getBoundingClientRect();
    return {
      legacyTop: legacy.top + window.scrollY,
      finaleTop: finale.top + window.scrollY,
    };
  });
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, legacyTop - 40));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/reduced-cards-top.png` });
  await page.evaluate((y) => window.scrollTo(0, y), legacyTop + 900);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/reduced-cards-mid.png` });
  await page.evaluate((y) => window.scrollTo(0, y), finaleTop - 40);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/reduced-finale.png` });

  // Reduced-motion must not register any scroll-driven animation: webs
  // should already be at their fully-drawn state (no dasharray/dashoffset
  // wired at all in the static tree) and finale copy fully opaque with zero
  // scrolling.
  const finaleOpacity = await page
    .locator(".legacy-finale .finale-headline")
    .evaluate((el) => getComputedStyle(el).opacity);
  console.log("reduced-motion finale-headline opacity (expect 1):", finaleOpacity);

  await browser.close();
  console.log(`reduced-motion shots done: legacyTop=${legacyTop.toFixed(0)} finaleTop=${finaleTop.toFixed(0)}`);
  process.exit(0);
}

if (variant === "share") {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  // Force the clipboard-fallback path even in a Chromium build where
  // navigator.share exists but would open a native OS sheet Playwright can't
  // drive -- deleting it makes handleShare() take the `else` branch exactly
  // like a browser without the Web Share API would.
  await page.evaluate(() => {
    // @ts-expect-error -- test-only override
    delete window.navigator.share;
  });
  await page.evaluate(() => document.querySelector(".legacy-finale")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${outDir}/share-before-click.png` });

  await page.getByRole("button", { name: "Share this concept" }).click();
  await page.waitForTimeout(300);
  const toastVisible = await page.locator('[role="status"]').isVisible().catch(() => false);
  const toastText = toastVisible ? await page.locator('[role="status"]').innerText() : null;
  console.log("toast visible after clipboard-fallback share click (expect true):", toastVisible);
  console.log("toast text (expect 'Link copied!'):", toastText);
  await page.screenshot({ path: `${outDir}/share-toast-visible.png` });

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  console.log("clipboard contents after share click:", clipboardText);

  await page.waitForTimeout(2600); // toast auto-dismiss is ~2.5s
  const toastGoneVisible = await page.locator('[role="status"]').isVisible().catch(() => false);
  console.log("toast auto-dismissed after ~2.5s (expect false):", toastGoneVisible);
  await page.screenshot({ path: `${outDir}/share-toast-dismissed.png` });

  await browser.close();
  process.exit(0);
}

if (variant === "mobile") {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url, { waitUntil: "networkidle" });
  const { pinTop, pinHeight, dist } = await page.evaluate(() => {
    const pin = document.querySelector(".legacy-pin");
    const track = document.querySelector(".legacy-track");
    const rect = pin.getBoundingClientRect();
    return {
      pinTop: rect.top + window.scrollY,
      pinHeight: rect.height,
      dist: Math.max(track.scrollWidth - window.innerWidth, 0),
    };
  });
  const points = [
    { label: "mobile-filmstrip-start", y: pinTop + 20 },
    { label: "mobile-filmstrip-mid", y: pinTop + dist * 0.5 },
    { label: "mobile-filmstrip-end", y: pinTop + dist * 0.98 },
  ];
  for (const { label, y } of points) {
    await page.evaluate((yy) => window.scrollTo(0, Math.round(yy)), y);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outDir}/${label}.png` });
  }
  await page.evaluate(() => document.querySelector(".legacy-finale")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(3200); // full reveal timeline (bg+webs+mask+headline+share+credits) runs ~2.7s
  await page.screenshot({ path: `${outDir}/mobile-finale.png` });
  await browser.close();
  console.log(`mobile shots done: pinTop=${pinTop.toFixed(0)} pinHeight=${pinHeight.toFixed(0)} dist=${dist.toFixed(0)}`);
  process.exit(0);
}

// --- main desktop sequence ---
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(500); // let GSAP's first ScrollTrigger.refresh() insert the pin spacer

const measurements = await page.evaluate(() => {
  const pin = document.querySelector(".legacy-pin");
  const track = document.querySelector(".legacy-track");
  const pinRect = pin.getBoundingClientRect();
  const finale = document.querySelector(".legacy-finale").getBoundingClientRect();
  return {
    pinTop: pinRect.top + window.scrollY,
    pinHeight: pinRect.height,
    trackScrollWidth: track.scrollWidth,
    dist: Math.max(track.scrollWidth - window.innerWidth, 0),
    cardCount: document.querySelectorAll(".legacy-card").length,
    finaleTop: finale.top + window.scrollY,
  };
});

console.log(
  `.legacy-pin: top=${measurements.pinTop.toFixed(0)} height=${measurements.pinHeight.toFixed(0)} ` +
    `trackScrollWidth=${measurements.trackScrollWidth.toFixed(0)} dist=${measurements.dist.toFixed(0)} ` +
    `cardCount=${measurements.cardCount} finaleTop=${measurements.finaleTop.toFixed(0)}`,
);

// 8 points across the scrub: start, three intermediate, and END (dist*1.0)
// plus an OVERSHOOT probe at dist*1.15 (well past the pin's own scroll
// budget) that must render IDENTICALLY to the dist*1.0 shot -- that's the
// dead-zone guard the brief calls out explicitly.
const points = [
  { label: "pre-entry", y: measurements.pinTop - 60 },
  { label: "scrub-000", y: measurements.pinTop + 10 },
  { label: "scrub-025", y: measurements.pinTop + measurements.dist * 0.25 },
  { label: "scrub-050", y: measurements.pinTop + measurements.dist * 0.5 },
  { label: "scrub-075", y: measurements.pinTop + measurements.dist * 0.75 },
  { label: "scrub-100-end", y: measurements.pinTop + measurements.dist * 1.0 },
  { label: "scrub-115-overshoot-probe", y: measurements.pinTop + measurements.dist * 1.15 },
];

for (const { label, y } of points) {
  const clampedY = Math.max(0, Math.round(y));
  await page.evaluate((yy) => window.scrollTo(0, yy), clampedY);
  await page.waitForTimeout(1200); // scrub:1 smoothing needs a moment to settle at each jump
  await page.screenshot({ path: `${outDir}/${label}.png` });
}

const trackTransformAtEnd = await page.locator(".legacy-track").evaluate((el) => getComputedStyle(el).transform);
console.log("track transform at scrub end (for dead-zone comparison with overshoot):", trackTransformAtEnd);

// Finale sequence
await page.evaluate(() => document.querySelector(".legacy-finale")?.scrollIntoView({ block: "center" }));
await page.waitForTimeout(3200); // full reveal timeline (bg+webs+mask+headline+share) runs ~2.2s
await page.screenshot({ path: `${outDir}/finale-revealed.png` });

const altTexts = await page.locator("#legacy img").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("alt")));
console.log("legacy <img alt> values:", JSON.stringify(altTexts));

// Task 12 dedupe: FINALE.credits + SITE.disclaimer used to render here AND
// in the site-wide <Footer/> immediately below Legacy in page.tsx -- now
// only Footer renders them, so .finale-credits/.finale-disclaimer no longer
// exist in the DOM at all. Actually assert that (throw + non-zero exit),
// not just log it, so a future regression that re-introduces the double
// render fails this capture script instead of silently passing.
const finaleCreditsCount = await page.locator(".finale-credits, .finale-disclaimer").count();
console.log("finale-credits/finale-disclaimer elements in DOM (expect 0, deduped into Footer):", finaleCreditsCount);
if (finaleCreditsCount !== 0) {
  await browser.close();
  throw new Error(
    `Expected 0 .finale-credits/.finale-disclaimer elements in the DOM (Task 12 deduped them into Footer), found ${finaleCreditsCount}.`,
  );
}
const footerDisclaimerText = await page.locator("footer p").first().innerText();
console.log("footer disclaimer text:", footerDisclaimerText);

await browser.close();
