import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join a room | Skribbl",
  description:
    "Enter a six-character room code and a nickname to join a private Skribbl drawing game. No account needed.",
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
