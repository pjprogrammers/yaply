import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { GameGrid } from "@/components/game-grid";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <GameGrid />
      <Footer />
    </main>
  );
}
