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
import type {
  HazardDef,
  MapDef,
  ObstacleDef,
  PlatformDef,
  RampDef,
  SceneryDef,
} from "./types";

export interface ArenaWorld {
  group: THREE.Group;
  animate: (time: number, dt: number) => void;
}

const HAZARD = () => createHazardTexture(0xffc233);

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

  const sunLook = map.id === "scrapyard"
    ? { color: 0xfff3cf, radius: 27, glow: 64, opacity: 0.92, glowOpacity: 0.13 }
    : map.id === "rooftop"
      ? { color: 0xd6e4ff, radius: 10, glow: 30, opacity: 0.8, glowOpacity: 0.09 }
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

  if (map.id === "foundry") {
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

  if (map.id === "scrapyard") {
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

  if (map.id === "rooftop") {
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
  } as const;

  for (const hazard of map.hazards) {
    const colors = palette[hazard.kind];
    const y = (hazard.base ?? 0) + 0.025;
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
  if (map.id !== "rooftop") {
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
  if (map.id === "rooftop") {
    return group;
  }
  const material = new THREE.MeshStandardMaterial({
    color: map.id === "scrapyard" ? 0x8a6a45 : 0x3a2a1e,
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
  return 0x2e2e36;
}

function buildPlatform(def: PlatformDef, map: MapDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  const w = def.hx * 2;
  const d = def.hz * 2;
  const h = def.height;
  const baseColor = platformColor(def);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: def.kind === "steel" ? 0.72 : 0.9,
    metalness: def.kind === "steel" ? 0.45 : 0.15,
  });
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.12), bodyMaterial);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const topMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor).multiplyScalar(1.22),
    roughness: 0.8,
    metalness: def.kind === "steel" ? 0.4 : 0.1,
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.16, d + 0.16), topMaterial);
  top.position.y = h + 0.02;
  top.receiveShadow = true;
  group.add(top);

  const accent = new THREE.MeshBasicMaterial({
    color: map.theme.accent,
    transparent: true,
    opacity: 0.82,
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

  const ribMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor).multiplyScalar(0.72),
    roughness: 0.9,
  });
  const ribGeometry = new THREE.BoxGeometry(0.18, h * 0.82, 0.18);
  for (const x of [-w / 2 + 1.2, 0, w / 2 - 1.2]) {
    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(ribGeometry, ribMaterial);
      rib.position.set(x, h * 0.41, side * (d / 2 + 0.02));
      group.add(rib);
    }
  }

  return group;
}

function rampColor(def: RampDef): number {
  if (def.color !== undefined) return def.color;
  if (def.kind === "steel") return 0x5a554c;
  if (def.kind === "wreck") return 0x9a7a52;
  return 0x35353e;
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

  // Local ramp rises toward +Z; the group is rotated to match the map axis.
  const vertices = new Float32Array([
    -halfWidth, 0, -halfLength,
    halfWidth, 0, -halfLength,
    halfWidth, 0, halfLength,
    -halfWidth, 0, halfLength,
    -halfWidth, h, halfLength,
    halfWidth, h, halfLength,
  ]);
  const indices = [
    0, 1, 2, 0, 2, 3,
    0, 5, 1, 0, 4, 5,
    3, 2, 5, 3, 5, 4,
    0, 3, 4, 1, 5, 2,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const baseColor = rampColor(def);
  const wedge = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: def.kind === "steel" ? 0.7 : 0.9,
      metalness: def.kind === "steel" ? 0.42 : 0.12,
    }),
  );
  wedge.castShadow = true;
  wedge.receiveShadow = true;
  group.add(wedge);

  const slope = Math.atan2(h, length);
  const slopeLength = Math.hypot(h, length);
  const chevron = createChevronTexture();
  chevron.wrapS = THREE.RepeatWrapping;
  chevron.wrapT = THREE.RepeatWrapping;
  chevron.repeat.set(1, Math.max(1, Math.round(length / 4)));
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.82, slopeLength * 0.94),
    new THREE.MeshBasicMaterial({
      map: chevron,
      color: map.theme.accent,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  top.rotation.x = -Math.PI / 2 - slope;
  top.position.y = h / 2 + 0.04;
  group.add(top);

  const railMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor).multiplyScalar(0.62),
    roughness: 0.9,
  });
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, slopeLength * 0.96, 0.24),
      railMaterial,
    );
    rail.position.set(side * (width / 2 - 0.14), h / 2 + 0.08, 0);
    rail.rotation.x = Math.PI / 2 - slope;
    group.add(rail);
  }

  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.12, 0.28),
    new THREE.MeshStandardMaterial({ color: map.theme.accent, roughness: 0.7 }),
  );
  lip.position.set(0, 0.06, -length / 2 + 0.14);
  group.add(lip);

  if (def.axis === "z") {
    group.rotation.y = def.dir === 1 ? 0 : Math.PI;
  } else {
    group.rotation.y = def.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  }

  return group;
}

export function buildArena(map: MapDef): ArenaWorld {
  const group = new THREE.Group();
  const animated: Array<(time: number, dt: number) => void> = [];

  group.add(buildSky(map));

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
  outerGround.position.y = -0.08;
  outerGround.receiveShadow = true;
  if (map.id !== "rooftop") {
    group.add(outerGround);
  }

  const groundTexture = createGroundTexture(map.theme);
  groundTexture.repeat.set(map.size / 7, map.depth / 7);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(map.size, map.depth),
    new THREE.MeshStandardMaterial({
      map: groundTexture,
      color: 0xffffff,
      roughness: 0.97,
      metalness: 0.02,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

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
    const mesh = new THREE.Mesh(padGeo, padMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = pad.rot;
    mesh.position.set(pad.x, 0.035, pad.z);
    group.add(mesh);

    const glow = new THREE.Mesh(padGlowGeo, padGlowMaterial);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(pad.x, 0.03, pad.z);
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

  // Warm ground bounce for the foundry slag, cyan wash for the roof.
  const wash = new THREE.PointLight(map.theme.accent, map.id === "rooftop" ? 240 : 130, Math.max(map.size, map.depth) * 0.6, 2);
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

export function rampHeightAt(ramp: RampDef, x: number, z: number): number {
  if (
    Math.abs(x - ramp.x) > ramp.hx ||
    Math.abs(z - ramp.z) > ramp.hz
  ) {
    return 0;
  }
  const length = (ramp.axis === "x" ? ramp.hx : ramp.hz) * 2;
  const along =
    ramp.axis === "x"
      ? x - (ramp.x - ramp.hx)
      : z - (ramp.z - ramp.hz);
  const t = ramp.dir === 1 ? along / length : 1 - along / length;
  return THREE.MathUtils.clamp(t, 0, 1) * ramp.height;
}

/**
 * Walkable height at a point. Ramps are always sampled; platform tops only
 * count once the kart is high enough to land on them, so side collision keeps
 * ground-level karts out from underneath.
 */
export function groundHeightAt(
  map: MapDef,
  x: number,
  z: number,
  y = Number.POSITIVE_INFINITY,
): number {
  let height = 0;
  for (const ramp of map.ramps) {
    if (
      Math.abs(x - ramp.x) <= ramp.hx &&
      Math.abs(z - ramp.z) <= ramp.hz
    ) {
      height = Math.max(height, rampHeightAt(ramp, x, z));
    }
  }
  for (const platform of map.platforms) {
    if (
      Math.abs(x - platform.x) <= platform.hx &&
      Math.abs(z - platform.z) <= platform.hz &&
      y >= platform.height - 0.7
    ) {
      height = Math.max(height, platform.height);
    }
  }
  return height;
}

export function obstacleHeightAt(map: MapDef, x: number, z: number): number {
  let height = 0;
  for (const obstacle of map.obstacles) {
    if (
      Math.abs(x - obstacle.x) <= obstacle.hx &&
      Math.abs(z - obstacle.z) <= obstacle.hz
    ) {
      height = Math.max(height, obstacle.h + (obstacle.base ?? 0));
    }
  }
  for (const platform of map.platforms) {
    if (
      Math.abs(x - platform.x) <= platform.hx &&
      Math.abs(z - platform.z) <= platform.hz
    ) {
      height = Math.max(height, platform.height);
    }
  }
  for (const ramp of map.ramps) {
    height = Math.max(height, rampHeightAt(ramp, x, z));
  }
  return height;
}

export { hexToCss };
