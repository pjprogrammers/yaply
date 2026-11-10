"use client";

import { useState } from "react";
import { ArrowRightIcon, EyeIcon, RefreshIcon } from "./icons";

type DemoCard = {
  category: string;
  civilian: string;
  spy: string;
};

const CARDS: DemoCard[] = [
  { category: "Food & Drinks", civilian: "Cappuccino", spy: "Latte" },
  { category: "Places & Buildings", civilian: "Beach", spy: "Swimming pool" },
  { category: "Food & Drinks", civilian: "Pizza", spy: "Burger" },
  { category: "Animals", civilian: "Dog", spy: "Elephant" },
  { category: "Food & Drinks", civilian: "Coffee", spy: "Tea" },
  { category: "Nature", civilian: "Ocean", spy: "Lake" },
  { category: "Sports", civilian: "Football", spy: "Basketball" },
  { category: "Movies & Entertainment", civilian: "Cinema", spy: "Theatre" },
  { category: "Vehicles & Transport", civilian: "Bicycle", spy: "Motorcycle" },
];

export function DossierDemo() {
  const [revealed, setRevealed] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [isSpy, setIsSpy] = useState(false);

  const card = CARDS[cardIndex] ?? CARDS[0]!;
  const word = isSpy ? card.spy : card.civilian;

  const deal = () => {
    if (!revealed) {
      setRevealed(true);
      return;
    }
    const next = Math.floor(Math.random() * CARDS.length);
    setCardIndex(next === cardIndex ? (next + 1) % CARDS.length : next);
    setIsSpy(Math.random() < 0.4);
  };

  return (
    <div className="dossier" aria-live="polite">
      <div className="dossier-tab">
        <span>Yaply case file</span>
        <span>No. 0042</span>
      </div>
      <div className="dossier-paper">
        <div className="dossier-head">
          <p>Who&apos;s the Spy</p>
          <span className="dossier-stamp">Top secret</span>
        </div>

        <p className="dossier-label">The word in your envelope</p>
        <div className={`dossier-word${revealed ? " is-revealed" : ""}`}>
          {revealed ? (
            <span>{word}</span>
          ) : (
            <span className="dossier-redaction" aria-label="Hidden word">
              <i />
              <i />
              <i />
            </span>
          )}
        </div>

        <div className="dossier-meta">
          <p>
            <span>Category</span>
            {card.category}
          </p>
          <p>
            <span>Your role</span>
            {revealed ? (
              <strong className={isSpy ? "role-spy" : "role-civilian"}>
                {isSpy ? "Spy" : "Civilian"}
              </strong>
            ) : (
              <span className="dossier-sealed">Sealed</span>
            )}
          </p>
        </div>

        <button className="dossier-action" type="button" onClick={deal}>
          {revealed ? (
            <>
              <RefreshIcon size={16} />
              Deal another card
            </>
          ) : (
            <>
              <EyeIcon size={17} />
              Open my card
            </>
          )}
        </button>

        <p className="dossier-note">
          Only you would see this card. Everyone else is holding their own —
          including the spy, whose word is different.
        </p>

        <a className="dossier-link" href="#how">
          See how a round runs
          <ArrowRightIcon size={14} />
        </a>
      </div>
    </div>
  );
}
