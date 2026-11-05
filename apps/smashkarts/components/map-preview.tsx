import { roadNetwork } from "@/game/roads";
import type { MapDef, RampDef, SurfaceKind } from "@/game/types";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 180;
const PADDING = 14;

const ROAD_COLORS: Record<SurfaceKind, string> = {
  asphalt: "#2b2f36",
  concrete: "#4a4b4d",
  dirt: "#5b4128",
  sand: "#7a6339",
  snow: "#c9d7e2",
  ice: "#9fd0e4",
  metal: "#454c54",
  wet: "#2e414d",
  futuristic: "#2b3550",
};

function css(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

function mixHex(a: number, b: number, t: number): string {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return css((r << 16) | (g << 8) | bl);
}

/**
 * A schematic preview generated from the same authored data the engine
 * simulates: road splines, decks, ramps, hazards, cover and spawns. It is
 * deliberately vector-only so every new arena has a preview without shipping
 * a render or a bitmap asset.
 */
export function MapPreview({
  map,
  className,
  detail = "full",
}: {
  map: MapDef;
  className?: string;
  /** `thumb` trims fine detail so lobby grids stay cheap to paint. */
  detail?: "full" | "thumb";
}) {
  const usableWidth = VIEW_WIDTH - PADDING * 2;
  const usableHeight = VIEW_HEIGHT - PADDING * 2;
  const scale = Math.min(usableWidth / map.size, usableHeight / map.depth);
  const cx = VIEW_WIDTH / 2;
  const cz = VIEW_HEIGHT / 2;
  const px = (x: number) => cx + x * scale;
  const pz = (z: number) => cz + z * scale;
  const accent = css(map.theme.accent);
  const gradientId = `preview-sky-${map.id}`;
  const glowId = `preview-glow-${map.id}`;
  const compact = detail === "thumb";

  const roads = roadNetwork(map);
  const roadPaths = roads.map((geometry) => {
    const stride = Math.max(1, Math.round(geometry.samples.length / 90));
    const points: string[] = [];
    for (let i = 0; i < geometry.samples.length; i += stride) {
      const sample = geometry.samples[i];
      points.push(`${px(sample.x).toFixed(1)},${pz(sample.z).toFixed(1)}`);
    }
    if ((geometry.samples.length - 1) % stride !== 0) {
      const last = geometry.samples[geometry.samples.length - 1];
      points.push(`${px(last.x).toFixed(1)},${pz(last.z).toFixed(1)}`);
    }
    return {
      road: geometry.def,
      path: `M${points.join(" L")}${geometry.def.closed ?? true ? " Z" : ""}`,
      width: Math.max(2, geometry.def.width * scale),
    };
  });

  return (
    <svg
      className={className}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Schematic layout of the ${map.name} arena.`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={css(map.theme.skyTop)} />
          <stop offset="58%" stopColor={mixHex(map.theme.skyTop, map.theme.skyBottom, 0.7)} />
          <stop offset="100%" stopColor={css(map.theme.skyBottom)} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.5" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${gradientId})`} />
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#05060a" opacity="0.2" />

      {/* The drivable slab. */}
      <rect
        x={px(-map.size / 2)}
        y={pz(-map.depth / 2)}
        width={map.size * scale}
        height={map.depth * scale}
        rx={2}
        fill={css(map.theme.ground)}
        fillOpacity={0.94}
        stroke={mixHex(map.theme.ground, 0xffffff, 0.35)}
        strokeOpacity={0.4}
        strokeWidth={0.8}
      />

      {/* Terrain features read as soft light and shadow. */}
      {!compact &&
        map.terrain.features.map((feature, index) => (
          <ellipse
            key={`terrain-${index}`}
            cx={px(feature.x)}
            cy={pz(feature.z)}
            rx={Math.max(2, feature.radiusX * scale)}
            ry={Math.max(2, feature.radiusZ * scale)}
            transform={`rotate(${((feature.rot ?? 0) * 180) / Math.PI} ${px(feature.x)} ${pz(feature.z)})`}
            fill={feature.height >= 0 ? "#ffffff" : "#000000"}
            fillOpacity={Math.min(0.16, 0.05 + Math.abs(feature.height) * 0.04)}
          />
        ))}

      {/* Hazard floors first, so roads and decks read on top. */}
      {map.hazards.map((hazard, index) => {
        const color =
          hazard.kind === "lava"
            ? "#ff6a2b"
            : hazard.kind === "sludge"
              ? "#8fd44a"
              : hazard.kind === "water"
                ? "#2bb6d6"
                : "#7c5cff";
        if (hazard.radius !== undefined) {
          return (
            <circle
              key={`hazard-${index}`}
              cx={px(hazard.x)}
              cy={pz(hazard.z)}
              r={Math.max(1.5, hazard.radius * scale)}
              fill={color}
              fillOpacity={0.72}
              stroke={color}
              strokeWidth={0.6}
            />
          );
        }
        return (
          <rect
            key={`hazard-${index}`}
            x={px(hazard.x - (hazard.hx ?? 0))}
            y={pz(hazard.z - (hazard.hz ?? 0))}
            width={Math.max(1, (hazard.hx ?? 0) * 2 * scale)}
            height={Math.max(1, (hazard.hz ?? 0) * 2 * scale)}
            fill={color}
            fillOpacity={0.72}
            stroke={color}
            strokeWidth={0.6}
          />
        );
      })}

      {/* Road network from the sampled Catmull-Rom centrelines. */}
      {roadPaths.map(({ road, path, width }, index) => (
        <g key={`road-${index}`}>
          <path
            d={path}
            fill="none"
            stroke={ROAD_COLORS[road.surface]}
            strokeWidth={width}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={path}
            fill="none"
            stroke={accent}
            strokeOpacity={0.34}
            strokeWidth={Math.max(0.4, width * 0.08)}
            strokeDasharray={road.kind === "main" ? "3 5" : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Raised decks and bridges. */}
      {map.platforms.map((platform, index) => {
        const width = platform.hx * 2 * scale;
        const depth = platform.hz * 2 * scale;
        const bridge = platform.kind === "bridge";
        return (
          <g
            key={`platform-${index}`}
            transform={`translate(${px(platform.x)} ${pz(platform.z)}) rotate(${((platform.rot ?? 0) * 180) / Math.PI})`}
          >
            <rect
              x={-width / 2}
              y={-depth / 2}
              width={width}
              height={depth}
              rx={0.8}
              fill={bridge ? "none" : mixHex(platform.color ?? map.theme.ground, 0xffffff, 0.3)}
              fillOpacity={bridge ? 0 : 0.85}
              stroke={accent}
              strokeOpacity={bridge ? 0.9 : 0.6}
              strokeWidth={bridge ? 1 : 0.7}
              strokeDasharray={bridge ? "4 2" : undefined}
            />
            {!compact && (
              <rect
                x={-width / 2 + 0.8}
                y={-depth / 2 + 0.8}
                width={Math.max(0, width - 1.6)}
                height={Math.max(0, depth - 1.6)}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={0.16}
                strokeWidth={0.4}
              />
            )}
          </g>
        );
      })}

      {/* Ramps point uphill with chevrons. */}
      {map.ramps.map((ramp: RampDef, index) => {
        const along = (ramp.axis === "x" ? ramp.hx : ramp.hz) * 2 * scale;
        const across = (ramp.axis === "x" ? ramp.hz : ramp.hx) * 2 * scale;
        const rotation =
          ramp.axis === "x"
            ? ramp.dir === 1
              ? 0
              : 180
            : ramp.dir === 1
              ? 90
              : -90;
        return (
          <g
            key={`ramp-${index}`}
            transform={`translate(${px(ramp.x)} ${pz(ramp.z)}) rotate(${rotation})`}
          >
            <rect
              x={-across / 2}
              y={-along / 2}
              width={across}
              height={along}
              fill={mixHex(ramp.color ?? map.theme.ground, 0xffffff, 0.55)}
              fillOpacity={0.55}
              stroke={accent}
              strokeOpacity={0.8}
              strokeWidth={0.6}
            />
            {[0.25, 0.5, 0.75].map((t) => (
              <path
                key={t}
                d={`M${-across * 0.28},${-along / 2 + along * t + across * 0.2} L0,${
                  -along / 2 + along * t - across * 0.16
                } L${across * 0.28},${-along / 2 + along * t + across * 0.2}`}
                fill="none"
                stroke={accent}
                strokeOpacity={0.85}
                strokeWidth={0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
        );
      })}

      {/* Cover objects. Decorative props are skipped, matching collision. */}
      {map.obstacles.map((obstacle, index) => {
        if (obstacle.category === "decorative") return null;
        if (compact && index % 2 === 1) return null;
        const width = Math.max(1, obstacle.hx * 2 * scale);
        const depth = Math.max(1, obstacle.hz * 2 * scale);
        return (
          <rect
            key={`obstacle-${index}`}
            x={px(obstacle.x - obstacle.hx)}
            y={pz(obstacle.z - obstacle.hz)}
            width={width}
            height={depth}
            transform={`rotate(${((obstacle.rot ?? 0) * 180) / Math.PI} ${px(obstacle.x)} ${pz(obstacle.z)})`}
            fill={mixHex(obstacle.color ?? map.theme.ground, 0x000000, 0.45)}
            fillOpacity={0.9}
            stroke="#ffffff"
            strokeOpacity={0.22}
            strokeWidth={0.4}
            rx={0.3}
          />
        );
      })}

      {/* Boost pads and pickups. */}
      {!compact &&
        map.boostPads.map((pad, index) => (
          <g
            key={`boost-${index}`}
            transform={`translate(${px(pad.x)} ${pz(pad.z)}) rotate(${(pad.rot * 180) / Math.PI})`}
          >
            <polygon points="-3,-1.8 3,0 -3,1.8" fill="#ffc233" fillOpacity={0.95} />
          </g>
        ))}
      {map.pickups.map(([x, z], index) => (
        <rect
          key={`pickup-${index}`}
          x={px(x) - 1.6}
          y={pz(z) - 1.6}
          width={3.2}
          height={3.2}
          rx={0.5}
          fill={accent}
          stroke="#ffffff"
          strokeOpacity={0.55}
          strokeWidth={0.35}
        />
      ))}

      {/* Spawn grid. */}
      {map.spawns.map(([x, z], index) => (
        <circle
          key={`spawn-${index}`}
          cx={px(x)}
          cy={pz(z)}
          r={compact ? 1.1 : 1.5}
          fill="#f2ecdd"
          fillOpacity={0.9}
          stroke="#05060a"
          strokeWidth={0.4}
        />
      ))}

      {/* Frame + arena accent glow. */}
      <rect
        x={px(-map.size / 2)}
        y={pz(-map.depth / 2)}
        width={map.size * scale}
        height={map.depth * scale}
        rx={2}
        fill="none"
        stroke={accent}
        strokeOpacity={0.55}
        strokeWidth={1}
      />
      <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${glowId})`} opacity={0.18} />
      <path
        d={`M4,4 h14 M4,4 v14 M${VIEW_WIDTH - 4},4 h-14 M${VIEW_WIDTH - 4},4 v14 M4,${VIEW_HEIGHT - 4} h14 M4,${VIEW_HEIGHT - 4} v-14 M${VIEW_WIDTH - 4},${VIEW_HEIGHT - 4} h-14 M${VIEW_WIDTH - 4},${VIEW_HEIGHT - 4} v-14`}
        stroke={accent}
        strokeOpacity={0.75}
        strokeWidth={1.2}
        fill="none"
      />
    </svg>
  );
}
