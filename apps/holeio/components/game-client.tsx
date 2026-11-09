"use client";

import dynamic from "next/dynamic";

const GameScreen = dynamic(
  () => import("./game-screen").then((module) => module.GameScreen),
  {
    ssr: false,
    loading: () => (
      <div className="game-screen game-screen--loading">
        <div className="game-loading">
          <span className="game-loading__hole" aria-hidden />
          <p className="game-loading__word">Hole.io</p>
          <p className="game-loading__hint">Digging the street…</p>
        </div>
      </div>
    ),
  },
);

export function GameClient() {
  return <GameScreen />;
}
