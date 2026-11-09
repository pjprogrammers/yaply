"use client";

import { useState } from "react";

interface Stage {
  id: string;
  number: string;
  title: string;
  body: string;
  stat: string;
  note: string;
  image: string;
  alt: string;
}

const STAGES: Stage[] = [
  {
    id: "drop",
    number: "01",
    title: "Drop in",
    body: "You start as a pothole with an appetite. The city is already awake: traffic moving, pedestrians crossing, seven other holes taking their first bites.",
    stat: "3.2 s",
    note: "Countdown, then the street is yours.",
    image: "/media/game-hero.png",
    alt: "A hole on a city street at the start of a match",
  },
  {
    id: "feed",
    number: "02",
    title: "Feed",
    body: "Anything smaller than your rim goes down. Start with bins and bollards, graduate to cars and trees, then take the corner buildings whole.",
    stat: "1.1 m",
    note: "Starting rim. It grows with every swallow.",
    image: "/media/game-street.png",
    alt: "A hole swallowing street objects in the city",
  },
  {
    id: "hunt",
    number: "03",
    title: "Hunt",
    body: "Rival holes are food too. Circle a smaller one, or get out of the way when a bigger one leans in. The leaderboard moves every second.",
    stat: "8 holes",
    note: "One city, seven rivals, no teams.",
    image: "/media/game-swallow.png",
    alt: "Two rival holes close together on a street",
  },
  {
    id: "top",
    number: "04",
    title: "Top the table",
    body: "Two minutes later the city is a rumour and the table is final. Your best score is kept in this browser so the next run has a number to beat.",
    stat: "2:00",
    note: "Then play again, slightly hungrier.",
    image: "/media/game-results-tall.png",
    alt: "The final leaderboard after a match",
  },
];

export function HowAccordion() {
  const [open, setOpen] = useState(0);

  return (
    <div className="how-row" data-open={open}>
      {STAGES.map((stage, index) => {
        const isOpen = index === open;
        return (
          <button
            key={stage.id}
            type="button"
            className={`how-panel how-panel--${index} ${isOpen ? "is-open" : ""}`}
            onClick={() => setOpen(index)}
            aria-expanded={isOpen}
            aria-controls={`how-panel-${stage.id}`}
          >
            <span className="how-panel__number">{stage.number}</span>
            <span className="how-panel__title">{stage.title}</span>
            <span className="how-panel__sliver" aria-hidden>
              {stage.title}
            </span>
            <img
              className="how-panel__media"
              src={stage.image}
              alt={stage.alt}
              loading="lazy"
            />
            <span className="how-panel__body" id={`how-panel-${stage.id}`}>
              <span className="how-panel__copy">{stage.body}</span>
              <span className="how-panel__stat">{stage.stat}</span>
              <span className="how-panel__note">{stage.note}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
