import Link from "next/link";
import { gameHref, games } from "@/data/games";

export function Footer() {
  return (
    <footer className="site-footer" data-chapter="black">
      <div className="shell">
        <div className="site-footer__top">
          <div>
            <h2>Yaply</h2>
          </div>

          <nav className="site-footer__nav" aria-label="Footer">
            <div className="site-footer__group">
              <span className="site-footer__label">Games</span>
              {games.map((game) => {
                const href = gameHref(game);
                return href.startsWith("/") ? (
                  <Link
                    key={game.id}
                    href={href}
                    className="site-footer__link"
                  >
                    {game.name}
                  </Link>
                ) : (
                  <a key={game.id} href={href} className="site-footer__link">
                    {game.name}
                  </a>
                );
              })}
            </div>

            <div className="site-footer__group">
              <span className="site-footer__label">Yaply</span>
              <Link href="/" className="site-footer__link">
                Home
              </Link>
              <Link href="/games" className="site-footer__link">
                All games
              </Link>
              <Link href="/about" className="site-footer__link">
                About
              </Link>
              <Link href="/#how" className="site-footer__link">
                How it works
              </Link>
              <Link href="/#faq" className="site-footer__link">
                FAQ
              </Link>
            </div>
          </nav>
        </div>

        <div className="site-footer__bottom">
          <p className="site-footer__about">
            Yaply is a browser games platform for game night. Play Chain
            Reaction and Skribbl with friends using one link or room code.
            Ludo, Who&apos;s the Spy and Smash Karts are on the way.
          </p>
          <p>
            © {new Date().getFullYear()} Yaply ·{" "}
            {games.filter((game) => game.status === "available").length} games
            live
          </p>
        </div>
      </div>
    </footer>
  );
}
