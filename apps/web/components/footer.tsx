import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/70 mt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-extrabold tracking-wider text-slate-300">YAPLY</span>
          <span>© {new Date().getFullYear()} Yaply</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <Link href="/games" className="hover:text-white transition">Games</Link>
          <Link href="/about" className="hover:text-white transition">About</Link>
        </div>
      </div>
    </footer>
  );
}
