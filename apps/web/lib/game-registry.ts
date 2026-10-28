export type GameStatus = "implemented" | "prototype" | "coming-soon";

export type GameEntry = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  status: GameStatus;
  minPlayers?: number;
  maxPlayers?: number;
  route: string;
  primaryColor: string;
  accentColor: string;
  bgGradient: string;
  featured?: boolean;
};

export const GAMES: GameEntry[] = [
  {
    id: "skribbl",
    slug: "skribbl",
    name: "Skribbl",
    shortName: "SKRIBBL",
    tagline: "Draw something wild. See if your friends can guess it.",
    description: "Draw, guess, and laugh. The classic party drawing game.",
    status: "implemented",
    minPlayers: 2,
    maxPlayers: 8,
    route: "/games/skribbl/create",
    primaryColor: "#22d3ee",
    accentColor: "#a78bfa",
    bgGradient: "from-cyan-400/30 via-violet-500/20 to-fuchsia-500/20",
    featured: true,
  },
  {
    id: "whos-the-spy",
    slug: "whos-the-spy",
    name: "Who's the Spy?",
    shortName: "WHO'S THE SPY",
    tagline: "Keep your identity secret. Find the impostor.",
    description: "Bluff, deduce, and expose the spy before time runs out.",
    status: "coming-soon",
    minPlayers: 3,
    maxPlayers: 12,
    route: "/games/whos-the-spy",
    primaryColor: "#fb7185",
    accentColor: "#f59e0b",
    bgGradient: "from-rose-500/30 via-red-600/20 to-amber-500/10",
  },
  {
    id: "chain-reaction",
    slug: "chain-reaction",
    name: "Chain Reaction",
    shortName: "CHAIN REACTION",
    tagline: "Plan your moves. Trigger a chain of reactions.",
    description: "Strategic grid battles where one move can ignite everything.",
    status: "coming-soon",
    minPlayers: 2,
    maxPlayers: 6,
    route: "/games/chain-reaction",
    primaryColor: "#38bdf8",
    accentColor: "#22d3ee",
    bgGradient: "from-sky-400/30 via-cyan-400/20 to-blue-600/20",
  },
  {
    id: "ludo",
    slug: "ludo",
    name: "Ludo",
    shortName: "LUDO",
    tagline: "Roll the dice. Race your friends to victory.",
    description: "A familiar board game with a social twist.",
    status: "coming-soon",
    minPlayers: 2,
    maxPlayers: 4,
    route: "/games/ludo",
    primaryColor: "#fbbf24",
    accentColor: "#22c55e",
    bgGradient: "from-amber-400/30 via-yellow-300/20 to-emerald-400/20",
  },
  {
    id: "smash-karts",
    slug: "smash-karts",
    name: "Smash Karts",
    shortName: "SMASH KARTS",
    tagline: "Race, battle, and fight for first place.",
    description: "Fast-paced kart battles with friends.",
    status: "coming-soon",
    minPlayers: 2,
    maxPlayers: 8,
    route: "/games/smash-karts",
    primaryColor: "#ef4444",
    accentColor: "#fb923c",
    bgGradient: "from-red-500/30 via-orange-500/20 to-pink-500/20",
  },
];

export function getGameBySlug(slug: string) {
  return GAMES.find((g) => g.slug === slug);
}
