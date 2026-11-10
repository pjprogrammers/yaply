import * as THREE from "three";
import type { ObjectKind } from "./types";

/**
 * Runtime description of the BigCity map extracted from the Hole Arena build.
 * Every renderer points at one mesh variant and carries its baked world matrix.
 */
export interface BigCityLayout {
  version: number;
  scale: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  land: { cell: number; cols: number; rows: number; data: string };
  spawns: { x: number; z: number }[];
  pedSpawns: { x: number; z: number }[];
  renderers: { m: number; t: number[] }[];
  variantNames: string[];
  groundVariants: number[];
  objects: {
    k: ObjectKind;
    l: string;
    x: number;
    y: number;
    z: number;
    w: number;
    d: number;
    h: number;
    v: number;
    n: number;
    rp: number;
    rd: number;
    r: number[];
  }[];
  pedMeshes: { name: string; index: number; height: number }[];
  /**
   * Exact character placements from the reference Arena scene. The Unity
   * export maps world space as x' = 0.6x - 15.252, z' = -0.6z - 0.216 and
   * flips Y rotation so these entries can be dropped straight into the game.
   */
  people?: {
    x: number;
    y: number;
    z: number;
    /** Y rotation in radians. */
    r: number;
    /** Mesh variant index from pedMeshes. */
    m: number;
    /** Reference group: idle, cops, nurses or dance. */
    g?: string;
  }[];
  carMeshes: number[];
}

export interface BigCityPrimitive {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

export interface BigCityAssets {
  layout: BigCityLayout;
  /** Primitives grouped by glTF mesh index. */
  variants: BigCityPrimitive[][];
}

const BASE = "/assets/bigcity";
let cache: Promise<BigCityAssets> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return (await response.json()) as T;
}

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response.arrayBuffer();
}

/** Parses a layout matrix (three rows of a column-major 4x4). */
export function layoutMatrix(values: number[], target = new THREE.Matrix4()): THREE.Matrix4 {
  const [a, b, c, x, d, e, f, y, g, h, i, z] = values;
  return target.set(a, b, c, x, d, e, f, y, g, h, i, z, 0, 0, 0, 1);
}

export function loadBigCity(): Promise<BigCityAssets> {
  if (!cache) {
    cache = (async () => {
      const [{ GLTFLoader }] = await Promise.all([
        import("three/examples/jsm/loaders/GLTFLoader.js"),
      ]);
      const [layout, buffer] = await Promise.all([
        fetchJson<BigCityLayout>(`${BASE}/city.json`),
        fetchBuffer(`${BASE}/city.glb`),
      ]);

      const loader = new GLTFLoader();
      const gltf = await loader.parseAsync(buffer, `${BASE}/`);

      // Character meshes sit after the map variants, so size the table from
      // the imported nodes rather than from the renderer indices.
      const nodes: { index: number; node: THREE.Object3D }[] = [];
      let variantCount = 0;
      for (const node of [...gltf.scene.children]) {
        const match = /^mesh_(\d+)$/.exec(node.name);
        if (!match) continue;
        const index = Number(match[1]);
        nodes.push({ index, node });
        variantCount = Math.max(variantCount, index + 1);
      }

      const variants: BigCityPrimitive[][] = Array.from(
        { length: variantCount },
        () => [],
      );

      for (const { index, node } of nodes) {
        const bucket = variants[index];
        if (!bucket) continue;
        node.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const material = Array.isArray(child.material)
            ? (child.material[0] as THREE.Material)
            : child.material;
          bucket.push({
            geometry: child.geometry as THREE.BufferGeometry,
            material,
          });
        });
      }

      for (const primitive of variants.flat()) {
        primitive.geometry.computeBoundingSphere();
        primitive.geometry.computeBoundingBox();
        const material = primitive.material as THREE.MeshStandardMaterial;
        if (material.isMeshStandardMaterial) {
          material.roughness = Math.max(material.roughness, 0.82);
          material.metalness = Math.min(material.metalness, 0.05);
          material.side = THREE.DoubleSide;
          const map = material.map as THREE.Texture | null;
          if (map) {
            // Anisotropic filtering keeps road markings and facades readable at
            // the game's shallow camera angle.
            map.anisotropy = 8;
            map.needsUpdate = true;
          }
        }
      }

      return { layout, variants };
    })().catch((error: unknown) => {
      cache = null;
      throw error;
    });
  }
  return cache;
}
