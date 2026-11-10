import { Suspense } from "react";
import type { Metadata } from "next";
import { RoomClient } from "@/components/room-client";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: { absolute: "Online room | Hole.io" },
  description:
    "Join a Hole.io room, invite friends, and fill the empty seats with bots for a two-minute city-eating match.",
  alternates: { canonical: `${SITE_URL}/play` },
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
        <div className="room-shell">
          <main className="room-gate margins">
            <div className="room-card room-gate-card">
              <span className="room-loader" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <p className="room-lede">Opening the room…</p>
            </div>
          </main>
        </div>
      }
    >
      <RoomClient code={clean} />
    </Suspense>
  );
}
