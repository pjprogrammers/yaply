import * as THREE from "three";
import { PrimitivePool } from "./instancing";
import { mulberry32, pick, range, type Rng } from "./rng";
import type { ObjectKind } from "./types";
import { layoutMatrix, type BigCityAssets, type BigCityLayout } from "./bigcity";

export type ObjectState = "idle" | "falling" | "gone" | "respawning";

export interface ObjectPart {
  pool: PrimitivePool;
  index: number;
  /** Matrix of the part in the object's local space. */
  local: THREE.Matrix4;
}

export interface CarMotion {
  kind: "car";
  axis: "x" | "z";
  lane: number;
  dir: 1 | -1;
  speed: number;
}

export interface PedMotion {
  kind: "ped";
  vx: number;
  vz: number;
  timer: number;
  homeX: number;
  homeZ: number;
  range: number;
}

export interface WorldObject {
  id: number;
  kind: ObjectKind;
  label: string;
  x: number;
  y: number;
  z: number;
  homeX: number;
  homeY: number;
  homeZ: number;
  homeRotation: number;
  /** True for characters placed exactly where the reference scene has them. */
  anchored: boolean;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  value: number;
  need: number;
  parts: ObjectPart[];
  mesh: THREE.Group | null;
  windowIndices: number[];
  state: ObjectState;
  fall: number;
  fallDuration: number;
  respawn: number;
  respawnable: boolean;
  respawnDelay: number;
  motion: CarMotion | PedMotion | null;
  color: THREE.Color;
  /** Set when the object starts falling into a hole. */
  fallX?: number;
  fallZ?: number;
  fallAngle?: number;
  fallRadius?: number;
  fallSpin?: number;
  fallTilt?: number;
}

const PALETTE = [
  "#e8785f",
  "#e7b34c",
  "#4f9e97",
  "#6f8fc2",
  "#d998a7",
  "#93b874",
  "#d7c9a8",
  "#b9865f",
  "#e2a25d",
  "#7cb3b8",
];

const SHIRTS = [
  "#e35d4f",
  "#4c86c6",
  "#e5b84b",
  "#5aa76e",
  "#d873a4",
  "#7a68b5",
  "#e08c4e",
  "#4fa7a4",
  "#f2efe4",
];

const FALLBACK_SPAWN = [
  { x: 0, z: 0 },
  { x: 42, z: 0 },
  { x: -42, z: 0 },
  { x: 0, z: 42 },
  { x: 0, z: -42 },
  { x: 42, z: 42 },
  { x: -42, z: -42 },
  { x: 42, z: -42 },
];

export class City {
  readonly group = new THREE.Group();
  readonly objects: WorldObject[] = [];
  readonly pools: PrimitivePool[] = [];
  readonly bounds: BigCityLayout["bounds"];
  readonly spawns: { x: number; z: number }[];

  private readonly rng: Rng;
  private readonly scene: THREE.Scene;
  private readonly pedSpawns: { x: number; z: number }[];
  private readonly land: Uint8Array | null = null;
  private readonly landCell: number = 2;
  private readonly landCols: number = 0;
  private readonly landRows: number = 0;
  private readonly pedPools: { pool: PrimitivePool; used: number; capacity: number }[] =
    [];
  private nextId = 1;

  constructor(scene: THREE.Scene, assets: BigCityAssets, seed = 20261108) {
    this.scene = scene;
    this.rng = mulberry32(seed);
    this.group.name = "bigcity";
    scene.add(this.group);

    const { layout, variants } = assets;
    this.bounds = layout.bounds;
    if (layout.land) {
      try {
        const binary = atob(layout.land.data);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        this.land = bytes;
        this.landCell = layout.land.cell;
        this.landCols = layout.land.cols;
        this.landRows = layout.land.rows;
      } catch {
        this.land = null;
      }
    }
    this.spawns =
      layout.spawns.length > 0
        ? layout.spawns.map((point) => ({ x: point.x, z: point.z }))
        : FALLBACK_SPAWN;
    this.pedSpawns =
      layout.pedSpawns.length > 0
        ? layout.pedSpawns
        : layout.spawns.length > 0
          ? layout.spawns
          : FALLBACK_SPAWN;

    // The exported city tiles leave the lake empty at the Unity water line
    // (y = -2.2, scaled by 0.6 with the rest of the map).
    const centreX = (layout.bounds.minX + layout.bounds.maxX) / 2;
    const centreZ = (layout.bounds.minZ + layout.bounds.maxZ) / 2;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(
        layout.bounds.maxX - layout.bounds.minX + 160,
        layout.bounds.maxZ - layout.bounds.minZ + 160,
      ),
      new THREE.MeshStandardMaterial({
        color: "#1f7fd6",
        roughness: 0.7,
        metalness: 0.05,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(centreX, -1.32, centreZ);
    water.receiveShadow = true;
    this.group.add(water);

    const ground = new Set(layout.groundVariants ?? []);
    const counts = new Map<number, number>();
    for (const renderer of layout.renderers) {
      counts.set(renderer.m, (counts.get(renderer.m) ?? 0) + 1);
    }

    const pools = new Map<number, PrimitivePool>();
    for (const [variant, count] of counts) {
      const primitives = variants[variant];
      if (!primitives || primitives.length === 0) continue;
      const pool = new PrimitivePool(
        primitives,
        count,
        this.group,
        !ground.has(variant),
        true,
      );
      pools.set(variant, pool);
      this.pools.push(pool);
    }

    const slots = new Map<number, number>();
    const refs: ({ pool: PrimitivePool; index: number } | null)[] = [];
    const baseMatrices: (THREE.Matrix4 | null)[] = [];

    layout.renderers.forEach((renderer, index) => {
      const pool = pools.get(renderer.m);
      if (!pool) {
        refs.push(null);
        baseMatrices.push(null);
        return;
      }
      const slot = slots.get(renderer.m) ?? 0;
      slots.set(renderer.m, slot + 1);
      const matrix = layoutMatrix(renderer.t);
      refs.push({ pool, index: slot });
      baseMatrices.push(matrix);
      pool.setMatrix(slot, matrix);
    });

    for (const source of layout.objects) {
      const parts: ObjectPart[] = [];
      for (const rendererIndex of source.r) {
        const ref = refs[rendererIndex];
        const base = baseMatrices[rendererIndex];
        if (!ref || !base) continue;
        const local = new THREE.Matrix4()
          .makeTranslation(-source.x, -source.y, -source.z)
          .multiply(base);
        parts.push({ pool: ref.pool, index: ref.index, local });
      }
      if (parts.length === 0) continue;

      const kind = source.k;
      const color =
        kind === "building"
          ? new THREE.Color(pick(this.rng, PALETTE))
          : kind === "tree"
            ? new THREE.Color(pick(this.rng, ["#5f9e53", "#73ad5d", "#4d8a4b"]))
            : kind === "car"
              ? new THREE.Color(
                  pick(this.rng, [
                    "#e05a47",
                    "#e8b84a",
                    "#4f86c6",
                    "#55a38e",
                    "#d56f9f",
                    "#e8e3d4",
                    "#8a6fc0",
                    "#d97b45",
                  ]),
                )
              : new THREE.Color(pick(this.rng, PALETTE));

      const object: WorldObject = {
        id: this.nextId++,
        kind,
        label: source.l || kind,
        x: source.x,
        y: source.y,
        z: source.z,
        homeX: source.x,
        homeY: source.y,
        homeZ: source.z,
        homeRotation: 0,
        anchored: false,
        rotation: 0,
        width: source.w,
        depth: source.d,
        height: source.h,
        value: source.v,
        need: source.n,
        parts,
        mesh: null,
        windowIndices: [],
        state: "idle",
        fall: 0,
        fallDuration: kind === "building" ? 1.1 : kind === "tree" ? 0.6 : 0.45,
        respawn: 0,
        respawnable: Boolean(source.rp),
        respawnDelay: source.rd,
        motion: null,
        color,
      };
      this.objects.push(object);
      writeObject(object);
    }

    this.buildPedestrians(layout, variants);
  }

  private buildPedestrians(
    layout: BigCityLayout,
    variants: BigCityAssets["variants"],
  ) {
    if (layout.people && layout.people.length > 0) {
      this.buildExactPeople(layout, variants);
      return;
    }

    const groups = layout.pedMeshes.filter(
      (entry) => (variants[entry.index]?.length ?? 0) > 0,
    );
    if (groups.length === 0) return;

    const total = Math.min(96, Math.max(48, this.pedSpawns.length));
    const per = Math.max(1, Math.ceil(total / groups.length));
    for (const entry of groups) {
      const pool = new PrimitivePool(
        variants[entry.index],
        per,
        this.group,
        false,
        true,
      );
      this.pools.push(pool);
      this.pedPools.push({ pool, used: 0, capacity: per });
    }

    for (let index = 0; index < total; index += 1) {
      const target = this.pedPools[index % this.pedPools.length];
      if (!target || target.used >= target.capacity) continue;
      const spawn = pick(this.rng, this.pedSpawns);
      const x = spawn.x + range(this.rng, -2.5, 2.5);
      const z = spawn.z + range(this.rng, -2.5, 2.5);
      const motion: PedMotion = {
        kind: "ped",
        vx: range(this.rng, -1.5, 1.5),
        vz: range(this.rng, -1.5, 1.5),
        timer: range(this.rng, 0.8, 3),
        homeX: x,
        homeZ: z,
        range: range(this.rng, 4, 12),
      };
      const rotation = range(this.rng, 0, Math.PI * 2);
      const object: WorldObject = {
        id: this.nextId++,
        kind: "person",
        label: "pedestrian",
        x,
        y: 0.08,
        z,
        homeX: x,
        homeY: 0.08,
        homeZ: z,
        homeRotation: rotation,
        anchored: false,
        rotation,
        width: 0.7,
        depth: 0.7,
        height: 1.8,
        value: 3,
        need: 0.4,
        parts: [
          {
            pool: target.pool,
            index: target.used,
            local: new THREE.Matrix4(),
          },
        ],
        mesh: null,
        windowIndices: [],
        state: "idle",
        fall: 0,
        fallDuration: 0.45,
        respawn: 0,
        respawnable: true,
        respawnDelay: 14,
        motion,
        color: new THREE.Color(pick(this.rng, SHIRTS)),
      };
      target.used += 1;
      this.objects.push(object);
      writeObject(object);
    }
  }

  /**
   * Reference scene characters. Unlike the procedural crowd these keep the
   * exact position and facing stored in the Arena level: 81 idle pedestrians,
   * 27 random dancers, 9 nurses and 6 police dancers.
   */
  private buildExactPeople(
    layout: BigCityLayout,
    variants: BigCityAssets["variants"],
  ) {
    const people = layout.people ?? [];
    const meshes = layout.pedMeshes.filter(
      (entry) => (variants[entry.index]?.length ?? 0) > 0,
    );
    if (meshes.length === 0) return;

    const counts = new Map<number, number>();
    for (const person of people) {
      const entry =
        meshes.find((candidate) => candidate.index === person.m) ?? meshes[0];
      counts.set(entry.index, (counts.get(entry.index) ?? 0) + 1);
    }

    const pools = new Map<
      number,
      { pool: PrimitivePool; entry: (typeof meshes)[number]; used: number }
    >();
    for (const entry of meshes) {
      const count = counts.get(entry.index) ?? 0;
      if (count === 0) continue;
      const pool = new PrimitivePool(
        variants[entry.index],
        count,
        this.group,
        false,
        true,
      );
      this.pools.push(pool);
      this.pedPools.push({ pool, used: 0, capacity: count });
      pools.set(entry.index, { pool, entry, used: 0 });
    }

    for (const person of people) {
      const entry =
        meshes.find((candidate) => candidate.index === person.m) ?? meshes[0];
      const target = pools.get(entry.index);
      if (!target || target.used >= (counts.get(entry.index) ?? 0)) continue;
      const label =
        person.g === "cops" || person.g === "nurses" || person.g === "dance"
          ? "dancer"
          : "pedestrian";
      const object: WorldObject = {
        id: this.nextId++,
        kind: "person",
        label,
        x: person.x,
        y: person.y,
        z: person.z,
        homeX: person.x,
        homeY: person.y,
        homeZ: person.z,
        homeRotation: person.r,
        anchored: true,
        rotation: person.r,
        width: 0.7,
        depth: 0.7,
        height: target.entry.height || 1.8,
        value: 3,
        need: 0.4,
        parts: [
          {
            pool: target.pool,
            index: target.used,
            local: new THREE.Matrix4(),
          },
        ],
        mesh: null,
        windowIndices: [],
        state: "idle",
        fall: 0,
        fallDuration: 0.45,
        respawn: 0,
        respawnable: true,
        respawnDelay: 14,
        motion: null,
        color: new THREE.Color(pick(this.rng, SHIRTS)),
      };
      target.used += 1;
      this.objects.push(object);
      writeObject(object);
    }
  }

  /** Animate pedestrians. Cars stay parked along the real streets. */
  update(dt: number, holes: { x: number; z: number; radius: number }[]) {
    for (const object of this.objects) {
      if (object.state !== "idle" || object.motion?.kind !== "ped") continue;
      const ped = object.motion;
      ped.timer -= dt;
      if (ped.timer <= 0) {
        ped.timer = range(this.rng, 1.2, 4);
        ped.vx = range(this.rng, -1.6, 1.6);
        ped.vz = range(this.rng, -1.6, 1.6);
      }
      for (const hole of holes) {
        const dx = object.x - hole.x;
        const dz = object.z - hole.z;
        const distance = Math.hypot(dx, dz);
        if (distance < hole.radius + 4 && distance > 0.001) {
          ped.vx += (dx / distance) * 8 * dt;
          ped.vz += (dz / distance) * 8 * dt;
        }
      }
      const speed = Math.hypot(ped.vx, ped.vz);
      const maxSpeed = 2.1;
      if (speed > maxSpeed) {
        ped.vx = (ped.vx / speed) * maxSpeed;
        ped.vz = (ped.vz / speed) * maxSpeed;
      }
      object.x += ped.vx * dt;
      object.z += ped.vz * dt;
      if (Math.hypot(object.x - ped.homeX, object.z - ped.homeZ) > ped.range) {
        const dx = ped.homeX - object.x;
        const dz = ped.homeZ - object.z;
        const distance = Math.max(0.001, Math.hypot(dx, dz));
        ped.vx += (dx / distance) * 4 * dt;
        ped.vz += (dz / distance) * 4 * dt;
      }
      if (Math.abs(ped.vx) + Math.abs(ped.vz) > 0.1) {
        object.rotation = Math.atan2(ped.vx, ped.vz);
      }
      this.clampPedestrian(object);
      writeObject(object);
    }
  }

  /** True when a point sits on exported pavement, road, bridge, or park. */
  isLand(x: number, z: number): boolean {
    if (!this.land) return true;
    const col = Math.floor((x - this.bounds.minX) / this.landCell);
    const row = Math.floor((z - this.bounds.minZ) / this.landCell);
    if (col < 0 || row < 0 || col >= this.landCols || row >= this.landRows) {
      return false;
    }
    return this.land[row * this.landCols + col] === 1;
  }

  private clampPedestrian(object: WorldObject) {
    const margin = 0.5;
    object.x = Math.max(
      this.bounds.minX + margin,
      Math.min(this.bounds.maxX - margin, object.x),
    );
    object.z = Math.max(
      this.bounds.minZ + margin,
      Math.min(this.bounds.maxZ - margin, object.z),
    );
  }

  /** Re-roll a car's road position after it gets eaten. */
  respawnCar(object: WorldObject) {
    object.x = object.homeX;
    object.z = object.homeZ;
    object.y = object.homeY;
    object.rotation = object.homeRotation;
    object.motion = null;
    writeObject(object);
  }

  respawnPerson(object: WorldObject) {
    if (object.anchored) {
      object.x = object.homeX;
      object.y = object.homeY;
      object.z = object.homeZ;
      object.rotation = object.homeRotation;
      writeObject(object);
      return;
    }
    const spawn = pick(this.rng, this.pedSpawns);
    const x = spawn.x + range(this.rng, -2.5, 2.5);
    const z = spawn.z + range(this.rng, -2.5, 2.5);
    object.x = x;
    object.z = z;
    object.y = object.homeY;
    object.homeX = x;
    object.homeZ = z;
    const ped = object.motion as PedMotion | null;
    if (ped) {
      ped.homeX = x;
      ped.homeZ = z;
      ped.vx = range(this.rng, -1.5, 1.5);
      ped.vz = range(this.rng, -1.5, 1.5);
      ped.timer = 1.5;
      ped.range = range(this.rng, 4, 12);
    }
    writeObject(object);
  }

  /**
   * Packs every non-idle city object into a base64 bitset. Both peers build
   * the city from the same layout, so indices line up without sending ids.
   */
  encodeState(): string {
    const bytes = new Uint8Array(Math.ceil(this.objects.length / 8));
    this.objects.forEach((object, index) => {
      if (object.state !== "idle") bytes[index >> 3] |= 1 << (index & 7);
    });
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  /**
   * Applies the host's eaten-object bitset. Newly swallowed props start a
   * short local sink animation; props that respawned on the host are restored.
   */
  applyState(
    encoded: string,
    holes: { x: number; z: number; radius: number }[],
  ): void {
    let binary: string;
    try {
      binary = atob(encoded);
    } catch {
      return;
    }
    const limit = Math.min(this.objects.length, binary.length * 8);
    for (let index = 0; index < limit; index += 1) {
      const object = this.objects[index];
      const gone =
        (binary.charCodeAt(index >> 3) & (1 << (index & 7))) !== 0;
      if (gone && object.state === "idle") {
        let near = holes[0];
        let best = Number.POSITIVE_INFINITY;
        for (const hole of holes) {
          const distance = (hole.x - object.x) ** 2 + (hole.z - object.z) ** 2;
          if (distance < best) {
            best = distance;
            near = hole;
          }
        }
        object.state = "falling";
        object.fall = 0.08;
        object.fallDuration = Math.min(0.55, object.fallDuration);
        object.fallX = near?.x ?? object.x;
        object.fallZ = near?.z ?? object.z;
      } else if (!gone && object.state !== "idle") {
        object.state = "idle";
        object.fall = 0;
        object.respawn = 0;
        if (object.kind === "person") {
          this.respawnPerson(object);
        } else {
          object.x = object.homeX;
          object.y = object.homeY;
          object.z = object.homeZ;
          object.rotation = object.homeRotation;
          writeObject(object);
        }
        if (object.mesh) object.mesh.visible = true;
      }
    }
  }

  /** Restore the city to its opening state. */
  reset() {
    for (const object of this.objects) {
      object.state = "idle";
      object.fall = 0;
      object.respawn = 0;
      object.x = object.homeX;
      object.z = object.homeZ;
      object.y = object.homeY;
      object.rotation = object.homeRotation;
      if (object.kind === "person") {
        this.respawnPerson(object);
      } else {
        writeObject(object);
      }
    }
  }

  hideWindows() {
    // Windows are baked into the imported building textures.
  }

  showWindows() {
    // Windows are baked into the imported building textures.
  }

  dispose() {
    this.scene.remove(this.group);
    for (const pool of this.pools) pool.dispose();
    this.group.clear();
  }
}

const scratch = new THREE.Matrix4();
const partMatrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const euler = new THREE.Euler();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();

/** Write an object's idle transform into every one of its parts. */
export function writeObject(
  object: WorldObject,
  drop = 0,
  spin = 0,
  scaleValue = 1,
  tilt = 0,
) {
  position.set(object.x, object.y - drop, object.z);
  euler.set(tilt, object.rotation + spin, tilt * 0.6);
  quaternion.setFromEuler(euler);
  scale.setScalar(scaleValue);
  scratch.compose(position, quaternion, scale);
  for (const part of object.parts) {
    partMatrix.multiplyMatrices(scratch, part.local);
    part.pool.setMatrix(part.index, partMatrix);
  }
  if (object.mesh) {
    object.mesh.position.set(object.x, object.y - drop, object.z);
    object.mesh.rotation.set(tilt, object.rotation + spin, tilt * 0.5);
    object.mesh.scale.setScalar(scaleValue);
  }
}
