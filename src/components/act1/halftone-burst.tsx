"use client";

import { useEffect, useRef, type RefObject } from "react";
import { act1State } from "@/lib/act1-store";
import { PHASE_BURST } from "./phases";

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Ease-out quadratic: the circle snaps out fast, then settles into full
 * coverage -- reads as an actual shockwave/burst rather than a linear
 * creep or a slow fade. */
function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t);
}

/**
 * The overlay is driven off act1State.raw, not the narrative PHASE_BURST
 * window (which is defined in damped-progress space for the scene/camera).
 * BURST_START mirrors PHASE_BURST[0] since raw and damped are still close
 * together that early -- but BURST_END is a raw-space constant with a
 * built-in safety margin (see the comment block below for why 1.0 itself
 * is not safe to target).
 */
const BURST_START = PHASE_BURST[0];
const BURST_END = 0.985;
/**
 * clip-path circle()'s percentage radius is resolved against the box's
 * diagonal reference (sqrt(w^2+h^2)/sqrt(2), per the CSS Masking spec) --
 * for a circle centered near the middle of the screen that reference puts
 * the farthest corner at roughly 70-72% at *any* aspect ratio (verified:
 * 1440x810 -> ~72.5%, 2560x1080 -> ~71.8%). 150 (as specified) is
 * comfortably past that with margin to spare for the 45%-not-50% vertical
 * center offset below.
 */
const MAX_RADIUS_PCT = 150;
const CENTER = "50% 45%";
const EXIT_FADE_MS = 300;

/**
 * THE SEAM -- covers Act1's canvas with a comic-halftone burst before the
 * scroll hands off to the DOM Act 2 sections underneath. rAF-driven only
 * (act1State.raw read every frame, written straight to element.style); no
 * setState per frame, no re-render on scroll, same discipline as the
 * title/badge overlay in act1.tsx.
 *
 * RAW, NOT DAMPED -- and why that distinction is the whole seam:
 *
 * act1.tsx sizes Act1's container at 400vh and pins its ScrollTrigger to
 * `start: "top top", end: "bottom bottom"` on that SAME container -- so
 * act1State.raw reaches 1.0 at the *exact* scroll position where the
 * container's bottom edge meets the viewport's bottom edge. That is also
 * the exact scroll position at which `position: sticky` releases the
 * pinned frame -- sticky is native CSS behaviour: it holds `top: 0` for as
 * long as the container has room below the pinned element, and lets go the
 * instant it doesn't. Both events are pinned to the same underlying
 * quantity: raw scroll position.
 *
 * act1State.progress is NOT that quantity -- it's `raw` exponentially
 * damped toward (lambda 4.5, see scene.tsx's RIG_LAMBDA) for the camera
 * rig, so it *lags* raw by design (that lag is what makes the camera feel
 * weighty instead of glued to the scrollbar). At ordinary scroll speeds
 * that lag is genuinely a few frames -- but at the exact instant raw hits
 * 1.0 and sticky lets go, a damped progress that's still mid-catch-up can
 * be meaningfully below 1.0. Driving the clip-path off progress would mean
 * the circle is still mid-expansion the moment the canvas is yanked away by
 * the unpinning frame -- a sliver of bare canvas (or the scene behind it)
 * exposed for exactly as many frames as progress was lagging. This overlay
 * is a DOM clip-path with no camera-weight reason to be damped in the first
 * place -- scroll position is its natural timeline -- so it reads
 * act1State.raw directly and sidesteps the lag entirely.
 *
 * BURST_END is 0.985, not 1.0: a small safety margin on top of the
 * raw-vs-damped fix itself, so that full coverage (MAX_RADIUS_PCT, fully
 * opaque) is reached slightly *before* raw=1.0/sticky-release rather than
 * exactly at it -- absorbing any residual rAF/ScrollTrigger sampling jitter
 * between "this component's tick() read raw" and "the browser evaluates the
 * sticky release" within the same frame. There is no scroll position past
 * raw=0.985 where the frame can unpin (and start moving with the rest of
 * the document) while the overlay is anything less than fully opaque.
 *
 * Past raw=1.0 this element (still `absolute inset-0` inside the now-
 * unstuck sticky frame) simply scrolls away as part of normal document
 * flow, fully opaque the entire way, until the frame -- and this overlay
 * with it -- has left the viewport and the Story section underneath is all
 * that's on screen. The IntersectionObserver below only fires once that's
 * confirmed: it's a defensive reset (so a scroll back up into Act 1 later
 * doesn't inherit a stale mid-transition opacity) done as a soft 300ms
 * fade instead of a hard snap, not something the seam's correctness
 * depends on.
 */
export function HalftoneBurst({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  // Flips true once the container is confirmed off-screen; once true, the
  // rAF loop stops writing clip-path/visibility so it doesn't fight the
  // CSS opacity transition applied for the exit fade.
  const exitingRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const tick = () => {
      const el = overlayRef.current;
      if (el && !exitingRef.current) {
        const p = act1State.raw;
        const t = clamp01((p - BURST_START) / (BURST_END - BURST_START));
        const radius = easeOutQuad(t) * MAX_RADIUS_PCT;
        el.style.clipPath = `circle(${radius.toFixed(2)}% at ${CENTER})`;
        el.style.visibility = t > 0.0005 ? "visible" : "hidden";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Exit/re-entry reset -- see the THE SEAM / RAW, NOT DAMPED comment above
     for why this isn't load-bearing for the seam itself. */
  useEffect(() => {
    const container = containerRef.current;
    const overlay = overlayRef.current;
    if (!container || !overlay) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        exitingRef.current = !entry.isIntersecting;
        overlay.style.transition = entry.isIntersecting ? "" : `opacity ${EXIT_FADE_MS}ms ease-out`;
        overlay.style.opacity = entry.isIntersecting ? "1" : "0";
      },
      { threshold: 0 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return (
    <div
      ref={overlayRef}
      aria-hidden
      style={{ clipPath: `circle(0% at ${CENTER})`, visibility: "hidden" }}
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden bg-[var(--red)]"
    >
      {/* Comic-page dot texture over the solid red flash core. */}
      <div className="halftone absolute inset-0" />
      {/* Dark vignette -- ink-black rim around the burst for a printed-page,
          not flat-color, read. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${CENTER}, transparent 0%, transparent 55%, rgba(0,0,0,0.65) 100%)`,
        }}
      />
    </div>
  );
}
