import type { Metadata } from "next";
import { CreateRoom } from "@/components/create-room";

export const metadata: Metadata = {
  title: "Set up a room | Who's the Spy",
  description:
    "Choose categories, spy count, timers and room rules, then invite the table with one link.",
};

export default function CreatePage() {
  return <CreateRoom />;
}
