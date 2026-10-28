import Link from "next/link";

export default function HowToPlay() {
  return (
    <main className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-8">
        <Link href="/" className="text-xl font-extrabold">CHAIN REACTION</Link>
        <Link href="/" className="text-slate-400 hover:text-white">Back</Link>
      </header>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">How to Play</h1>
        <p className="text-slate-400">Add orbs to cells. When a cell reaches its critical mass, it explodes and spreads to adjacent cells, triggering chain reactions.</p>
      </div>
    </main>
  );
}
