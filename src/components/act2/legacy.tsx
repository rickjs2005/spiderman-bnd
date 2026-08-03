"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FINALE, LEGACY, SITE, TIMELINE } from "@/lib/content";
import { MEDIA } from "@/lib/media";

gsap.registerPlugin(ScrollTrigger);

type Mode = "motion" | "static" | null;
type TimelineEntry = (typeof TIMELINE)[number];

/** Default card sizing for the horizontal filmstrip (desktop/tablet/mobile,
 * all still horizontal-scrub -- only prefers-reduced-motion drops to a
 * vertical stack, see StaticLegacy). */
const CARD_CLASS =
  "h-[68vh] w-[85vw] flex-none sm:w-[55vw] lg:h-[72vh] lg:w-[36vw]";

/** Four web strands, one per corner, converging toward the middle of a
 * 1000x1000 viewBox. preserveAspectRatio="none" lets the same four paths
 * stretch to any section aspect ratio without re-authoring per-breakpoint;
 * vector-effect keeps the stroke a constant on-screen thickness despite that
 * non-uniform stretch. */
const WEB_PATHS = [
  { corner: "tl", d: "M0,0 C 300,60 460,260 500,500" },
  { corner: "tr", d: "M1000,0 C 700,60 540,260 500,500" },
  { corner: "bl", d: "M0,1000 C 300,940 460,740 500,500" },
  { corner: "br", d: "M1000,1000 C 700,940 540,740 500,500" },
] as const;

/**
 * Act 2 closer, "The Legacy": a horizontally-scrubbed filmstrip of the four
 * Holland-era TIMELINE entries, followed immediately by the site's cinematic
 * finale (webs closing the screen, the poster's mask rising center-stage,
 * FINALE.headline, a share button). Credits + SITE.disclaimer are
 * deliberately NOT repeated here (Task 12 deduped a Task 11 double-render) --
 * the site-wide <Footer/> immediately below is their one canonical home.
 *
 * The filmstrip and the finale are deliberately TWO separate ScrollTriggers
 * sharing one <section>, not one combined pin: the filmstrip's scroll
 * distance is measured (scrollWidth - innerWidth, re-measured on every
 * refresh -- see the horizontal-scrub effect below for the aurex-motors
 * gotcha this avoids), while the finale is a fixed-duration one-shot reveal
 * (webs draw, mask rises, copy staggers in) triggered once by scroll
 * position, matching how threats.tsx hands off from its per-villain pins to
 * Wildcards' plain toggleActions reveal. Stacking a measured, continuously
 * re-scrubbed distance and a fixed-duration reveal under one pin would mean
 * the finale's timing drifts with the filmstrip's card sizing -- keeping
 * them independent keeps each easy to reason about and re-tune alone.
 *
 * Same mode-state / gsap.context pattern as story.tsx, threats.tsx and
 * watch.tsx: null while deciding prefers-reduced-motion, then either the
 * pinned/animated tree or a fully separate static one (StaticLegacy).
 */
export function Legacy() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const finaleRef = useRef<HTMLDivElement>(null);
  const webRefs = useRef<(SVGPathElement | null)[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(reduce ? "static" : "motion");
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: SITE.title,
          text: FINALE.headline,
          url: window.location.href,
        });
      } catch (err) {
        // AbortError = the user closed the native share sheet themselves --
        // expected, silent. Any other navigator.share failure is also left
        // silent rather than falling back to a clipboard toast the user
        // never asked for (they already saw -- and dismissed -- a native UI).
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast(FINALE.copiedToast);
    } catch {
      // Clipboard API unavailable/blocked (e.g. insecure context, denied
      // permission) -- no-op rather than surfacing an error the user can't
      // act on.
    }
  }, [showToast]);

  useEffect(() => {
    if (mode !== "motion") return;
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // --- horizontal timeline scrub ---
      // KNOWN GOTCHA (aurex-motors): measuring track.scrollWidth once at
      // mount breaks the moment a resize or a late-loading font/image
      // changes layout -- the pin's scroll distance and the track's travel
      // distance silently go out of sync. Fix: both `end` and `x` below are
      // FUNCTIONS, not pre-computed numbers, and invalidateOnRefresh:true
      // means GSAP calls them again on every ScrollTrigger.refresh() (which
      // itself re-runs on resize/load). Both read the *same* getDist(), so
      // the pin's scroll length and the track's translate distance can never
      // drift apart -- at scrub progress 1 the track always sits at exactly
      // -(scrollWidth - innerWidth), i.e. the last card's right edge flush
      // with the viewport's right edge. No overshoot, no gap.
      const pinEl = pinRef.current;
      const track = trackRef.current;
      if (pinEl && track) {
        const getDist = () => Math.max(track.scrollWidth - window.innerWidth, 0);
        gsap.to(track, {
          x: () => -getDist(),
          ease: "none",
          scrollTrigger: {
            trigger: pinEl,
            start: "top top",
            end: () => "+=" + getDist(),
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      }

      // --- finale: webs close in, mask rises, copy stacks in ---
      const finale = finaleRef.current;
      if (finale) {
        const webs = webRefs.current.filter((p): p is SVGPathElement => p !== null);
        webs.forEach((path) => {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        });
        gsap.set(finale.querySelector(".finale-bg"), { opacity: 0 });
        gsap.set(finale.querySelector(".finale-mask"), { opacity: 0, y: 40, scale: 0.9 });
        gsap.set(finale.querySelectorAll(".finale-headline, .finale-share"), { opacity: 0, y: 20 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: finale,
            start: "top 65%",
            toggleActions: "play none none reverse",
          },
        });
        tl.to(finale.querySelector(".finale-bg"), { opacity: 1, duration: 0.6, ease: "power1.out" })
          .to(webs, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut", stagger: 0.12 }, "-=0.3")
          .to(
            finale.querySelector(".finale-mask"),
            { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power2.out" },
            "-=0.5",
          )
          .to(
            finale.querySelector(".finale-headline"),
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
            "-=0.4",
          )
          .to(
            finale.querySelector(".finale-share"),
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
            "-=0.3",
          );
      }
    }, section);

    return () => ctx.revert();
  }, [mode]);

  if (mode === "static") {
    return <StaticLegacy onShare={handleShare} toast={toast} />;
  }

  return (
    <section id="legacy" ref={sectionRef} aria-label="The Legacy" className="relative bg-[var(--ink)]">
      <div ref={pinRef} className="legacy-pin relative h-screen w-full overflow-hidden">
        {/* top-20: the site's <Nav> is fixed + transparent-background (see
            nav.tsx) and overlays every section forever, not just at scroll
            top -- normally a fleeting, ignorable overlap as content scrolls
            past underneath it, but this heading is PINNED at the very top of
            the viewport for the whole filmstrip scrub, so it's a sustained
            view a user will actually look at. On mobile the nav's own right-
            hand badge wraps to two lines (~80px tall) and reaches left far
            enough to cross paths with this left-anchored heading, so it
            needs real clearance below the nav's tallest (wrapped) state, not
            just its single-line desktop height (where sm:top-10 stacks
            cleanly under the nav's one-line logo, confirmed in review). */}
        <div className="pointer-events-none absolute left-6 top-20 z-10 sm:left-10 sm:top-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--red-text)]">{LEGACY.eyebrow}</p>
          <h2 className="mt-2 font-[family-name:var(--font-anton)] text-4xl uppercase leading-[0.9] tracking-tight text-[var(--paper)] sm:text-6xl">
            {LEGACY.heading}
          </h2>
        </div>
        <div ref={trackRef} className="legacy-track flex h-full items-center gap-6 pl-[8vw] pr-[8vw] sm:gap-10">
          {/* No `priority` here: the filmstrip is several screens below the
              fold (after Act1/Story/Threats/Watch), so none of these cards
              are ever part of the first paint -- eager-loading one would
              only compete with the site's actual LCP candidate. */}
          {TIMELINE.map((entry, i) => (
            <LegacyCard key={entry.year} entry={entry} src={MEDIA.timeline[i]} />
          ))}
        </div>
      </div>

      <div
        ref={finaleRef}
        className="legacy-finale relative flex h-screen w-full items-center justify-center overflow-hidden bg-[var(--ink)]"
      >
        <div className="finale-bg pointer-events-none absolute inset-0 bg-[var(--ink)]" aria-hidden />
        <FinaleWebs
          setRef={(i, el) => {
            webRefs.current[i] = el;
          }}
        />
        <FinaleContent onShare={handleShare} />
      </div>

      <ShareToast message={toast} />
    </section>
  );
}

function LegacyCard({
  entry,
  src,
  className = CARD_CLASS,
  // Matches CARD_CLASS's own w-[85vw]/sm:w-[55vw]/lg:w-[36vw] -- the
  // filmstrip track has no max-width cap, so these ARE the real rendered
  // widths. StaticLegacy overrides this to "100vw" below since its cards
  // stack full-width instead.
  sizes = "(min-width: 1024px) 36vw, (min-width: 640px) 55vw, 85vw",
}: {
  entry: TimelineEntry;
  src: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={`legacy-card relative overflow-hidden bg-[var(--ink)] ${className}`}>
      <Image
        src={src}
        alt={`${entry.title} concept still`}
        fill
        sizes={sizes}
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/25 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-8">
        <p className="font-[family-name:var(--font-anton)] text-5xl text-[var(--red)] sm:text-6xl">{entry.year}</p>
        <h3 className="mt-1 font-[family-name:var(--font-anton)] text-2xl uppercase tracking-tight text-[var(--paper)] sm:text-3xl">
          {entry.title}
        </h3>
        <p className="mt-2 max-w-xs text-sm text-[var(--paper)]/85 sm:text-base">{entry.line}</p>
      </div>
    </div>
  );
}

function FinaleWebs({ setRef }: { setRef: (i: number, el: SVGPathElement | null) => void }) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {WEB_PATHS.map((w, i) => (
        <path
          key={w.corner}
          ref={(el) => setRef(i, el)}
          d={w.d}
          fill="none"
          stroke="var(--paper)"
          strokeOpacity={0.4}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function FinaleContent({ onShare }: { onShare: () => void }) {
  return (
    <div className="finale-content relative z-10 flex flex-col items-center px-6 text-center">
      <div className="finale-mask relative h-[38vh] max-h-64 w-[38vh] max-w-64 overflow-hidden rounded-full ring-4 ring-[var(--red)]/70 shadow-[0_0_60px_rgba(228,38,24,0.35)]">
        <Image
          src={MEDIA.poster}
          alt=""
          fill
          sizes="256px"
          className="object-cover object-[50%_18%] grayscale contrast-125"
        />
      </div>
      <h2 className="finale-headline mt-8 max-w-2xl font-[family-name:var(--font-anton)] text-4xl uppercase leading-[0.95] tracking-tight text-[var(--paper)] sm:text-6xl">
        {FINALE.headline}
      </h2>
      <button
        type="button"
        onClick={onShare}
        className="finale-share mt-6 inline-flex items-center gap-2 border-2 border-[var(--paper)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--paper)] transition-colors duration-200 hover:bg-[var(--paper)] hover:text-[var(--ink)]"
      >
        {FINALE.cta}
      </button>
      {/* FINALE.credits + SITE.disclaimer are NOT repeated here -- the
          site-wide <Footer/> (immediately below Legacy in page.tsx) is the
          single canonical place for both, per the project rule that the
          disclaimer must appear in nav badge + footer + meta description.
          Task 11 rendered them twice (finale AND footer); deduped here. */}
    </div>
  );
}

function ShareToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-6"
    >
      <span className="rounded-full bg-[var(--paper)] px-5 py-2 text-sm font-semibold text-[var(--ink)] shadow-lg">
        {message}
      </span>
    </div>
  );
}

/** prefers-reduced-motion fallback: no pin, no horizontal scrub, no
 * scroll-triggered web-draw/mask-rise -- the four TIMELINE cards stack
 * vertically (full-width, reading order) and the finale renders in its
 * fully-settled end state (webs solid/undrawn-to-drawn distinction removed
 * entirely, mask/headline/credits/disclaimer all at opacity 1 from the
 * start) so everything is immediately legible with zero motion. */
function StaticLegacy({ onShare, toast }: { onShare: () => void; toast: string | null }) {
  return (
    <>
      <section id="legacy" aria-label="The Legacy" className="relative bg-[var(--ink)] px-6 py-16 sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--red-text)]">{LEGACY.eyebrow}</p>
        <h2 className="mt-2 font-[family-name:var(--font-anton)] text-4xl uppercase leading-[0.9] tracking-tight text-[var(--paper)] sm:text-6xl">
          {LEGACY.heading}
        </h2>

        <div className="mt-10 flex flex-col gap-6">
          {/* No priority here either -- see the matching comment on the
              scroll variant above; StaticLegacy is just as far below the
              fold. sizes="100vw": this stack has no max-width cap (only
              the section's own px-6/sm:px-10 padding), unlike the
              filmstrip's CARD_CLASS-driven widths. */}
          {TIMELINE.map((entry, i) => (
            <LegacyCard
              key={entry.year}
              entry={entry}
              src={MEDIA.timeline[i]}
              className="h-[60vh] w-full sm:h-[70vh]"
              sizes="100vw"
            />
          ))}
        </div>

        <div className="legacy-finale relative mt-16 flex min-h-[80vh] w-full items-center justify-center overflow-hidden bg-[var(--ink)] py-20">
          <div className="pointer-events-none absolute inset-0 bg-[var(--ink)]" aria-hidden />
          <FinaleWebs setRef={() => {}} />
          <FinaleContent onShare={onShare} />
        </div>
      </section>
      <ShareToast message={toast} />
    </>
  );
}
