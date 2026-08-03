// node scripts/capture-watch.mjs http://localhost:3000 shots-t10/ [mobile|reduced]
//
// Captures the "Watch" section (src/components/act2/watch.tsx): the
// click-to-load trailer facade + the 3x2 stills gallery. Also asserts the
// project's click-to-load rule holds -- zero requests to any
// youtube.com/youtube-nocookie.com/ytimg.com host before the play button is
// clicked, and a youtube-nocookie.com request firing once it is.
//
// Third CLI arg selects a variant instead of the main desktop sequence:
//   mobile  -- 390x844 viewport
//   reduced -- prefers-reduced-motion: reduce (no entrance animation, no
//              hover-parallax transform)
import { chromium } from "playwright";

const [, , url = "http://localhost:3000", outDir = "shots-t10", variant = ""] = process.argv;

const browser = await chromium.launch();

if (variant === "reduced") {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector("#watch")?.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/reduced-motion-full-section.png` });

  const cell = page.locator("#watch .grid > div").first();
  const box = await cell.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8);
    await page.waitForTimeout(300);
    const transform = await cell.locator("> div").evaluate((el) => getComputedStyle(el).transform);
    console.log("gallery cell transform after hover (expect none/identity):", transform);
  }
  const opacity = await page
    .locator("#watch .watch-fade")
    .first()
    .evaluate((el) => getComputedStyle(el).opacity);
  console.log("first .watch-fade opacity, no scroll (expect 1):", opacity);

  await browser.close();
  process.exit(0);
}

if (variant === "mobile") {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector("#watch")?.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/mobile-390-full-section.png` });
  await page.locator("#watch").screenshot({ path: `${outDir}/mobile-390-watch-section.png` });
  await browser.close();
  process.exit(0);
}

// --- main desktop sequence: network assertions + screenshots ---
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const youtubeRequests = [];
let clicked = false;
const beforeClick = [];
page.on("request", (req) => {
  const reqUrl = req.url();
  if (/youtube(-nocookie)?\.com|ytimg\.com/i.test(reqUrl)) {
    youtubeRequests.push(reqUrl);
    if (!clicked) beforeClick.push(reqUrl);
  }
});

await page.goto(`${url}/#watch`, { waitUntil: "networkidle" });
await page.locator("#watch").scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);

console.log("youtube-domain requests before click (expect 0):", beforeClick.length, beforeClick);
console.log("iframe count before click (expect 0):", await page.locator("#watch iframe").count());
await page.locator("#watch").screenshot({ path: `${outDir}/desktop-facade-before-click.png` });

clicked = true;
await page.getByRole("button", { name: "Play official trailer" }).click();
await page.waitForTimeout(1500);

const iframeSrc = await page.locator("#watch iframe").getAttribute("src").catch(() => null);
console.log("iframe src after click:", iframeSrc);
console.log(
  "youtube-nocookie.com request fired after click (expect true):",
  youtubeRequests.some((u) => /youtube-nocookie\.com/i.test(u)),
);
await page.locator("#watch").screenshot({ path: `${outDir}/desktop-facade-after-click.png` });

await page.evaluate(() => document.querySelector("#watch")?.scrollIntoView({ block: "start" }));
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/desktop-full-section.png` });

const firstCell = page.locator("#watch .grid > div").first();
const box = await firstCell.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.waitForTimeout(200);
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8);
  await page.waitForTimeout(300);
  await firstCell.screenshot({ path: `${outDir}/desktop-gallery-hover.png` });
}

const altTexts = await page.locator("#watch img").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("alt")));
console.log("gallery <img alt> values:", JSON.stringify(altTexts));

await browser.close();
