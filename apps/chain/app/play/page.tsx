import { Suspense } from "react";
import type { Metadata } from "next";
import { LocalGameGate } from "@/components/local-game";
import { Topbar } from "@/components/topbar";

export const metadata: Metadata = {
  title: "Play | Chain Reaction",
  description: "Play Chain Reaction locally or pass-and-play on one device.",
};

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
          <Topbar compact />
          <main className="join-gate">
            <div className="loading-card">
              <span className="dot-pulse" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              Setting the table…
            </div>
          </main>
        </div>
      }
    >
      <LocalGameGate />
    </Suspense>
  );
}
