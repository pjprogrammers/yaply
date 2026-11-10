import {
  FAQS,
  GAME_ALIASES,
  GAME_DESCRIPTION,
  GAME_KEYWORDS,
  STAGES,
} from "@/lib/content";
import { MAIN_URL, SITE_URL } from "@/lib/config";
import { ORGANIZATION_ID } from "@/lib/structured-data";

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "Yaply",
      alternateName: ["Yaply Games", "Yaply browser games"],
      url: MAIN_URL,
      description:
        "Yaply builds free multiplayer browser games for game night, played with one link or room code.",
      logo: {
        "@type": "ImageObject",
        url: `${MAIN_URL}/icon-512.png`,
        width: 512,
        height: 512,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: "Hole.io",
      alternateName: GAME_ALIASES,
      description: GAME_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": ORGANIZATION_ID },
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: "Hole.io — play the free hole io game online",
      description: GAME_DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#game` },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: `${SITE_URL}/og.png`,
        width: 1200,
        height: 630,
        caption: "Hole.io — a black hole swallowing a city block on a lime field",
      },
      inLanguage: "en",
      keywords: GAME_KEYWORDS.join(", "),
      significantLink: [`${SITE_URL}/play`, `${SITE_URL}/install`],
    },
    {
      "@type": "VideoGame",
      "@id": `${SITE_URL}/#game`,
      name: "Hole.io",
      alternateName: GAME_ALIASES,
      url: `${SITE_URL}/`,
      description: GAME_DESCRIPTION,
      image: [
        `${SITE_URL}/og.png`,
        `${SITE_URL}/media/game-hero.png`,
        `${SITE_URL}/media/game-city.png`,
      ],
      screenshot: `${SITE_URL}/media/game-city.png`,
      genre: ["Arcade", "Casual", "Io"],
      gamePlatform: ["Web browser", "Android", "iPhone", "iPad", "Desktop"],
      applicationCategory: "Game",
      operatingSystem: "Any",
      playMode: ["SinglePlayer", "MultiPlayer"],
      numberOfPlayers: {
        "@type": "QuantitativeValue",
        minValue: 1,
        maxValue: 8,
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/play`,
      },
      author: { "@id": ORGANIZATION_ID },
      publisher: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
      isAccessibleForFree: true,
    },
    {
      "@type": "HowTo",
      "@id": `${SITE_URL}/#howto`,
      name: "How to play Hole.io",
      description:
        "Drop into a two-minute match, swallow everything smaller than your rim, grow, and finish top of the eight-hole leaderboard.",
      totalTime: "PT2M",
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: "USD",
        value: "0",
      },
      step: STAGES.map((stage, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: stage.title,
        text: stage.body,
        url: `${SITE_URL}/#how`,
        image: `${SITE_URL}${stage.image}`,
      })),
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    },
    {
      "@type": "ItemList",
      "@id": `${SITE_URL}/#pages`,
      name: "Hole.io pages",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Play Hole.io",
          url: `${SITE_URL}/play`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Install Hole.io",
          url: `${SITE_URL}/install`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Hole.io home",
          url: `${SITE_URL}/`,
        },
      ],
    },
  ],
};

/**
 * JSON-LD for the Hole.io landing page. The copy comes from the same data the
 * visible page renders, so the markup never drifts out of sync.
 */
export function SeoSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
