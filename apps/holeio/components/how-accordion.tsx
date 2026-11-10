"use client";

import { useState } from "react";
import { STAGES } from "@/lib/content";

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
