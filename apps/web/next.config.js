/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@yaply/shared"],
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
