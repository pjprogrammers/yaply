import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <h1 className="text-3xl sm:text-5xl font-extrabold mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>About Yaply</h1>
        <p className="text-slate-300 mb-4">Yaply is a mobile-first social gaming platform. Each game is an independent app on its own subdomain, connected by a shared multiplayer backend.</p>
        <p className="text-slate-400">chain.yaply.eu.org • skribbl.yaply.eu.org • yaply.eu.org</p>
      </section>
      <Footer />
    </main>
  );
}
