import {
  FAQS,
  GAME_ALIASES,
  GAME_DESCRIPTION,
  GAME_KEYWORDS,
  GAME_NAME,
  STEPS,
} from "@/lib/content";
import { MAIN_URL, SITE_URL } from "@/lib/config";

export const ORGANIZATION_ID = `${MAIN_URL}/#organization`;

const HOME = `${SITE_URL}/`;
const CREATE = `${SITE_URL}/create`;
const JOIN = `${SITE_URL}/join`;
const HOW_TO_PLAY = `${SITE_URL}/how-to-play`;
const INSTALL = `${SITE_URL}/install`;
const YAPLY_GAME = `${MAIN_URL}/games/skribbl`;

/**
 * The home-page entity graph. Everything is generated from the same copy the
 * page renders, so schema and visible text stay in sync.
 */
export function skribblSchema() {
  return {
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
        "@id": `${HOME}#website`,
        url: HOME,
        name: GAME_NAME,
        alternateName: GAME_ALIASES,
        description: GAME_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": ORGANIZATION_ID },
      },
      {
        "@type": "WebPage",
        "@id": `${HOME}#webpage`,
        url: HOME,
        name: "Skribbl — free online drawing game to play with friends",
        description: GAME_DESCRIPTION,
        isPartOf: { "@id": `${HOME}#website` },
        about: { "@id": `${HOME}#game` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${SITE_URL}/opengraph-image.png`,
          width: 1200,
          height: 630,
          caption:
            "Skribbl — a doodled cat on a paper game card with a hidden word and a correct guess",
        },
        inLanguage: "en",
        keywords: GAME_KEYWORDS.join(", "),
        significantLink: [CREATE, JOIN, HOW_TO_PLAY, INSTALL],
      },
      {
        "@type": "VideoGame",
        "@id": `${HOME}#game`,
        name: GAME_NAME,
        alternateName: GAME_ALIASES,
        url: HOME,
        description: GAME_DESCRIPTION,
        image: [
          `${SITE_URL}/opengraph-image.png`,
          `${SITE_URL}/icon-512.png`,
        ],
        screenshot: `${SITE_URL}/opengraph-image.png`,
        genre: ["Party", "Drawing", "Guessing", "Casual", "Multiplayer"],
        gamePlatform: ["Web browser", "Android", "iPhone", "iPad", "Desktop"],
        applicationCategory: "Game",
        operatingSystem: "Any",
        playMode: ["MultiPlayer"],
        numberOfPlayers: {
          "@type": "QuantitativeValue",
          minValue: 2,
          maxValue: 12,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: CREATE,
        },
        author: { "@id": ORGANIZATION_ID },
        publisher: { "@id": ORGANIZATION_ID },
        inLanguage: "en",
        availableLanguage: ["English", "Filipino", "Japanese", "Korean"],
        isAccessibleForFree: true,
        sameAs: [YAPLY_GAME],
      },
      {
        "@type": "HowTo",
        "@id": `${HOME}#howto`,
        name: "How to play Skribbl",
        description:
          "Create a private room, share the code, draw a secret word and race the room to guess it.",
        totalTime: "PT2M",
        estimatedCost: {
          "@type": "MonetaryAmount",
          currency: "USD",
          value: "0",
        },
        step: STEPS.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.title,
          text: step.body,
          url: HOW_TO_PLAY,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${HOME}#faq`,
        mainEntity: FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${HOME}#pages`,
        name: "Skribbl pages",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Skribbl home",
            url: HOME,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Create a Skribbl room",
            url: CREATE,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Join a Skribbl room",
            url: JOIN,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "How to play Skribbl",
            url: HOW_TO_PLAY,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: "Install Skribbl",
            url: INSTALL,
          },
        ],
      },
    ],
  };
}

/** Breadcrumb JSON-LD for a single page. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, SITE_URL).toString(),
    })),
  };
}
