import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { Act1 } from "@/components/act1/act1";
import { Scene } from "@/components/act1/scene";
import { Story } from "@/components/act2/story";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Act1>
          <Scene />
        </Act1>
        <Story />
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
