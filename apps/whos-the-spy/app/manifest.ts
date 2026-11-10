import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?app=whos-the-spy",
    name: "Yaply Who's the Spy",
    short_name: "Who's the Spy",
    description:
      "A social deduction party game for 3–12 players. Everyone gets a secret word, but the spies get a different one.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["fullscreen", "standalone"],
    orientation: "any",
    prefer_related_applications: false,
    background_color: "#0b0910",
    theme_color: "#0b0910",
    lang: "en",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Start a game",
        short_name: "Create",
        description: "Set up a Who's the Spy room",
        url: "/create",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Join a room",
        short_name: "Join",
        description: "Join with a six-character code",
        url: "/join",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "How to play",
        short_name: "Rules",
        description: "Learn the clue, vote and final-guess rules",
        url: "/how-to-play",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
