"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type RevealTag = "div" | "section" | "li" | "article";

export function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
  stagger = false,
  tilt = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: RevealTag;
  /** Stagger the direct children instead of moving the whole block. */
  stagger?: boolean;
  /** Let the pointer tip the block in 3D. */
  tilt?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only hide reveal content once JavaScript is running, so the page is
    // still readable if the bundle fails to load.
    document.documentElement.classList.add("has-cr-reveal");

    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as;

  return (
    <Tag
      ref={ref as never}
      className={`cr-reveal ${visible ? "is-visible" : ""} ${className}`.trim()}
      data-stagger={stagger ? "" : undefined}
      data-tilt={tilt ? "" : undefined}
      style={
        {
          animationDelay: `${delay}ms`,
          "--reveal-delay": `${delay}ms`,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
