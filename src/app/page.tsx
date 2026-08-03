import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { Act1 } from "@/components/act1/act1";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Act1>
          <div className="absolute inset-0 grid place-items-center text-[var(--paper)]/40">
            ACT 1 SCENE
          </div>
        </Act1>
        <section id="story" className="h-screen grid place-items-center">
          STORY
        </section>
        <section id="threats" className="h-screen grid place-items-center">
          THREATS
        </section>
        <section id="watch" className="h-screen grid place-items-center">
          WATCH
        </section>
        <section id="legacy" className="h-screen grid place-items-center">
          LEGACY
        </section>
      </main>
      <Footer />
    </>
  );
}
