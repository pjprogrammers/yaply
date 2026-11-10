/**
 * Shared Who's the Spy copy. Metadata, JSON-LD and the LLM discovery routes all
 * read from this file so the visible page and the structured data stay in sync.
 */

export const GAME_NAME = "Who's the Spy";

/** Common spellings and searches for the game. */
export const GAME_ALIASES = [
  "Who is the Spy",
  "Whos the Spy",
  "Who's the Spy game",
  "Whos the Spy game",
  "Yaply Who's the Spy",
  "Yaply Spy",
  "Spy game",
  "Social deduction game",
];

export const GAME_KEYWORDS = [
  "spy game",
  "whos the spy game",
  "whos the spy",
  "yaply",
  "yaply whos the spy",
  "who's the spy",
  "who is the spy",
  "who is the spy game",
  "who's the spy game",
  "spy party game",
  "social deduction game",
  "social deduction party game",
  "impostor game",
  "word party game",
  "deduction game",
  "online spy game",
  "free spy game",
  "games to play with friends",
  "games to play with friends online",
  "play games with friends online",
  "online party games",
  "browser party games",
  "no download games",
];

export const GAME_DESCRIPTION =
  "Play Who's the Spy, a free online spy game by Yaply for 3–12 players. Everyone gets a secret word, but the spies get a different one. Give clues, read the room and vote out the spy.";

export const GAME_SHORT_DESCRIPTION =
  "A social deduction party game for 3–12 players. Everyone gets a secret word, but the spies get a different one.";

export const ABOUT_SECTIONS = [
  {
    id: "what-is-whos-the-spy",
    title: "What is Who's the Spy?",
    paragraphs: [
      "Who's the Spy is a free online spy game and social deduction party game made by Yaply. Everyone opens a private card with a secret word. The civilians all share one word; the spies get a related but different word. The category is the only thing the whole table agrees on.",
      "Players take turns giving one clue about their word, then vote in private. The table is trying to find the player whose word does not quite fit. If the last spy is caught, they get one final guess at the civilian word and can still steal the win.",
    ],
  },
  {
    id: "play-with-friends",
    title: "A spy game for game night",
    paragraphs: [
      "Who's the Spy is built for 3–12 friends on separate phones, tablets or laptops. The host chooses the categories, spy count, timers and clue format, then sends one room link. There is no download, no account and no narrator.",
      "It is also searched as the whos the spy game, whos the spy, who's the spy game, spy game, Yaply Who's the Spy or yaply whos the spy. One round takes 10–20 minutes, with private ballots, a revote for ties and an optional final guess. Empty seats stay open for friends who join late, and a reconnect restores the same role and word.",
    ],
  },
];

export const FAQS = [
  {
    question: "What is Who's the Spy?",
    answer:
      "Who's the Spy is a free online spy game and social deduction party game for 3–12 players. Everyone gets a secret word, but the spies get a different one. Give clues, read the room and vote out the players who do not quite belong.",
  },
  {
    question: "Is Who's the Spy free on Yaply?",
    answer:
      "Yes. Who's the Spy is free to play in a browser on Yaply. There is no account, no download, no shop and no energy meter. Open the page, create a room and share the link.",
  },
  {
    question: "How many people can play Who's the Spy?",
    answer:
      "Three to twelve players. The host can start as soon as three players are connected. The number of spies is set automatically between one and three, and civilians always keep a strict majority.",
  },
  {
    question: "Can I play Who's the Spy with friends online?",
    answer:
      "Yes. Create a private room, share the room link or six-character code, and everyone joins from their own phone, tablet or desktop browser. There is no central lobby and no random matchmaking.",
  },
  {
    question: "Does Who's the Spy work on a phone?",
    answer:
      "Yes. The room, private role cards, clues and voting are built mobile-first. The game works on phones, tablets and desktop browsers, and it can be installed as a home-screen web app.",
  },
  {
    question: "What is the difference between civilians and spies?",
    answer:
      "Civilians share one secret word. The spies share a different but related word, and they know their word is different without knowing the civilian word. The spies win by surviving the votes or by guessing the civilian word after the last spy is caught.",
  },
  {
    question: "How do you win Who's the Spy?",
    answer:
      "Civilians win by voting out every spy. Spies win if they survive to the end, or if the last caught spy correctly guesses the civilian word. A tie vote gets one revote before nobody is eliminated.",
  },
  {
    question: "Do I need an account to play?",
    answer:
      "No. Choose a nickname, create a room or join with a six-character code. Your nickname is saved in the browser for next time, and no email or password is required.",
  },
  {
    question: "Is Yaply Who's the Spy the same as other spy games?",
    answer:
      "No. Who's the Spy by Yaply is an original browser party game built by Yaply. It follows the classic word-deduction format but is not affiliated with any other spy game, TV show or third-party app.",
  },
];

export const STEPS = [
  {
    title: "Create a room",
    body: "The host picks categories, spy count, clue format and voting time, then opens a private room.",
  },
  {
    title: "Share the link",
    body: "Send the room link or six-character code in the group chat. Everyone joins the same table from their own browser.",
  },
  {
    title: "Read your card",
    body: "Each player opens a private card. Civilians share one word; the spies get a related but different word.",
  },
  {
    title: "Give one clue",
    body: "Players take turns giving a single clue about their word. It has to prove you belong without giving the word away.",
  },
  {
    title: "Vote in private",
    body: "When the clue round ends, everyone votes in secret. The table eliminates the player whose word does not fit.",
  },
  {
    title: "Take the win",
    body: "Civilians win when every spy is out. Spies win by surviving, or by guessing the civilian word after the last spy is caught.",
  },
];
