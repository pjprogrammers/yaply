import type { WeaponSlot } from "@/game/types";

interface WeaponGlyphProps {
  weapon: WeaponSlot;
  className?: string;
}

/**
 * One stroked icon per weapon. The circle HUD and the kill feed share these so
 * a weapon always reads the same way wherever it appears.
 */
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
      {weapon === "machinegun" && (
        <g {...common}>
          <path d="M7 20h20v8H7z" />
          <path d="M27 22h12v4H27z" />
          <path d="M12 28v8M18 28v5M24 28v8" />
          <path d="M11 16h8M11 12h5" />
        </g>
      )}
      {weapon === "bullets" && (
        <g {...common}>
          <path d="M12 34V19l4-5 4 5v15z" />
          <path d="M24 34V17l4-5 4 5v17z" />
          <path d="M36 34V21l4-5 4 5v13z" opacity="0.55" />
          <path d="M8 38h36" />
        </g>
      )}
      {weapon === "rockets" && (
        <g {...common}>
          <path d="M9 29c9-12 18-17 31-17l-4 10 4 10c-13 0-22-5-31-3Z" />
          <path d="M9 29l9-1-6 10-8 1 5-10Z" />
          <circle cx="32" cy="22" r="3" />
        </g>
      )}
      {weapon === "cannonballs" && (
        <g {...common}>
          <path d="M7 26h15l8 7H10z" />
          <circle cx="14" cy="34" r="4" />
          <path d="M30 34c0-6 4-10 9-10s9 4 9 10-4 8-9 8-9-2-9-8Z" />
          <path d="M35 30h8" opacity="0.6" />
        </g>
      )}
      {weapon === "nuke" && (
        <g {...common}>
          <path d="M24 8v10M14 12l6 8M34 12l-6 8" />
          <path d="M24 19c-7 0-12 5-12 11s5 10 12 10 12-4 12-10-5-11-12-11Z" />
          <path d="M18 34c2-5 4-7 6-7s4 2 6 7" />
          <circle cx="24" cy="29" r="2.2" />
        </g>
      )}
      {weapon === "grenuke" && (
        <g {...common}>
          <path d="M21 16h6v5h-6z" />
          <path d="M18 21h12l2 6-3 14H19l-3-14z" />
          <path d="M27 16l4-5M31 11l3 2" />
          <path d="M22 27h4M22 32h4" opacity="0.6" />
        </g>
      )}
      {weapon === "snowball" && (
        <g {...common}>
          <circle cx="24" cy="24" r="10" />
          <path d="M24 8v32M8 24h32M13 13l22 22M35 13 13 35" />
        </g>
      )}
      {weapon === "mines" && (
        <g {...common}>
          <ellipse cx="24" cy="27" rx="13" ry="7" />
          <path d="M11 24v6M37 24v6M24 11v7M24 34v7M14 17l5 5M34 17l-5 5" />
          <circle cx="24" cy="24" r="2.4" />
        </g>
      )}
      {weapon === "spikey" && (
        <g {...common}>
          <circle cx="24" cy="24" r="9" />
          <path d="M24 7v6M24 35v6M7 24h6M35 24h6M12 12l4 4M32 32l4 4M36 12l-4 4M16 32l-4 4" />
          <circle cx="24" cy="24" r="3" opacity="0.6" />
        </g>
      )}
      {weapon === "invincibility" && (
        <g {...common}>
          <path d="m24 6 5.6 11.4L42 19l-9 8.8 2.1 12.4L24 34.4 12.9 40.2 15 27.8 6 19l12.4-1.6Z" />
        </g>
      )}
      {weapon === "fakebox" && (
        <g {...common}>
          <path d="M10 16 24 9l14 7v18l-14 7-14-7z" />
          <path d="M10 16l14 7 14-7M24 23v18" />
          <path d="M19 14.5c0-3 2-5 5-5 3.2 0 5 2 5 4.4 0 3-4.5 3.4-4.5 6.1" />
          <circle cx="24.5" cy="23.4" r="1.3" />
        </g>
      )}
      {weapon === "none" && (
        <g {...common} opacity="0.55">
          <circle cx="24" cy="24" r="13" strokeDasharray="4 5" />
          <path d="M17 31 31 17" />
        </g>
      )}
    </svg>
  );
}
