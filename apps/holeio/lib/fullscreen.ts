"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface LockableOrientation {
  lock?: (orientation: "landscape") => Promise<void>;
}

function currentFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const doc = document as WebkitDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isFullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as WebkitDocument;
  const element = document.documentElement as WebkitElement;
  return Boolean(document.fullscreenEnabled || doc.webkitFullscreenEnabled) && Boolean(
    element.requestFullscreen || element.webkitRequestFullscreen,
  );
}

function isCoarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

async function lockLandscape(): Promise<void> {
  if (!isCoarsePointer()) return;
  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    await orientation?.lock?.("landscape");
  } catch {
    // iOS refuses; the rotate gate asks the player by hand.
  }
}

export async function requestFullscreen(): Promise<boolean> {
  if (typeof document === "undefined" || currentFullscreenElement()) {
    return Boolean(currentFullscreenElement());
  }
  const element = document.documentElement as WebkitElement;
  try {
    if (element.requestFullscreen) await element.requestFullscreen();
    else if (element.webkitRequestFullscreen) await element.webkitRequestFullscreen();
    else return false;
    void lockLandscape();
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<boolean> {
  if (typeof document === "undefined" || !currentFullscreenElement()) return false;
  const doc = document as WebkitDocument;
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
    else return false;
    return true;
  } catch {
    return false;
  }
}

function subscribeFullscreen(callback: () => void): () => void {
  document.addEventListener("fullscreenchange", callback);
  document.addEventListener("webkitfullscreenchange", callback);
  return () => {
    document.removeEventListener("fullscreenchange", callback);
    document.removeEventListener("webkitfullscreenchange", callback);
  };
}

function getFullscreenSnapshot(): boolean {
  return Boolean(currentFullscreenElement());
}

function getServerSnapshot(): boolean {
  return false;
}

export function useFullscreen() {
  const active = useSyncExternalStore(
    subscribeFullscreen,
    getFullscreenSnapshot,
    getServerSnapshot,
  );
  const supported = useSyncExternalStore(
    subscribeFullscreen,
    isFullscreenSupported,
    getServerSnapshot,
  );
  const enter = useCallback(async () => requestFullscreen(), []);
  const exit = useCallback(async () => exitFullscreen(), []);
  const toggle = useCallback(
    async () => (currentFullscreenElement() ? exitFullscreen() : requestFullscreen()),
    [],
  );
  return { supported, active, enter, exit, toggle };
}

function isFormField(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
  );
}

function isFullscreenControl(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-fullscreen-control]"));
}

/**
 * Tries fullscreen on the first gesture. Once the player deliberately leaves
 * fullscreen the hook stops fighting them until the page remounts.
 */
export function useAutoFullscreen(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let entered = false;
    let dismissed = false;

    const attempt = async () => {
      if (cancelled || entered || dismissed || currentFullscreenElement()) {
        entered = true;
        return;
      }
      const ok = await requestFullscreen();
      if (ok && !cancelled) entered = true;
    };

    void attempt();

    const onGesture = (event: Event) => {
      if (isFormField(event.target) || isFullscreenControl(event.target)) return;
      void attempt();
    };
    const onFullscreenChange = () => {
      if (currentFullscreenElement()) entered = true;
      else if (entered) dismissed = true;
    };

    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("touchend", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("touchend", onGesture);
      window.removeEventListener("keydown", onGesture);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, [enabled]);
}
