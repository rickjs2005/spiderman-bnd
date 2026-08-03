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

const [BURST_START, BURST_END] = PHASE_BURST;
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
 * (act1State.progress read every frame, written straight to
 * element.style); no setState per frame, no re-render on scroll, same
 * discipline as the title/badge overlay in act1.tsx.
 *
 * TIMING INVARIANT -- why this can never expose a canvas edge or a
 * dead-zone gap between the canvas and the DOM below it:
 *
 * act1.tsx sizes Act1's container at 400vh and pins its ScrollTrigger to
 * `start: "top top", end: "bottom bottom"` on that SAME container -- so
 * act1State.raw (and, damped, act1State.progress) reaches 1.0 at the
 * *exact* scroll position where the container's bottom edge meets the
 * viewport's bottom edge. That is also the exact scroll position at which
 * `position: sticky` releases the pinned frame -- sticky is native CSS
 * behaviour: it holds `top: 0` for as long as the container has room below
 * the pinned element, and lets go the instant it doesn't. PHASE_BURST is
 * [0.95, 1], so this overlay's clip-path circle finishes expanding to
 * MAX_RADIUS_PCT (fully opaque, covering the entire sticky frame -- canvas
 * included) at that very same instant. There is no scroll position where
 * the frame is unpinned (and so starts moving with the rest of the
 * document, per sticky's "glued to the container's trailing edge" behavior
 * once released) while the overlay is anything less than fully opaque --
 * both events are defined by the same p=1.0. The overlay doesn't race the
 * handoff; it *is* the handoff.
 *
 * Past that point this element (still `absolute inset-0` inside the now-
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
        const p = act1State.progress;
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

  /* Exit/re-entry reset -- see the TIMING INVARIANT comment above for why
     this isn't load-bearing for the seam itself. */
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
