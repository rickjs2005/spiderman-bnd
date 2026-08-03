import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { Act1 } from "@/components/act1/act1";
import { Scene } from "@/components/act1/scene";
import { Story } from "@/components/act2/story";
import { Threats } from "@/components/act2/threats";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Act1>
          <Scene />
        </Act1>
        <Story />
        <Threats />
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
