import type { WeaponId } from "@/game/types";

interface WeaponGlyphProps {
  weapon: WeaponId;
  className?: string;
}

export function WeaponGlyph({ weapon, className = "h-7 w-7" }: WeaponGlyphProps) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {weapon === "pulse" && (
        <g {...common}>
          <path d="M8 24h13M27 24h13" />
          <path d="M14 17l7 7-7 7M27 17l7 7-7 7" />
        </g>
      )}
      {weapon === "missile" && (
        <g {...common}>
          <path d="M10 30c8-11 17-16 28-16l-3 9 3 9c-11 0-20-5-28-2Z" />
          <path d="M10 30l8-1-5 9-7 1 4-9Z" />
          <circle cx="31" cy="23" r="3" />
        </g>
      )}
      {weapon === "mine" && (
        <g {...common}>
          <ellipse cx="24" cy="27" rx="12" ry="6" />
          <path d="M12 24v6M36 24v6M24 12v6M24 33v6M14 17l4 4M34 17l-4 4M14 34l4-4M34 34l-4-4" />
          <circle cx="24" cy="24" r="2.4" fill="currentColor" />
        </g>
      )}
      {weapon === "shield" && (
        <g {...common}>
          <path d="M24 8l13 5v11c0 9-6 15-13 17-7-2-13-8-13-17V13l13-5Z" />
          <path d="M18 24l4 5 8-10" />
        </g>
      )}
      {weapon === "turbo" && (
        <g {...common}>
          <path d="M12 32l12-20h8l-7 12h11L17 40l4-12H12Z" />
        </g>
      )}
      {weapon === "shock" && (
        <g {...common}>
          <circle cx="24" cy="24" r="5" />
          <path d="M24 6v7M24 35v7M6 24h7M35 24h7M11 11l5 5M32 32l5 5M37 11l-5 5M16 32l-5 5" />
        </g>
      )}
    </svg>
  );
}
