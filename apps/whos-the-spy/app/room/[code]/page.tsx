import { Suspense } from "react";
import type { Metadata } from "next";
import { RoomClient } from "@/components/room-client";
import { SpyMark } from "@/components/icons";

export const metadata: Metadata = {
  title: "Room | Who's the Spy",
  description: "Your private role, the clue order and the table chat.",
  robots: { index: false, follow: false },
};

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const clean = (code ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);

  return (
    <Suspense
      fallback={
        <div className="room-app">
          <header className="room-bar">
            <span className="room-brand">
              <SpyMark size={30} />
              <span>
                Yaply <em>Spy</em>
              </span>
            </span>
          </header>
          <main className="room-loading">
            <div className="loading-card">Opening the case file…</div>
          </main>
        </div>
      }
    >
      <RoomClient code={clean} />
    </Suspense>
  );
}
