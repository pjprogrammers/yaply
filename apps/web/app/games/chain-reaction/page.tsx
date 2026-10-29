import type { Metadata } from "next";
import { GamePage } from "@/components/game-page";
import { games } from "@/data/games";
import { gameMetadata } from "@/lib/game-metadata";

const game = games.find((entry) => entry.slug === "chain-reaction")!;

export const metadata: Metadata = gameMetadata(game);

export default function Page() {
  return <GamePage game={game} />;
}
