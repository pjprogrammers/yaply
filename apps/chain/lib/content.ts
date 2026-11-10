/**
 * Shared Chain Reaction copy. Metadata, JSON-LD and the LLM discovery routes
 * all read from this file so the visible page and structured data stay in sync.
 */

export const GAME_NAME = "Chain Reaction";

/** Common spellings and searches for the game. */
export const GAME_ALIASES = [
  "Chain Reaction game",
  "Chain reaction board game",
  "Chain Reaction online",
  "Play Chain Reaction",
  "Yaply Chain Reaction",
  "Chain Reaction by Yaply",
  "Yaply Chain",
  "Orb chain game",
  "Chain Reaction orb game",
  "Chain Reaction ggame",
];

export const GAME_KEYWORDS = [
  "chain reaction",
  "chain reaction game",
  "chain reaction ggame",
  "yaply chain reaction",
  "yaply",
  "yaply games",
  "chain reaction online",
  "play chain reaction",
  "chain reaction board game",
  "chain reaction orb game",
  "orb game",
  "orb strategy game",
  "turn based strategy game",
  "strategy browser game",
  "board game online",
  "free board game",
  "games to play with friends",
  "games to play with friends online",
  "play games with friends online",
  "online party games",
  "browser party games",
  "no download games",
  "pass and play game",
  "local multiplayer game",
];

export const GAME_DESCRIPTION =
  "Play Chain Reaction, a free online chain reaction game by Yaply for 2–8 players. Claim cells, stack orbs past their critical mass and watch one pop flip the whole board.";

export const GAME_SHORT_DESCRIPTION =
  "A turn-based board game for 2–8 players. Stack orbs past their critical mass and watch the chain flip the table.";

export const ABOUT_SECTIONS = [
  {
    id: "what-is-chain-reaction",
    title: "What is Chain Reaction?",
    paragraphs: [
      "Chain Reaction is a free online chain reaction game, turn-based orb strategy game and board game made by Yaply. Two to eight players claim cells on a grid, stack orbs and push a cell past its critical mass. When it pops, one orb flies into each neighbouring cell and can set off a chain that flips the whole board.",
      "Every cell has a breaking point: corners pop at 2 orbs, edges at 3 and middle cells at 4. The board is the whole game. There is no luck, no cards and no hidden information — only the shape of the table after your last move.",
    ],
  },
  {
    id: "play-with-friends",
    title: "A chain reaction game for game night",
    paragraphs: [
      "Chain Reaction is built for 2–8 friends in a private online room, on one device in pass-and-play, or against easy, medium or hard CPUs. The host picks from four board sizes — 9×5, 11×6, 15×8 and 18×10 — plus a 30–60 second turn clock, a palette and a table theme.",
      "It is also searched as the chain reaction game, chain reaction board game, Yaply Chain Reaction or yaply chain reaction. Yaply Games (also written YaplyGames) is the browser games platform behind it, with Chain Reaction sitting alongside Skribbl, Smash Karts, Hole.io and Who's the Spy. There is no account, no download and no lobby wait: share a six-character room code or one link, and the first orb can land immediately. Games open on a fullscreen 3D table on phone, tablet or desktop.",
    ],
  },
];

export const FAQS = [
  {
    question: "What is Chain Reaction?",
    answer:
      "Chain Reaction is a free online chain reaction game and turn-based strategy board game for 2–8 players. You claim cells, stack orbs past their critical mass and let the cascade flip the board. It is made by Yaply and runs in a browser with no account or download.",
  },
  {
    question: "Is Chain Reaction free on Yaply?",
    answer:
      "Yes. Chain Reaction is free to play on Yaply. There is no account, no download, no shop and no energy meter. Open the page, pick a table and start a game or share a room code.",
  },
  {
    question: "How many players can play Chain Reaction?",
    answer:
      "Two to eight players. You can play online with friends in a private room, pass one device around in pass-and-play, or fill the other seats with CPUs.",
  },
  {
    question: "Can I play Chain Reaction with friends online?",
    answer:
      "Yes. Create a private room, share the six-character code or room link, and everyone joins from their own phone, tablet or desktop browser. There is no public lobby and no random matchmaking.",
  },
  {
    question: "Can I play Chain Reaction against the computer?",
    answer:
      "Yes. The solo mode fills the other seats with easy, medium or hard CPUs. It uses the same critical-mass rules as a multiplayer game and is a good place to learn the angles before playing people.",
  },
  {
    question: "Does Chain Reaction work on a phone?",
    answer:
      "Yes. The board, room controls and chat are built for phones, tablets and desktop browsers. The game can also be installed as a home-screen web app and opens in its own fullscreen window.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No. Pick a nickname, create a room or join with a six-character code. Your name is saved in this browser for next time.",
  },
  {
    question: "What is critical mass?",
    answer:
      "The number of orbs a cell can hold before it pops: corners 2, edges 3 and the middle 4. Add one more orb and it bursts into its orthogonal neighbours.",
  },
  {
    question: "Can I place an orb on an opponent's cell?",
    answer:
      "No. You can only place on an empty cell or one you already own. Cells change hands when a chain wave hits them, not when you tap them.",
  },
  {
    question: "What happens when my turn clock runs out?",
    answer:
      "The game auto-plays a legal cell for you, preferring one of your own cells that is one orb from popping. The clock keeps the table moving.",
  },
  {
    question: "How do I win Chain Reaction?",
    answer:
      "Leave every opponent with zero orbs. The last colour on the board wins. If a chain takes the last orb from several players at once, the surviving player takes it.",
  },
  {
    question: "Can I change the table after the game starts?",
    answer:
      "Settings lock while a game is running. The host can reopen them before a rematch without rebuilding the room.",
  },
  {
    question: "Is Yaply Chain Reaction the same as other chain reaction games?",
    answer:
      "No. Chain Reaction by Yaply is an original browser board game built by Yaply. It uses the classic orb-chain format but is not affiliated with any other chain reaction game, app or third-party product.",
  },
];

export const STEPS = [
  {
    title: "Create or join a room",
    body: "Pick a nickname, choose a board and turn clock, then open a private room or join one with a six-character code. No account is needed.",
  },
  {
    title: "Place one orb",
    body: "On your turn, place one orb on an empty cell or on a cell you already own. Opponent cells are off-limits until a chain takes them.",
  },
  {
    title: "Fill to critical mass",
    body: "Corners pop at 2 orbs, edges at 3 and middle cells at 4. Add the orb that crosses the limit and the cell bursts.",
  },
  {
    title: "Let the chain run",
    body: "Each pop sends one orb into every orthogonal neighbour. Any cell pushed past its own limit pops next, flipping colours as the wave crosses the board.",
  },
  {
    title: "Be the last colour",
    body: "A player with no orbs is eliminated. The last player still holding a colour wins, and their orb count is the score.",
  },
  {
    title: "Rematch",
    body: "The host can restart from the final score screen with the same table and settings, or change the board before the next game.",
  },
];

export const TIPS = [
  "Build from a corner first. A corner only needs 2 orbs to pop, so it is the cheapest fuse on the board.",
  "Keep one orb of breathing room in your own cells. A full cell is a threat to your opponents, but it is also a chain waiting to be triggered against you.",
  "Watch the player before you. If their board is one orb from a cascade, placing anywhere near it can hand them the table.",
  "Trade early cells for board shape. A connected cluster is worth more than the same number of orbs scattered across the grid.",
  "On larger boards, play the edges. A long chain that runs along a 15×8 or 18×10 table is harder to stop than a short burst in the middle.",
];
