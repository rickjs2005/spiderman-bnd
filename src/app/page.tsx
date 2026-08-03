import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { Act1 } from "@/components/act1/act1";
import { Scene } from "@/components/act1/scene";
import { Story } from "@/components/act2/story";
import { Threats } from "@/components/act2/threats";
import { Watch } from "@/components/act2/watch";
import { Legacy } from "@/components/act2/legacy";

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
        <Watch />
        <Legacy />
      </main>
      <Footer />
    </>
  );
}
