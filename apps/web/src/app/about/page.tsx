import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  CHAIN_REACTION_URL,
  SKRIBBL_URL,
  SMASHKARTS_URL,
} from "@/lib/game-urls";
import { SITE_HOST } from "@/lib/site";

const chainHost = new URL(CHAIN_REACTION_URL).host;
const skribblHost = new URL(SKRIBBL_URL).host;
const smashKartsHost = new URL(SMASHKARTS_URL).host;

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <h1 className="text-3xl sm:text-5xl font-extrabold mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>About Yaply</h1>
        <p className="text-slate-300 mb-4">Yaply is a mobile-first social gaming platform. Each game is an independent app on its own subdomain, connected by a shared multiplayer backend.</p>
        <p className="text-slate-400">{chainHost} • {skribblHost} • {smashKartsHost} • {SITE_HOST}</p>
      </section>
      <Footer />
    </main>
  );
}
