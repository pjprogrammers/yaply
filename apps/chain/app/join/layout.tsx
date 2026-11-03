import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join a room | Chain Reaction",
  description:
    "Enter a six-character room code and a nickname to join a private Chain Reaction game.",
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
