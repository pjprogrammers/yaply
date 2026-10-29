"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Reveal from "@/components/reveal";

const features = [
  {
    id: "installs",
    title: "No installs, ever.",
    result:
      "Every game opens in the browser you already have. No app store, no update prompt, no waiting.",
    band: "var(--yellow)",
    ink: "var(--black)",
  },
  {
    id: "phones",
    title: "Your phone is the console.",
    result:
      "Rooms are built for a small screen and a thumb. The same link works on a laptop when you want a bigger board.",
    band: "var(--pink)",
    ink: "var(--black)",
  },
  {
    id: "link",
    title: "One link fills the room.",
    result:
      "Create a room, copy the code and drop it in the group chat. Everyone lands in the same lobby.",
    band: "var(--green)",
    ink: "var(--black)",
  },
  {
    id: "rail",
    title: "More games on the same rail.",
    result:
      "Chain Reaction and Skribbl are live now. Ludo, Who's the Spy and Smash Karts are being added to the same shelf.",
    band: "var(--blue)",
    ink: "var(--white)",
  },
];

export default function Features() {
  const [on, setOn] = useState<Record<string, boolean>>({
    installs: true,
    phones: true,
    link: false,
    rail: false,
  });

  return (
    <section
      className="features"
      data-chapter="black"
      aria-labelledby="features-title"
    >
      <div className="shell features__head">
        <Reveal>
          <h2 id="features-title">Game night, minus the setup.</h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="features__aside">
            Four things every game night should get right. Flip a switch — the
            answer stays the same.
          </p>
        </Reveal>
      </div>

      {features.map((feature) => {
        const isOn = Boolean(on[feature.id]);

        return (
          <div
            key={feature.id}
            className={`feature-band ${isOn ? "is-on" : ""}`}
            style={
              {
                "--band": feature.band,
                "--band-ink": feature.ink,
              } as CSSProperties
            }
          >
            <div className="shell feature-band__inner">
              <div className="feature-band__copy">
                <h3>{feature.title}</h3>
                <p className="feature-band__result">{feature.result}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={`Toggle ${feature.title}`}
                className="switch"
                onClick={() =>
                  setOn((current) => ({
                    ...current,
                    [feature.id]: !current[feature.id],
                  }))
                }
              >
                <span className="switch__thumb" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
