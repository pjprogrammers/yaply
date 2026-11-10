import {
  CHAIN_REACTION_URL,
  HOLEIO_URL,
  SKRIBBL_URL,
  SMASHKARTS_URL,
  WHOS_THE_SPY_URL,
} from "@/lib/game-urls";

export type GameStatus = "available" | "coming-soon";

export type GameEntry = {
  id: string;
  slug: string;
  name: string;
  description: string;
  statement: string;
  url: string | null;
  status: GameStatus;
  tag?: string;
  color: string;
  disc: string;
  ink: "light" | "dark";
  poster: string;
  alt: string;
  /** Optional wide social card. Falls back to the portrait poster. */
  ogImage?: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
  /** Optional search/social copy for games with their own landing copy. */
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  about?: string[];
  faqs?: { question: string; answer: string }[];
};

export const games: GameEntry[] = [
  {
    id: "chain",
    slug: "chain-reaction",
    name: "Chain Reaction",
    description: "Outsmart your opponents, one move at a time.",
    statement: "Expanding orbs, a shrinking board and absolutely no mercy.",
    url: CHAIN_REACTION_URL,
    status: "available",
    tag: "Strategy",
    color: "#1423b8",
    disc: "#e9479f",
    ink: "light",
    poster: "/games/chain-reaction.png",
    alt: "Chain Reaction cover with yellow orbital orbs on a blue field",
  },
  {
    id: "skribbl",
    slug: "skribbl",
    name: "Skribbl",
    description: "Draw, guess, and compete with friends.",
    statement: "One canvas, wild guesses and no drawing talent required.",
    url: SKRIBBL_URL,
    status: "available",
    tag: "Party",
    color: "#f7dd47",
    disc: "#070707",
    ink: "dark",
    poster: "/games/skribbl.png",
    alt: "Skribbl cover with a pink drawing on a yellow field",
    seoTitle: "Skribbl — free online drawing game to play with friends",
    seoDescription:
      "Play Skribbl free in your browser on Yaply. A private drawing and guessing game for 2–12 friends: create a room, share the code and race to guess the drawing. Also known as scribbl, skribble or Yaply Skribbl.",
    keywords: [
      "skribbl",
      "skribbl game",
      "scribbl",
      "scribbl game",
      "skribble",
      "drawing game",
      "drawing and guessing game",
      "online drawing game",
      "free drawing game",
      "multiplayer drawing game",
      "pictionary game online",
      "games to play with friends",
      "games to play with friends online",
      "play games with friends online",
      "online party games",
      "yaply",
      "yaply skribbl",
      "skribbl io alternative",
    ],
    about: [
      "Skribbl is a free online drawing and guessing game on Yaply. One player gets a secret word and a blank canvas, everyone else types guesses into the room chat, and the fastest correct guess earns the most points. Turns rotate so every player gets the pen once per round.",
      "Create a private room and share the six-letter code with 2–12 friends. The host picks the word pack, number of rounds, draw time and player cap. Words are available in English, Filipino, Japanese and Korean, so a mixed group can still share one canvas.",
      "Skribbl by Yaply is also written as scribbl, skribble or Yaply Skribbl. It is an original browser party game and is not affiliated with skribbl.io. It is one of the easiest games to play with friends online: one link, one pen and no download or account.",
    ],
    faqs: [
      {
        question: "What is Skribbl?",
        answer:
          "Skribbl is a free online drawing and guessing game for 2–12 players. One player draws a secret word while everyone else races to guess it in chat. It is also written as scribbl, skribble or Yaply Skribbl.",
      },
      {
        question: "Is Skribbl free on Yaply?",
        answer:
          "Yes. Skribbl is free to play in the browser on Yaply. There is no account, no shop and no energy meter — open the game, create a room and share the code.",
      },
      {
        question: "Can I play Skribbl with friends online?",
        answer:
          "Yes. Create a private room, share the six-letter code or room link, and everyone joins the same canvas from their own phone, tablet or desktop browser.",
      },
      {
        question: "Does Skribbl work on a phone?",
        answer:
          "Yes. The canvas accepts touch input and the room stacks into one column. A bigger screen makes drawing easier, but it is not required.",
      },
      {
        question: "Is Yaply Skribbl the same as skribbl.io?",
        answer:
          "No. Skribbl by Yaply is an original browser drawing and guessing game built by Yaply. It follows the classic draw-and-guess party format but is not affiliated with skribbl.io or any third-party game.",
      },
    ],
  },
  {
    id: "smash-karts",
    slug: "smash-karts",
    name: "Smash Karts",
    description: "Race, battle, and fight for first place.",
    statement: "Short races, big collisions and first place or nothing.",
    url: SMASHKARTS_URL,
    status: "available",
    tag: "Arena",
    color: "#1fc27a",
    disc: "#1423b8",
    ink: "dark",
    poster: "/games/smash-karts.png",
    alt: "Smash Karts cover with a black kart and speed lines on green",
  },
  {
    id: "holeio",
    slug: "holeio",
    name: "Hole.io",
    description: "Swallow the city, one block at a time.",
    statement: "Two minutes, seven rivals and a city small enough to eat.",
    url: HOLEIO_URL,
    status: "available",
    tag: "Arcade",
    color: "#dafa9c",
    disc: "#0f0f0f",
    ink: "dark",
    poster: "/games/holeio.png",
    alt: "Hole.io cover with a black hole swallowing buildings on a lime field",
    ogImage: {
      src: "/games/holeio-og.png",
      width: 1200,
      height: 630,
      alt: "Hole.io — a black hole swallowing a city block on a lime field",
    },
    seoTitle: "Hole.io — play the free hole io game on Yaply",
    seoDescription:
      "Play Hole.io free in your browser on Yaply. Swallow cars, trees and buildings, out-grow seven rival holes and top the leaderboard in two minutes. Also known as holeio, hole io game or Yaply Hole.io.",
    keywords: [
      "hole io",
      "holeio",
      "hole io game",
      "hole game",
      "play hole io",
      "hole.io online",
      "yaply holeio",
      "yaply",
      "free browser game",
      "io games",
      "games to play with friends",
      "play games with friends online",
      "two minute browser game",
    ],
    about: [
      "Hole.io is a free browser arcade game on Yaply. You start as a pothole, eat everything smaller than your rim, and grow until cars, trees and corner buildings disappear. Eight holes share one city and every match lasts two minutes.",
      "Play solo against seven AI rivals, or create a room and share the code with friends. It is one of the easiest games to play with friends online: one link, one thumb and no download, account or launcher.",
      "Hole.io is also written as holeio, hole io game or Yaply Hole.io. Open it in a browser on a phone, tablet or desktop, or install the web app for a home-screen icon.",
    ],
    faqs: [
      {
        question: "Is Hole.io free on Yaply?",
        answer:
          "Yes. Hole.io is free to play in the browser on Yaply. There is no account, no shop and no energy meter — open the game page and press play.",
      },
      {
        question: "Can I play Hole.io with friends?",
        answer:
          "Yes. Create an online room, share the code or link, and fill any empty seats with bots. Friends join the same two-minute match from their own browser.",
      },
      {
        question: "Does Hole.io work on a phone?",
        answer:
          "Yes. Hole.io uses a touch joystick on phones and tablets, with the same city and the same two-minute match as desktop.",
      },
      {
        question: "How long is a Hole.io match?",
        answer:
          "Two minutes. The leaderboard is final when the clock hits zero, and you can restart immediately.",
      },
      {
        question: "Is Yaply Hole.io the original Hole.io?",
        answer:
          "Yaply Hole.io is an original browser arcade game built by Yaply with original code, city and art. It follows the classic swallow-the-city formula rather than using another company's proprietary assets.",
      },
    ],
  },
  {
    id: "ludo",
    slug: "ludo",
    name: "Ludo",
    description: "A classic board game with friends.",
    statement: "The board you grew up with, rebuilt for a room link.",
    url: null,
    status: "coming-soon",
    tag: "Classic",
    color: "#e9479f",
    disc: "#1423b8",
    ink: "dark",
    poster: "/games/ludo.png",
    alt: "Ludo cover with a four colour board and a black die",
  },
  {
    id: "whos-the-spy",
    slug: "whos-the-spy",
    name: "Who's the Spy?",
    description: "Bluff, deduce, and expose the impostor.",
    statement: "Everyone has a word. One player is bluffing.",
    url: WHOS_THE_SPY_URL,
    status: "available",
    tag: "Mystery",
    color: "#070707",
    disc: "#1fc27a",
    ink: "light",
    poster: "/games/whos-the-spy.png",
    alt: "Who's the Spy cover with a large yellow magnifying glass on black",
  },
];

export const availableGames = games.filter((game) => game.status === "available");

export function gameHref(game: GameEntry) {
  return game.url || `/games/${game.slug}`;
}

export function gameStatusLabel(game: GameEntry) {
  return game.status === "available" ? "Live now" : "Coming soon";
}
