"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

// The shared package is built without Node types. Next replaces this exact
// member expression at build time, so the declaration only needs to satisfy
// the type checker.
declare const process: { env: { NODE_ENV?: string } };

export type PwaPlatform = "ios" | "android" | "desktop";
export type PwaBrowser = "safari" | "chrome" | "edge" | "firefox" | "samsung" | "other";
export type InstallOutcome = "accepted" | "dismissed" | "unavailable";
export type InstallGuideId = "android" | "ios" | "desktop";

export type PwaInstallState = {
  /** False during server rendering and the first hydration pass. */
  ready: boolean;
  /** True when the current window is running as an installed app. */
  installed: boolean;
  /** True when the browser has offered a native install prompt. */
  canInstall: boolean;
  platform: PwaPlatform;
  browser: PwaBrowser;
  secure: boolean;
};

export type InstallGuide = {
  id: InstallGuideId;
  title: string;
  short: string;
  steps: string[];
  note: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const SERVER_STATE: PwaInstallState = {
  ready: false,
  installed: false,
  canInstall: false,
  platform: "desktop",
  browser: "other",
  secure: false,
};

let current: PwaInstallState = SERVER_STATE;
let initialized = false;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedThisSession = false;
const listeners = new Set<() => void>();

export function detectPwaPlatform(
  userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
  platform = typeof navigator === "undefined" ? "" : navigator.platform,
  maxTouchPoints = typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints,
): PwaPlatform {
  const ios =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);

  if (ios) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export function detectPwaBrowser(
  userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
): PwaBrowser {
  if (/EdgA\//i.test(userAgent) || /EdgiOS\//i.test(userAgent) || /Edg\//i.test(userAgent)) {
    return "edge";
  }
  if (/SamsungBrowser/i.test(userAgent)) return "samsung";
  if (/Firefox|FxiOS/i.test(userAgent)) return "firefox";
  if (/CriOS|Chrome|Chromium/i.test(userAgent)) return "chrome";
  if (/Safari/i.test(userAgent)) return "safari";
  return "other";
}

function runningStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    navigatorWithStandalone.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

function computeState(): PwaInstallState {
  if (typeof window === "undefined") return SERVER_STATE;

  const installed = installedThisSession || runningStandalone();

  return {
    ready: true,
    installed,
    canInstall: Boolean(deferredPrompt) && !installed,
    platform: detectPwaPlatform(),
    browser: detectPwaBrowser(),
    secure: window.isSecureContext,
  };
}

function publish(): void {
  current = computeState();
  for (const listener of listeners) listener();
}

function ensureInitialized(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  current = computeState();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    publish();
  });

  window.addEventListener("appinstalled", () => {
    installedThisSession = true;
    deferredPrompt = null;
    publish();
  });

  for (const query of ["(display-mode: standalone)", "(display-mode: fullscreen)", "(display-mode: minimal-ui)"]) {
    window.matchMedia(query).addEventListener?.("change", publish);
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  ensureInitialized();
  publish();
  return () => listeners.delete(listener);
}

function getSnapshot(): PwaInstallState {
  return current;
}

function getServerSnapshot(): PwaInstallState {
  return SERVER_STATE;
}

// The listener has to exist before the install page mounts so a
// `beforeinstallprompt` event fired earlier in the page lifetime is not lost.
if (typeof window !== "undefined") ensureInitialized();

export function usePwaInstall(): PwaInstallState & {
  install: () => Promise<InstallOutcome>;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    ensureInitialized();
    if (!deferredPrompt) return "unavailable";

    const prompt = deferredPrompt;
    // A captured prompt can only be used once, so drop it before awaiting.
    deferredPrompt = null;

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;

      if (choice.outcome === "accepted") installedThisSession = true;
      publish();

      return choice.outcome;
    } catch {
      publish();
      return "unavailable";
    }
  }, []);

  return { ...state, install };
}

export function getInstallGuides(
  appName: string,
  platform: PwaPlatform,
  browser: PwaBrowser,
): { recommended: InstallGuideId; guides: InstallGuide[] } {
  const recommended: InstallGuideId =
    platform === "ios" ? "ios" : platform === "android" ? "android" : "desktop";

  return {
    recommended,
    guides: [
      {
        id: "android",
        title: "Android",
        short: "Chrome, Edge or Samsung Internet",
        steps: [
          "Open this page in your browser.",
          "Tap the browser menu (⋮).",
          "Choose Install app. If you only see Add to Home screen, the browser is offering a shortcut instead.",
          `Confirm Install to add ${appName}.`,
        ],
        note:
          browser === "firefox"
            ? "Firefox for Android adds a shortcut, which may keep browser branding in Recent Apps. Use Chrome, Edge or Samsung Internet for a full Android app install."
            : "Chrome, Edge and Samsung Internet register a proper Android app (WebAPK) when Google Play services support it. A plain shortcut is not the same thing.",
      },
      {
        id: "ios",
        title: "iPhone & iPad",
        short: "Safari",
        steps: [
          "Open this page in Safari.",
          "Tap the Share button.",
          "Scroll down and choose Add to Home Screen.",
          "Tap Add in the top corner.",
        ],
        note:
          browser !== "safari"
            ? "On iPhone and iPad, apps can only be added from Safari's Share menu. Open this page in Safari first."
            : "The new icon opens in its own full-screen window, without the Safari toolbar.",
      },
      {
        id: "desktop",
        title: "Desktop",
        short: "Chrome, Edge or Safari",
        steps: [
          "Look for the install icon in the address bar, or open the browser menu.",
          `Choose Install ${appName}, or in Safari choose File → Add to Dock.`,
          "Confirm Install. The app opens in its own window.",
        ],
        note:
          browser === "firefox"
            ? "Firefox does not install web apps. Use Chrome, Edge or Safari to get an app window."
            : "Installed apps get their own window, dock icon and launcher entry.",
      },
    ],
  };
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") return;
  if (!("serviceWorker" in navigator)) return;

  const register = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // A blocked or unavailable service worker should never break the app.
      });
  };

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

/** Mount once in the root layout to capture install events and register the worker. */
export function PwaBridge() {
  useEffect(() => {
    ensureInitialized();
    registerServiceWorker();
  }, []);

  return null;
}
