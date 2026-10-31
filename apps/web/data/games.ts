import { CHAIN_REACTION_URL, SKRIBBL_URL } from "@/lib/game-urls";

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
    url: null,
    status: "coming-soon",
    tag: "Mystery",
    color: "#070707",
    disc: "#1fc27a",
    ink: "light",
    poster: "/games/whos-the-spy.png",
    alt: "Who's the Spy cover with a large yellow magnifying glass on black",
  },
  {
    id: "smash-karts",
    slug: "smash-karts",
    name: "Smash Karts",
    description: "Race, battle, and fight for first place.",
    statement: "Short races, big collisions and first place or nothing.",
    url: null,
    status: "coming-soon",
    tag: "Racing",
    color: "#1fc27a",
    disc: "#1423b8",
    ink: "dark",
    poster: "/games/smash-karts.png",
    alt: "Smash Karts cover with a black kart and speed lines on green",
  },
];

export const availableGames = games.filter((game) => game.status === "available");

export function gameHref(game: GameEntry) {
  return game.url || `/games/${game.slug}`;
}

export function gameStatusLabel(game: GameEntry) {
  return game.status === "available" ? "Live now" : "Coming soon";
}
