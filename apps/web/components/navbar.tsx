"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Chapter = "blue" | "black" | "yellow" | "pink";

const chapters: Chapter[] = ["blue", "black", "yellow", "pink"];

function toChapter(value: string | undefined): Chapter | null {
  return chapters.includes(value as Chapter) ? (value as Chapter) : null;
}

export function Navbar({
  initialChapter,
}: {
  initialChapter?: Chapter;
} = {}) {
  const pathname = usePathname();
  const [chapter, setChapter] = useState<Chapter>(
    initialChapter ?? (pathname === "/" ? "blue" : "black"),
  );

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-chapter]"),
    );

    if (!sections.length) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const line = window.scrollY + 72;
      let next: Chapter = "blue";

      for (const section of sections) {
        const top = section.getBoundingClientRect().top + window.scrollY;
        if (top <= line) {
          next = toChapter(section.dataset.chapter) ?? next;
        }
      }

      setChapter(next);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  return (
    <header className={`site-header site-header--${chapter}`}>
      <div className="shell site-header__inner">
        <Link href="/" className="site-header__brand" aria-label="Yaply home">
          <span className="site-header__mark" aria-hidden="true" />
          <span>Yaply</span>
        </Link>

        <nav className="site-header__nav" aria-label="Primary">
          <Link href="/games" className="site-header__link">
            Games
          </Link>
          <Link href="/#how" className="site-header__link">
            How it works
          </Link>
          <Link href="/#faq" className="site-header__link">
            FAQ
          </Link>
          <Link href="/about" className="site-header__link">
            About
          </Link>
        </nav>

        <Link href="/#play" className="site-header__action">
          Play now
        </Link>
      </div>
    </header>
  );
}
