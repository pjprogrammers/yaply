import type { Metadata } from "next";
import { CreateRoom } from "@/components/create-room";

export const metadata: Metadata = {
  title: "Set up a game | Chain Reaction",
  description:
    "Choose a board, turn clock and palette, then play online, pass-and-play or against CPUs.",
};

export default function CreatePage() {
  return <CreateRoom />;
}
