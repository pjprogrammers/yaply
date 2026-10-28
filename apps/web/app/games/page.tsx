import { Navbar } from "@/components/navbar";
import { GameGrid } from "@/components/game-grid";
import { Footer } from "@/components/footer";

export default function GamesPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        <h1 className="text-3xl sm:text-5xl font-extrabold mb-3" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>All Games</h1>
        <p className="text-slate-400">Browse Yaply games. Available games open in their own subdomain.</p>
      </section>
      <GameGrid />
      <Footer />
    </main>
  );
}
