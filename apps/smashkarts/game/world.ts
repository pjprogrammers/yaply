import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  createBannerTexture,
  createChevronTexture,
  createGroundTexture,
  createHazardTexture,
  createSignTexture,
  createWindowTexture,
  hexToCss,
} from "./assets";
import { roadNetwork, sampleRoad } from "./roads";
import {
  groundHeightAt,
  groundSurfaceAt,
  rampHeightAt,
  terrainHeightAt,
} from "./terrain";
import type {
  HazardDef,
  MapDef,
  ObstacleDef,
  PlatformDef,
  RampDef,
  SceneryDef,
  SurfaceKind,
} from "./types";

export interface ArenaWorld {
  group: THREE.Group;
  animate: (time: number, dt: number) => void;
}

const HAZARD = () => createHazardTexture(0xffc233);

const SURFACE_COLORS: Record<SurfaceKind, number> = {
  asphalt: 0x2c2f34,
  concrete: 0x8c8a84,
  dirt: 0x7a5a3a,
  sand: 0xbfa06a,
  snow: 0xe6eef6,
  ice: 0xa8d8ec,
  metal: 0x6a7078,
  wet: 0x3a4a58,
  futuristic: 0x34405a,
};

const SURFACE_ROUGHNESS: Record<SurfaceKind, number> = {
  asphalt: 0.92,
  concrete: 0.95,
  dirt: 1,
  sand: 1,
  snow: 0.82,
  ice: 0.24,
  metal: 0.55,
  wet: 0.34,
  futuristic: 0.5,
};

function buildSky(map: MapDef): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(320, 24, 18);
  const top = new THREE.Color(map.theme.skyTop);
  const bottom = new THREE.Color(map.theme.skyBottom);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i) / 320;
    const t = THREE.MathUtils.clamp(y * 0.5 + 0.5, 0, 1);
    const c = bottom.clone().lerp(top, Math.pow(t, 0.85));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -10;
  group.add(mesh);

  const darkSky = new THREE.Color(map.theme.skyTop).getHSL({ h: 0, s: 0, l: 0 }).l < 0.22;
  const sunLook =
    map.arenaClass === "sky"
      ? { color: 0xd8ecff, radius: 16, glow: 46, opacity: 0.78, glowOpacity: 0.1 }
      : map.theme.groundStyle === "asphalt"
        ? { color: 0xd6e4ff, radius: 10, glow: 30, opacity: 0.8, glowOpacity: 0.09 }
        : map.theme.groundStyle === "sand" || map.theme.groundStyle === "grass"
          ? { color: 0xfff3cf, radius: 27, glow: 64, opacity: 0.92, glowOpacity: 0.13 }
          : map.theme.groundStyle === "snow"
            ? { color: 0xe8f4ff, radius: 20, glow: 54, opacity: 0.7, glowOpacity: 0.1 }
            : map.theme.groundStyle === "concrete"
              ? { color: 0xffb36b, radius: 22, glow: 58, opacity: 0.72, glowOpacity: 0.11 }
              : { color: 0xffb072, radius: 18, glow: 52, opacity: 0.5, glowOpacity: 0.08 };
  const direction = new THREE.Vector3(...map.theme.sunPosition).normalize().multiplyScalar(300);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(sunLook.radius, 36),
    new THREE.MeshBasicMaterial({
      color: sunLook.color,
      transparent: true,
      opacity: sunLook.opacity,
      fog: false,
      depthWrite: false,
    }),
  );
  disc.position.copy(direction);
  disc.lookAt(0, 0, 0);
  disc.renderOrder = -9;
  group.add(disc);

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(sunLook.glow, 36),
    new THREE.MeshBasicMaterial({
      color: sunLook.color,
      transparent: true,
      opacity: sunLook.glowOpacity,
      blending: THREE.AdditiveBlending,
      fog: false,
      depthWrite: false,
    }),
  );
  halo.position.copy(direction);
  halo.lookAt(0, 0, 0);
  halo.renderOrder = -9;
  group.add(halo);

  if (darkSky) {
    const starCount = 480;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const radius = 260;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xbfe8ff,
        size: 1.1,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        fog: false,
      }),
    );
    stars.renderOrder = -8;
    group.add(stars);
  }

  return group;
}

function buildWalls(map: MapDef): THREE.Group {
  const group = new THREE.Group();
  const halfX = map.size / 2;
  const halfZ = map.depth / 2;
  const thickness = 1.6;
  const height = map.theme.wallHeight;
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: map.theme.wallColor,
    roughness: 0.9,
  });
  const capMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(map.theme.wallColor).multiplyScalar(1.35),
    roughness: 0.8,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x0c0c0b,
    emissive: map.theme.accent,
    emissiveIntensity: 1.6,
    roughness: 0.5,
  });

  const sides: Array<[number, number, number, number]> = [
    [0, -halfZ - thickness / 2, map.size + thickness * 2, thickness],
    [0, halfZ + thickness / 2, map.size + thickness * 2, thickness],
    [-halfX - thickness / 2, 0, thickness, map.depth + thickness * 2],
    [halfX + thickness / 2, 0, thickness, map.depth + thickness * 2],
  ];
  for (const [x, z, w, d] of sides) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), wallMaterial);
    wall.position.set(x, height / 2, z);
    wall.receiveShadow = true;
    group.add(wall);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.18, d + 0.25), capMaterial);
    cap.position.set(x, height + 0.08, z);
    group.add(cap);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.08, 0.08), accentMaterial);
    strip.position.set(x, height - 0.35, z);
    if (w < d) {
      strip.rotation.y = Math.PI / 2;
    }
    group.add(strip);
  }

  if (map.theme.groundStyle === "metal") {
    const buttressGeo = new THREE.BoxGeometry(0.8, height + 0.6, 1.4);
    for (let i = -halfX + 10; i <= halfX - 10; i += 12) {
      for (const side of [-1, 1]) {
        const a = new THREE.Mesh(buttressGeo, wallMaterial);
        a.position.set(i, (height + 0.6) / 2, side * (halfZ + 0.4));
        group.add(a);
        const b = new THREE.Mesh(buttressGeo, wallMaterial);
        b.rotation.y = Math.PI / 2;
        b.position.set(side * (halfX + 0.4), (height + 0.6) / 2, i);
        group.add(b);
      }
    }
  }

  if (map.theme.groundStyle === "sand") {
    const postGeo = new THREE.BoxGeometry(0.35, height + 0.5, 0.35);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5a4530, roughness: 0.9 });
    for (let i = -halfX + 4; i <= halfX - 4; i += 8) {
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(i, (height + 0.5) / 2, side * (halfZ + 0.35));
        group.add(post);
      }
    }
    for (let i = -halfZ + 4; i <= halfZ - 4; i += 8) {
      for (const side of [-1, 1]) {
        const post2 = new THREE.Mesh(postGeo, postMat);
        post2.position.set(side * (halfX + 0.35), (height + 0.5) / 2, i);
        group.add(post2);
      }
    }
  }

  if (map.theme.groundStyle === "asphalt") {
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xff3d81 });
    for (let i = -halfX + 6; i <= halfX - 6; i += 14) {
      for (const side of [-1, 1]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), lightMat);
        lamp.position.set(i, 0.35, side * (halfZ + 0.2));
        group.add(lamp);
      }
    }
    for (let i = -halfZ + 6; i <= halfZ - 6; i += 14) {
      for (const side of [-1, 1]) {
        const lamp2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), lightMat);
        lamp2.position.set(side * (halfX + 0.2), 0.35, i);
        group.add(lamp2);
      }
    }
  }

  if (map.theme.groundStyle === "grass") {
    const crenelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(map.theme.wallColor).multiplyScalar(1.22),
      roughness: 0.9,
    });
    for (let i = -halfX + 3; i <= halfX - 3; i += 4) {
      for (const side of [-1, 1]) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 1.9), crenelMaterial);
        block.position.set(i, height + 0.35, side * (halfZ + 0.2));
        group.add(block);
      }
    }
    for (let i = -halfZ + 3; i <= halfZ - 3; i += 4) {
      for (const side of [-1, 1]) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 2.2), crenelMaterial);
        block.position.set(side * (halfX + 0.2), height + 0.35, i);
        group.add(block);
      }
    }
  }

  if (map.theme.groundStyle === "snow") {
    const snowCap = new THREE.MeshStandardMaterial({
      color: 0xf2f8ff,
      roughness: 0.82,
      metalness: 0.02,
    });
    for (const [x, z, w, d] of sides) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.34, d + 0.4), snowCap);
      cap.position.set(x, height + 0.17, z);
      group.add(cap);
    }
  }

  if (map.arenaClass === "sky") {
    const stripMaterial = new THREE.MeshBasicMaterial({ color: 0x37f5e0 });
    for (let i = -halfX + 8; i <= halfX - 8; i += 12) {
      for (const side of [-1, 1]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, height * 0.82, 0.08), stripMaterial);
        strip.position.set(i, height * 0.45, side * (halfZ + 0.05));
        group.add(strip);
      }
    }
  }

  return group;
}

function buildObstacle(def: ObstacleDef, map: MapDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, def.base ?? 0, def.z);
  group.rotation.y = def.rot ?? 0;
  const w = def.hx * 2;
  const d = def.hz * 2;
  const h = def.h;

  if (def.kind === "crate") {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: def.color ?? 0x6c5a38,
      roughness: 0.62,
      metalness: 0.45,
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x24241f,
      roughness: 0.7,
      metalness: 0.5,
    });
    const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.1), bodyMaterial);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.22, d + 0.08), trimMaterial);
    band.position.y = h * 0.72;
    group.add(band);
    const band2 = band.clone();
    band2.position.y = h * 0.28;
    group.add(band2);

    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.1, d * 0.82), trimMaterial);
    top.position.y = h + 0.04;
    group.add(top);

    const stripeTex = HAZARD();
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.7, h * 0.22),
      new THREE.MeshBasicMaterial({ map: stripeTex }),
    );
    stripe.position.set(0, h * 0.5, d / 2 + 0.02);
    group.add(stripe);
  } else if (def.kind === "concrete" || def.kind === "barrier") {
    const concrete = new THREE.MeshStandardMaterial({
      color: def.color ?? map.theme.wallColor,
      roughness: 0.94,
    });
    const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.08), concrete);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const topMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color ?? map.theme.wallColor).multiplyScalar(1.25),
      roughness: 0.85,
    });
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.12, d + 0.12), topMaterial);
    top.position.y = h + 0.05;
    group.add(top);

    if (def.kind === "barrier") {
      const tex = HAZARD();
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.92, h * 0.5),
        new THREE.MeshBasicMaterial({ map: tex }),
      );
      stripe.position.set(0, h * 0.5, d / 2 + 0.015);
      group.add(stripe);
      const stripeBack = stripe.clone();
      stripeBack.rotation.y = Math.PI;
      stripeBack.position.z = -d / 2 - 0.015;
      group.add(stripeBack);
    } else {
      for (const side of [-1, 1]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, h * 0.92, 0.12), concrete);
        rib.position.set(side * (w / 2 - 0.4), h / 2, d / 2 + 0.01);
        group.add(rib);
      }
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(w * 0.5, 3.2), 0.7),
        new THREE.MeshBasicMaterial({ map: createBannerTexture(map.theme.accent) }),
      );
      label.position.set(0, h * 0.62, d / 2 + 0.02);
      group.add(label);
    }
  } else if (def.kind === "pillar") {
    const material = new THREE.MeshStandardMaterial({ color: 0x4a4741, roughness: 0.85 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(def.hx + 0.2, def.hx + 0.35, 0.3, 12), material);
    base.position.y = 0.15;
    group.add(base);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(def.hx * 0.86, def.hx, h, 12), material);
    column.position.y = h / 2;
    column.castShadow = true;
    group.add(column);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(def.hx * 0.9, def.hx * 0.9, 0.28, 12),
      new THREE.MeshBasicMaterial({ color: map.theme.accent }),
    );
    band.position.y = h * 0.68;
    group.add(band);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(def.hx + 0.16, def.hx + 0.16, 0.18, 12), material);
    cap.position.y = h + 0.09;
    group.add(cap);
  } else if (def.kind === "tire") {
    const rubber = new THREE.MeshStandardMaterial({ color: 0x171614, roughness: 0.98 });
    const stack = Math.max(3, Math.round(h / 0.55));
    for (let i = 0; i < stack; i += 1) {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(def.hx * (1 - i * 0.015), def.hx * (1 - i * 0.015), 0.48, 18),
        rubber,
      );
      tire.position.y = 0.25 + i * 0.47;
      tire.rotation.y = i * 0.4;
      tire.castShadow = true;
      group.add(tire);
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(def.hx * 0.52, def.hx * 0.52, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: 0x40382c, roughness: 0.9 }),
      );
      cap.position.y = 0.51 + i * 0.47;
      group.add(cap);
    }
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(def.hx * 2.08, 0.1, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xff7a1f }),
    );
    strap.position.y = h * 0.55;
    strap.rotation.y = 0.5;
    group.add(strap);
  } else if (def.kind === "ac") {
    const casing = new THREE.MeshStandardMaterial({
      color: 0x7a7d7c,
      roughness: 0.65,
      metalness: 0.35,
    });
    const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.08), casing);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const vent = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.min(w, d) * 0.34, Math.min(w, d) * 0.34, 0.06, 18),
      new THREE.MeshStandardMaterial({ color: 0x25272a, roughness: 0.8 }),
    );
    vent.position.y = h + 0.02;
    group.add(vent);

    const fan = new THREE.Group();
    fan.position.y = h + 0.08;
    const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2e30, roughness: 0.7 });
    for (let i = 0; i < 4; i += 1) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.16), bladeMaterial);
      blade.rotation.y = (i / 4) * Math.PI;
      blade.position.x = Math.cos((i / 4) * Math.PI) * 0.3;
      blade.position.z = Math.sin((i / 4) * Math.PI) * 0.3;
      fan.add(blade);
    }
    fan.userData.spin = 4 + Math.random() * 4;
    group.add(fan);
    group.userData.fans = [fan];

    const grille = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.8, h * 0.4, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x3a3d3e, roughness: 0.8 }),
    );
    grille.position.set(0, h * 0.5, d / 2 + 0.01);
    group.add(grille);
  } else if (def.kind === "wreck") {
    const rust = new THREE.MeshStandardMaterial({
      color: def.color ?? 0x8a5a3a,
      roughness: 0.9,
      metalness: 0.4,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2c2823, roughness: 0.9 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(w, h * 0.55, d, 2, 0.1), rust);
    body.position.y = h * 0.275;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, h * 0.4, d * 0.62), rust);
    cabin.position.set(w * 0.1, h * 0.72, -d * 0.05);
    cabin.rotation.y = 0.18;
    cabin.castShadow = true;
    group.add(cabin);

    const window = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, h * 0.22, 0.05), dark);
    window.position.set(w * 0.1, h * 0.75, d * 0.28);
    window.rotation.y = 0.18;
    group.add(window);

    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const side of [-1, 1]) {
      for (const z of [-0.28, 0.3]) {
        const wheel = new THREE.Mesh(wheelGeo, dark);
        wheel.position.set(side * (w / 2 - 0.1), 0.3, z * d);
        group.add(wheel);
      }
    }
  } else if (def.kind === "furnace") {
    const steel = new THREE.MeshStandardMaterial({
      color: 0x35322d,
      roughness: 0.55,
      metalness: 0.7,
    });
    const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.18), steel);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xff5a1f });
    for (const side of [-1, 1]) {
      const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.42, h * 0.28), glowMaterial);
      windowMesh.position.set(side * (w / 2 + 0.02), h * 0.42, 0);
      windowMesh.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(windowMesh);

      const windowMesh2 = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.42, h * 0.28), glowMaterial);
      windowMesh2.position.set(0, h * 0.42, side * (d / 2 + 0.02));
      windowMesh2.rotation.y = side > 0 ? 0 : Math.PI;
      group.add(windowMesh2);
    }

    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.45, 3.2, 12), steel);
    chimney.position.set(0, h + 1.5, 0);
    group.add(chimney);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.25, 12),
      new THREE.MeshStandardMaterial({ color: 0x1e1c19, roughness: 0.7 }),
    );
    rim.position.y = h + 3.05;
    group.add(rim);

    const ladder = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, h * 0.8, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x1a1917, roughness: 0.7 }),
    );
    ladder.position.set(0, h * 0.45, -d / 2 - 0.06);
    group.add(ladder);
  } else if (def.kind === "container") {
    const shell = new THREE.MeshStandardMaterial({
      color: def.color ?? 0x2f6f8f,
      roughness: 0.72,
      metalness: 0.4,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shell);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const ribMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color ?? 0x2f6f8f).multiplyScalar(0.72),
      roughness: 0.8,
      metalness: 0.35,
    });
    const ribs = Math.max(4, Math.round(w / 1.1));
    for (let i = 0; i < ribs; i += 1) {
      const t = (i + 0.5) / ribs - 0.5;
      for (const side of [-1, 1]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, h * 0.92, 0.1), ribMaterial);
        rib.position.set(t * w * 0.94, h / 2, side * (d / 2 + 0.03));
        group.add(rib);
      }
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.86, 0.06), ribMaterial);
    door.position.set(0, h / 2, d / 2 + 0.06);
    group.add(door);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.09, h * 0.9, 0.09), ribMaterial);
    bar.position.set(0, h / 2, d / 2 + 0.1);
    group.add(bar);
    const code = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(w * 0.5, 2.4), 0.5),
      new THREE.MeshBasicMaterial({ map: createSignTexture("CARGO", 0xffc977) }),
    );
    code.position.set(-w * 0.18, h * 0.74, d / 2 + 0.12);
    group.add(code);
  } else if (def.kind === "bumper") {
    const rubber = new THREE.MeshStandardMaterial({
      color: def.color ?? 0x2a2f38,
      roughness: 0.65,
      metalness: 0.2,
    });
    const base = new THREE.Mesh(new RoundedBoxGeometry(w, h * 0.72, d, 3, 0.28), rubber);
    base.position.y = h * 0.36;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
    const cushion = new THREE.Mesh(
      new RoundedBoxGeometry(w * 0.92, h * 0.42, d * 0.9, 3, 0.24),
      new THREE.MeshStandardMaterial({
        color: 0x1b1f26,
        roughness: 0.55,
        emissive: map.theme.accent,
        emissiveIntensity: 0.55,
      }),
    );
    cushion.position.y = h * 0.72;
    group.add(cushion);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.94, h * 0.1, d * 0.94),
      new THREE.MeshBasicMaterial({ color: map.theme.accent }),
    );
    stripe.position.y = h * 0.5;
    group.add(stripe);
  } else if (def.kind === "log") {
    const bark = new THREE.MeshStandardMaterial({
      color: def.color ?? 0x5a4430,
      roughness: 0.98,
    });
    // Climbable logs are half-buried: only the top half of the cylinder is
    // above grade, so the visual crown height matches `climbableHeightAt`.
    const climbable = def.category === "climbable";
    const radius = climbable ? h : h / 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, w, 12), bark);
    trunk.rotation.z = Math.PI / 2;
    trunk.position.y = climbable ? 0 : h / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color ?? 0x5a4430).multiplyScalar(1.3),
      roughness: 0.9,
    });
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.03, 12), ringMaterial);
      cap.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      cap.position.set(side * (w / 2 + 0.01), trunk.position.y, 0);
      group.add(cap);
    }
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.16, h * 0.2, h * 0.7, 8), bark);
    stub.position.set(w * 0.16, climbable ? h * 0.7 : h * 0.9, 0);
    stub.rotation.z = -0.5;
    group.add(stub);
  } else if (def.kind === "crystal") {
    const glow = def.color ?? map.theme.accent;
    const material = new THREE.MeshStandardMaterial({
      color: glow,
      emissive: glow,
      emissiveIntensity: 0.9,
      roughness: 0.18,
      metalness: 0.5,
      transparent: true,
      opacity: 0.86,
    });
    const shards = 4;
    for (let i = 0; i < shards; i += 1) {
      const angle = (i / shards) * Math.PI * 2;
      const radius = Math.min(def.hx, def.hz) * 0.5;
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(h * 0.22, h * (0.7 + (i % 2) * 0.35), 5),
        material,
      );
      shard.position.set(
        Math.cos(angle) * radius,
        h * 0.45,
        Math.sin(angle) * radius,
      );
      shard.rotation.z = Math.cos(angle) * 0.22;
      shard.rotation.x = Math.sin(angle) * 0.22;
      shard.castShadow = true;
      group.add(shard);
    }
    const light = new THREE.PointLight(glow, 26, h * 6, 2);
    light.position.y = h * 0.7;
    group.add(light);
  } else if (def.kind === "rock") {
    const stone = new THREE.MeshStandardMaterial({
      color: def.color ?? 0x6d6a63,
      roughness: 0.98,
    });
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(Math.max(def.hx, def.hz), 0), stone);
    body.scale.set(1, h / Math.max(0.4, Math.max(def.hx, def.hz)), 1);
    body.position.y = h / 2;
    body.rotation.set(0.2, (def.rot ?? 0) * 0.5, 0.1);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const chip = new THREE.Mesh(
      new THREE.DodecahedronGeometry(Math.max(0.3, def.hx * 0.4), 0),
      stone,
    );
    chip.position.set(def.hx * 0.7, h * 0.24, -def.hz * 0.5);
    chip.castShadow = true;
    group.add(chip);
  } else {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: 0x5b5145, roughness: 0.95 }),
    );
    box.position.y = h / 2;
    box.castShadow = true;
    group.add(box);

    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.86, 0.1, d * 0.8),
      new THREE.MeshStandardMaterial({ color: 0x2e2418, roughness: 1 }),
    );
    soil.position.y = h + 0.03;
    group.add(soil);

    const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x3d5a2a, roughness: 0.95 });
    const bushCount = Math.min(5, Math.round(w * d * 0.4));
    for (let i = 0; i < bushCount; i += 1) {
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 + Math.random() * 0.25, 1), bushMaterial);
      bush.position.set((Math.random() - 0.5) * w * 0.7, h + 0.3, (Math.random() - 0.5) * d * 0.7);
      group.add(bush);
    }
  }

  return group;
}

function buildScenery(def: SceneryDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;

  if (def.kind === "lamp") {
    const metal = new THREE.MeshStandardMaterial({ color: 0x2c2c28, roughness: 0.55, metalness: 0.7 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 6.4, 8), metal);
    pole.position.y = 3.2;
    group.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.14), metal);
    arm.position.set(0.45, 6.3, 0);
    group.add(arm);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.42),
      new THREE.MeshStandardMaterial({
        color: 0x1b1b18,
        emissive: 0xffd9a0,
        emissiveIntensity: 2.4,
        roughness: 0.4,
      }),
    );
    head.position.set(0.95, 6.18, 0);
    group.add(head);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 18),
      new THREE.MeshBasicMaterial({
        color: 0xffc977,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0.95, 0.02, 0);
    group.add(glow);
  } else if (def.kind === "crane") {
    const metal = new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.9, metalness: 0.5 });
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 20, 1.1), metal);
      leg.position.set(side * 4.5, 10, 0);
      group.add(leg);
    }
    for (let y = 2; y < 20; y += 3.4) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.4, 0.4), metal);
      brace.position.set(0, y, 0);
      group.add(brace);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(25, 1.4, 1.4), metal);
    beam.position.set(4, 20, 0);
    group.add(beam);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.08, 8, 0.08), metal);
    cable.position.set(11, 15.8, 0);
    group.add(cable);
    const hook = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x2b2520, roughness: 0.8 }),
    );
    hook.position.set(11, 11.5, 0);
    group.add(hook);
  } else if (def.kind === "neon") {
    const color = def.color ?? 0xff3d81;
    const texture = createSignTexture(def.text ?? "RIOT", color);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 2.1, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x121210, roughness: 0.6 }),
    );
    frame.position.y = def.y ?? 4.5;
    group.add(frame);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 1.9),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    panel.position.set(0, def.y ?? 4.5, 0.16);
    group.add(panel);
    const panelBack = panel.clone();
    panelBack.rotation.y = Math.PI;
    panelBack.position.z = -0.16;
    group.add(panelBack);

    const supports = new THREE.MeshStandardMaterial({ color: 0x1a1917, roughness: 0.8 });
    for (const side of [-1, 1]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.5, 0.16), supports);
      support.position.set(side * 3.1, (def.y ?? 4.5) / 2 - 0.6, -0.3);
      group.add(support);
    }
    group.userData.flicker = [panel, panelBack];
  } else if (def.kind === "tower") {
    const metal = new THREE.MeshStandardMaterial({ color: 0x4b4d50, roughness: 0.6, metalness: 0.5 });
    for (const [x, z] of [
      [-1.4, -1.4],
      [1.4, -1.4],
      [-1.4, 1.4],
      [1.4, 1.4],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 0.2), metal);
      leg.position.set(x, 2.5, z);
      group.add(leg);
    }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 3, 14), metal);
    tank.position.y = 6;
    group.add(tank);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.4, 14), metal);
    roof.position.y = 8.2;
    group.add(roof);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6), metal);
    antenna.position.y = 10.2;
    group.add(antenna);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2b2b }),
    );
    beacon.position.y = 11.7;
    group.add(beacon);
  } else if (def.kind === "pipes") {
    const metal = new THREE.MeshStandardMaterial({ color: 0x5c5345, roughness: 0.7, metalness: 0.55 });
    for (let i = 0; i < 3; i += 1) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 16, 10), metal);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 1.6 + i * 0.75, i * 0.42);
      group.add(pipe);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.18, 10), metal);
      ring.rotation.z = Math.PI / 2;
      ring.position.set(-4.5, 1.6 + i * 0.75, i * 0.42);
      group.add(ring);
      const ring2 = ring.clone();
      ring2.position.x = 4.5;
      group.add(ring2);
    }
  } else if (def.kind === "barrel") {
    const color = def.color ?? 0x8b3a1f;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 1.15, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.35 }),
    );
    body.position.y = 0.58;
    group.add(body);
    const ringMaterial = new THREE.MeshStandardMaterial({ color: 0x1d1c19, roughness: 0.7 });
    for (const y of [0.28, 0.88]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.07, 12), ringMaterial);
      ring.position.y = y;
      group.add(ring);
    }
  } else if (def.kind === "stack") {
    const colors = [0x6a5a42, 0x7a3f2a, 0x4a5a42, 0x3f4652, 0x8a6a3a];
    for (let i = 0; i < 5; i += 1) {
      const size = 1.2 + Math.random() * 1.6;
      const material = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.92,
      });
      const part = new THREE.Mesh(new THREE.BoxGeometry(size, 0.8 + Math.random(), size), material);
      part.position.set((Math.random() - 0.5) * 3, 0.5 + i * 0.55, (Math.random() - 0.5) * 3);
      part.rotation.y = Math.random() * Math.PI;
      part.castShadow = true;
      group.add(part);
    }
  } else if (def.kind === "skyline") {
    const texture = createWindowTexture(0xffc977);
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        map: texture,
        color: 0x15161f,
        roughness: 0.9,
        emissive: 0xffffff,
        emissiveMap: texture,
        emissiveIntensity: 0.9,
      }),
    );
    building.scale.set(6 + Math.random() * 8, 18 + Math.random() * 42, 6 + Math.random() * 8);
    building.position.y = building.scale.y / 2;
    group.add(building);
  } else if (def.kind === "headstone") {
    const stone = new THREE.MeshStandardMaterial({
      color: def.color ?? 0x6e746c,
      roughness: 0.94,
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.65), stone);
    base.position.y = 0.11;
    group.add(base);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.25, 0.3), stone);
    slab.position.y = 0.78;
    slab.rotation.z = (Math.random() - 0.5) * 0.08;
    group.add(slab);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.3, 10, 1, false, 0, Math.PI), stone);
    cap.rotation.z = Math.PI / 2;
    cap.rotation.x = Math.PI / 2;
    cap.position.y = 1.4;
    group.add(cap);
  } else if (def.kind === "pine") {
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.95 });
    const needleMaterial = new THREE.MeshStandardMaterial({
      color: def.color ?? 0x2f5a42,
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.1, 7), trunkMaterial);
    trunk.position.y = 1.05;
    group.add(trunk);
    for (let i = 0; i < 3; i += 1) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.55 - i * 0.32, 1.8, 8), needleMaterial);
      cone.position.y = 1.9 + i * 0.85;
      group.add(cone);
    }
  } else if (def.kind === "palm") {
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.95 });
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: def.color ?? 0x2f8a4a,
      roughness: 0.82,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 5; i += 1) {
      const segment = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.1, 7), trunkMaterial);
      segment.position.set(Math.sin(i * 0.22) * 0.32, 0.55 + i * 0.95, 0);
      segment.rotation.z = -i * 0.06;
      group.add(segment);
    }
    const crown = new THREE.Group();
    crown.position.set(Math.sin(4 * 0.22) * 0.32, 5.1, 0);
    for (let i = 0; i < 6; i += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.9, 4), leafMaterial);
      leaf.rotation.z = Math.PI / 2.4;
      leaf.rotation.y = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos((i / 6) * Math.PI * 2) * 1.05, 0.2, Math.sin((i / 6) * Math.PI * 2) * 1.05);
      crown.add(leaf);
    }
    const coconutMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
    for (let i = 0; i < 3; i += 1) {
      const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), coconutMaterial);
      coconut.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.28, -0.05, Math.sin((i / 3) * Math.PI * 2) * 0.28);
      crown.add(coconut);
    }
    group.add(crown);
  } else if (def.kind === "snowman") {
    const snow = new THREE.MeshStandardMaterial({ color: 0xf2f7fb, roughness: 0.85 });
    const coal = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.8 });
    const carrot = new THREE.MeshStandardMaterial({ color: 0xff8a1f, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 9), snow);
    body.position.y = 0.78;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 9), snow);
    head.position.y = 1.66;
    group.add(head);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.46, 7), carrot);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.66, 0.56);
    group.add(nose);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), coal);
      eye.position.set(side * 0.16, 1.78, 0.42);
      group.add(eye);
    }
    for (let i = 0; i < 3; i += 1) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), coal);
      button.position.set(0, 1.18 - i * 0.25, 0.68);
      group.add(button);
    }
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.42, 10), coal);
    hat.position.y = 2.12;
    group.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 10), coal);
    brim.position.y = 1.94;
    group.add(brim);
  } else if (def.kind === "torii") {
    const paint = new THREE.MeshStandardMaterial({
      color: def.color ?? 0xd8422f,
      roughness: 0.7,
      metalness: 0.15,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2422, roughness: 0.8 });
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 4.2, 10), paint);
      post.position.set(side * 2.2, 2.1, 0);
      group.add(post);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.3, 10), dark);
      foot.position.set(side * 2.2, 0.15, 0);
      group.add(foot);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.4, 0.55), paint);
    top.position.y = 4.35;
    group.add(top);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.28, 0.75), dark);
    cap.position.y = 4.63;
    group.add(cap);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.28, 0.4), paint);
    beam.position.y = 3.55;
    group.add(beam);
  } else if (def.kind === "flag") {
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.5 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.4, 7), poleMaterial);
    pole.position.y = 3.2;
    group.add(pole);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 1.5),
      new THREE.MeshStandardMaterial({
        color: def.color ?? 0xff5a1f,
        roughness: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    banner.position.set(1.45, 5.45, 0);
    banner.rotation.y = Math.PI / 2;
    group.add(banner);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), poleMaterial);
    finial.position.y = 6.5;
    group.add(finial);
  } else if (def.kind === "fan") {
    const casing = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6, metalness: 0.5 });
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.5, 20), casing);
    housing.position.y = 2.4;
    housing.rotation.x = Math.PI / 2;
    group.add(housing);
    const fan = new THREE.Group();
    fan.position.y = 2.4;
    const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.7, metalness: 0.4 });
    for (let i = 0; i < 5; i += 1) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.42, 0.05), bladeMaterial);
      blade.position.x = Math.cos((i / 5) * Math.PI * 2) * 0.62;
      blade.position.y = Math.sin((i / 5) * Math.PI * 2) * 0.62;
      blade.rotation.z = (i / 5) * Math.PI * 2;
      fan.add(blade);
    }
    fan.userData.spin = 5 + Math.random() * 4;
    group.add(fan);
    group.userData.fans = [fan];
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.4, 0.28), casing);
      leg.position.set(side * 1.1, 1.2, 0);
      group.add(leg);
    }
    const glow = new THREE.PointLight(def.color ?? 0x59d5ff, 12, 12, 2);
    glow.position.set(0, 3.4, 0);
    group.add(glow);
  } else if (def.kind === "hologram") {
    const color = def.color ?? 0x59d5ff;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const wire = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const height = def.y ?? 5;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(5.2, height), material);
    panel.position.y = height / 2 + 0.4;
    group.add(panel);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(5.2, height)), wire);
    edges.position.copy(panel.position);
    group.add(edges);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 28), wire);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    group.add(ring);
    const text = def.text;
    if (text) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(4.6, 1.15),
        new THREE.MeshBasicMaterial({
          map: createSignTexture(text, color),
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sign.position.set(0, height * 0.62 + 0.4, 0.02);
      group.add(sign);
    }
    const light = new THREE.PointLight(color, 18, 14, 2);
    light.position.y = height * 0.6;
    group.add(light);
  } else if (def.kind === "antenna") {
    const metal = new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.55, metalness: 0.6 });
    const height = def.y ?? 12;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, height, 8), metal);
    mast.position.y = height / 2;
    group.add(mast);
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, height * 0.5, 6), metal);
    brace.position.set(0.9, height * 0.25, 0);
    brace.rotation.z = 0.28;
    group.add(brace);
    for (let i = 0; i < 3; i += 1) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6 - i * 0.3, 0.1, 0.1), metal);
      arm.position.y = height * (0.45 + i * 0.16);
      group.add(arm);
    }
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff3d5a }),
    );
    beacon.position.y = height;
    group.add(beacon);
    group.userData.beacon = beacon;
  } else if (def.kind === "tunnelCeiling") {
    const shellColor = def.color ?? 0x3a4650;
    const shell = new THREE.MeshStandardMaterial({
      color: shellColor,
      roughness: 0.82,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });
    const accent = new THREE.MeshBasicMaterial({
      color: 0x37f5e0,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const width = (def.hx ?? 6) * 2;
    const depth = (def.hz ?? 20) * 2;
    const crown = def.height ?? 5.2;
    // A shallow boxed vault: a flat crown plate plus two angled haunches. It is
    // open at both ends and stays well above the kart's bounding volume.
    const crownPlate = new THREE.Mesh(new THREE.BoxGeometry(width * 0.62, 0.34, depth), shell);
    crownPlate.position.y = crown;
    group.add(crownPlate);
    for (const side of [-1, 1]) {
      const haunch = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.42, 0.3, depth),
        shell,
      );
      haunch.rotation.z = side * -0.42;
      haunch.position.set(side * width * 0.3, crown - 0.62, 0);
      group.add(haunch);
    }

    // Cross ribs read the tunnel direction and catch the accent light.
    const ribs = Math.max(2, Math.round(depth / 6));
    for (let i = 0; i < ribs; i += 1) {
      const t = (i + 0.5) / ribs - 0.5;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.1, 0.18), accent);
      rib.position.set(0, crown - 0.36, t * depth);
      group.add(rib);
    }
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, depth * 0.94), accent);
      strip.position.set(side * (width * 0.36), crown - 0.72, 0);
      group.add(strip);
    }
  } else if (def.kind === "reactor") {
    const core = new THREE.MeshStandardMaterial({
      color: def.color ?? 0x8affc8,
      emissive: def.color ?? 0x8affc8,
      emissiveIntensity: 1.4,
      roughness: 0.25,
      metalness: 0.55,
      transparent: true,
      opacity: 0.82,
    });
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.4 + i * 0.7, 0.11, 8, 32),
        core,
      );
      ring.rotation.x = Math.PI / 2 + i * 0.32;
      ring.rotation.z = i * 0.4;
      ring.position.y = (def.y ?? 4) + i * 0.5;
      group.add(ring);
      rings.push(ring);
    }
    const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), core);
    coreMesh.position.y = def.y ?? 4;
    group.add(coreMesh);
    const light = new THREE.PointLight(def.color ?? 0x8affc8, 90, 26, 2);
    light.position.y = def.y ?? 4;
    group.add(light);
    group.userData.reactor = { rings, core: coreMesh };
  }

  return group;
}

function buildHazards(
  map: MapDef,
  animated: Array<(time: number, dt: number) => void>,
): THREE.Group {
  const group = new THREE.Group();
  if (map.hazards.length === 0) return group;

  const palette = {
    lava: { base: 0xff5a1f, edge: 0xffb347, glow: 0xff3d00 },
    sludge: { base: 0x8fd14a, edge: 0xc8ff7a, glow: 0x4f8a1f },
    void: { base: 0x120a20, edge: 0xff3d81, glow: 0x1a0b2e },
    water: { base: 0x1e4f78, edge: 0x7dd3fc, glow: 0x1a4a6a },
  } as const;

  for (const hazard of map.hazards) {
    const colors = palette[hazard.kind];
    const floor = hazard.base ?? terrainHeightAt(map, hazard.x, hazard.z);
    const y = floor + 0.025;
    const texture = createHazardTexture(colors.edge);
    texture.repeat.set(
      hazard.radius ? Math.max(1, hazard.radius / 3) : Math.max(1, (hazard.hx ?? 4) / 3),
      hazard.radius ? Math.max(1, hazard.radius / 3) : Math.max(1, (hazard.hz ?? 4) / 3),
    );

    const geometry = hazard.radius
      ? new THREE.CircleGeometry(hazard.radius, 48)
      : new THREE.PlaneGeometry((hazard.hx ?? 0) * 2, (hazard.hz ?? 0) * 2);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: colors.base,
      transparent: true,
      opacity: hazard.kind === "void" ? 0.94 : 0.88,
      blending: hazard.kind === "void" ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const surface = new THREE.Mesh(geometry, material);
    surface.rotation.x = -Math.PI / 2;
    surface.position.set(hazard.x, y, hazard.z);
    surface.renderOrder = 1;
    group.add(surface);

    // A bright rim makes the lethal boundary legible from the kart camera.
    const rimGeometry = hazard.radius
      ? new THREE.RingGeometry(hazard.radius * 0.94, hazard.radius, 48)
      : new THREE.RingGeometry(1, 1.1, 4);
    const rimMaterial = new THREE.MeshBasicMaterial({
      color: colors.edge,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = -Math.PI / 2;
    if (hazard.radius) {
      rim.position.set(hazard.x, y + 0.012, hazard.z);
    } else {
      const hx = hazard.hx ?? 1;
      const hz = hazard.hz ?? 1;
      rim.scale.set(hx, hz, 1);
      rim.position.set(hazard.x, y + 0.012, hazard.z);
    }
    rim.renderOrder = 2;
    group.add(rim);

    if (hazard.kind !== "void") {
      const light = new THREE.PointLight(colors.glow, 55, (hazard.radius ?? 8) * 3.2, 2);
      light.position.set(hazard.x, y + 1.4, hazard.z);
      group.add(light);
    }

    const phase = Math.random() * Math.PI * 2;
    animated.push((time) => {
      texture.offset.x = time * 0.035;
      texture.offset.y = time * 0.021;
      material.opacity =
        (hazard.kind === "void" ? 0.9 : 0.82) + Math.sin(time * 1.7 + phase) * 0.08;
    });
  }

  return group;
}

function buildSkyline(map: MapDef): THREE.Group {
  const group = new THREE.Group();
  if (map.theme.groundStyle !== "asphalt") {
    return group;
  }
  const colors = [0xffc977, 0xff3d81, 0x37f5e0];
  for (let i = 0; i < 34; i += 1) {
    const angle = (i / 34) * Math.PI * 2 + Math.random() * 0.08;
    const radius = 66 + Math.random() * 58;
    const texture = createWindowTexture(colors[i % colors.length]);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x10111a,
      roughness: 0.92,
      emissive: 0xffffff,
      emissiveMap: texture,
      emissiveIntensity: 1.1,
      fog: true,
    });
    const width = 8 + Math.random() * 12;
    const depth = 8 + Math.random() * 12;
    const height = 40 + Math.random() * 78 + (radius < 90 ? 18 : 0);
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    building.position.set(Math.cos(angle) * radius, height / 2 - 46, Math.sin(angle) * radius);
    building.rotation.y = -angle + Math.random() * 0.3;
    group.add(building);

    if (i % 4 === 0) {
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 6, 4),
        new THREE.MeshBasicMaterial({ color: 0xff3d81 }),
      );
      beacon.position.set(building.position.x, building.position.y + height / 2 + 0.6, building.position.z);
      group.add(beacon);
    }
  }

  const cityFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshStandardMaterial({ color: 0x06070e, roughness: 0.98 }),
  );
  cityFloor.rotation.x = -Math.PI / 2;
  cityFloor.position.y = -47.6;
  group.add(cityFloor);

  const towerBase = new THREE.Mesh(
    new THREE.BoxGeometry(map.size + 12, 6, map.depth + 12),
    new THREE.MeshStandardMaterial({ color: 0x0e0e14, roughness: 0.95 }),
  );
  towerBase.position.y = -3.1;
  group.add(towerBase);

  return group;
}

function buildMounds(map: MapDef): THREE.Group {
  const group = new THREE.Group();
  if (map.arenaClass === "sky") {
    return group;
  }
  const material = new THREE.MeshStandardMaterial({
    color:
      map.theme.groundStyle === "snow"
        ? new THREE.Color(map.theme.ground).multiplyScalar(0.92)
        : map.theme.groundStyle === "sand"
          ? 0x8a6a45
          : 0x3a2a1e,
    roughness: 1,
  });
  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const radius = Math.max(map.size, map.depth) * 0.85 + (i % 3) * 18;
    const mound = new THREE.Mesh(new THREE.SphereGeometry(12 + (i % 4) * 6, 10, 6), material);
    mound.scale.y = 0.24;
    mound.position.set(Math.cos(angle) * radius, -1.5, Math.sin(angle) * radius);
    group.add(mound);
  }
  return group;
}

function platformColor(def: PlatformDef): number {
  if (def.color !== undefined) return def.color;
  if (def.kind === "steel") return 0x4b4740;
  if (def.kind === "wreck") return 0x8a6a45;
  if (def.kind === "temple") return 0x5b5348;
  if (def.kind === "roof") return 0x35373d;
  if (def.kind === "hologram") return 0x2c4a6a;
  return 0x2e2e36;
}

function buildPlatform(def: PlatformDef, map: MapDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;
  const w = def.hx * 2;
  const d = def.hz * 2;
  const h = def.height;
  const baseColor = platformColor(def);
  const isHologram = def.kind === "hologram";
  const isBridge = def.kind === "bridge";
  const underside = isBridge ? Math.max(0, Math.min(def.clearance ?? 0, h - 0.3)) : 0;
  const slab = h - underside;
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: isHologram ? 0.2 : def.kind === "steel" ? 0.72 : 0.9,
    metalness: isHologram ? 0.55 : def.kind === "steel" ? 0.45 : 0.15,
    emissive: isHologram ? map.theme.accent : 0x000000,
    emissiveIntensity: isHologram ? 0.35 : 0,
    transparent: isHologram,
    opacity: isHologram ? 0.72 : 1,
  });
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, Math.max(0.3, slab), d, 2, 0.12), bodyMaterial);
  body.position.y = underside + Math.max(0.3, slab) / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const topMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor).multiplyScalar(1.22),
    roughness: isHologram ? 0.3 : 0.8,
    metalness: def.kind === "steel" ? 0.4 : 0.1,
    emissive: isHologram ? map.theme.accent : 0x000000,
    emissiveIntensity: isHologram ? 0.5 : 0,
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.16, d + 0.16), topMaterial);
  top.position.y = h + 0.02;
  top.receiveShadow = true;
  group.add(top);

  const accent = new THREE.MeshBasicMaterial({
    color: map.theme.accent,
    transparent: true,
    opacity: isHologram ? 0.95 : 0.82,
  });
  const frontStrip = new THREE.BoxGeometry(w * 0.92, 0.08, 0.08);
  const flankStrip = new THREE.BoxGeometry(0.08, 0.08, d * 0.92);
  for (const side of [-1, 1]) {
    const front = new THREE.Mesh(frontStrip, accent);
    front.position.set(0, h - 0.18, side * (d / 2 + 0.05));
    group.add(front);
    const flank = new THREE.Mesh(flankStrip, accent);
    flank.position.set(side * (w / 2 + 0.05), h - 0.18, 0);
    group.add(flank);
  }

  if (isBridge) {
    // Visible slab edge and corner pylons so the drive-under gap reads clearly.
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor).multiplyScalar(0.7),
      roughness: 0.8,
      metalness: 0.4,
    });
    for (const side of [-1, 1]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.24, 0.24), trimMaterial);
      beam.position.set(0, underside + 0.12, side * (d / 2));
      group.add(beam);
    }
    const pylonHeight = Math.max(0.4, underside);
    const pylonGeometry = new THREE.BoxGeometry(0.42, pylonHeight, 0.42);
    for (const x of [-w / 2 + 0.4, w / 2 - 0.4]) {
      for (const z of [-d / 2 + 0.4, d / 2 - 0.4]) {
        const pylon = new THREE.Mesh(pylonGeometry, trimMaterial);
        pylon.position.set(x, pylonHeight / 2, z);
        pylon.castShadow = true;
        group.add(pylon);
      }
    }
  } else {
    const ribMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor).multiplyScalar(0.72),
      roughness: 0.9,
    });
    const ribHeight = Math.max(0.8, h * 0.82);
    const ribGeometry = new THREE.BoxGeometry(0.18, ribHeight, 0.18);
    for (const x of [-w / 2 + 1.2, 0, w / 2 - 1.2]) {
      for (const side of [-1, 1]) {
        const rib = new THREE.Mesh(ribGeometry, ribMaterial);
        rib.position.set(x, ribHeight / 2, side * (d / 2 + 0.02));
        group.add(rib);
      }
    }
  }

  if (def.kind === "temple") {
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.6, 0.34, d + 0.6),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseColor).multiplyScalar(1.42),
        roughness: 0.88,
      }),
    );
    cornice.position.y = h - 0.42;
    group.add(cornice);
    const columnMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor).multiplyScalar(1.3),
      roughness: 0.86,
    });
    const columns = Math.max(2, Math.floor(w / 3.2));
    for (let i = 0; i < columns; i += 1) {
      const t = (i + 0.5) / columns - 0.5;
      for (const side of [-1, 1]) {
        const column = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, h - 0.6, 10), columnMaterial);
        column.position.set(t * w * 0.88, (h - 0.6) / 2, side * (d / 2 + 0.12));
        column.castShadow = true;
        group.add(column);
      }
    }
  }

  if (isHologram) {
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
      new THREE.LineBasicMaterial({
        color: map.theme.accent,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      }),
    );
    wire.position.y = h / 2;
    group.add(wire);
  }

  return group;
}

function rampColor(def: RampDef): number {
  if (def.color !== undefined) return def.color;
  if (def.kind === "steel") return 0x5a554c;
  if (def.kind === "wreck") return 0x9a7a52;
  if (def.kind === "temple") return 0x6a5f52;
  return 0x35353e;
}

function rampProfileValue(profile: RampDef["profile"], t: number): number {
  switch (profile ?? "linear") {
    case "smooth":
      return t * t * t * (t * (t * 6 - 15) + 10);
    case "quarter":
      return t * t * (3 - 2 * t) * t;
    default:
      return t;
  }
}

function buildRamp(def: RampDef, map: MapDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  const along = def.axis === "z" ? def.hz : def.hx;
  const across = def.axis === "z" ? def.hx : def.hz;
  const length = along * 2;
  const width = across * 2;
  const h = def.height;
  const halfWidth = width / 2;
  const halfLength = length / 2;
  const steps = def.profile && def.profile !== "linear" ? 14 : 2;

  const topRows: Array<Array<[number, number, number]>> = [];
  const bottom: Array<[number, number, number]> = [
    [-halfWidth, 0, -halfLength],
    [halfWidth, 0, -halfLength],
    [halfWidth, 0, halfLength],
    [-halfWidth, 0, halfLength],
  ];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const y = rampProfileValue(def.profile, t) * h;
    const z = -halfLength + t * length;
    topRows.push([
      [-halfWidth, y, z],
      [halfWidth, y, z],
    ]);
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const push = (point: [number, number, number], u: number, v: number) => {
    positions.push(point[0], point[1], point[2]);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };

  // Top surface strip.
  const topIndices: number[][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const v = i / steps;
    topIndices.push([
      push(topRows[i][0], 0, v),
      push(topRows[i][1], 1, v),
    ]);
  }
  for (let i = 0; i < steps; i += 1) {
    const [a0, a1] = topIndices[i];
    const [b0, b1] = topIndices[i + 1];
    indices.push(a0, a1, b1, a0, b1, b0);
  }

  // Closed sides and low wall.
  const sideLeft: number[] = [];
  const sideRight: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    sideLeft.push(push([-halfWidth, 0, topRows[i][0][2]], 0, i / steps));
    sideRight.push(push([halfWidth, 0, topRows[i][0][2]], 1, i / steps));
  }
  for (let i = 0; i < steps; i += 1) {
    const topLeftA = topIndices[i][0];
    const topLeftB = topIndices[i + 1][0];
    indices.push(sideLeft[i], topLeftA, topLeftB, sideLeft[i], topLeftB, sideLeft[i + 1]);
    const topRightA = topIndices[i][1];
    const topRightB = topIndices[i + 1][1];
    indices.push(sideRight[i], topRightB, topRightA, sideRight[i], sideRight[i + 1], topRightB);
  }
  const lowLeft = push(bottom[0], 0, 0);
  const lowRight = push(bottom[1], 1, 0);
  indices.push(lowLeft, lowRight, topIndices[0][1], lowLeft, topIndices[0][1], topIndices[0][0]);
  const highLeft = push(bottom[3], 0, 1);
  const highRight = push(bottom[2], 1, 1);
  indices.push(highLeft, topIndices[steps][0], topIndices[steps][1], highLeft, topIndices[steps][1], highRight);
  const bottomA = push(bottom[0], 0, 0);
  const bottomB = push(bottom[1], 1, 0);
  const bottomC = push(bottom[2], 1, 1);
  const bottomD = push(bottom[3], 0, 1);
  indices.push(bottomA, bottomC, bottomB, bottomA, bottomD, bottomC);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const baseColor = rampColor(def);
  const wedge = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: def.kind === "steel" ? 0.7 : 0.9,
      metalness: def.kind === "steel" ? 0.42 : 0.12,
      side: THREE.DoubleSide,
    }),
  );
  wedge.castShadow = true;
  wedge.receiveShadow = true;
  group.add(wedge);

  const chevron = createChevronTexture();
  chevron.wrapS = THREE.RepeatWrapping;
  chevron.wrapT = THREE.RepeatWrapping;
  chevron.repeat.set(1, Math.max(1, Math.round(length / 4)));
  const stripePositions: number[] = [];
  const stripeUvs: number[] = [];
  const stripeIndices: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const y = rampProfileValue(def.profile, t) * h + 0.035;
    const z = -halfLength + t * length;
    stripePositions.push(-halfWidth * 0.82, y, z, halfWidth * 0.82, y, z);
    stripeUvs.push(0, t, 1, t);
    if (i > 0) {
      const base = (i - 1) * 2;
      stripeIndices.push(base, base + 1, base + 3, base, base + 3, base + 2);
    }
  }
  const stripeGeometry = new THREE.BufferGeometry();
  stripeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(stripePositions, 3));
  stripeGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(stripeUvs, 2));
  stripeGeometry.setIndex(stripeIndices);
  const stripe = new THREE.Mesh(
    stripeGeometry,
    new THREE.MeshBasicMaterial({
      map: chevron,
      color: map.theme.accent,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  group.add(stripe);

  const railMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor).multiplyScalar(0.62),
    roughness: 0.9,
  });
  for (const side of [-1, 1]) {
    const posts = Math.max(3, Math.round(length / 3));
    for (let i = 0; i <= posts; i += 1) {
      const t = i / posts;
      const y = rampProfileValue(def.profile, t) * h;
      const z = -halfLength + t * length;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.14), railMaterial);
      post.position.set(side * (halfWidth - 0.1), y + 0.3, z);
      group.add(post);
    }
  }

  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.12, 0.28),
    new THREE.MeshStandardMaterial({ color: map.theme.accent, roughness: 0.7 }),
  );
  lip.position.set(0, 0.06, -halfLength + 0.14);
  group.add(lip);

  if (def.axis === "z") {
    group.rotation.y = def.dir === 1 ? 0 : Math.PI;
  } else {
    group.rotation.y = def.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  }

  return group;
}

/**
 * The collision height field rendered as a single mesh. Resolution scales with
 * the arena so a 120-unit map still samples natural mounds and road shoulders.
 */
function buildTerrainSurface(map: MapDef): THREE.Group {
  const group = new THREE.Group();
  const sizeX = map.size;
  const sizeZ = map.depth;
  const halfX = sizeX / 2;
  const halfZ = sizeZ / 2;
  const segmentsX = Math.min(110, Math.max(28, Math.round(sizeX / 1.6)));
  const segmentsZ = Math.min(110, Math.max(28, Math.round(sizeZ / 1.6)));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iz = 0; iz <= segmentsZ; iz += 1) {
    const z = -halfZ + (iz / segmentsZ) * sizeZ;
    for (let ix = 0; ix <= segmentsX; ix += 1) {
      const x = -halfX + (ix / segmentsX) * sizeX;
      positions.push(x, terrainHeightAt(map, x, z), z);
      uvs.push(ix / segmentsX, iz / segmentsZ);
    }
  }
  for (let iz = 0; iz < segmentsZ; iz += 1) {
    for (let ix = 0; ix < segmentsX; ix += 1) {
      const a = iz * (segmentsX + 1) + ix;
      const b = a + 1;
      const c = a + segmentsX + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const texture = createGroundTexture(map.theme);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(Math.max(2, map.size / 7), Math.max(2, map.depth / 7));
  const ground = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.97,
      metalness: map.theme.groundStyle === "metal" ? 0.12 : 0.02,
    }),
  );
  ground.receiveShadow = true;
  group.add(ground);

  // A thin skirt hides the seam between the height field and the void.
  const skirtMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(map.theme.ground).multiplyScalar(0.4),
    roughness: 1,
  });
  const skirtHeight = 6;
  const sides: Array<[number, number, number, number, number]> = [
    [0, -halfZ, sizeX, 0, 1],
    [0, halfZ, sizeX, 0, 1],
    [-halfX, 0, 0, sizeZ, 1],
    [halfX, 0, 0, sizeZ, 1],
  ];
  for (const [x, z, w, d] of sides) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(w || 0.4, skirtHeight, d || 0.4), skirtMaterial);
    skirt.position.set(x, -skirtHeight / 2 - 0.05, z);
    group.add(skirt);
  }

  return group;
}

/** Road ribbons follow the carved collision height, including banking. */
function buildRoads(map: MapDef): THREE.Group {
  const group = new THREE.Group();
  for (const geometry of roadNetwork(map)) {
    const road = geometry.def;
    const half = road.width / 2;
    const bank = Math.tan(road.banking ?? 0);
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const samples = geometry.samples;
    const closed = road.closed ?? true;
    const count = samples.length;
    const rows = closed ? count + 1 : count;
    for (let i = 0; i < rows; i += 1) {
      const sample = samples[i % count];
      const leftX = sample.x + sample.lx * half;
      const leftZ = sample.z + sample.lz * half;
      const rightX = sample.x - sample.lx * half;
      const rightZ = sample.z - sample.lz * half;
      const leftY = terrainHeightAt(map, leftX, leftZ) + bank * half + 0.025;
      const rightY = terrainHeightAt(map, rightX, rightZ) - bank * half + 0.025;
      const centerY = terrainHeightAt(map, sample.x, sample.z) + 0.035;
      positions.push(leftX, Math.max(leftY, centerY - 0.1), leftZ);
      positions.push(rightX, Math.max(rightY, centerY - 0.1), rightZ);
      const v = sample.distance / 9;
      uvs.push(0, v, 1, v);
      if (i > 0) {
        const base = (i - 1) * 2;
        indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
    }
    const surface = road.surface;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(SURFACE_COLORS[surface]).multiplyScalar(0.92),
      roughness: SURFACE_ROUGHNESS[surface],
      metalness: surface === "metal" || surface === "futuristic" ? 0.32 : 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const geometry3 = new THREE.BufferGeometry();
    geometry3.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry3.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry3.setIndex(indices);
    geometry3.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry3, material);
    mesh.receiveShadow = true;
    group.add(mesh);

    // Glowing edge strips make lane boundaries legible at speed.
    if (road.kind === "main") {
      for (const side of [-1, 1]) {
        const edgePositions: number[] = [];
        for (let i = 0; i < rows; i += 1) {
          const sample = samples[i % count];
          const offset = side * (half - 0.22);
          const x = sample.x + sample.lx * offset;
          const z = sample.z + sample.lz * offset;
          const y = terrainHeightAt(map, x, z) + 0.045;
          edgePositions.push(x, y, z);
        }
        const edgeGeometry = new THREE.BufferGeometry();
        edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
        const edge = new THREE.Line(
          edgeGeometry,
          new THREE.LineBasicMaterial({
            color: map.theme.accent,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
          }),
        );
        group.add(edge);
      }
    }
  }
  return group;
}

function buildWeather(map: MapDef): {
  group: THREE.Group;
  update: (time: number, dt: number) => void;
} | null {
  if (!map.weather) return null;
  const kind = map.weather;
  const count = kind === "rain" ? 1100 : kind === "snow" ? 800 : kind === "ash" ? 640 : 520;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count);
  const phases = new Float32Array(count);
  // A tiny deterministic generator keeps the ambient layer identical on every
  // client without touching gameplay state.
  let state = (map.seed ^ 0x5bd1e995) >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const halfX = map.size * 0.72;
  const halfZ = map.depth * 0.72;
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (random() * 2 - 1) * halfX;
    positions[i * 3 + 1] = random() * 32 + 0.5;
    positions[i * 3 + 2] = (random() * 2 - 1) * halfZ;
    velocities[i] =
      kind === "rain" ? 22 + random() * 12 : kind === "snow" ? 2 + random() * 2 : kind === "ash" ? 1 + random() * 1.4 : 4 + random() * 3;
    phases[i] = random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const color =
    kind === "rain"
      ? 0xa8d8ff
      : kind === "snow"
        ? 0xf4f9ff
        : kind === "ash"
          ? 0xc8c2b4
          : map.theme.accent;
  const material = new THREE.PointsMaterial({
    color,
    size: kind === "rain" ? 0.12 : kind === "snow" ? 0.24 : 0.18,
    transparent: true,
    opacity: kind === "rain" ? 0.55 : 0.8,
    sizeAttenuation: true,
    depthWrite: false,
    blending: kind === "ash" ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  if (kind === "rain") {
    // A faint ground-level sheen sells wet asphalt without a second texture.
    const sheen = new THREE.Mesh(
      new THREE.PlaneGeometry(map.size * 1.02, map.depth * 1.02),
      new THREE.MeshBasicMaterial({
        color: map.theme.accent,
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    sheen.rotation.x = -Math.PI / 2;
    sheen.position.y = 0.06;
    group.add(sheen);
  }

  const update = (time: number, dt: number) => {
    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      const index = i * 3;
      const speed = velocities[i];
      if (kind === "sparks") {
        array[index + 1] += speed * dt;
        if (array[index + 1] > 34) array[index + 1] = 0.4;
      } else {
        array[index + 1] -= speed * dt;
        if (array[index + 1] < 0.1) array[index + 1] = 32;
      }
      const sway = kind === "snow" || kind === "ash" ? 0.5 : 0.12;
      array[index] += Math.sin(time * 0.7 + phases[i]) * sway * dt;
      array[index + 2] += (kind === "rain" ? 2.5 : Math.cos(time * 0.5 + phases[i]) * sway) * dt;
      if (array[index] > halfX) array[index] = -halfX;
      if (array[index] < -halfX) array[index] = halfX;
      if (array[index + 2] > halfZ) array[index + 2] = -halfZ;
      if (array[index + 2] < -halfZ) array[index + 2] = halfZ;
    }
    attribute.needsUpdate = true;
    if (kind === "sparks") {
      material.opacity = 0.65 + Math.sin(time * 4.2) * 0.12;
    }
  };

  return { group, update };
}

export function buildArena(map: MapDef): ArenaWorld {
  const group = new THREE.Group();
  const animated: Array<(time: number, dt: number) => void> = [];

  group.add(buildSky(map));

  const weather = buildWeather(map);
  if (weather) {
    group.add(weather.group);
    animated.push(weather.update);
  }

  group.add(buildTerrainSurface(map));
  group.add(buildRoads(map));

  const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(
      Math.max(map.size, map.depth) * 5,
      Math.max(map.size, map.depth) * 5,
    ),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(map.theme.ground).multiplyScalar(0.55),
      roughness: 1,
    }),
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.28;
  outerGround.receiveShadow = true;
  group.add(outerGround);

  for (const deck of map.platforms) {
    group.add(buildPlatform(deck, map));
  }
  for (const slope of map.ramps) {
    group.add(buildRamp(slope, map));
  }

  group.add(buildWalls(map));
  group.add(buildMounds(map));
  group.add(buildSkyline(map));
  group.add(buildHazards(map, animated));

  for (const obstacle of map.obstacles) {
    const mesh = buildObstacle(obstacle, map);
    group.add(mesh);
    const fans = mesh.userData.fans as THREE.Group[] | undefined;
    if (fans) {
      for (const fan of fans) {
        const speed = (fan.userData.spin as number) ?? 4;
        animated.push((_, dt) => {
          fan.rotation.y += speed * dt;
        });
      }
    }
  }

  for (const prop of map.scenery) {
    const mesh = buildScenery(prop);
    group.add(mesh);
    const flicker = mesh.userData.flicker as THREE.Mesh[] | undefined;
    if (flicker && flicker.length > 0) {
      animated.push((time) => {
        const pulse = 0.82 + Math.sin(time * 7.3) * 0.06 + (Math.random() > 0.985 ? -0.35 : 0);
        for (const panel of flicker) {
          const material = panel.material as THREE.MeshBasicMaterial;
          material.opacity = THREE.MathUtils.clamp(pulse, 0.45, 1);
          material.transparent = true;
        }
      });
    }
    const beacon = mesh.userData.beacon as THREE.Mesh | undefined;
    if (beacon) {
      const material = beacon.material as THREE.MeshBasicMaterial;
      animated.push((time) => {
        material.color.setHex(Math.sin(time * 4.2) > 0.2 ? 0xff3d5a : 0x4a1018);
      });
    }
    const reactor = mesh.userData.reactor as
      | { rings: THREE.Mesh[]; core: THREE.Mesh }
      | undefined;
    if (reactor) {
      animated.push((time, dt) => {
        reactor.rings.forEach((ring, index) => {
          ring.rotation.z += dt * (0.45 + index * 0.22) * (index % 2 === 0 ? 1 : -1);
        });
        reactor.core.rotation.y += dt * 0.7;
        const pulse = 1 + Math.sin(time * 2.6) * 0.08;
        reactor.core.scale.setScalar(pulse);
      });
    }
  }

  const chevron = createChevronTexture();
  const padMaterial = new THREE.MeshBasicMaterial({
    map: chevron,
    color: 0xffa02b,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const padGeo = new THREE.PlaneGeometry(3.4, 5.8);
  const padGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7a1f,
    transparent: true,
    opacity: 0.07,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const padGlowGeo = new THREE.PlaneGeometry(5.2, 8);
  for (const pad of map.boostPads) {
    const padY = groundHeightAt(map, pad.x, pad.z, 1) + 0.05;
    const mesh = new THREE.Mesh(padGeo, padMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = pad.rot;
    mesh.position.set(pad.x, padY, pad.z);
    group.add(mesh);

    const glow = new THREE.Mesh(padGlowGeo, padGlowMaterial);
    glow.rotation.x = -Math.PI / 2;
    glow.rotation.z = pad.rot;
    glow.position.set(pad.x, padY - 0.01, pad.z);
    group.add(glow);
  }
  animated.push((_, dt) => {
    chevron.offset.y -= dt * 2.2;
  });

  const hemi = new THREE.HemisphereLight(map.theme.hemiSky, map.theme.hemiGround, map.theme.hemiIntensity);
  group.add(hemi);

  const sun = new THREE.DirectionalLight(map.theme.sun, map.theme.sunIntensity);
  sun.position.set(...map.theme.sunPosition);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -65;
  sun.shadow.camera.right = 65;
  sun.shadow.camera.top = 65;
  sun.shadow.camera.bottom = -65;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  group.add(sun);
  group.add(sun.target);

  const flickerLights: Array<{ light: THREE.PointLight; base: number; phase: number }> = [];
  for (const lightDef of map.lights) {
    const light = new THREE.PointLight(lightDef.color, lightDef.intensity, lightDef.distance, 1.8);
    light.position.set(lightDef.x, lightDef.y, lightDef.z);
    group.add(light);
    flickerLights.push({ light, base: lightDef.intensity, phase: Math.random() * Math.PI * 2 });
  }

  animated.push((time) => {
    for (const entry of flickerLights) {
      entry.light.intensity = entry.base * (0.92 + Math.sin(time * 3.1 + entry.phase) * 0.08);
    }
  });

  // Ambient wash keyed to the arena accent so every theme reads as one place.
  const wash = new THREE.PointLight(
    map.theme.accent,
    map.arenaClass === "sky" ? 180 : 130,
    Math.max(map.size, map.depth) * 0.6,
    2,
  );
  wash.position.set(0, 3, 0);
  group.add(wash);

  return {
    group,
    animate(time, dt) {
      for (const fn of animated) {
        fn(time, dt);
      }
    },
  };
}

// Collision height queries live in terrain.ts; world.ts re-exports them so the
// renderer and physics always agree on a single height field.
export { groundHeightAt, groundSurfaceAt, rampHeightAt, terrainHeightAt };

export { hexToCss };

