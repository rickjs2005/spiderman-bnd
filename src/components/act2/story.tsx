"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STORY_PANELS } from "@/lib/content";

gsap.registerPlugin(ScrollTrigger);

/** How much extra scroll the pin holds, past the section's own 100vh --
 * matches the brief exactly. pinSpacing stays at its default (true), so
 * this is real, natural scroll length inserted after the section, not a
 * layout hack. */
const PIN_END = "+=250%";

/**
 * Per-panel entrance: where it slides in FROM (xPercent/yPercent + a
 * dramatic tilt) and where it SETTLES (finalRotate, 2-4deg, alternating
 * sign per the brief). xPercent/yPercent -- NOT x/y in pixels -- is the
 * aurex-motors gotcha: pixel offsets break at other viewport widths since
 * they don't scale with the panel's own box, percent-of-self does.
 */
const ENTRANCE = [
  { xPercent: -140, yPercent: 0, rotate: -10, finalRotate: -3 },
  { xPercent: 140, yPercent: 0, rotate: 9, finalRotate: 2 },
  { xPercent: 0, yPercent: 130, rotate: -7, finalRotate: -2.5 },
  { xPercent: -140, yPercent: 0, rotate: 7, finalRotate: 3 },
  { xPercent: 140, yPercent: 0, rotate: -9, finalRotate: -4 },
] as const;

/** Asymmetric 6x6 comic-page grid placement, desktop/tablet only (mobile
 * stacks to a single column via the base grid-cols-1). */
const PANEL_LAYOUT = [
  "sm:col-start-1 sm:col-span-4 sm:row-start-1 sm:row-span-3", // A -- big top-left
  "sm:col-start-5 sm:col-span-2 sm:row-start-1 sm:row-span-3", // B -- top-right
  "sm:col-start-1 sm:col-span-2 sm:row-start-4 sm:row-span-3", // C -- bottom-left
  "sm:col-start-3 sm:col-span-3 sm:row-start-4 sm:row-span-3", // D -- bottom-mid, wide
  "sm:col-start-6 sm:col-span-1 sm:row-start-4 sm:row-span-3", // E -- narrow mystery sliver
];

/**
 * Act 2 opener: "The Story" -- five comic-book panels that assemble on
 * scroll inside a pinned, scrubbed timeline. Mirrors Act1's mode-state
 * pattern (see act1.tsx) to avoid an SSR/first-paint flash and to give
 * prefers-reduced-motion a completely separate, static render path instead
 * of a reduced-parameter version of the same animation.
 */
export function Story() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sfxRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [mode, setMode] = useState<"comic" | "static" | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(reduce ? "static" : "comic");
  }, []);

  useEffect(() => {
    if (mode !== "comic") return;
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const panels = panelRefs.current;
      const sfxs = sfxRefs.current;

      gsap.set(panels, {
        xPercent: (i: number) => ENTRANCE[i].xPercent,
        yPercent: (i: number) => ENTRANCE[i].yPercent,
        rotate: (i: number) => ENTRANCE[i].rotate,
        opacity: 0,
      });
      gsap.set(sfxs, { scale: 0, opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          pin: true,
          start: "top top",
          end: PIN_END,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      ENTRANCE.forEach((cfg, i) => {
        const panel = panels[i];
        if (!panel) return;
        const label = `panel${i}`;
        tl.addLabel(label, i === 0 ? 0 : "-=0.15");
        tl.to(
          panel,
          {
            xPercent: 0,
            yPercent: 0,
            rotate: cfg.finalRotate,
            opacity: 1,
            duration: 1,
            ease: "power2.out",
          },
          label,
        );
        const sfx = sfxs[i];
        if (sfx) {
          tl.to(
            sfx,
            { scale: 1, opacity: 1, duration: 0.6, ease: "elastic.out(1, 0.45)" },
            `${label}+=0.5`,
          );
        }
      });
    }, section);

    return () => ctx.revert();
  }, [mode]);

  if (mode === "static") return <StaticStory />;

  return (
    <section
      id="story"
      ref={sectionRef}
      aria-label="The Story"
      className="relative h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]"
    >
      <div className="halftone absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto grid h-full max-w-6xl grid-cols-1 gap-6 px-6 py-16 sm:grid-cols-6 sm:grid-rows-6 sm:gap-4 sm:px-10 sm:py-14">
        {STORY_PANELS.map((panel, i) => (
          <div
            key={panel.sfx}
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            data-panel-index={i}
            /* opacity: 0 only, deliberately NOT a transform string here --
               gsap.set() below is the first (and only) writer of this
               element's `transform`. Baking an off-screen translate/rotate
               into a plain inline style first, then having gsap's
               xPercent/rotate touch the same element, makes gsap parse the
               pre-existing CSS transform as a raw pixel offset and layer
               its own percent-based offset ON TOP of it (double-translate)
               instead of owning the value outright -- gsap never sees a
               reason to *replace* a transform it didn't author. Since
               opacity 0 already hides the panel regardless of its
               transform, there's no FOUC to avoid by pre-setting the
               offset here, so we just don't. */
            style={{ opacity: 0 }}
            className={`comic-border relative flex min-h-[200px] flex-col justify-center bg-[var(--paper)] p-5 sm:min-h-0 sm:p-6 ${PANEL_LAYOUT[i]}`}
          >
            <span
              ref={(el) => {
                sfxRefs.current[i] = el;
              }}
              aria-hidden
              style={{
                opacity: 0,
                WebkitTextStroke: "2px var(--ink)",
                textShadow: "3px 3px 0 var(--ink)",
              }}
              className="pointer-events-none absolute -top-6 -right-3 font-[family-name:var(--font-bangers)] text-4xl text-[var(--red)] sm:text-6xl"
            >
              {panel.sfx}
            </span>
            {/* h2, not h3 -- Story is the first DOM section after Act1's h1
                (Act1's canvas has no heading of its own to sit between
                them), so an h3 here would skip a level and fail Lighthouse's
                heading-order a11y audit. Multiple sibling h2s across the 5
                panels is valid heading structure (no skip, just breadth). */}
            <h2 className="font-[family-name:var(--font-anton)] text-xl uppercase tracking-wide sm:text-2xl">
              {panel.title}
            </h2>
            <p className="mt-2 text-base leading-relaxed">{panel.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** prefers-reduced-motion fallback: no pin, no scrub -- the 5 panels stacked
 * in reading order with a simple opacity fade-in (no transform/motion). */
function StaticStory() {
  return (
    <section
      id="story"
      aria-label="The Story"
      className="relative bg-[var(--paper)] px-6 py-20 text-[var(--ink)] sm:px-10"
    >
      <div className="halftone absolute inset-0 opacity-30" aria-hidden />
      <div className="relative mx-auto flex max-w-2xl flex-col gap-8">
        {STORY_PANELS.map((panel, i) => (
          <div
            key={panel.sfx}
            style={{ animationDelay: `${i * 90}ms` }}
            className="comic-border relative animate-[story-fade-in_0.6s_ease-out_forwards] bg-[var(--paper)] p-6 opacity-0"
          >
            <span
              aria-hidden
              style={{ WebkitTextStroke: "2px var(--ink)", textShadow: "3px 3px 0 var(--ink)" }}
              className="absolute -top-5 -right-3 font-[family-name:var(--font-bangers)] text-3xl text-[var(--red)]"
            >
              {panel.sfx}
            </span>
            <h2 className="font-[family-name:var(--font-anton)] text-xl uppercase tracking-wide">
              {panel.title}
            </h2>
            <p className="mt-2 text-base leading-relaxed">{panel.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
