import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#382D4B]/80 mt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#898097]">
        <div className="flex items-center gap-3">
          <span className="font-extrabold tracking-wider text-[#F7F4FC]">YAPLY</span>
          <span>© {new Date().getFullYear()} Yaply. Premium dark + playful gaming.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-[#F7F4FC] transition">Home</Link>
          <Link href="/games" className="hover:text-[#F7F4FC] transition">Games</Link>
          <Link href="/about" className="hover:text-[#F7F4FC] transition">About</Link>
        </div>
      </div>
    </footer>
  );
}
