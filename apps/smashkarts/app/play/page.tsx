import type { Metadata } from "next";
import { GameClient } from "@/components/game-client";

export const metadata: Metadata = {
  title: "Play — Kart Riot",
  description:
    "Pick your paint, your arena, and your bot count. Kart Riot runs entirely in your browser.",
};

export default function PlayPage() {
  return <GameClient />;
}
