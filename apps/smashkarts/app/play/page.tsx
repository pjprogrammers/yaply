import type { Metadata } from "next";
import { GameClient } from "@/components/game-client";

export const metadata: Metadata = {
  title: "Play — Smash Karts",
  description:
    "Pick your paint, your arena, and your bot count. Smash Karts runs entirely in your browser.",
};

export default function PlayPage() {
  return <GameClient />;
}
