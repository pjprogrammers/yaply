import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, ClockIcon, UsersIcon } from "@/components/icons";
import { MiniBoard } from "@/components/mini-board";
import { Topbar } from "@/components/topbar";

export const metadata: Metadata = {
  title: "How to play | Chain Reaction",
};

export default function HowToPlay() {
  return (
    <div className="app-shell">
      <Topbar />
      <main className="page page--narrow">
        <div className="page-head">
          <div className="page-head-copy">
            <p className="eyebrow">Chain Reaction</p>
            <h1 className="home-title">How to play</h1>
            <p className="subline">
              A turn-based board game of pressure. Every orb you place is a threat, and every
              full cell is a chain waiting to happen.
            </p>
          </div>
          <Link href="/" className="btn btn--ghost btn--sm">
            <ArrowLeftIcon size={13} />
            Home
          </Link>
        </div>

        <div className="fact-strip" style={{ marginTop: 0, marginBottom: 16 }}>
          <div className="fact">
            <p className="fact-label">Board</p>
            <p className="fact-value">6 × 9</p>
          </div>
          <div className="fact">
            <p className="fact-label">Players</p>
            <p className="fact-value">2–8</p>
          </div>
          <div className="fact">
            <p className="fact-label">Turn clock</p>
            <p className="fact-value">30–60s</p>
          </div>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">The board in one picture</h2>
              <span className="pill">Preview</span>
            </div>
            <MiniBoard />
            <p className="subline" style={{ marginTop: 12 }}>
              Blue owns the top-left corner, amber holds the middle, red is spread across the left
              and lime sits on the right. The blue corner holds two orbs — one more and it bursts.
            </p>
          </section>

          <section className="card">
            <div className="help-list">
              <div className="help-section">
                <p className="eyebrow">01</p>
                <h2>Place one orb on your turn</h2>
                <p>
                  You can place on any empty cell, or on a cell you already own. You cannot place on
                  an opponent's cell. After your move the turn passes to the next player who still
                  has a seat on the board.
                </p>
              </div>

              <div className="help-section">
                <p className="eyebrow">02</p>
                <h2>Fill a cell to its critical mass</h2>
                <p>
                  Corners pop at <strong>2</strong> orbs, edges at <strong>3</strong> and the middle
                  at <strong>4</strong>. The cell empties, keeps its owner, and sends one orb into
                  every orthogonal neighbour.
                </p>
                <div className="mass-grid" aria-hidden>
                  <span className="mass-cell">2</span>
                  <span className="mass-cell">3</span>
                  <span className="mass-cell">2</span>
                  <span className="mass-cell">3</span>
                  <span className="mass-cell mass-cell--center">4</span>
                  <span className="mass-cell">3</span>
                  <span className="mass-cell">2</span>
                  <span className="mass-cell">3</span>
                  <span className="mass-cell">2</span>
                </div>
                <p className="mass-caption">
                  This 3 × 3 model shows the same rule as the 6 × 9 board: corners 2, edges 3,
                  middle 4.
                </p>
              </div>

              <div className="help-section">
                <p className="eyebrow">03</p>
                <h2>Let the chain run</h2>
                <p>
                  Every orb that lands in a neighbour can push that cell over its own critical mass.
                  The cascade keeps resolving until the board settles. Any opponent orbs caught in
                  the wave flip to the colour of the player who started it.
                </p>
                <p>
                  If a player loses every orb they owned, they are eliminated. The last player with
                  orbs on the board wins. A turn that runs out auto-plays a legal cell, preferring
                  one of your own cells that is one orb from popping.
                </p>
              </div>

              <div className="help-section">
                <p className="eyebrow">04</p>
                <h2>Score, surrender, rematch</h2>
                <p>
                  Your score is the number of orbs you own on the board, recalculated after every
                  move. You can surrender from the room panel; your orbs leave the board and the
                  turn passes on. The host can start a rematch from the final score screen.
                </p>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Room controls</h2>
              <span className="pill">Host</span>
            </div>
            <div className="legend-row">
              <span className="pill">
                <UsersIcon size={11} /> 2–8 players
              </span>
              <span className="pill">
                <ClockIcon size={11} /> 30–60s turns
              </span>
            </div>
            <p className="subline" style={{ marginTop: 10 }}>
              The host sets the room size and turn clock in the lobby. Settings lock when the game
              starts and reopen before a rematch.
            </p>
            <div className="form-actions">
              <Link href="/" className="btn btn--primary">
                Create a room
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
