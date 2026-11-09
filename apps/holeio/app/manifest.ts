import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?app=holeio",
    name: "Yaply Hole.io",
    short_name: "Hole.io",
    description:
      "Steer a growing hole through a live city, swallow cars, trees and buildings, and out-eat seven rival holes in two minutes.",
    start_url: "/play",
    scope: "/",
    display: "standalone",
    display_override: ["fullscreen", "standalone"],
    orientation: "any",
    prefer_related_applications: false,
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
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
        name: "Play Hole.io",
        short_name: "Play",
        description: "Drop into a two-minute city match",
        url: "/play",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "How to play",
        short_name: "How to play",
        description: "The rules of the hole",
        url: "/#how",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
