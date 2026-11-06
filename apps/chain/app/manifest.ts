import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?app=chain-reaction",
    name: "Yaply Chain Reaction",
    short_name: "Chain Reaction",
    description:
      "A turn-based board game for 2–8 players. Stack orbs past their critical mass and watch the chain flip the table.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["fullscreen", "standalone"],
    orientation: "any",
    prefer_related_applications: false,
    background_color: "#06090e",
    theme_color: "#06090e",
    lang: "en",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
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
        description: "Set up a Chain Reaction room",
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
        description: "Learn the critical-mass rules",
        url: "/how-to-play",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
