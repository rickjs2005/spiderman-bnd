export const SITE = {
  title: "SPIDER-MAN: BRAND NEW DAY",
  // nav.tsx's fixed logo -- shorter than the full `title` above (no
  // "SPIDER-MAN:" prefix), so it's its own field rather than reusing title.
  navBrand: "BRAND NEW DAY",
  // <title>/OpenGraph title (layout.tsx). Deliberately its own field, not a
  // reuse of `title` above -- the two read differently ("SPIDER-MAN: BRAND
  // NEW DAY" vs "Spider-Man: Brand New Day — Fan Concept") and centralizing
  // must not change the byte-for-byte rendered/meta text.
  metaTitle: "Spider-Man: Brand New Day — Fan Concept",
  tagline: "A fan-made cinematic concept",
  badge: "FAN CONCEPT — NOT AFFILIATED WITH MARVEL OR SONY",
  disclaimer:
    "Fan concept — not affiliated with Marvel, Sony Pictures or Disney. All characters and images © their respective owners.",
  metaDescription:
    "A fan-made cinematic scroll experience for Spider-Man: Brand New Day (2026). Not affiliated with Marvel, Sony Pictures or Disney.",
  releaseLine: "In theaters July 31, 2026 · Directed by Destin Daniel Cretton",
  // act1.tsx's "skip past the scroll-scrub" button.
  skipIntroLabel: "Skip intro",
  // Act 1's `aria-label="Act 1"` (both the scene tree and its
  // reduced-motion StaticHero fallback share this landmark label).
  act1Label: "Act 1",
};

// Section `aria-label`s / landmark names, one field per Act 2 section --
// centralized here rather than inlined so every user-facing string (even
// accessibility-only ones) has one home, per the project's copy rule.
export const SECTION_LABELS = {
  story: "The Story",
  threats: "The Threats",
  watch: "Watch",
  legacy: "The Legacy",
} as const;

// Shared suffix composed onto every `${entry.title} …`/`${villain.name} …`
// alt-text fragment across threats.tsx and legacy.tsx -- centralizing the
// literal words even though the noun they follow is per-item data.
export const CONCEPT_STILL_SUFFIX = "concept still";

export const STORY_PANELS = [
  { sfx: "GONE!", title: "New York has moved on.", body: "Nobody remembers Peter Parker. Not his friends. Not the city he saves every night." },
  { sfx: "THWIP!", title: "Crime never sleeps. Neither does he.", body: "Full-time hero. No name, no credit, no way back." },
  { sfx: "CRACK!", title: "Watching your friends move on without you…", body: "…changes a person. Even one with great power." },
  { sfx: "HRRM…", title: "Something is waking up inside him.", body: "A change he may not have the power to control." },
  { sfx: "??!", title: "And the city's newest threat?", body: "You can't fight what you can't see." },
] as const;

export const VILLAINS = [
  { key: "scorpion", name: "SCORPION", actor: "Michael Mando", line: "Venom in his tail. Vengeance on his mind." },
  { key: "tombstone", name: "TOMBSTONE", actor: "Marvin Jones III", line: "Unbreakable. Unforgiving." },
  { key: "unseen", name: "THE UNSEEN", actor: "?????", line: "A mind that jumps from host to host. You never see it coming." },
] as const;

export const WILDCARDS = [
  { key: "punisher", name: "THE PUNISHER", actor: "Jon Bernthal", line: "One bad day away from becoming him." },
  { key: "hulk", name: "HULK", actor: "Mark Ruffalo", line: "The strongest one there is." },
] as const;

export const TIMELINE = [
  { year: "2017", title: "Homecoming", line: "The kid from Queens." },
  { year: "2019", title: "Far From Home", line: "The world needs a next Iron Man." },
  { year: "2021", title: "No Way Home", line: "The world forgets." },
  { year: "2026", title: "Brand New Day", line: "A brand new day." },
] as const;

export const LEGACY = {
  eyebrow: "The Legacy",
  heading: "The Holland Era",
} as const;

// Paired to MEDIA.gallery by index (src/lib/media.ts) -- 6 stills, 6 captions.
export const GALLERY_CAPTIONS = [
  "Concept still — the new mask.",
  "Concept still — a city that moved on.",
  "Concept still — the threat nobody sees coming.",
  "Concept still — one more brand new day.",
  "Concept still — the cost of the mask.",
  "Concept still — surrounded, and still swinging.",
] as const;

export const WATCH = {
  eyebrow: "Watch",
  trailerHeading: "Official Trailer",
  playLabel: "Play official trailer",
  galleryHeading: "Concept Gallery",
  // <iframe title> for the trailer embed once clicked.
  iframeTitle: "Official trailer",
  // Fallback alt-fragment used only if MEDIA.gallery ever outgrows
  // GALLERY_CAPTIONS.
  captionFallback: "Concept still — Brand New Day.",
} as const;

export const FINALE = {
  headline: "Every legend needs a witness.",
  cta: "Share this concept",
  copiedToast: "Link copied!",
  credits: "A fan tribute built with Next.js, Three.js and GSAP.",
};

export const FOOTER = {
  officialSiteLabel: "Official movie site",
  officialSiteHref: "https://www.marvel.com/movies/spider-man-brand-new-day",
} as const;
