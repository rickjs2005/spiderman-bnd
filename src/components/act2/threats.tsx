"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { VILLAINS, WILDCARDS, SECTION_LABELS, CONCEPT_STILL_SUFFIX } from "@/lib/content";
import { MEDIA } from "@/lib/media";

gsap.registerPlugin(ScrollTrigger);

type Villain = (typeof VILLAINS)[number];

/** How much extra scroll each villain panel's pin holds, past its own
 * 100vh -- matches the brief exactly (a short pin per panel, not one long
 * one). This is the first place in the codebase that self-pins several
 * consecutive full-screen panels in a row (Story pins its section once, as
 * one unit; Act1 is one long scroll-scrub, not a stack of pins) -- there's
 * no existing precedent being mirrored here. It works because each panel is
 * an independent ScrollTrigger with its own `pin: true`: GSAP naturally
 * hands off from one panel's pin to the next as normal document flow
 * carries the scroll position from one panel's box into the next's, so no
 * manual offset math is needed between panels. */
const PANEL_END = "+=100%";

/**
 * Diagonal wipe-in: both strings are 4-point polygons in the same winding
 * order (top-left, top-right, bottom-right, bottom-left) -- GSAP's CSS
 * plugin tweens clip-path point-wise between matching polygons, so the
 * *shape* mid-tween (not just the two end states) is what reads as a
 * diagonal sweep. Top-left/bottom-left stay pinned at the panel's own left
 * edge; top-right and bottom-right race in from off-canvas at different
 * x's (0% vs -15%), so the leading edge is slanted the whole way across
 * instead of a flat vertical wipe.
 */
const WIPE_FROM = "polygon(0% 0%, 0% 0%, -15% 100%, 0% 100%)";
const WIPE_TO = "polygon(0% 0%, 115% 0%, 100% 100%, 0% 100%)";

type Mode = "pinned" | "static" | null;

/**
 * Act 2, "The Threats": one fullscreen panel per VILLAIN with a short pin
 * (diagonal clip-path wipe-in + slow Ken Burns zoom scrubbed across the
 * pin), then the two WILDCARDS as a no-pin, half-screen entrance finale.
 * "The Unseen" is a distinct sub-component (see UnseenPanel below) since it
 * intentionally never shows a clean still. Same mode-state / gsap.context
 * pattern as story.tsx and act1.tsx: null while deciding
 * prefers-reduced-motion (avoids a first-paint flash), then either the
 * pinned/animated tree or a fully separate static one.
 */
export function Threats() {
  const sectionRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(reduce ? "static" : "pinned");
  }, []);

  useEffect(() => {
    if (mode !== "pinned") return;
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".threat-panel", section).forEach((panel) => {
        const wipe = panel.querySelector<HTMLElement>(".threat-wipe");
        const img = panel.querySelector<HTMLElement>(".threat-img");
        const copy = panel.querySelector<HTMLElement>(".threat-copy");
        if (!wipe) return;

        gsap.set(wipe, { clipPath: WIPE_FROM });
        if (img) gsap.set(img, { scale: 1 });
        if (copy) gsap.set(copy, { opacity: 0, y: 28 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: panel,
            start: "top top",
            end: PANEL_END,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        // Wipe reveals fast (relative duration 1); Ken Burns zoom spans the
        // *entire* pin (relative duration 4, same start=0) so the timeline's
        // total duration is driven by the zoom -- scrubbing all the way
        // through the pin keeps slowly tightening the still even once the
        // wipe/copy have long finished.
        tl.to(wipe, { clipPath: WIPE_TO, duration: 1, ease: "power2.inOut" }, 0);
        if (img) tl.to(img, { scale: 1.06, duration: 4, ease: "none" }, 0);
        if (copy) tl.to(copy, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 0.25);
      });

      gsap.utils.toArray<HTMLElement>(".wildcard-card", section).forEach((card, i) => {
        gsap.set(card, { opacity: 0, y: 50 });
        gsap.to(card, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: i * 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      });
    }, section);

    return () => ctx.revert();
  }, [mode]);

  if (mode === "static") return <StaticThreats />;

  return (
    <section id="threats" ref={sectionRef} aria-label={SECTION_LABELS.threats} className="relative bg-[var(--ink)]">
      {VILLAINS.map((villain) =>
        villain.key === "unseen" ? (
          <UnseenPanel key={villain.key} villain={villain} />
        ) : (
          <VillainPanel key={villain.key} villain={villain} />
        ),
      )}
      <Wildcards />
    </section>
  );
}

function VillainPanel({ villain }: { villain: Villain }) {
  const src = MEDIA.villains[villain.key];
  return (
    <div className="threat-panel relative h-screen w-full overflow-hidden bg-[var(--ink)]">
      {/* clip-path pre-set inline (not just via gsap.set in the effect) so
          there's no frame of the full still before JS/GSAP mounts -- same
          "no FOUC" reasoning as story.tsx's panel opacity, just for
          clip-path instead of opacity. */}
      <div className="threat-wipe absolute inset-0" style={{ clipPath: WIPE_FROM }}>
        <div className="threat-img relative h-full w-full">
          <Image
            src={src}
            alt={`${villain.name} ${CONCEPT_STILL_SUFFIX}`}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/10 to-transparent" />
        </div>
      </div>
      <div className="threat-copy pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-12 sm:px-12 sm:pb-16">
        <h2 className="font-[family-name:var(--font-anton)] text-6xl uppercase leading-[0.9] tracking-tight text-[var(--paper)] drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] sm:text-8xl md:text-9xl">
          {villain.name}
        </h2>
        <p className="mt-3 max-w-md text-sm font-semibold uppercase tracking-[0.2em] text-[var(--red-text)] sm:text-base">
          {villain.actor}
        </p>
        <p className="mt-2 max-w-lg text-base text-[var(--paper)]/85 sm:text-lg">{villain.line}</p>
      </div>
    </div>
  );
}

/**
 * "The Unseen" never shows a clean still (MEDIA.villains.unseen
 * intentionally points at the poster -- "the villain no one can see"). The
 * poster gets a dark/desaturated treatment run through a LOCAL SVG filter
 * (feTurbulence -> feDisplacementMap, scoped to this one image via
 * `filter: url(#id)`, never touching the R3F canvas from Act 1), and the
 * name glitches via two aria-hidden, offset RGB clones sitting BEHIND the
 * real (solid, always-legible) heading -- so the name reads clean on top
 * while red/blue fringes flicker out from behind its letterforms.
 *
 * Both the SVG turbulence animation (SMIL, so it costs nothing on the JS
 * thread while running) and the CSS glitch-layer keyframes default to
 * *paused* and only run while this panel is actually on screen, via a
 * single IntersectionObserver -- keeps the (GPU-side) filter cost off
 * whenever the panel has scrolled away.
 */
function UnseenPanel({ villain }: { villain: Villain }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Defensive initial pause: the panel is below the fold on load, so
    // there'd otherwise be a brief window between mount and the observer's
    // first callback where the SMIL animation runs unseen.
    svgRef.current?.pauseAnimations();

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          svgRef.current?.unpauseAnimations();
          panel.classList.add("is-active");
        } else {
          svgRef.current?.pauseAnimations();
          panel.classList.remove("is-active");
        }
      },
      { threshold: 0 },
    );
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={panelRef}
      className="threat-panel threat-unseen relative h-screen w-full overflow-hidden bg-[var(--ink)]"
    >
      {/* Defs-only SVG: zero footprint, just holds the filter this panel's
          image references via CSS `filter: url(#unseen-distort)`. */}
      <svg ref={svgRef} aria-hidden className="absolute h-0 w-0 overflow-hidden">
        <filter id="unseen-distort" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" numOctaves="2" seed="7" result="noise">
            <animate
              attributeName="baseFrequency"
              dur="9s"
              values="0.012 0.02;0.022 0.009;0.008 0.026;0.016 0.014;0.012 0.02"
              repeatCount="indefinite"
            />
          </feTurbulence>
          {/* Modest displacement scale (16px) -- enough to read as
              "distortion", not so much the poster dissolves into noise. */}
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="threat-wipe absolute inset-0" style={{ clipPath: WIPE_FROM }}>
        <div className="threat-img relative h-full w-full" style={{ filter: "url(#unseen-distort)" }}>
          <Image
            src={MEDIA.villains.unseen}
            alt=""
            fill
            sizes="100vw"
            className="object-cover grayscale brightness-[0.35] contrast-125"
          />
          <div className="pointer-events-none absolute inset-0 bg-[var(--ink)]/50" />
        </div>
      </div>

      <div className="threat-copy pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-12 sm:px-12 sm:pb-16">
        <div className="relative inline-block">
          <span
            aria-hidden
            className="glitch-layer glitch-red pointer-events-none absolute inset-0 font-[family-name:var(--font-anton)] text-6xl uppercase leading-[0.9] tracking-tight sm:text-8xl md:text-9xl"
          >
            {villain.name}
          </span>
          <span
            aria-hidden
            className="glitch-layer glitch-blue pointer-events-none absolute inset-0 font-[family-name:var(--font-anton)] text-6xl uppercase leading-[0.9] tracking-tight sm:text-8xl md:text-9xl"
          >
            {villain.name}
          </span>
          <h2 className="relative z-10 font-[family-name:var(--font-anton)] text-6xl uppercase leading-[0.9] tracking-tight text-[var(--paper)] drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] sm:text-8xl md:text-9xl">
            {villain.name}
          </h2>
        </div>
        <p className="mt-3 max-w-md text-sm font-semibold uppercase tracking-[0.2em] text-[var(--red-text)] sm:text-base">
          {villain.actor}
        </p>
        <p className="mt-2 max-w-lg text-base text-[var(--paper)]/85 sm:text-lg">{villain.line}</p>
      </div>
    </div>
  );
}

/** No-pin finale: Punisher and Hulk as half-screen (side-by-side on sm+,
 * stacked on mobile) cards with a simple fade/slide entrance -- brief is
 * explicit these don't pin. */
function Wildcards() {
  return (
    <div className="wildcards relative grid grid-cols-1 bg-[var(--ink)] sm:h-screen sm:grid-cols-2">
      {WILDCARDS.map((wildcard) => (
        <div key={wildcard.key} className="wildcard-card relative h-[60vh] overflow-hidden sm:h-full">
          <Image
            src={MEDIA.wildcards[wildcard.key]}
            alt={`${wildcard.name} ${CONCEPT_STILL_SUFFIX}`}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/20 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-10 sm:px-8 sm:pb-12">
            <h3 className="font-[family-name:var(--font-anton)] text-4xl uppercase leading-[0.9] tracking-tight text-[var(--paper)] sm:text-5xl md:text-6xl">
              {wildcard.name}
            </h3>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--blue-text)] sm:text-sm">
              {wildcard.actor}
            </p>
            <p className="mt-2 max-w-sm text-sm text-[var(--paper)]/85 sm:text-base">{wildcard.line}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** prefers-reduced-motion fallback: no pins, no wipes, no scrubbed zoom, no
 * SVG/CSS glitch animation -- villains and wildcards stacked in reading
 * order with a plain opacity fade-in (reuses story.tsx's story-fade-in
 * keyframes). The Unseen keeps its dark/desaturated treatment (a static
 * visual choice, not motion) but drops the animated distortion entirely. */
function StaticThreats() {
  return (
    <section id="threats" aria-label={SECTION_LABELS.threats} className="relative bg-[var(--ink)] px-6 py-16 sm:px-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        {VILLAINS.map((villain, i) => (
          <div
            key={villain.key}
            style={{ animationDelay: `${i * 90}ms` }}
            className="relative animate-[story-fade-in_0.6s_ease-out_forwards] overflow-hidden opacity-0"
          >
            <div className="relative h-[60vh] w-full">
              <Image
                src={MEDIA.villains[villain.key]}
                alt={villain.key === "unseen" ? "" : `${villain.name} ${CONCEPT_STILL_SUFFIX}`}
                fill
                // This wrapper sits inside the `mx-auto max-w-4xl` column
                // above, not full viewport width -- cap sizes at 896px
                // (max-w-4xl) instead of always requesting a 100vw image.
                sizes="(min-width: 896px) 896px, 100vw"
                className={`object-cover ${villain.key === "unseen" ? "grayscale brightness-[0.4] contrast-125" : ""}`}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/10 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-8">
                <h2 className="font-[family-name:var(--font-anton)] text-5xl uppercase leading-[0.9] tracking-tight text-[var(--paper)] sm:text-7xl">
                  {villain.name}
                </h2>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--red-text)]">
                  {villain.actor}
                </p>
                <p className="mt-2 max-w-lg text-base text-[var(--paper)]/85">{villain.line}</p>
              </div>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {WILDCARDS.map((wildcard, i) => (
            <div
              key={wildcard.key}
              style={{ animationDelay: `${(VILLAINS.length + i) * 90}ms` }}
              className="relative h-[50vh] animate-[story-fade-in_0.6s_ease-out_forwards] overflow-hidden opacity-0"
            >
              <Image
                src={MEDIA.wildcards[wildcard.key]}
                alt={`${wildcard.name} ${CONCEPT_STILL_SUFFIX}`}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/20 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-6">
                <h3 className="font-[family-name:var(--font-anton)] text-3xl uppercase leading-[0.9] tracking-tight text-[var(--paper)] sm:text-4xl">
                  {wildcard.name}
                </h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--blue-text)]">
                  {wildcard.actor}
                </p>
                <p className="mt-1 max-w-xs text-sm text-[var(--paper)]/85">{wildcard.line}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
