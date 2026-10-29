"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { gameHref, type GameEntry } from "@/data/games";

type Props = {
  game: GameEntry;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  children: ReactNode;
};

export default function GameLink({
  game,
  className,
  style,
  ariaLabel,
  children,
}: Props) {
  const href = gameHref(game);
  const shared = {
    className,
    style,
    "aria-label": ariaLabel,
  };

  if (href.startsWith("/")) {
    return (
      <Link href={href} {...shared}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} {...shared}>
      {children}
    </a>
  );
}
