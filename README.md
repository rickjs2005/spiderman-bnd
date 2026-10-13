[Português](README.pt-BR.md) | **English**

# Spider-Man: Brand New Day — Fan Concept Site

> **Type:** fan-made, non-commercial concept site (no published demo link).
>
> **Unofficial fan project.** It is **not affiliated with, endorsed by, or produced by
> Marvel, Sony Pictures, or Disney**. Spider-Man and all related characters, names,
> imagery, and trademarks belong to their respective owners. No official logos are used
> as site branding; the nav title is plain text.

![Opening screen of the site: macro shot of the mask's eye with the fan-concept disclaimer](docs/screenshots/home.jpg)

A one-page, scroll-driven cinematic site built around the *Spider-Man: Brand New Day*
promotional campaign (theatrical release listed in the site copy as **July 31, 2026**).
The site opens on a 3D "dive" sequence — a macro shot of the mask's eye that pulls back
into a 2.5D New York diorama with a web-swinging Spider-Man — before seaming into a
traditional DOM-based story: comic panels, a villain roster, the trailer embed, and a
legacy timeline through the Tom Holland era.

## Features

- **Act 1 (WebGL):** eye macro shot → NYC 2.5D parallax dive with webs/dust →
  halftone-burst transition into the DOM content, with a "Skip intro" button and a
  static reduced-motion fallback.
- **Act 2 (DOM):** Story (pinned comic panels), Threats (villain wipes), Watch
  (click-to-load trailer + concept gallery), Legacy (horizontal filmstrip timeline) and
  a "share this concept" button.
- Fan-concept disclaimer in the nav badge, the footer, and the meta description.

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router, Turbopack) + **React 19** + TypeScript
- **[React Three Fiber](https://docs.pmnd.rs/react-three-fiber)** + **drei** + **three.js**
  — the Act 1 hero canvas
- **[GSAP](https://gsap.com) + ScrollTrigger** — every scroll-pinned/scrubbed sequence
- **[Lenis](https://lenis.darkroom.engineering)** — smooth scroll, synced to ScrollTrigger
- **Tailwind CSS v4**
- **[sharp](https://sharp.pixelplumbing.com)** — offline asset pipeline;
  **Playwright** — local capture scripts (dev only)

The Canvas (three.js/R3F/drei) is code-split via `next/dynamic({ ssr: false })` so it
doesn't block first paint or bloat the initial JS bundle.

## Running it

Prerequisites: Node.js 20+ and npm. No environment variables are needed.

```bash
npm ci
npm run dev        # http://localhost:3000
```

For a production-accurate check (the dev server behaves differently, especially for the
Canvas code-splitting and image optimization):

```bash
npm run build
npm run start
```

> **Windows note:** `next dev` with Turbopack has been unreliable in the author's
> environment (it can hang). Prefer `npm run build && npm run start` when verifying real
> behavior.

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Asset pipeline

The processed images in `public/media/` **are committed**, so a fresh clone renders
without extra steps. The raw sources (`assets-raw/`) are intentionally **not** committed
(they are third-party promotional images and are large).

To regenerate `public/media/`:

1. Put your own source images in `assets-raw/` (see `scripts/prepare-media.mjs` for the
   exact filenames each step expects, and `src/lib/media.ts` for the manifest the site
   reads).
2. Run:

   ```bash
   node scripts/prepare-media.mjs
   ```

   This resizes/crops/re-encodes every asset with `sharp`, generates the Act 1 eye's
   Sobel-derived normal map, cuts out the Spider-Man hero silhouette, and produces the
   mobile-sized variants used on coarse-pointer devices.

`scripts/capture*.mjs` are Playwright scripts used during development to take local
screenshots (output goes to `shots*/`, which is git-ignored).

## Image credits and rights

- **Character stills, posters, and key art** in `public/media/` are official
  *Spider-Man: Brand New Day* promotional material (per the author, sourced from TMDB's
  press-kit mirror and syndicated press stills) plus posters for *Homecoming*, *Far From
  Home*, and *No Way Home* used in the Legacy timeline. Several of these posters include
  the official film title treatments. © Marvel / Sony Pictures / Disney. **No license
  was obtained**; they are used only as part of this non-commercial fan tribute, and
  will be removed on request from the rights holders. One villain tile (Tombstone) uses
  a treated poster crop as a fallback.
- **New York City background photography** (the five parallax layers in the Act 1 dive)
  is from [Unsplash](https://unsplash.com):
  - `nyc-1` — aerial night Manhattan, [Andre Benz](https://unsplash.com/@trapnation)
  - `nyc-2` to `nyc-5` — skyline/street photos; individual photographers not documented
- **Trailer:** embedded via `youtube-nocookie.com`, click-to-load only. Footage is never
  re-hosted or downloaded — the embed makes no requests to YouTube until the user clicks
  play.
- The screenshot above (`docs/screenshots/home.jpg`) is a capture of the local build.

## Project structure

```
src/
  app/                  Next.js App Router entry (layout, page, globals.css)
  components/
    act1/               R3F canvas: eye scene, NYC dive, webs/dust, halftone-burst seam
    act2/               DOM sections: Story, Threats, Watch, Legacy
    nav.tsx, footer.tsx Site chrome (disclaimer lives in both, plus meta description)
  lib/
    content.ts          All user-facing copy, centralized (English only)
    media.ts            Asset manifest (paths into public/media/)
    act1-store.ts       Shared scroll-progress store for Act 1's camera rig
public/media/           Processed images used by the site
scripts/
  prepare-media.mjs     Asset pipeline (sharp)
  capture*.mjs          Playwright capture scripts used during development
```

## Project rules

- All user-facing copy is in English and centralized in `src/lib/content.ts`.
- Movie footage is never re-hosted — the trailer is a `youtube-nocookie.com` embed only.

## Limitations

- Personal fan/portfolio experiment; not intended for commercial use or deployment as an
  official site.
- Relies on third-party promotional images (see above).
- No automated tests; CI runs lint and build only.

## Security

See [SECURITY.md](SECURITY.md).

## License

No license has been chosen yet; all rights reserved by the author. This applies only to
the author's own code — third-party characters, images, and trademarks remain the
property of their respective owners.
