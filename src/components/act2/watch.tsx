"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GALLERY_CAPTIONS, WATCH } from "@/lib/content";
import { MEDIA, TRAILER_YT_ID } from "@/lib/media";

gsap.registerPlugin(ScrollTrigger);

/** Max hover-parallax offset, in px, in either axis (brief: "±6px"). */
const PARALLAX_RANGE = 12;
const HOVER_SCALE = 1.06;

/** Fallback for any gallery image beyond GALLERY_CAPTIONS' length -- keeps
 * every <Image alt> meaningful even if the two arrays (MEDIA.gallery,
 * GALLERY_CAPTIONS) ever drift apart again. */
const CAPTION_FALLBACK = "Concept still — Brand New Day.";

/**
 * Act 2, "Watch": a click-to-load trailer facade (poster + play button in a
 * cinematic letterboxed/vignetted frame -- the youtube-nocookie iframe is
 * only ever mounted after a click, so zero request to any youtube.com/
 * ytimg.com host happens on page load, per the project's performance +
 * privacy rule) followed by a 3x2 stills gallery with a light cursor
 * parallax on hover.
 *
 * Mirrors story.tsx/threats.tsx's mode-state pattern for
 * prefers-reduced-motion, but -- like threats.tsx's Wildcards -- there's no
 * separate static render tree: the scroll entrance (opacity/y set + reveal)
 * is only ever wired up inside the "motion" branch of the effect below, so
 * skipping it under reduced-motion just leaves every element at its default,
 * fully-visible state. The same `mode` flag gates the hover-parallax
 * handlers so reduced-motion also gets no pointer-driven movement.
 */
export function Watch() {
  const sectionRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"motion" | "reduced" | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(reduce ? "reduced" : "motion");
  }, []);

  useEffect(() => {
    if (mode !== "motion") return;
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const targets = gsap.utils.toArray<HTMLElement>(".watch-fade", section);
      gsap.set(targets, { opacity: 0, y: 28 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: section,
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });
    }, section);

    return () => ctx.revert();
  }, [mode]);

  return (
    <section
      id="watch"
      ref={sectionRef}
      aria-label="Watch"
      className="relative bg-[var(--ink)] px-6 py-20 text-[var(--paper)] sm:px-10"
    >
      <div className="mx-auto max-w-5xl">
        <div className="watch-fade">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--red)]">
            {WATCH.eyebrow}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-anton)] text-4xl uppercase leading-[0.9] tracking-tight sm:text-6xl">
            {WATCH.trailerHeading}
          </h2>
        </div>

        <div className="watch-fade mt-8">
          <TrailerFacade playing={playing} onPlay={() => setPlaying(true)} />
        </div>

        <h3 className="watch-fade mt-16 font-[family-name:var(--font-anton)] text-2xl uppercase tracking-tight sm:text-3xl">
          {WATCH.galleryHeading}
        </h3>
        <Gallery interactive={mode === "motion"} />
      </div>
    </section>
  );
}

function TrailerFacade({ playing, onPlay }: { playing: boolean; onPlay: () => void }) {
  return (
    <div className="relative mx-auto aspect-video w-full overflow-hidden bg-black">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${TRAILER_YT_ID}?autoplay=1`}
          title="Official trailer"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <>
          <Image
            src={MEDIA.poster}
            alt=""
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover object-[50%_22%]"
            priority={false}
          />
          {/* Letterbox bars -- carve the 16:9 frame down to a widescreen
              cinematic band, matching the "trailer" framing even though the
              source poster is a portrait crop. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[11%] bg-black" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[11%] bg-black" />
          {/* Vignette */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)",
            }}
          />
          <button
            type="button"
            aria-label={WATCH.playLabel}
            onClick={onPlay}
            className="group absolute inset-0 flex items-center justify-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--paper)] bg-[var(--red)]/90 transition-transform duration-200 ease-out group-hover:scale-110 sm:h-20 sm:w-20">
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="ml-1 h-6 w-6 fill-[var(--paper)] sm:h-7 sm:w-7"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        </>
      )}
    </div>
  );
}

function Gallery({ interactive }: { interactive: boolean }) {
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ el: HTMLDivElement; tx: number; ty: number; scale: number } | null>(
    null,
  );

  const flush = () => {
    rafRef.current = null;
    const pending = pendingRef.current;
    if (!pending) return;
    pending.el.style.transform = `translate3d(${pending.tx}px, ${pending.ty}px, 0) scale(${pending.scale})`;
  };

  const schedule = (el: HTMLDivElement, tx: number, ty: number, scale: number) => {
    pendingRef.current = { el, tx, ty, scale };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flush);
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      {MEDIA.gallery.map((src, i) => {
        const caption = GALLERY_CAPTIONS[i] ?? CAPTION_FALLBACK;
        return (
          <div
            key={src}
            className="watch-fade relative aspect-[4/3] overflow-hidden bg-[var(--ink)]"
            onMouseMove={(e) => {
              if (!interactive) return;
              const el = mediaRefs.current[i];
              if (!el) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = (e.clientX - rect.left) / rect.width - 0.5;
              const relY = (e.clientY - rect.top) / rect.height - 0.5;
              schedule(el, relX * PARALLAX_RANGE, relY * PARALLAX_RANGE, HOVER_SCALE);
            }}
            onMouseLeave={() => {
              if (!interactive) return;
              const el = mediaRefs.current[i];
              if (!el) return;
              schedule(el, 0, 0, 1);
            }}
          >
            <div
              ref={(el) => {
                mediaRefs.current[i] = el;
              }}
              className="absolute inset-0 will-change-transform transition-transform duration-200 ease-out"
            >
              <Image
                src={src}
                alt={caption}
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
