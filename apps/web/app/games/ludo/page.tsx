import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen p-4 sm:p-6">
      <header className="flex items-center justify-between mb-8">
        <Link href="/" className="text-xl sm:text-2xl font-extrabold tracking-wider" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          YAP<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">LY</span>
        </Link>
        <Link href="/" className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm hover:bg-slate-700/50 transition">
          Back to Home
        </Link>
      </header>
      <section className="max-w-2xl mx-auto text-center py-10 sm:py-16">
        <div className="inline-block px-4 py-1 rounded-full text-xs uppercase tracking-widest mb-6 bg-slate-800/60 border border-slate-700/50">
          Coming Soon
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Ludo</h1>
        <p className="text-lg sm:text-xl text-slate-300 mb-6">Roll the dice. Race your friends to victory.</p>
        <p className="text-slate-400 max-w-md mx-auto mb-10">A familiar board game with a social twist.</p>
        <div className="inline-flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
          <p className="text-sm text-slate-300">In development — this game is not yet playable.</p>
          <p className="text-xs text-slate-500">We're building it with the same polished, mobile-first experience.</p>
        </div>
      </section>
    </main>
  );
}
