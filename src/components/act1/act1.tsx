"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { act1State, act1Flags, damp } from "@/lib/act1-store";
import { SITE } from "@/lib/content";
import { MEDIA } from "@/lib/media";

gsap.registerPlugin(ScrollTrigger);

/** Act 1 container height, in viewport heights, driving the scroll-scrub. */
const ACT1_VH = 400;

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Act 1: a ~4-screen-tall container; inside it, a sticky 100vh frame holds
 * the scene (R3F canvas mounts here as `children` in Task 4) plus a title
 * overlay that fades out as the scene takes over. The overlay reads
 * act1State.progress via rAF and writes straight to element.style -- no
 * setState per frame, no re-render on scroll.
 */
export function Act1({ children }: { children?: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  // null = still deciding (SSR/first paint); avoids a flash of the fallback
  const [mode, setMode] = useState<"scene" | "static" | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(reduce ? "static" : "scene");
  }, []);

  useEffect(() => {
    if (mode !== "scene" || !containerRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        act1State.raw = self.progress;
      },
    });

    return () => {
      trigger.kill();
    };
  }, [mode]);

  /**
   * Temporary damp-propagation loop: raw -> progress, at a fixed lambda.
   * This belongs to the R3F scene's useFrame from Task 4 onward -- but the
   * overlay and the capture script need `progress` to move NOW, before the
   * canvas mounts. act1Flags.sceneOwnsProgress lets the scene take over the
   * write without a race: once the scene's own useFrame starts damping,
   * it flips the flag and this loop stops touching `progress` (still safe
   * to run, it just becomes a no-op for that field).
   */
  useEffect(() => {
    if (mode !== "scene") return;
    let current = act1State.progress;
    let rafId = 0;
    let lastT = performance.now();
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;

      if (act1Flags.sceneOwnsProgress) return;

      current = damp(current, act1State.raw, 9, dt);
      act1State.progress = current;
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mode]);

  /* Title/badge overlay reads act1State.progress every frame and writes
     directly to the DOM -- same no-setState-per-frame rule as the damp
     loop above. Visible at the top of the scroll, fades out early so the
     scene reads clearly for the rest of Act 1. */
  useEffect(() => {
    if (mode !== "scene") return;
    let raf = 0;
    const tick = () => {
      if (titleRef.current) {
        const p = act1State.progress;
        const alpha = 1 - clamp01((p - 0.02) / 0.13);
        titleRef.current.style.opacity = alpha.toFixed(3);
        titleRef.current.style.visibility = alpha > 0.002 ? "visible" : "hidden";
        titleRef.current.style.transform = `translateY(${(-(1 - alpha) * 24).toFixed(1)}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  function skipIntro() {
    const el = containerRef.current;
    if (!el) return;
    const targetY = el.getBoundingClientRect().bottom + window.scrollY - 84;
    const lenis = window.__lenis;
    if (lenis) {
      lenis.scrollTo(targetY, { duration: 1.3, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
    } else {
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }
  }

  if (mode === "static") return <StaticHero />;

  return (
    <section
      id="act1"
      ref={containerRef}
      aria-label="Act 1"
      style={{ height: `${ACT1_VH}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen overflow-hidden bg-[var(--ink)]">
        {mode === "scene" && children}

        <div
          ref={titleRef}
          className="pointer-events-none absolute inset-x-0 top-[38vh] z-10 flex flex-col items-center px-6 text-center"
        >
          <h1 className="font-[family-name:var(--font-anton)] text-4xl tracking-wide text-[var(--paper)] drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] sm:text-6xl">
            {SITE.title}
          </h1>
          <p className="mt-4 text-[10px] font-semibold tracking-[0.3em] text-[var(--paper)]/70 sm:text-xs">
            {SITE.badge}
          </p>
        </div>

        {mode === "scene" && (
          <button
            type="button"
            onClick={skipIntro}
            className="pointer-events-auto absolute bottom-6 right-5 z-20 rounded-full border border-[var(--paper)]/25 bg-[var(--ink)]/40 px-4 py-2 text-xs font-semibold text-[var(--paper)]/85 backdrop-blur-sm transition-colors hover:border-[var(--paper)]/50 hover:bg-[var(--ink)]/60 sm:right-8"
          >
            Skip intro
          </button>
        )}
      </div>
    </section>
  );
}

/** prefers-reduced-motion fallback: static hero, same message, no scroll-scrub. */
function StaticHero() {
  return (
    <section
      id="act1"
      aria-label="Act 1"
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[var(--ink)] px-6 text-center"
    >
      <Image
        src={MEDIA.poster}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-70"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[var(--ink)]/20 via-[var(--ink)]/40 to-[var(--ink)]"
      />
      <div className="relative">
        <h1 className="font-[family-name:var(--font-anton)] text-4xl tracking-wide text-[var(--paper)] sm:text-6xl">
          {SITE.title}
        </h1>
        <p className="mt-4 text-[10px] font-semibold tracking-[0.3em] text-[var(--paper)]/70 sm:text-xs">
          {SITE.badge}
        </p>
      </div>
    </section>
  );
}
