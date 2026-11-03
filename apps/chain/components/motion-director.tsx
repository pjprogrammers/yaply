"use client";

import { useEffect } from "react";

/**
 * Pointer-driven depth for the landing page. CSS owns every loop and every
 * reveal; this only writes two unitless variables while the pointer moves so
 * parallax and card tilt stay on the compositor.
 */
export function MotionDirector() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const precise = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (reduce.matches || !precise.matches) return;

    const hero = document.querySelector<HTMLElement>("[data-hero-parallax]");
    let frame = 0;
    let heroX = 0;
    let heroY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let tiltTarget: HTMLElement | null = null;

    const clearTilt = (node: HTMLElement | null) => {
      if (!node) return;
      node.style.removeProperty("--tilt-x");
      node.style.removeProperty("--tilt-y");
    };

    const paint = () => {
      frame = 0;
      if (hero) {
        hero.style.setProperty("--hero-x", heroX.toFixed(3));
        hero.style.setProperty("--hero-y", heroY.toFixed(3));
      }
      if (tiltTarget) {
        const rect = tiltTarget.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, ((pointerX - rect.left) / rect.width - 0.5) * 2));
        const y = Math.max(-1, Math.min(1, ((pointerY - rect.top) / rect.height - 0.5) * 2));
        tiltTarget.style.setProperty("--tilt-x", x.toFixed(3));
        tiltTarget.style.setProperty("--tilt-y", y.toFixed(3));
      }
    };

    const requestPaint = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (hero) {
        const rect = hero.getBoundingClientRect();
        heroX = Math.max(-1, Math.min(1, ((pointerX - rect.left) / rect.width - 0.5) * 2));
        heroY = Math.max(-1, Math.min(1, ((pointerY - rect.top) / rect.height - 0.5) * 2));
      }

      const next =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-tilt]")
          : null;

      if (next !== tiltTarget) {
        clearTilt(tiltTarget);
        tiltTarget = next;
      }

      requestPaint();
    };

    const reset = () => {
      heroX = 0;
      heroY = 0;
      clearTilt(tiltTarget);
      tiltTarget = null;
      requestPaint();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("mouseleave", reset);
    window.addEventListener("blur", reset);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("mouseleave", reset);
      window.removeEventListener("blur", reset);
      if (frame) window.cancelAnimationFrame(frame);
      clearTilt(tiltTarget);
    };
  }, []);

  return null;
}
