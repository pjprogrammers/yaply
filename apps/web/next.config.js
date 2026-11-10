/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@yaply/shared"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // The game shipped as "Kart Riot" in early previews. Keep old links
      // working while the public name is Smash Karts.
      {
        source: "/games/kart-riot",
        destination: "/games/smash-karts",
        permanent: true,
      },
      // Common spellings and searches for the same game pages.
      {
        source: "/games/smashkarts",
        destination: "/games/smash-karts",
        permanent: true,
      },
      {
        source: "/games/hole-io",
        destination: "/games/holeio",
        permanent: true,
      },
      {
        source: "/games/holeio-game",
        destination: "/games/holeio",
        permanent: true,
      },
      {
        source: "/games/who-is-the-spy",
        destination: "/games/whos-the-spy",
        permanent: true,
      },
      {
        source: "/games/whos-the-spy-game",
        destination: "/games/whos-the-spy",
        permanent: true,
      },
      {
        source: "/games/scribbl",
        destination: "/games/skribbl",
        permanent: true,
      },
      {
        source: "/games/skribble",
        destination: "/games/skribbl",
        permanent: true,
      },
      {
        source: "/games/chain",
        destination: "/games/chain-reaction",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
