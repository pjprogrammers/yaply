import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#100D18]/70 border-b border-[#382D4B]/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="text-xl sm:text-2xl font-extrabold tracking-wider" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          YAP<span className="bg-gradient-to-r from-[#B69AFF] via-[#65A8FF] to-[#FF6B70] bg-clip-text text-transparent">LY</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-[#B9B0C9]">
          <Link href="/" className="hover:text-[#F7F4FC] transition">Home</Link>
          <Link href="/games" className="hover:text-[#F7F4FC] transition">Games</Link>
          <Link href="/about" className="hover:text-[#F7F4FC] transition">About</Link>
        </nav>
        <Link href="/games" className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#9B6DFF] to-[#7C3AED] hover:from-[#B69AFF] hover:to-[#8B5CF6] transition">
          Explore Games
        </Link>
      </div>
    </header>
  );
}
