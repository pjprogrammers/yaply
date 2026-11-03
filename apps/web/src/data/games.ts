import { CHAIN_REACTION_URL, SKRIBBL_URL, SMASHKARTS_URL } from "@/lib/game-urls";

export type GameStatus = "available" | "coming-soon";

export type GameEntry = {
  id: string;
  name: string;
  description: string;
  url: string | null;
  status: GameStatus;
  tag?: string;
};

export const games: GameEntry[] = [
  {
    id: "chain",
    name: "Chain Reaction",
    description: "Outsmart your opponents, one move at a time.",
    url: CHAIN_REACTION_URL,
    status: "available",
    tag: "Strategy",
  },
  {
    id: "skribbl",
    name: "Skribbl",
    description: "Draw, guess, and compete with friends.",
    url: SKRIBBL_URL,
    status: "available",
    tag: "Party",
  },
  {
    id: "smash-karts",
    name: "Smash Karts",
    description: "Race, battle, and fight for first place.",
    url: SMASHKARTS_URL,
    status: "available",
    tag: "Arena",
  },
  {
    id: "ludo",
    name: "Ludo",
    description: "A classic board game with friends.",
    url: null,
    status: "coming-soon",
    tag: "Classic",
  },
  {
    id: "whos-the-spy",
    name: "Who's the Spy?",
    description: "Bluff, deduce, and expose the impostor.",
    url: null,
    status: "coming-soon",
    tag: "Mystery",
  },
];
