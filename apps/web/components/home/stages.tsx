"use client";

import { useState } from "react";
import { gameStatusLabel, games } from "@/data/games";

const board = [
  "green",
  "pink",
  "green",
  "blue",
  "yellow",
  "green",
  "green",
  "pink",
  "blue",
  "",
  "yellow",
  "green",
  "pink",
  "pink",
  "blue",
  "",
  "yellow",
  "green",
  "pink",
  "blue",
  "green",
  "",
  "yellow",
  "pink",
  "blue",
];

function PickFragment() {
  return (
    <div
      className="ui-panel"
      data-ui
      role="img"
      aria-label="Yaply game shelf with Chain Reaction selected"
    >
      <div className="ui-top">
        <span>Choose a game</span>
        <span>5 games</span>
      </div>
      <div className="ui-shelf">
        {games.map((game) => (
          <div
            key={game.id}
            className={`ui-shelf__row ${game.id === "chain" ? "is-on" : ""}`}
          >
            <img src={game.poster} alt="" width={900} height={1200} />
            <span>{game.name}</span>
            <span>{gameStatusLabel(game)}</span>
          </div>
        ))}
      </div>
      <div className="ui-kv">
        <span>Selected</span>
        <strong>Chain Reaction</strong>
      </div>
    </div>
  );
}

function RoomFragment() {
  return (
    <div
      className="ui-panel"
      data-ui
      role="img"
      aria-label="A Yaply room code panel showing room code YAP7K"
    >
      <div className="ui-top">
        <span>Chain Reaction</span>
        <span>Room</span>
      </div>
      <div className="ui-code">YAP7K</div>
      <div className="ui-kv">
        <span>Players</span>
        <strong>You + 3 open seats</strong>
      </div>
      <span className="ui-button">Copy invite link</span>
      <p className="ui-note">
        Share the code. Friends can join from the link.
      </p>
    </div>
  );
}

function ShareFragment() {
  return (
    <div
      className="ui-panel"
      data-ui
      role="img"
      aria-label="A share panel with a room link and copy button"
    >
      <div className="ui-top">
        <span>Share the room</span>
        <span>YAP7K</span>
      </div>
      <div className="ui-link">yaply.eu.org/room/YAP7K</div>
      <div className="ui-kv">
        <span>Room code</span>
        <strong>YAP7K</strong>
      </div>
      <span className="ui-button">Copy link</span>
      <p className="ui-note">Send it in any chat. No app needed.</p>
    </div>
  );
}

function PlayFragment() {
  return (
    <div
      className="ui-panel"
      data-ui
      role="img"
      aria-label="A Chain Reaction board with three players and a scoreboard"
    >
      <div className="ui-top">
        <span>Chain Reaction</span>
        <span>Round 3</span>
      </div>
      <div className="ui-board">
        {board.map((color, index) => (
          <span
            key={index}
            className={`ui-dot ${color ? `ui-dot--${color}` : ""}`}
          />
        ))}
      </div>
      <div className="ui-score">
        <span>
          <strong>You</strong> 12
        </span>
        <span>
          <strong>Maya</strong> 9
        </span>
        <span>
          <strong>Jon</strong> 6
        </span>
      </div>
    </div>
  );
}

const stages = [
  {
    name: "Pick a game",
    body: "Five games sit on one shelf. Chain Reaction and Skribbl are ready now; the others are close behind.",
    fragment: <PickFragment />,
  },
  {
    name: "Open a room",
    body: "Open a room and get a short code. No account, no lobby to build by hand.",
    fragment: <RoomFragment />,
  },
  {
    name: "Send the link",
    body: "Send the code or the link. Everyone who opens it lands in the same room.",
    fragment: <ShareFragment />,
  },
  {
    name: "Play",
    body: "Play in the browser. Scores, turns and rematches stay in the room.",
    fragment: <PlayFragment />,
  },
];

export default function Stages() {
  const [stage, setStage] = useState(0);
  const current = stages[stage];

  return (
    <section
      id="how"
      className="stages section-anchor"
      data-chapter="pink"
      aria-label="How Yaply works"
    >
      <div className="stages__grid">
        <div className="stages__copy">
          <h2>{current.name}</h2>
          <p className="stages__body">{current.body}</p>
          <p className="sr-only" aria-live="polite">
            Step {stage + 1} of 4: {current.name}. {current.body}
          </p>
        </div>

        <div className="stages__visual">
          <div className="stages__stack">
            {stages.map((item, index) => (
              <div
                key={item.name}
                className={`stage-fragment ${
                  index === stage ? "is-active" : ""
                }`}
                aria-hidden={index !== stage}
              >
                {item.fragment}
              </div>
            ))}
          </div>
        </div>

        <div className="stages__slider">
          <div className="stage-tabs">
            {stages.map((item, index) => (
              <button
                key={item.name}
                type="button"
                className={`stage-tab ${
                  index === stage ? "is-active" : ""
                }`}
                aria-pressed={index === stage}
                onClick={() => setStage(index)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={stages.length - 1}
            step={1}
            value={stage}
            aria-label="Choose a step"
            aria-valuetext={`Step ${stage + 1}: ${current.name}`}
            onChange={(event) => setStage(Number(event.target.value))}
          />
        </div>
      </div>
    </section>
  );
}
