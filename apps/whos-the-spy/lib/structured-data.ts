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
export const WEBSITE_ID = `${SITE_URL}/#website`;

const HOME = `${SITE_URL}/`;
const CREATE = `${SITE_URL}/create`;
const JOIN = `${SITE_URL}/join`;
const HOW_TO_PLAY = `${SITE_URL}/how-to-play`;
const INSTALL = `${SITE_URL}/install`;
const YAPLY_GAME = `${MAIN_URL}/games/whos-the-spy`;

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "Yaply",
    alternateName: ["Yaply Games", "YaplyGames", "Yaply game"],
    url: MAIN_URL,
    description:
      "Yaply builds free multiplayer browser games for game night, played with one link or room code.",
    logo: {
      "@type": "ImageObject",
      url: `${MAIN_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
    sameAs: [YAPLY_GAME],
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: HOME,
    name: `${GAME_NAME} by Yaply`,
    alternateName: GAME_ALIASES,
    description: GAME_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function gameNode() {
  return {
    "@type": "VideoGame",
    "@id": `${HOME}#game`,
    name: GAME_NAME,
    alternateName: GAME_ALIASES,
    url: HOME,
    description: GAME_DESCRIPTION,
    image: [`${SITE_URL}/og.png`, `${SITE_URL}/icon-512.png`],
    screenshot: `${SITE_URL}/og.png`,
    genre: ["Social deduction", "Party", "Word game", "Multiplayer"],
    gamePlatform: ["Web browser", "Android", "iPhone", "iPad", "Desktop"],
    applicationCategory: "Game",
    operatingSystem: "Any",
    playMode: ["MultiPlayer"],
    numberOfPlayers: {
      "@type": "QuantitativeValue",
      minValue: 3,
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
    isAccessibleForFree: true,
    sameAs: [YAPLY_GAME],
  };
}

export function faqNode() {
  return {
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
  };
}

export function howToNode(id = `${HOME}#howto`) {
  return {
    "@type": "HowTo",
    "@id": id,
    name: "How to play Who's the Spy",
    description:
      "Create a room, share the link, read your private word, give clues, vote in secret and find the spies.",
    totalTime: "PT15M",
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
      url: index < 2 ? CREATE : HOW_TO_PLAY,
    })),
  };
}

export function breadcrumbNode(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${new URL(items[items.length - 1].path, SITE_URL)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, SITE_URL).toString(),
    })),
  };
}

export function homeSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      {
        "@type": "WebPage",
        "@id": `${HOME}#webpage`,
        url: HOME,
        name: "Who's the Spy — free online spy game by Yaply",
        description: GAME_DESCRIPTION,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": `${HOME}#game` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${SITE_URL}/og.png`,
          width: 900,
          height: 1200,
          caption: "Who's the Spy — a social deduction party game by Yaply",
        },
        inLanguage: "en",
        keywords: GAME_KEYWORDS.join(", "),
        significantLink: [CREATE, JOIN, HOW_TO_PLAY, INSTALL],
      },
      gameNode(),
      howToNode(),
      faqNode(),
      {
        "@type": "ItemList",
        "@id": `${HOME}#pages`,
        name: "Who's the Spy pages",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Who's the Spy home",
            url: HOME,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Create a Who's the Spy room",
            url: CREATE,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Join a Who's the Spy room",
            url: JOIN,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "How to play Who's the Spy",
            url: HOW_TO_PLAY,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: "Install Who's the Spy",
            url: INSTALL,
          },
          {
            "@type": "ListItem",
            position: 6,
            name: "Who's the Spy on Yaply",
            url: YAPLY_GAME,
          },
        ],
      },
    ],
  };
}

export function howToPlaySchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      {
        "@type": "WebPage",
        "@id": `${HOW_TO_PLAY}#webpage`,
        url: HOW_TO_PLAY,
        name: "How to play Who's the Spy",
        description:
          "The complete rules for Who's the Spy: secret words, clue turns, private voting, revotes, eliminations and the final spy guess.",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": `${HOME}#game` },
        inLanguage: "en",
        keywords: GAME_KEYWORDS.join(", "),
      },
      howToNode(`${HOW_TO_PLAY}#howto`),
      breadcrumbNode([
        { name: GAME_NAME, path: "/" },
        { name: "How to play", path: "/how-to-play" },
      ]),
    ],
  };
}

export function installSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      {
        "@type": "WebPage",
        "@id": `${INSTALL}#webpage`,
        url: INSTALL,
        name: "Install Who's the Spy",
        description:
          "Install Who's the Spy on your phone, tablet or desktop. The free party game opens in its own window with no store and no account.",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": `${HOME}#game` },
        inLanguage: "en",
        keywords: GAME_KEYWORDS.join(", "),
      },
      {
        "@type": "WebApplication",
        "@id": `${INSTALL}#app`,
        name: `${GAME_NAME} by Yaply`,
        url: INSTALL,
        description:
          "Who's the Spy is an installable browser party game for 3–12 players. Add it to your home screen and open it in its own window.",
        applicationCategory: "GameApplication",
        operatingSystem: "Android, iOS, Windows, macOS, Linux",
        browserRequirements: "Requires a modern browser with JavaScript enabled.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: INSTALL,
        },
        featureList: [
          "Install without an app store",
          "Private role cards and ballots",
          "Works on Android, iOS and desktop",
          "No account required",
        ],
        publisher: { "@id": ORGANIZATION_ID },
        isAccessibleForFree: true,
      },
      breadcrumbNode([
        { name: GAME_NAME, path: "/" },
        { name: "Install", path: "/install" },
      ]),
    ],
  };
}

export function createRoomSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      {
        "@type": "WebPage",
        "@id": `${CREATE}#webpage`,
        url: CREATE,
        name: "Create a Who's the Spy room",
        description:
          "Set up a private Who's the Spy room: choose word categories, spy count, clue format, voting timer and final-guess rules.",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": `${HOME}#game` },
        inLanguage: "en",
        keywords: GAME_KEYWORDS.join(", "),
      },
      breadcrumbNode([
        { name: GAME_NAME, path: "/" },
        { name: "Create a room", path: "/create" },
      ]),
    ],
  };
}

export function joinRoomSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      {
        "@type": "WebPage",
        "@id": `${JOIN}#webpage`,
        url: JOIN,
        name: "Join a Who's the Spy room",
        description:
          "Join a private Who's the Spy game with a six-character room code and a nickname. No account is required.",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": `${HOME}#game` },
        inLanguage: "en",
        keywords: GAME_KEYWORDS.join(", "),
      },
      breadcrumbNode([
        { name: GAME_NAME, path: "/" },
        { name: "Join a room", path: "/join" },
      ]),
    ],
  };
}
