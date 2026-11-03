import { Suspense } from "react";
import type { Metadata } from "next";
import { RoomClient } from "@/components/room-client";

export const metadata: Metadata = {
  title: "Room | Smash Karts",
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
        <div className="room-shell">
          <main className="room-gate margins">
            <div className="room-card room-gate-card">
              <span className="room-loader" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <p className="room-lede mt-4">Opening the room…</p>
            </div>
          </main>
        </div>
      }
    >
      <RoomClient code={clean} />
    </Suspense>
  );
}
