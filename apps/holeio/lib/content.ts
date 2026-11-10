/**
 * Shared game copy. Kept framework-free so metadata, structured data, the
 * landing page, the how-it-works panel and the LLM discovery routes all read
 * from one source of truth.
 */

export const GAME_NAME = "Hole.io";

/** Common ways players write the name in search and chat. */
export const GAME_ALIASES = [
  "Holeio",
  "Hole io",
  "Hole io game",
  "Hole.io game",
  "Hole.io online",
  "Hole game",
  "Yaply Hole.io",
  "Yaply Holeio",
];

export const GAME_KEYWORDS = [
  "hole io",
  "holeio",
  "hole io game",
  "hole game",
  "play hole io",
  "hole.io online",
  "free hole game",
  "browser arcade game",
  "io games",
  "games to play with friends",
  "play games with friends online",
  "yaply",
  "yaply holeio",
  "swallow the city game",
  "two minute browser game",
];

export const GAME_DESCRIPTION =
  "Hole.io is a free browser arcade game by Yaply. Steer a growing hole through a live city, swallow cars, trees and buildings, and out-eat seven rival holes in two minutes.";

export const GAME_SHORT_DESCRIPTION =
  "Two minutes. Eight holes. One city that disappears block by block.";

export type Faq = {
  q: string;
  a: string;
};

export const FAQS: Faq[] = [
  {
    q: "Is Hole.io free?",
    a: "Yes. The game runs in the browser, the whole match is free, and there is no account, no energy meter and no shop. Open the page and press play.",
  },
  {
    q: "What do I actually do?",
    a: "Steer your hole through the city and swallow things smaller than your rim. Cars, trees, people, kiosks and eventually whole buildings all count. The bigger you get, the more the street becomes food.",
  },
  {
    q: "How long is a match?",
    a: "Two minutes. There is a short countdown, then the clock runs. When it hits zero the table is final and you can restart immediately.",
  },
  {
    q: "Who are the other holes?",
    a: "Seven AI-controlled rivals with different appetites. They hunt food, avoid bigger holes, and will happily swallow a smaller one. A leaderboard tracks the whole field live.",
  },
  {
    q: "Can I eat another hole?",
    a: "If your rim is clearly bigger than theirs, yes. Catch a smaller rival and you take a cut of their score. If the other hole is bigger, run: the same rule applies to you.",
  },
  {
    q: "Does it work on a phone?",
    a: "Yes. The game uses a touch joystick on phones and tablets, with the same world and the same two-minute match. The interface is built to stay out of the way of your thumb.",
  },
  {
    q: "What are the controls on desktop?",
    a: "WASD or the arrow keys to move, or point with the mouse and the hole follows. Escape or P pauses. The match pauses by itself if you switch tabs.",
  },
  {
    q: "Can I install it?",
    a: "Yes. Hole.io installs from the browser on Android, iPhone, iPad and desktop. It opens in its own window with a home-screen icon, and there is a step-by-step install page if you need it.",
  },
  {
    q: "Is this the original Hole.io?",
    a: "This is an original browser arcade game built by Yaply: original code, original city, original art. It follows the classic swallow-the-city formula, not any company's proprietary assets.",
  },
];

export type Stage = {
  id: string;
  number: string;
  title: string;
  body: string;
  stat: string;
  note: string;
  image: string;
  alt: string;
};

export const STAGES: Stage[] = [
  {
    id: "drop",
    number: "01",
    title: "Drop in",
    body: "You start as a pothole with an appetite. The city is already awake: traffic moving, pedestrians crossing, seven other holes taking their first bites.",
    stat: "3.2 s",
    note: "Countdown, then the street is yours.",
    image: "/media/game-hero.png",
    alt: "A hole on a city street at the start of a match",
  },
  {
    id: "feed",
    number: "02",
    title: "Feed",
    body: "Anything smaller than your rim goes down. Start with bins and bollards, graduate to cars and trees, then take the corner buildings whole.",
    stat: "1.1 m",
    note: "Starting rim. It grows with every swallow.",
    image: "/media/game-street.png",
    alt: "A hole swallowing street objects in the city",
  },
  {
    id: "hunt",
    number: "03",
    title: "Hunt",
    body: "Rival holes are food too. Circle a smaller one, or get out of the way when a bigger one leans in. The leaderboard moves every second.",
    stat: "8 holes",
    note: "One city, seven rivals, no teams.",
    image: "/media/game-swallow.png",
    alt: "Two rival holes close together on a street",
  },
  {
    id: "top",
    number: "04",
    title: "Top the table",
    body: "Two minutes later the city is a rumour and the table is final. Your best score is kept in this browser so the next run has a number to beat.",
    stat: "2:00",
    note: "Then play again, slightly hungrier.",
    image: "/media/game-results-tall.png",
    alt: "The final leaderboard after a match",
  },
];

export const ABOUT_SECTIONS = [
  {
    id: "what-is-hole-io",
    title: "What is Hole.io?",
    paragraphs: [
      "Hole.io is a free browser game about swallowing a city. You start as a small pothole, eat everything smaller than your rim, and grow until cars, trees and corner buildings disappear. Eight holes share the same map and only the biggest one tops the table after two minutes.",
      "It is an arcade game you can open in a tab on a phone, tablet or desktop. There is no download, no account and no launcher: press play and the match starts. Players also find it as holeio, hole io game or Yaply Hole.io.",
    ],
  },
  {
    id: "play-with-friends",
    title: "A hole game for game night",
    paragraphs: [
      "Hole.io is built for quick rounds with friends. Create a room, share the code, and fill any empty seats with bots. One link gets everyone into the same city, and every match is short enough to run again while the group chat is still typing.",
      "Looking for games to play with friends online? This is the low-friction end of the shelf: one thumb to move, two minutes per round, and no rules to explain beyond eat what is smaller than you.",
    ],
  },
];

export const TIPS = [
  "Start with bins, bollards and benches. They are everywhere and they grow your rim before the traffic gets close.",
  "Cut across traffic instead of following it. A car that turns into your path is an easy swallow.",
  "Only hunt a rival when your rim is clearly bigger. A close call usually belongs to the larger hole.",
  "Keep moving along fresh blocks. The leaderboard rewards constant eating, not guarding one corner.",
];
