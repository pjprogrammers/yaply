/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@yaply/shared"],
  async redirects() {
    return [
      // The game shipped as "Smash Karts" in early previews. Keep old links
      // working while the public name is Kart Riot.
      {
        source: "/games/smash-karts",
        destination: "/games/kart-riot",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
