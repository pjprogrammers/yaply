import { faqs } from "@/data/faqs";
import { games, type GameEntry } from "@/data/games";
import { SITE_URL } from "@/lib/site";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const GAME_URLS = games.flatMap((game) => (game.url ? [game.url] : []));

const GAME_KEYWORDS = [
  "browser games",
  "free browser games",
  "multiplayer browser games",
  "browser party games",
  "games to play with friends",
  "games to play with friends online",
  "play games with friends online",
  "online party games",
  "online drawing game",
  "drawing and guessing game",
  "strategy browser game",
  "kart arena game",
  "io games",
  "social deduction game",
  "yaply",
  "yaply games",
  "yaplygames",
  "yaply game",
];

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "Yaply",
    alternateName: ["Yaply Games", "YaplyGames", "Yaply game"],
    url: SITE_URL,
    description:
      "Yaply builds free multiplayer browser games for game night, played with one link or room code.",
    slogan: "Good games. Better together.",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}/og.png`,
    sameAs: GAME_URLS,
    knowsAbout: GAME_KEYWORDS,
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: "Yaply",
    alternateName: ["Yaply Games", "YaplyGames", "Yaply game"],
    description:
      "Free multiplayer browser games for game night. Play Chain Reaction, Skribbl, Smash Karts, Hole.io and Who's the Spy with one link or room code.",
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function gameNode(game: GameEntry) {
  const pageUrl = `${SITE_URL}/games/${game.slug}`;
  const image = game.ogImage ?? {
    src: game.poster,
    width: 900,
    height: 1200,
    alt: game.alt,
  };

  return {
    "@type": "VideoGame",
    "@id": `${pageUrl}/#game`,
    name: game.name,
    ...(game.aliases?.length ? { alternateName: game.aliases } : {}),
    description: game.seoDescription ?? game.statement,
    url: pageUrl,
    image: [`${SITE_URL}${image.src}`, `${SITE_URL}${game.poster}`],
    screenshot: `${SITE_URL}${image.src}`,
    genre: game.tag ? [game.tag, "Browser game"] : ["Browser game"],
    gamePlatform: ["Web browser", "Android", "iPhone", "iPad", "Desktop"],
    applicationCategory: "Game",
    operatingSystem: "Any",
    playMode:
      game.status === "available"
        ? ["SinglePlayer", "MultiPlayer"]
        : ["MultiPlayer"],
    ...(game.playerCount
      ? {
          numberOfPlayers: {
            "@type": "QuantitativeValue",
            minValue: game.playerCount.min,
            maxValue: game.playerCount.max,
          },
        }
      : {}),
    ...(game.status === "available"
      ? {
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: game.url ?? pageUrl,
          },
        }
      : {}),
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en",
    isAccessibleForFree: true,
    ...(game.url ? { sameAs: [game.url] } : {}),
  };
}

export function faqNode(
  items: { question: string; answer: string }[],
  id = `${SITE_URL}/#faq`,
) {
  return {
    "@type": "FAQPage",
    "@id": id,
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
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

function gamesItemListNode(id = `${SITE_URL}/#games`) {
  return {
    "@type": "ItemList",
    "@id": id,
    name: "Yaply browser games",
    numberOfItems: games.length,
    itemListElement: games.map((game, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: gameNode(game),
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
        "@id": `${SITE_URL}/#webpage`,
        url: `${SITE_URL}/`,
        name: "Yaply Games — free browser games to play with friends",
        description:
          "Yaply is a free browser games platform for game night. Play Chain Reaction, Skribbl, Smash Karts, Hole.io and Who's the Spy with friends using one link or room code. No installs, no accounts.",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORGANIZATION_ID },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${SITE_URL}/og.png`,
          width: 1200,
          height: 630,
          caption:
            "Yaply browser games — a fanned deck of game posters on a blue and yellow field",
        },
        inLanguage: "en",
        keywords: GAME_KEYWORDS.join(", "),
        significantLink: [
          `${SITE_URL}/games`,
          `${SITE_URL}/apps`,
          `${SITE_URL}/install`,
          `${SITE_URL}/about`,
        ],
      },
      gamesItemListNode(),
      faqNode(faqs),
      {
        "@type": "HowTo",
        "@id": `${SITE_URL}/#howto`,
        name: "How to play Yaply browser games with friends",
        description:
          "Pick a game, open a room, share the room code or link, and play together in the browser.",
        totalTime: "PT2M",
        estimatedCost: {
          "@type": "MonetaryAmount",
          currency: "USD",
          value: "0",
        },
        step: [
          {
            "@type": "HowToStep",
            position: 1,
            name: "Pick a game",
            text: "Choose Chain Reaction, Skribbl, Smash Karts, Hole.io or Who's the Spy from the Yaply shelf.",
            url: `${SITE_URL}/games`,
          },
          {
            "@type": "HowToStep",
            position: 2,
            name: "Open a room",
            text: "Create a room and get a short room code. No account or install is needed.",
            url: `${SITE_URL}/`,
          },
          {
            "@type": "HowToStep",
            position: 3,
            name: "Send the link",
            text: "Send the room code or link to your group chat. Everyone opens the same room in their browser.",
            url: `${SITE_URL}/`,
          },
          {
            "@type": "HowToStep",
            position: 4,
            name: "Play",
            text: "Play on a phone, tablet or desktop. Scores, turns and rematches stay in the room.",
            url: `${SITE_URL}/`,
          },
        ],
      },
    ],
  };
}

export function gamesSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/games#webpage`,
        url: `${SITE_URL}/games`,
        name: "Yaply Games — all browser games",
        description:
          "Browse every Yaply browser game: Chain Reaction, Skribbl, Smash Karts, Hole.io, Ludo and Who's the Spy. Free to play, no installs and no account.",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORGANIZATION_ID },
        inLanguage: "en",
        keywords: GAME_KEYWORDS.join(", "),
        mainEntity: { "@id": `${SITE_URL}/games#games` },
      },
      gamesItemListNode(`${SITE_URL}/games#games`),
      breadcrumbNode([
        { name: "Yaply", path: "/" },
        { name: "Games", path: "/games" },
      ]),
    ],
  };
}

export function aboutSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      {
        "@type": "AboutPage",
        "@id": `${SITE_URL}/about#webpage`,
        url: `${SITE_URL}/about`,
        name: "About Yaply",
        description:
          "Yaply is a browser games platform for game night. One link, no installs and a small shelf of multiplayer games built to start fast.",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORGANIZATION_ID },
        inLanguage: "en",
        keywords: GAME_KEYWORDS.join(", "),
      },
      breadcrumbNode([
        { name: "Yaply", path: "/" },
        { name: "About", path: "/about" },
      ]),
    ],
  };
}

export function appsSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/apps#webpage`,
        url: `${SITE_URL}/apps`,
        name: "Install the Yaply apps",
        description:
          "Install Yaply and each browser game as its own app. Chain Reaction, Skribbl, Smash Karts, Hole.io and Who's the Spy each get a separate home-screen icon.",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORGANIZATION_ID },
        inLanguage: "en",
        keywords: GAME_KEYWORDS.join(", "),
        mainEntity: {
          "@type": "ItemList",
          "@id": `${SITE_URL}/apps#apps`,
          name: "Yaply apps",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Yaply",
              url: `${SITE_URL}/install`,
            },
            ...games
              .filter((game) => game.url)
              .map((game, index) => ({
                "@type": "ListItem",
                position: index + 2,
                name: game.name,
                url: game.url ?? `${SITE_URL}/games/${game.slug}`,
              })),
          ],
        },
      },
      breadcrumbNode([
        { name: "Yaply", path: "/" },
        { name: "Apps", path: "/apps" },
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
        "@id": `${SITE_URL}/install#webpage`,
        url: `${SITE_URL}/install`,
        name: "Install Yaply",
        description:
          "Install Yaply on your phone, tablet or desktop. Put every Yaply game one tap away with no app store and no account.",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORGANIZATION_ID },
        inLanguage: "en",
        keywords: GAME_KEYWORDS.join(", "),
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/install#app`,
        name: "Yaply",
        url: `${SITE_URL}/install`,
        description:
          "Yaply is an installable browser games platform. Add the games shelf to your home screen and open it in its own window.",
        applicationCategory: "GameApplication",
        operatingSystem: "Android, iOS, Windows, macOS, Linux",
        browserRequirements: "Requires a modern browser with JavaScript enabled.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/install`,
        },
        featureList: [
          "Install without an app store",
          "Play every Yaply browser game",
          "Works on Android, iOS and desktop",
          "No account required",
        ],
        publisher: { "@id": ORGANIZATION_ID },
        isAccessibleForFree: true,
      },
      breadcrumbNode([
        { name: "Yaply", path: "/" },
        { name: "Install", path: "/install" },
      ]),
    ],
  };
}

export function gamePageSchema(game: GameEntry) {
  const pageUrl = `${SITE_URL}/games/${game.slug}`;
  const image = game.ogImage ?? {
    src: game.poster,
    width: 900,
    height: 1200,
    alt: game.alt,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      gameNode(game),
      {
        "@type": "WebPage",
        "@id": `${pageUrl}/#webpage`,
        url: pageUrl,
        name: game.seoTitle ?? `${game.name} on Yaply`,
        description: game.seoDescription ?? game.statement,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": `${pageUrl}/#game` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${SITE_URL}${image.src}`,
          width: image.width,
          height: image.height,
          caption: image.alt,
        },
        inLanguage: "en",
        ...(game.keywords?.length
          ? { keywords: game.keywords.join(", ") }
          : {}),
      },
      breadcrumbNode([
        { name: "Yaply", path: "/" },
        { name: "Games", path: "/games" },
        { name: game.name, path: `/games/${game.slug}` },
      ]),
      ...(game.faqs?.length
        ? [faqNode(game.faqs, `${pageUrl}/#faq`)]
        : []),
    ],
  };
}
