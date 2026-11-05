"use client";

import type { FeedEntry } from "@/game/types";
import { WeaponGlyph } from "./weapon-glyph";

interface MatchFeedProps {
  entries: FeedEntry[];
  /** Current match time in seconds, used to expire old notifications. */
  now: number;
}

const FEED_LIFETIME = 5;
const FEED_LIMIT = 3;

/**
 * Short, top-centre kill notifications. The full six-entry feed remains in
 * the menu; this keeps only the three newest rows and drops them after a few
 * seconds so old kills do not sit over the arena.
 */
export function MatchFeed({ entries, now }: MatchFeedProps) {
  const visible = entries
    .filter((entry) => entry.at === undefined || now - entry.at < FEED_LIFETIME)
    .slice(0, FEED_LIMIT);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="hud-kill-feed" role="log" aria-live="polite" aria-relevant="additions">
      {visible.map((entry) => (
        <div key={entry.id} className="hud-kill-feed-row">
          <span className="hud-kill-feed-killer">{entry.killer}</span>
          <WeaponGlyph weapon={entry.weapon} className="hud-kill-feed-glyph" />
          {entry.self ? (
            <span className="hud-kill-feed-victim">self-destructed</span>
          ) : (
            <span className="hud-kill-feed-victim">{entry.victim}</span>
          )}
        </div>
      ))}
    </div>
  );
}
