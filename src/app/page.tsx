import Nav from "@/components/nav";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <section id="act1" className="h-screen grid place-items-center">
          ACT 1
        </section>
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
