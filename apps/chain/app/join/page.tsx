import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import { JoinForm } from "@/components/join-form";
import { Topbar } from "@/components/topbar";

export default function JoinPage() {
  return (
    <div className="app-shell">
      <Topbar />
      <main className="page page--narrow">
        <div className="page-head">
          <div className="page-head-copy">
            <p className="eyebrow">Chain Reaction</p>
            <h1 className="home-title">Join a Chain Reaction room.</h1>
            <p className="subline">
              Six characters and a nickname. Ask the host for the code if you do not have it yet.
            </p>
          </div>
          <Link href="/" className="btn btn--ghost btn--sm">
            <ArrowLeftIcon size={13} />
            Home
          </Link>
        </div>

        <div className="lobby-grid">
          <section className="card">
            <Suspense fallback={<p className="subline">Opening the join form…</p>}>
              <JoinForm />
            </Suspense>
          </section>

          <aside className="rail">
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">What you need</h2>
                <span className="pill">2 min</span>
              </div>
              <div className="help-list" style={{ gap: 12 }}>
                <div>
                  <p className="setting-value">A six-character code</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    The host can send the code or the full room link. Both land you at the same
                    table.
                  </p>
                </div>
                <div>
                  <p className="setting-value">A nickname</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    This is what the table and scoreboard show. It stays saved in this browser for
                    next time.
                  </p>
                </div>
                <div>
                  <p className="setting-value">Nothing else</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    No account, no install and no download. You join straight into the room lobby.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
