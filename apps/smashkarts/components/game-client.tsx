"use client";

import dynamic from "next/dynamic";

const GameScreen = dynamic(
  () => import("./game-screen").then((module) => module.GameScreen),
  {
    ssr: false,
    loading: () => (
      <div className="game-screen flex items-center justify-center">
        <div className="text-center">
          <p className="display text-4xl">Kart Riot</p>
          <p className="mt-2 text-sm text-ash">Opening the garage…</p>
        </div>
      </div>
    ),
  },
);

export function GameClient() {
  return <GameScreen />;
}
