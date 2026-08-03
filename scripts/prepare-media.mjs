// node scripts/prepare-media.mjs
//
// Processes assets-raw/ (gitignored, hunted originals) into public/media/
// (committed, optimized). Every visual task imports paths from src/lib/media.ts,
// never a hardcoded /media/... string.
//
// - resizes (2048px ceiling for canvas/R3F textures, 1600px ceiling for DOM),
//   converts to webp q80 (except the eye crop, kept as jpg q90 for R3F texture use)
// - generates the eye crop (mask-eye.jpg, 2048px, jpg q90)
// - generates a normal map for the eye crop via Sobel luminance gradient
// - generates the Spidey cutout (alpha webp) from the background-removed PNG
// - generates a duotone fallback crop for villain-tombstone (no clean official
//   still exists for this character in the source material — see task-2-report.md)
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";

mkdirSync("public/media", { recursive: true });

const RAW = "assets-raw";
const OUT = "public/media";

// [input, output, opts]
// opts.width / opts.height: resize ceiling (withoutEnlargement)
// opts.format: "jpeg" | "webp" (default webp)
// opts.quality: default 80 (webp) / 90 (jpeg via mask-eye override below)
// Canvas/R3F textures are bound by a 2048px ceiling on BOTH axes (not just width) --
// portrait sources otherwise blow the height axis past what the GPU/driver allows.
// `fit: "inside"` scales to fit within the 2048x2048 box preserving aspect ratio
// (no crop), so a portrait source shrinks by height instead of overflowing it.
const jobs = [
  // --- Eye texture (R3F material, kept as high-quality jpg) ---
  [`${RAW}/mask-closeup.jpg`, `${OUT}/mask-eye.jpg`, { width: 2048, height: 2048, fit: "inside", format: "jpeg", quality: 90 }],

  // --- Hero art ---
  [`${RAW}/poster.jpg`, `${OUT}/poster.webp`, { width: 1600 }],

  // --- NYC diorama layers (canvas texture, 2048px ceiling on BOTH axes) ---
  [`${RAW}/nyc-1.jpg`, `${OUT}/nyc-1.webp`, { width: 2048, height: 2048, fit: "inside" }],
  [`${RAW}/nyc-2.jpg`, `${OUT}/nyc-2.webp`, { width: 2048, height: 2048, fit: "inside" }],
  [`${RAW}/nyc-3.jpg`, `${OUT}/nyc-3.webp`, { width: 2048, height: 2048, fit: "inside" }],
  [`${RAW}/nyc-4.jpg`, `${OUT}/nyc-4.webp`, { width: 2048, height: 2048, fit: "inside" }],
  [`${RAW}/nyc-5.jpg`, `${OUT}/nyc-5.webp`, { width: 2048, height: 2048, fit: "inside" }],

  // --- Villains ---
  [`${RAW}/villain-scorpion.jpg`, `${OUT}/villain-scorpion.webp`, { width: 1200 }],
  [`${RAW}/punisher.jpg`, `${OUT}/punisher.webp`, { width: 1200 }],
  [`${RAW}/hulk.jpg`, `${OUT}/hulk.webp`, { width: 1200 }],

  // --- Gallery stills ---
  [`${RAW}/still-1.jpg`, `${OUT}/still-1.webp`, { width: 1600 }],
  [`${RAW}/still-2.jpg`, `${OUT}/still-2.webp`, { width: 1600 }],
  [`${RAW}/still-3.jpg`, `${OUT}/still-3.webp`, { width: 1600 }],
  [`${RAW}/still-4.jpg`, `${OUT}/still-4.webp`, { width: 1600 }],
  [`${RAW}/still-5.jpg`, `${OUT}/still-5.webp`, { width: 1600 }],
  [`${RAW}/still-6.jpg`, `${OUT}/still-6.webp`, { width: 1600 }],

  // --- Legacy timeline (Holland-era posters) ---
  [`${RAW}/timeline-homecoming.jpg`, `${OUT}/timeline-homecoming.webp`, { width: 900 }],
  [`${RAW}/timeline-ffh.jpg`, `${OUT}/timeline-ffh.webp`, { width: 900 }],
  [`${RAW}/timeline-nwh.jpg`, `${OUT}/timeline-nwh.webp`, { width: 900 }],
  [`${RAW}/timeline-bnd.jpg`, `${OUT}/timeline-bnd.webp`, { width: 900 }],
];

for (const [inp, out, opt] of jobs) {
  if (!existsSync(inp)) {
    console.warn("SKIP (missing input)", inp);
    continue;
  }
  let img = sharp(inp).resize({ width: opt.width, height: opt.height, fit: opt.fit, withoutEnlargement: true });
  img = opt.format === "jpeg" ? img.jpeg({ quality: opt.quality ?? 80 }) : img.webp({ quality: opt.quality ?? 80 });
  await img.toFile(out);
  console.log("ok", out);
}

// --- Spidey cutout: background already removed (Higgsfield remove_background) ---
// The raw Higgsfield cutout leaves a residual translucent halo: broad partial-alpha
// bands whose RGB matches the source's cream/gold bokeh background, which ghosts
// visibly over the site's dark NYC backdrop. Fix: remap alpha with a steep ramp
// (<=120 -> 0, >=180 -> 255, linear between) so residual translucency collapses to
// fully transparent or fully opaque, then erode the surviving mask by 1px (min of
// the 3x3 neighborhood) to eat any thin fringe left right at the edge. Only then
// trim the transparent margins, cap height at 1400px (comfortably above the
// brief's 1200px minimum), and export as alpha webp.
{
  const inp = `${RAW}/spidey-cutout.png`;
  const out = `${OUT}/spidey.webp`;
  if (existsSync(inp)) {
    const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: ch } = info; // ch === 4 (RGBA)
    const LOW = 120;
    const HIGH = 180;
    const thresholded = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const a = data[i * ch + 3];
      thresholded[i] = a <= LOW ? 0 : a >= HIGH ? 255 : Math.round(((a - LOW) / (HIGH - LOW)) * 255);
    }
    // 1px erosion: each pixel takes the min alpha of its 3x3 neighborhood, shrinking
    // the opaque region by one pixel so no halo fringe survives at the boundary.
    const eroded = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let min = 255;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = Math.min(w - 1, Math.max(0, x + dx));
            const ny = Math.min(h - 1, Math.max(0, y + dy));
            const v = thresholded[ny * w + nx];
            if (v < min) min = v;
          }
        }
        eroded[y * w + x] = min;
      }
    }
    for (let i = 0; i < w * h; i++) data[i * ch + 3] = eroded[i];

    await sharp(data, { raw: { width: w, height: h, channels: ch } })
      .trim()
      .resize({ height: 1400, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(out);
    console.log("ok", out, "(cutout, alpha thresholded + eroded, halo removed)");
  } else {
    console.warn("SKIP (missing input)", inp, "- spidey.webp fallback (SVG silhouette) was NOT generated because the cutout succeeded upstream; see task-2-report.md if this ever needs regenerating.");
  }
}

// --- Villain fallback: villain-tombstone ---
// No official still of this character exists in the hunted source material
// (see task-2-report.md). Per the brief's defined fallback, crop a moody region
// of the teaser poster (bottom-left, blurred city bokeh, no face/text) and apply
// a duotone (red/black) treatment so it reads as an "unrevealed threat" tile
// rather than a broken image.
{
  const inp = `${RAW}/poster.jpg`;
  const out = `${OUT}/villain-tombstone.webp`;
  if (existsSync(inp)) {
    await sharp(inp)
      .extract({ left: 0, top: 900, width: 1000, height: 1000 })
      .resize({ width: 1200 }) // "zoom" — enlarge the crop
      .linear(1.15, -12) // punch up contrast a bit
      .tint({ r: 190, g: 24, b: 24 }) // duotone: black -> red (tint reads luminance directly; don't greyscale first, it flattens to 1 channel and tint no-ops)
      .webp({ quality: 82 })
      .toFile(out);
    console.log("ok", out, "(FALLBACK: poster crop + duotone, no official Tombstone still found)");
  }
}

// --- Normal map for the eye crop: greyscale -> Sobel X/Y -> RGB(nx, ny, 255) ---
{
  const { data, info } = await sharp(`${OUT}/mask-eye.jpg`)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x, y) => data[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  const out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = px(x + 1, y) - px(x - 1, y);
      const dy = px(x, y + 1) - px(x, y - 1);
      const i = (y * w + x) * 3;
      out[i] = 128 + dx / 2;
      out[i + 1] = 128 + dy / 2;
      out[i + 2] = 255;
    }
  }
  await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toFile(`${OUT}/mask-eye-normal.png`);
  console.log("ok", `${OUT}/mask-eye-normal.png`);
}

console.log("\nDone. Run `ls public/media` to confirm every manifest path in src/lib/media.ts exists.");
