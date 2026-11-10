/**
 * Shared Skribbl copy. Metadata, JSON-LD, the landing page, the how-to page and
 * the LLM discovery routes all read from this one source so the facts never
 * drift apart.
 */

export const GAME_NAME = "Skribbl";

/** Common spellings and searches for the game. */
export const GAME_ALIASES = [
  "Skribbl game",
  "Skribbl by Yaply",
  "Yaply Skribbl",
  "Scribbl",
  "Scribbl game",
  "Skribble",
  "Drawing game",
  "Drawing and guessing game",
  "Online drawing game",
];

export const GAME_KEYWORDS = [
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
  "browser party games",
  "yaply",
  "yaply skribbl",
  "skribbl io alternative",
  "private drawing game",
  "no download drawing game",
];

export const GAME_DESCRIPTION =
  "Skribbl is a free online drawing and guessing game from Yaply for 2–12 players. Create a private room, share the six-letter code, draw a secret word and race to guess it. No download and no account.";

export const GAME_SHORT_DESCRIPTION =
  "A private drawing and guessing game for 2–12 friends. One canvas, wild guesses and no drawing talent required.";

export const ABOUT_SECTIONS = [
  {
    id: "what-is-skribbl",
    title: "What is Skribbl?",
    paragraphs: [
      "Skribbl is a free online drawing and guessing game made by Yaply. One player gets a secret word and a blank canvas, everyone else types guesses into the room chat, and the fastest correct guess earns the most points. Turns rotate so every player gets the pen once per round.",
      "It is the low-pressure end of game night: no download, no account and no rules to study. Create a private room, send the six-letter code to your group chat, and the first round starts as soon as everyone joins. Players also find it as scribbl, skribble, a drawing game or Yaply Skribbl.",
    ],
  },
  {
    id: "play-with-friends",
    title: "A drawing game for game night",
    paragraphs: [
      "Skribbl is built for 2–12 friends in the same room or on a call. The host chooses the word pack, number of rounds, draw time and player cap before the game. Words are available in English, Filipino, Japanese and Korean, so a mixed group can still share one canvas.",
      "Looking for games to play with friends online? This is the easy pick: one link, one pen and a 60–120 second round. It works on a phone, tablet or desktop, and a disconnected player keeps their seat for 30 seconds so a refresh does not end the night.",
    ],
  },
];

export const STEPS = [
  {
    title: "Pick a word",
    body: "The drawer gets three private words and twenty seconds to choose. If the clock runs out, the first word is picked automatically.",
  },
  {
    title: "Draw it badly",
    body: "Ink, size, undo and clear. Letters and numbers are off-limits. Confidence is not.",
  },
  {
    title: "Guess in chat",
    body: "Everyone types guesses into the room. A correct guess is announced and locks in points; wrong guesses stay in the chat.",
  },
  {
    title: "Pass the pen",
    body: "The word is revealed, scores move, and the next player takes over. Every player gets the pen once per round.",
  },
];

export const FAQS = [
  {
    question: "What is Skribbl?",
    answer:
      "Skribbl is a free online drawing and guessing game for 2–12 players. One player draws a secret word on a shared canvas while everyone else races to guess it in chat. It is also written as scribbl, skribble or Yaply Skribbl.",
  },
  {
    question: "Is Skribbl free?",
    answer:
      "Yes. Skribbl is completely free to play in a browser. There is no download, no account, no shop and no energy meter. Create a room, share the code and play.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No. Pick a nickname, create a room or enter a six-letter code. Your nickname is saved in this browser for next time.",
  },
  {
    question: "How many people can play?",
    answer:
      "Two to twelve players in a room. Every player draws once per round, so a full room keeps the pen moving.",
  },
  {
    question: "Can I play Skribbl with friends online?",
    answer:
      "Yes. Create a private room and send the six-letter code or the room link to your friends. Everyone joins the same canvas from their own phone, tablet or desktop browser.",
  },
  {
    question: "Is this the same as skribbl.io?",
    answer:
      "No. Skribbl by Yaply is an original browser drawing and guessing game built by Yaply. It is not affiliated with skribbl.io or any other third-party game. It follows the classic draw-and-guess party format.",
  },
  {
    question: "What happens if someone disconnects?",
    answer:
      "Their seat is held for 30 seconds. Refresh in that window and the same seat, score and resume token come back.",
  },
  {
    question: "Does it work on a phone?",
    answer:
      "Yes. The canvas accepts touch input and the room stacks into one column. A bigger screen makes drawing easier, but it is not required.",
  },
  {
    question: "Who controls the room settings?",
    answer:
      "The host sets the word pack, rounds, draw time, word choices and player cap in the lobby. Settings lock when the game starts and can change again before a rematch.",
  },
  {
    question: "When does a round end?",
    answer:
      "When everyone has guessed or the clock hits zero. The word is revealed, the drawer scores for the guesses they earned, and the next player takes the pen.",
  },
];

export const TIPS = [
  "Draw the most obvious shape first. A recognisable outline beats a detailed masterpiece.",
  "Use the whole canvas. Small drawings are harder to read on a phone.",
  "Guess early. Correct guesses start at 100 points and fall as the clock runs down.",
  "Save letters and numbers for the chat. The drawing canvas does not allow them.",
];
