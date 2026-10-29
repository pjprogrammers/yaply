export type Faq = {
  question: string;
  answer: string;
};

export const faqs: Faq[] = [
  {
    question: "What is Yaply?",
    answer:
      "Yaply is a browser games platform for friends. It brings fast multiplayer party games together in one place, so a game night starts with a link instead of a download.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. Every Yaply game opens in a modern browser on a phone, tablet or laptop. There is no app store step and no download.",
  },
  {
    question: "Which games can I play right now?",
    answer:
      "Chain Reaction and Skribbl are live. Ludo, Who's the Spy and Smash Karts are in development and will open on the same platform.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No account is needed to start. Pick a name, create a room and share the code. Friends join from the same link.",
  },
  {
    question: "Does Yaply work on a phone?",
    answer:
      "Yes. The games are built mobile-first, with portrait rooms and touch-sized controls, and they run just as well on a laptop.",
  },
  {
    question: "How do I invite friends?",
    answer:
      "Share the room code or send the room link in any chat. Everyone who opens it joins the same lobby.",
  },
];
