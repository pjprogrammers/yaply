import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Yaply Skribbl",
    short_name: "Skribbl",
    description:
      "A private drawing and guessing game for 2–12 players. Create a room, share the code, and try to draw a word nobody can guess.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a09",
    theme_color: "#0a0a09",
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
        name: "Create a room",
        short_name: "Create",
        description: "Set up a Skribbl room",
        url: "/create",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Join a room",
        short_name: "Join",
        description: "Join with a six-letter code",
        url: "/join",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "How to play",
        short_name: "Rules",
        description: "Learn how drawing and guessing works",
        url: "/how-to-play",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
