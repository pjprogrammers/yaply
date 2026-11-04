import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chain Reaction",
    short_name: "Chain",
    description:
      "A turn-based board game for 2–8 players. Stack orbs past their critical mass and watch the chain flip the table.",
    start_url: "/",
    display: "fullscreen",
    orientation: "any",
    background_color: "#0b0b10",
    theme_color: "#0b0b10",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
