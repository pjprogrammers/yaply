import { Suspense } from "react";
import type { Metadata } from "next";
import { LocalGameGate } from "@/components/local-game";
import { Topbar } from "@/components/topbar";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: { absolute: "Play Chain Reaction on one device | Yaply" },
  description:
    "Play Chain Reaction locally or pass-and-play on one device. Set the table, choose the board and start a match without a room code.",
  alternates: { canonical: `${SITE_URL}/play` },
  robots: { index: false, follow: true },
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
