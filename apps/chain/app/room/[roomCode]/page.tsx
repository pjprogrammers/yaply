import { Suspense } from "react";
import type { Metadata } from "next";
import { RoomClient } from "@/components/room-client";
import { Topbar } from "@/components/topbar";

export const metadata: Metadata = {
  title: "Room | Chain Reaction",
};

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  const clean = (roomCode ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);

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
              Opening the room…
            </div>
          </main>
        </div>
      }
    >
      <RoomClient code={clean} />
    </Suspense>
  );
}
