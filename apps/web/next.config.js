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
    ];
  },
};

module.exports = nextConfig;
