"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

function currentFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const doc = document as WebkitDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

async function requestNativeFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  if (currentFullscreenElement()) return true;

  const element = document.documentElement as WebkitElement;
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen({ navigationUI: "hide" });
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    } else {
      return false;
    }
    return true;
  } catch {
    // The request was not tied to a gesture, or the browser refuses it.
    return false;
  }
}

async function exitNativeFullscreen(): Promise<void> {
  if (typeof document === "undefined" || !currentFullscreenElement()) return;
  const doc = document as WebkitDocument;
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    }
  } catch {
    // The browser may already have left fullscreen.
  }
}

/**
 * Immersive game viewport with a best-effort native fullscreen layer.
 *
 * The layout is fullscreen by default even when the browser blocks native
 * fullscreen. A triple-tap (handled by Board) toggles both layers together.
 */
export function useGameFullscreen(enabled = true) {
  // The last fullscreen choice, tagged with the `enabled` value it belongs to.
  // A scope that turns on after being disabled (lobby -> playing) opens
  // immersive by default without synchronously setting state in an effect.
  const [choice, setChoice] = useState({ enabled, fullscreen: enabled });
  const fullscreen = choice.enabled === enabled ? choice.fullscreen : enabled;
  const nativeOwnedRef = useRef(false);
  const suppressNativeExitRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      if (nativeOwnedRef.current) {
        suppressNativeExitRef.current = true;
        nativeOwnedRef.current = false;
        void exitNativeFullscreen();
      }
      return;
    }

    let cancelled = false;
    // Navigation from a click often still carries user activation, so this
    // attempt succeeds for a game started from the setup screen.
    void requestNativeFullscreen().then((ok) => {
      if (cancelled || !ok) return;
      if (currentFullscreenElement()) nativeOwnedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    const onChange = () => {
      if (currentFullscreenElement()) {
        nativeOwnedRef.current = true;
        return;
      }
      if (!nativeOwnedRef.current) return;
      nativeOwnedRef.current = false;
      if (suppressNativeExitRef.current) {
        suppressNativeExitRef.current = false;
        return;
      }
      // The player pressed Esc or the browser dropped native fullscreen.
      setChoice((previous) => {
        const active = previous.enabled === enabled ? previous.fullscreen : enabled;
        if (!active) return previous;
        return { enabled, fullscreen: false };
      });
    };

    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !fullscreen) return;
    if (typeof document === "undefined" || currentFullscreenElement()) return;

    // Browsers only grant native fullscreen from a gesture. The first tap on
    // the table (or any key press) hides the URL bar and browser chrome.
    const request = () => {
      if (currentFullscreenElement()) return;
      void requestNativeFullscreen().then((ok) => {
        if (ok && currentFullscreenElement()) nativeOwnedRef.current = true;
      });
    };
    window.addEventListener("pointerdown", request, { once: true, capture: true });
    window.addEventListener("keydown", request, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", request, { capture: true });
      window.removeEventListener("keydown", request, { capture: true });
    };
  }, [enabled, fullscreen]);

  const enter = useCallback(async () => {
    suppressNativeExitRef.current = false;
    setChoice({ enabled, fullscreen: true });
    const ok = await requestNativeFullscreen();
    if (ok && currentFullscreenElement()) nativeOwnedRef.current = true;
    return ok;
  }, [enabled]);

  const exit = useCallback(async () => {
    setChoice({ enabled, fullscreen: false });
    if (!nativeOwnedRef.current && !currentFullscreenElement()) return;
    suppressNativeExitRef.current = true;
    nativeOwnedRef.current = false;
    await exitNativeFullscreen();
  }, [enabled]);

  const toggle = useCallback(async () => {
    if (fullscreen) {
      await exit();
      return false;
    }
    return enter();
  }, [enter, exit, fullscreen]);

  // Lock the document while the immersive viewport is visible.
  useEffect(() => {
    if (!fullscreen) return;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [fullscreen]);

  // A route change should not leave the next page trapped in native fullscreen.
  useEffect(() => {
    return () => {
      if (nativeOwnedRef.current && currentFullscreenElement()) {
        suppressNativeExitRef.current = true;
        void exitNativeFullscreen();
      }
    };
  }, []);

  return { fullscreen, enter, exit, toggle };
}
