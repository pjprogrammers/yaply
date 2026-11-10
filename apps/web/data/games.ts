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
  /** Common spellings, names and searches used for schema and AI discovery. */
  aliases?: string[];
  keywords?: string[];
  about?: string[];
  faqs?: { question: string; answer: string }[];
  playerCount?: { min: number; max: number };
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
    seoTitle: "Chain Reaction — play the free orb strategy game online",
    seoDescription:
      "Play Chain Reaction free in your browser on Yaply. Claim cells, stack orbs past their critical mass and let the chain flip the table. 2–8 players online, pass-and-play or against CPUs. Also known as chain reaction game or Yaply Chain Reaction.",
    aliases: [
      "Chain Reaction game",
      "Yaply Chain Reaction",
      "Chain Reaction online",
      "Orb chain game",
      "Chain reaction board game",
    ],
    keywords: [
      "chain reaction",
      "chain reaction game",
      "chain reaction online",
      "play chain reaction",
      "chain reaction board game",
      "orb game",
      "orb strategy game",
      "turn based strategy game",
      "strategy browser game",
      "games to play with friends",
      "games to play with friends online",
      "online party games",
      "yaply",
      "yaply chain reaction",
    ],
    about: [
      "Chain Reaction is a free turn-based strategy game on Yaply. Place an orb on an empty cell or stack one on a cell you already own. Every cell has a critical mass: corners pop at two orbs, edges at three and the middle at four. Push a cell past its limit and it bursts into its orthogonal neighbours, flipping colours as the chain runs across the board.",
      "Play online with 2–8 friends in a private room, pass one device around for a local match, or fill empty seats with easy, medium or hard CPUs. The host can choose from four board sizes, set a 30–60 second turn clock and pick the table palette.",
      "Chain Reaction is also written as chain reaction game, Yaply Chain Reaction or the orb chain game. It is an original browser strategy game built by Yaply and one of the quickest games to play with friends online: one room code, no download and no account.",
    ],
    faqs: [
      {
        question: "What is Chain Reaction?",
        answer:
          "Chain Reaction is a free turn-based browser strategy game for 2–8 players. Claim cells, stack orbs and push a cell past its critical mass to send a chain reaction across the board.",
      },
      {
        question: "Is Chain Reaction free on Yaply?",
        answer:
          "Yes. Chain Reaction is free to play in the browser on Yaply. There is no account, no download and no launcher — open the game page and start a room.",
      },
      {
        question: "Can I play Chain Reaction with friends online?",
        answer:
          "Yes. Create a private room, share the six-character code or room link, and everyone joins the same table from their own phone, tablet or desktop.",
      },
      {
        question: "What is critical mass in Chain Reaction?",
        answer:
          "The number of orbs a cell can hold before it pops: corners 2, edges 3 and the middle 4. Add one more orb and it bursts into its orthogonal neighbours.",
      },
      {
        question: "Does Chain Reaction work on a phone?",
        answer:
          "Yes. The board supports touch input, and online, pass-and-play and CPU matches all work on phones, tablets and desktop browsers.",
      },
    ],
    playerCount: { min: 2, max: 8 },
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
    aliases: [
      "Skribbl game",
      "Yaply Skribbl",
      "Scribbl",
      "Scribbl game",
      "Skribble",
      "Drawing and guessing game",
    ],
    playerCount: { min: 2, max: 12 },
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
    seoTitle: "Smash Karts — play the free kart arena game online",
    seoDescription:
      "Play Smash Karts free in your browser on Yaply. Drift, fire and ram through scrap-built arenas with eleven weapons and up to seven bots. Also known as SmashKarts, Smash Karts game or Yaply Smash Karts.",
    aliases: [
      "SmashKarts",
      "Smash Karts game",
      "Yaply Smash Karts",
      "Smash Karts online",
      "Kart arena game",
      "Kart battle game",
    ],
    keywords: [
      "smash karts",
      "smashkarts",
      "smash karts game",
      "play smash karts",
      "smash karts online",
      "kart game",
      "kart arena game",
      "kart battle game",
      "racing battle game",
      "free browser game",
      "games to play with friends",
      "games to play with friends online",
      "yaply",
      "yaply smash karts",
    ],
    about: [
      "Smash Karts is a free-for-all kart arena game on Yaply. Race, drift, ram and fire through scrap-built maps, grab mystery crates and try to hold the lead before the arena turns on you. You carry one weapon at a time, so every crate is a gamble.",
      "Play solo against up to seven bots, or open a private room and invite friends from one link. The same game runs on a phone, tablet or desktop, with keyboard, touch and gamepad-friendly controls.",
      "Smash Karts is also written as SmashKarts, smash karts game or Yaply Smash Karts. It is an original browser kart arena built by Yaply, not a copy of another kart game, and it is free to play without an account.",
    ],
    faqs: [
      {
        question: "What is Smash Karts?",
        answer:
          "Smash Karts is a free-for-all kart arena game in the browser. Race, drift, ram opponents and fire weapons from mystery crates across scrap-built maps.",
      },
      {
        question: "Is Smash Karts free on Yaply?",
        answer:
          "Yes. Smash Karts is free to play in the browser on Yaply. There is no account, no download and no launcher.",
      },
      {
        question: "Can I play Smash Karts with friends?",
        answer:
          "Yes. Create a private room, share the room code or link, and friends can join the same arena. Empty seats can be filled with bots.",
      },
      {
        question: "Does Smash Karts work on a phone?",
        answer:
          "Yes. Smash Karts has touch controls built in and runs on phones, tablets and desktop browsers.",
      },
      {
        question: "How many weapons are in Smash Karts?",
        answer:
          "There are eleven weapons in the arsenal, from machine guns and rockets to mines and the nuke. You can carry one weapon at a time.",
      },
    ],
    playerCount: { min: 1, max: 8 },
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
    aliases: [
      "Hole.io game",
      "Holeio",
      "Hole IO",
      "Yaply Hole.io",
      "Hole io game",
      "Hole game",
    ],
    playerCount: { min: 1, max: 8 },
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
    seoTitle: "Ludo — coming soon to Yaply Games",
    seoDescription:
      "Ludo is coming soon to Yaply. The classic four-player board game will join the free browser games shelf, so a game night can start with one link and no download.",
    aliases: ["Ludo game", "Yaply Ludo", "Online Ludo"],
    keywords: [
      "ludo",
      "ludo game",
      "online ludo",
      "ludo board game",
      "play ludo online",
      "free ludo game",
      "yaply",
      "yaply ludo",
    ],
    about: [
      "Ludo is coming soon to Yaply. The classic four-colour board game will join the same free browser shelf as Chain Reaction, Skribbl, Smash Karts, Hole.io and Who's the Spy.",
      "When it launches, Ludo will open from one link on a phone, tablet or desktop. There will be no download, no launcher and no account, just a room code for friends.",
    ],
    faqs: [
      {
        question: "Is Ludo available on Yaply?",
        answer:
          "Not yet. Ludo is in development and will be added to the Yaply games shelf when it is ready to play.",
      },
      {
        question: "Will Ludo be free on Yaply?",
        answer:
          "Yes. Every Yaply game is free to play in the browser, and Ludo will follow the same one-link, no-account setup.",
      },
    ],
    playerCount: { min: 2, max: 4 },
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
    seoTitle: "Who's the Spy — play the free social deduction game online",
    seoDescription:
      "Play Who's the Spy free in your browser on Yaply. A social deduction party game for 3–12 players: everyone gets a secret word, but the spies get a different one. Give clues, read the room and vote them out. Also known as Who is the Spy or Yaply Who's the Spy.",
    aliases: [
      "Who is the Spy",
      "Who's the Spy game",
      "Whos the Spy",
      "Yaply Who's the Spy",
      "Social deduction game",
      "Spy party game",
    ],
    keywords: [
      "who's the spy",
      "who is the spy",
      "whos the spy",
      "who is the spy game",
      "spy game",
      "social deduction game",
      "social deduction party game",
      "impostor game",
      "word party game",
      "games to play with friends",
      "games to play with friends online",
      "online party games",
      "yaply",
      "yaply who's the spy",
    ],
    about: [
      "Who's the Spy is a free social deduction party game on Yaply for 3–12 players. Everyone opens a private card with a secret word. The civilians all share one word; the spies get a related but different word. The category is the only thing everyone agrees on.",
      "Players take turns giving one clue about their word, then vote in private. The table tries to find the player whose word does not quite fit. If the last spy is caught, they get one final guess at the civilian word and can still steal the win.",
      "Who's the Spy is also written as Who is the Spy, whos the spy or Yaply Who's the Spy. It is an original browser party game built by Yaply, with no download and no account. One room link is all a group needs to start bluffing.",
    ],
    faqs: [
      {
        question: "What is Who's the Spy?",
        answer:
          "Who's the Spy is a free social deduction party game for 3–12 players. Everyone gets a secret word, but the spies get a different one. Give clues, read the room and vote out the players who do not quite belong.",
      },
      {
        question: "Is Who's the Spy free on Yaply?",
        answer:
          "Yes. Who's the Spy is free to play in the browser on Yaply. There is no account, no download and no launcher.",
      },
      {
        question: "How many people can play Who's the Spy?",
        answer:
          "Three to twelve players. The host can start as soon as three players are connected, and the number of spies is set automatically while civilians keep a strict majority.",
      },
      {
        question: "Can I play Who's the Spy with friends online?",
        answer:
          "Yes. Create a private room, share the room code or link, and everyone joins the same game from their own phone, tablet or desktop.",
      },
      {
        question: "Does Who's the Spy work on a phone?",
        answer:
          "Yes. The room, private role cards, clues and voting are built for a phone-first group chat. A bigger screen is optional.",
      },
    ],
    playerCount: { min: 3, max: 12 },
  },
];

export const availableGames = games.filter((game) => game.status === "available");

export function gameHref(game: GameEntry) {
  return game.url || `/games/${game.slug}`;
}

export function gameStatusLabel(game: GameEntry) {
  return game.status === "available" ? "Live now" : "Coming soon";
}
