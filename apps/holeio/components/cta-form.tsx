"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readName, writeName } from "@/lib/settings";

export function CtaForm() {
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    const stored = readName();
    // One-time hydration from localStorage after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored && stored !== "You") setName(stored);
  }, []);

  return (
    <form
      className="cta-form"
      data-ui
      onSubmit={(event) => {
        event.preventDefault();
        const clean = name.trim().slice(0, 14) || "You";
        writeName(clean);
        router.push("/play");
      }}
    >
      <p className="cta-sentence display">
        Become{" "}
        <label className="cta-field">
          <span className="sr-only">Your player name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 14))}
            placeholder="your name"
            maxLength={14}
            autoComplete="nickname"
            spellCheck={false}
          />
        </label>{" "}
        the biggest hole in the city.{" "}
        <button type="submit" className="cta-submit">
          Play
          <span aria-hidden>→</span>
        </button>
      </p>
      <p className="cta-note">
        Free, no account, no download. Prefer a home-screen icon?{" "}
        <Link href="/install">Install the app</Link>.
      </p>
    </form>
  );
}
