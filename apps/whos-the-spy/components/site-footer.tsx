import Link from "next/link";
import { MAIN_URL } from "@/lib/config";
import { SpyMark } from "./icons";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <SpyMark size={34} />
          <p>
            Who&apos;s the Spy
            <span> A Yaply party game for people who listen too closely.</span>
          </p>
        </div>
        <div className="footer-links">
          <Link href="/how-to-play">How to play</Link>
          <Link href="/create">Start a room</Link>
          <Link href="/install">Install</Link>
          <a href={MAIN_URL}>All Yaply games</a>
        </div>
        <p className="footer-note">
          No accounts. No downloads. Words stay on the server.
        </p>
      </div>
    </footer>
  );
}
