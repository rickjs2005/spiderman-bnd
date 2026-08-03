# Spider-Man: Brand New Day — Fan Concept Site

> **This is an unofficial fan concept.** It is **not affiliated with, endorsed by, or
> produced by Marvel, Sony Pictures, or Disney.** All Spider-Man characters, imagery,
> and trademarks belong to their respective owners. This project exists purely as a
> cinematic web experiment/fan tribute built around the real *Spider-Man: Brand New Day*
> promotional campaign.

A one-page, scroll-driven cinematic site celebrating **Spider-Man: Brand New Day**,
releasing in theaters **July 31, 2026**. The site opens on a 3D "dive" sequence — a
macro shot of the mask's eye that pulls back into a 2.5D New York diorama with a
web-swinging Spider-Man — before seaming into a traditional (DOM-based) story: comic
panels, a villain roster, the official trailer, and a legacy timeline through the
Tom Holland era.

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router, Turbopack) + **React 19**
- **[React Three Fiber](https://docs.pmnd.rs/react-three-fiber)** + **three.js** — the
  Act 1 hero canvas (eye macro shot → NYC 2.5D dive with webs/dust → halftone-burst
  transition into the DOM content)
- **[GSAP](https://gsap.com) + ScrollTrigger** — every scroll-pinned/scrubbed sequence
  in both acts (camera rig in Act 1, comic-panel pin in Story, villain wipes in
  Threats, horizontal filmstrip in Legacy)
- **[Lenis](https://lenis.darkroom.engineering)** — smooth scroll, synced to
  ScrollTrigger
- **Tailwind CSS v4**
- **[sharp](https://sharp.pixelplumbing.com)** — the offline asset pipeline (see below)

The Canvas (three.js/R3F/drei) is code-split via `next/dynamic({ ssr: false })` so it
doesn't block first paint or bloat the initial JS bundle.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

For a production-accurate check (the dev server behaves differently, especially for
the Canvas code-splitting and image optimization):

```bash
npm run build
npm run start
```

> **Windows note:** `next dev` with Turbopack has been unreliable in this environment
> (it can hang). Prefer `npm run build && npm run start` when verifying real behavior.

## Asset pipeline

`public/media/` is generated, not hand-placed, and **`assets-raw/` is intentionally not
committed to version control** (it's real promotional photography — see licensing note
below — and it's large). To regenerate `public/media/`:

1. Supply your own source images in `assets-raw/` (posters, character stills, NYC
   background photography — see `scripts/prepare-media.mjs` for the exact filenames
   each pipeline step expects, and `src/lib/media.ts` for the final manifest it
   produces).
2. Run:

   ```bash
   node scripts/prepare-media.mjs
   ```

   This resizes/crops/re-encodes every asset with `sharp`, generates the Act 1 eye's
   Sobel-derived normal map, cuts out the Spider-Man hero silhouette, and produces the
   mobile-sized variants used on coarse-pointer devices.

Without `assets-raw/`, a fresh clone will not have populated `public/media/` — the site
won't render correctly until the pipeline has been run against real source images.

## Image credits

- **Character stills, posters, and key art** are official *Spider-Man: Brand New Day*
  promotional material (via TMDB's press-kit mirror and syndicated press stills) plus
  posters for the earlier Tom Holland films (*Homecoming*, *Far From Home*, *No Way
  Home*) used in the Legacy timeline. © Marvel / Sony Pictures / Disney, used here
  under fair-use for a non-commercial fan tribute. One villain tile (Tombstone) uses a
  treated poster crop as a fallback, since no official still for that character exists
  in this film's marketing.
- **New York City background photography** (the five parallax layers in the Act 1
  dive) is free-license imagery from [Unsplash](https://unsplash.com):
  - `nyc-1` — aerial night Manhattan, [Andre Benz](https://unsplash.com/@trapnation)
  - `nyc-2` — golden-lit skyline
  - `nyc-3` — monochrome downtown skyline with the Freedom Tower
  - `nyc-4` — dark blue skyline with water reflection
  - `nyc-5` — dense street-canyon towers
- **Official trailer**: embedded via `youtube-nocookie.com`, click-to-load only. The
  trailer is never re-hosted or downloaded — the embed makes zero requests to YouTube
  until the user explicitly clicks play.

## Project structure

```
src/
  app/                Next.js App Router entry (layout, page, globals.css)
  components/
    act1/              R3F canvas: eye scene, NYC dive, webs/dust, halftone-burst seam
    act2/               DOM sections: Story, Threats, Watch, Legacy
    nav.tsx, footer.tsx  Site chrome (disclaimer lives in both, plus meta description)
  lib/
    content.ts          All user-facing copy, centralized (English only)
    media.ts             Generated asset manifest (paths into public/media/)
    act1-store.ts         Shared scroll-progress store for Act 1's camera rig
scripts/
  prepare-media.mjs      Asset pipeline (sharp)
  capture*.mjs            Playwright verification scripts used during development
```

## Project rules

- All user-facing copy is in English and centralized in `src/lib/content.ts`.
- Movie footage is never re-hosted — the trailer is a `youtube-nocookie.com` embed only.
