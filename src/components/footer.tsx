import { SITE, FINALE } from "@/lib/content";

export default function Footer() {
  return (
    <footer className="px-6 py-10 text-sm opacity-80 flex flex-col gap-2 items-center text-center">
      <p>{SITE.disclaimer}</p>
      <p>{FINALE.credits}</p>
      <a
        href="https://www.marvel.com/movies/spider-man-brand-new-day"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:opacity-100"
      >
        Official movie site
      </a>
    </footer>
  );
}
