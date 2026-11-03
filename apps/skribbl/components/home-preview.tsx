"use client";

import { useState } from "react";
import { ClockIcon, RefreshIcon, CheckIcon } from "./icons";
import { CatDoodle, FishDoodle, RocketDoodle } from "./doodle";
import { WordMask } from "./word-mask";

const PREVIEWS = [
  {
    word: "cat",
    mask: "_a_",
    drawing: CatDoodle,
    guess: "is it a cat?",
    alternateGuess: "a very round cat?",
    points: 94,
  },
  {
    word: "rocket",
    mask: "_o____",
    drawing: RocketDoodle,
    guess: "is that a rocket?",
    alternateGuess: "a very fast pencil?",
    points: 87,
  },
  {
    word: "fish",
    mask: "_i__",
    drawing: FishDoodle,
    guess: "is it a fish?",
    alternateGuess: "a sad potato?",
    points: 91,
  },
] as const;

export function HomePreview() {
  const [index, setIndex] = useState(0);
  const preview = PREVIEWS[index];
  const Doodle = preview.drawing;

  return (
    <div className="landing-preview" aria-label="Preview of a Skribbl round">
      <div className="landing-preview-sheet">
        <span className="landing-tape landing-tape--left" aria-hidden="true" />
        <span className="landing-tape landing-tape--right" aria-hidden="true" />
        <div className="landing-preview-head">
          <span className="landing-live">
            <i aria-hidden="true" />
            Room PEN123
          </span>
          <span className="landing-preview-timer">
            <ClockIcon size={12} />
            0:42
          </span>
        </div>

        <div className="landing-paper-word">
          <span className="landing-paper-caption">Mara is drawing</span>
          <WordMask maskedWord={preview.mask} className="landing-wordmask" />
        </div>

        <div className="landing-doodle-stage">
          <Doodle />
        </div>

        <div className="landing-guess-feed">
          <p>
            <b>Jules</b> {preview.guess}
          </p>
          <p>
            <b>Niko</b> {preview.alternateGuess}
          </p>
          <p className="landing-correct">
            <CheckIcon size={12} />
            Ari guessed it <b>+{preview.points}</b>
          </p>
        </div>

        <div className="landing-preview-foot">
          <div className="landing-preview-players">
            <span className="landing-preview-chip">
              <i style={{ background: "#4cb3f0" }} aria-hidden="true" />
              Mara
            </span>
            <span className="landing-preview-chip">
              <i style={{ background: "#f2b33d" }} aria-hidden="true" />
              Jules
            </span>
            <span className="landing-preview-chip">
              <i style={{ background: "#e5484d" }} aria-hidden="true" />
              Niko
            </span>
            <span className="landing-preview-chip">
              <i style={{ background: "#c6f24e" }} aria-hidden="true" />
              Ari
            </span>
          </div>
          <button
            className="landing-reroll"
            type="button"
            onClick={() => setIndex((current) => (current + 1) % PREVIEWS.length)}
          >
            <RefreshIcon size={13} />
            Another word
          </button>
        </div>
      </div>
      <p className="landing-sr-only" aria-live="polite">
        Now previewing the word {preview.word}.
      </p>
    </div>
  );
}
