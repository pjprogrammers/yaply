import type { SurfaceKind } from "./types";

/**
 * Surface coefficients from the maps.md physics section. `grip` scales lateral
 * tyre force, `rolling` is a longitudinal drag coefficient and `traction`
 * scales engine acceleration. Values are game-tuned rather than SI because the
 * kart controller runs in arena units.
 */
export interface SurfaceSpec {
  label: string;
  grip: number;
  rolling: number;
  traction: number;
  color: number;
  /** Visual roughness used by the renderer. */
  roughness: number;
}

export const SURFACES: Record<SurfaceKind, SurfaceSpec> = {
  asphalt: {
    label: "Asphalt",
    grip: 1.0,
    rolling: 0.62,
    traction: 1.0,
    color: 0x3b3f44,
    roughness: 0.94,
  },
  concrete: {
    label: "Concrete",
    grip: 0.92,
    rolling: 0.7,
    traction: 0.95,
    color: 0x8d8a82,
    roughness: 0.96,
  },
  dirt: {
    label: "Dirt",
    grip: 0.72,
    rolling: 0.92,
    traction: 0.82,
    color: 0x6d5138,
    roughness: 1,
  },
  sand: {
    label: "Sand",
    grip: 0.6,
    rolling: 1.18,
    traction: 0.68,
    color: 0xc9ab74,
    roughness: 1,
  },
  snow: {
    label: "Snow",
    grip: 0.55,
    rolling: 0.82,
    traction: 0.72,
    color: 0xe8eef5,
    roughness: 0.88,
  },
  ice: {
    label: "Ice",
    grip: 0.2,
    rolling: 0.3,
    traction: 0.52,
    color: 0xa9d8ec,
    roughness: 0.24,
  },
  metal: {
    label: "Metal",
    grip: 0.84,
    rolling: 0.48,
    traction: 0.94,
    color: 0x6d747c,
    roughness: 0.42,
  },
  wet: {
    label: "Wet asphalt",
    grip: 0.62,
    rolling: 0.58,
    traction: 0.84,
    color: 0x2b3a44,
    roughness: 0.3,
  },
  futuristic: {
    label: "Bonded plate",
    grip: 1.08,
    rolling: 0.44,
    traction: 1.08,
    color: 0x24323e,
    roughness: 0.38,
  },
};

export function surfaceSpec(kind: SurfaceKind | undefined): SurfaceSpec {
  return SURFACES[kind ?? "concrete"];
}

/**
 * Steering feel is intentionally tied to surface grip: low-grip surfaces let
 * the kart rotate but keep lateral momentum, which is what makes ice and slick
 * arenas read as a different driving discipline rather than a texture swap.
 */
export function lateralGripFactor(kind: SurfaceKind | undefined): number {
  const spec = surfaceSpec(kind);
  return 0.24 + spec.grip * 0.76;
}
