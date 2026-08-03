import { SITE } from "@/lib/content";

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-transparent">
      <span className="font-[family-name:var(--font-anton)] text-lg tracking-wide">
        BRAND NEW DAY
      </span>
      <span className="text-[10px] tracking-widest opacity-70">{SITE.badge}</span>
    </nav>
  );
}
