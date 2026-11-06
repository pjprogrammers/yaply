import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?app=yaply",
    name: "Yaply",
    short_name: "Yaply",
    description:
      "Fast multiplayer browser games for game night. Pick a game, open a room and send one link.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    prefer_related_applications: false,
    background_color: "#1423b8",
    theme_color: "#1423b8",
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
        name: "All games",
        short_name: "Games",
        description: "Browse the Yaply shelf",
        url: "/games",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Install apps",
        short_name: "Apps",
        description: "Install every Yaply game on its own",
        url: "/apps",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
