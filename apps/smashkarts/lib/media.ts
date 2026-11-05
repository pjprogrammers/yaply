"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

function subscribe(query: string, callback: () => void): () => void {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getSnapshot(query: string): boolean {
  return window.matchMedia(query).matches;
}

/** Live media-query state without a resize listener in every component. */
export function useMediaQuery(query: string): boolean {
  const subscribeToQuery = useCallback(
    (callback: () => void) => subscribe(query, callback),
    [query],
  );
  const getQuerySnapshot = useCallback(() => getSnapshot(query), [query]);
  return useSyncExternalStore(subscribeToQuery, getQuerySnapshot, () => false);
}

/**
 * True when the game should use its touch layout. A coarse primary pointer
 * (phone, tablet) always qualifies. Hybrid laptops expose both coarse and fine
 * pointers, so they only switch to touch after a real touch is used; that keeps
 * the virtual controls off a desktop that merely has a touchscreen.
 */
export function useTouchCapability(): boolean {
  const coarse = useMediaQuery("(pointer: coarse)");
  const anyCoarse = useMediaQuery("(any-pointer: coarse)");
  const anyFine = useMediaQuery("(any-pointer: fine)");
  const [touchActive, setTouchActive] = useState(false);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        setTouchActive(true);
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  return coarse || (anyCoarse && !anyFine) || touchActive;
}
