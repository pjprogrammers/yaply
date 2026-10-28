import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/60 border-b border-slate-800/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="text-xl sm:text-2xl font-extrabold tracking-wider" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          YAP<span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-rose-400 bg-clip-text text-transparent">LY</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <Link href="/games" className="hover:text-white transition">Games</Link>
          <Link href="/about" className="hover:text-white transition">About</Link>
        </nav>
      </div>
    </header>
  );
}
