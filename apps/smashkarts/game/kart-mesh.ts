import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createNameTexture } from "./assets";

export interface KartVisual {
  group: THREE.Group;
  body: THREE.Group;
  wheels: THREE.Group[];
  frontWheels: THREE.Group[];
  flames: THREE.Mesh[];
  shield: THREE.Mesh;
  shieldWire: THREE.Mesh;
  turret: THREE.Group;
  tag: THREE.Sprite;
  boostGlow: THREE.Mesh;
}

const WHEEL_RADIUS = 0.47;

function wheelPivot(materials: {
  tire: THREE.Material;
  hub: THREE.Material;
  rim: THREE.Material;
}): THREE.Group {
  const pivot = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.42, 16);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, materials.tire);
  tire.castShadow = true;
  pivot.add(tire);

  const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.44, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, materials.hub);
  pivot.add(hub);

  const rimGeo = new THREE.BoxGeometry(0.46, 0.1, 0.52);
  const rim = new THREE.Mesh(rimGeo, materials.rim);
  pivot.add(rim);

  return pivot;
}

export function buildKart(name: string, colorHex: string, accentHex: string): KartVisual {
  const color = new THREE.Color(colorHex);
  const accent = new THREE.Color(accentHex);
  const group = new THREE.Group();
  group.name = `kart-${name}`;

  const body = new THREE.Group();
  body.position.y = 0.62;
  group.add(body);

  const paint = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.44,
    metalness: 0.25,
  });
  const paintDark = new THREE.MeshStandardMaterial({
    color: color.clone().multiplyScalar(0.55),
    roughness: 0.6,
    metalness: 0.2,
  });
  const trim = new THREE.MeshStandardMaterial({ color: 0x1b1b1a, roughness: 0.75 });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x8b9097,
    roughness: 0.32,
    metalness: 0.8,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 });
  const glow = new THREE.MeshStandardMaterial({
    color: 0xfff0c8,
    emissive: 0xffc977,
    emissiveIntensity: 2.2,
    roughness: 0.3,
  });
  const tail = new THREE.MeshStandardMaterial({
    color: 0xff2b2b,
    emissive: 0xff1a1a,
    emissiveIntensity: 1.8,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0c1118,
    roughness: 0.1,
    metalness: 0.9,
  });

  const chassis = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.52, 3.5, 3, 0.2), paint);
  chassis.castShadow = true;
  body.add(chassis);

  const nose = new THREE.Mesh(new RoundedBoxGeometry(1.65, 0.34, 0.95, 2, 0.14), paintDark);
  nose.position.set(0, -0.02, 1.86);
  nose.castShadow = true;
  body.add(nose);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.28), trim);
  bumper.position.set(0, -0.16, 2.16);
  body.add(bumper);

  const sidePodGeo = new THREE.BoxGeometry(0.34, 0.32, 2.15);
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(sidePodGeo, trim);
    pod.position.set(side * 0.98, -0.06, -0.12);
    pod.castShadow = true;
    body.add(pod);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 1.2), paint);
    stripe.position.set(side * 0.99, 0.13, 0.2);
    body.add(stripe);
  }

  const engine = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.5, 0.85, 2, 0.1), trim);
  engine.position.set(0, 0.2, -1.4);
  engine.castShadow = true;
  body.add(engine);

  const engineTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.6), metal);
  engineTop.position.set(0, 0.5, -1.4);
  body.add(engineTop);

  for (const side of [-1, 1]) {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.55, 8), metal);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(side * 0.52, 0.24, -1.95);
    body.add(exhaust);
  }

  const wingPostGeo = new THREE.BoxGeometry(0.1, 0.58, 0.14);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(wingPostGeo, trim);
    post.position.set(side * 0.7, 0.66, -1.68);
    body.add(post);
  }
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.09, 0.52), paint);
  wing.position.set(0, 0.95, -1.72);
  wing.rotation.x = -0.08;
  wing.castShadow = true;
  body.add(wing);

  const cagePostGeo = new THREE.BoxGeometry(0.09, 0.95, 0.09);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(cagePostGeo, metal);
    post.position.set(side * 0.62, 0.66, -0.62);
    body.add(post);
    const postFront = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.75, 0.09), metal);
    postFront.position.set(side * 0.62, 0.56, 0.52);
    postFront.rotation.x = 0.18;
    body.add(postFront);
  }
  const cageTop = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.08, 0.08), metal);
  cageTop.position.set(0, 1.12, -0.62);
  body.add(cageTop);
  const cageRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), metal);
  for (const side of [-1, 1]) {
    const rail = cageRail.clone();
    rail.position.set(side * 0.62, 1.12, -0.04);
    body.add(rail);
  }

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.6, 0.24), trim);
  seat.position.set(0, 0.48, -0.62);
  body.add(seat);

  const driver = new THREE.Group();
  driver.position.set(0, 0.66, -0.28);
  body.add(driver);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.24, 4, 8), trim);
  torso.position.y = 0.2;
  driver.add(torso);

  const helmetColor = color.clone().lerp(new THREE.Color(0xf2ecdd), 0.55);
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.33, 18, 14),
    new THREE.MeshStandardMaterial({ color: helmetColor, roughness: 0.35, metalness: 0.3 }),
  );
  helmet.position.y = 0.68;
  helmet.castShadow = true;
  driver.add(helmet);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.17, 0.1), glass);
  visor.position.set(0, 0.7, 0.28);
  driver.add(visor);

  const helmetStripe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.5), paint);
  helmetStripe.position.set(0, 0.87, 0.02);
  driver.add(helmetStripe);

  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.1), glow);
    lamp.position.set(side * 0.58, 0.08, 2.24);
    body.add(lamp);

    const rearLamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.1), tail);
    rearLamp.position.set(side * 0.55, 0.34, -2.02);
    body.add(rearLamp);
  }

  const turret = new THREE.Group();
  turret.position.set(0, 1.56, -1.12);
  body.add(turret);

  const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.52, 0.22, 12), trim);
  turretBase.position.y = -0.06;
  turret.add(turretBase);

  const turretHead = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.3, 0.6, 2, 0.1), accentMaterial(accent));
  turretHead.position.y = 0.14;
  turret.add(turretHead);

  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 1.25), metal);
  barrel.position.set(0, 0.16, 0.62);
  turret.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 10), trim);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.16, 1.27);
  turret.add(muzzle);

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 10), metal);
  drum.rotation.z = Math.PI / 2;
  drum.position.set(0.32, 0.16, -0.05);
  turret.add(drum);

  const wheelMaterials = { tire: rubber, hub: metal, rim: paint };
  const wheels: THREE.Group[] = [];
  const frontWheels: THREE.Group[] = [];
  const wheelPositions: Array<[number, number, boolean]> = [
    [-1.1, 1.16, true],
    [1.1, 1.16, true],
    [-1.1, -1.16, false],
    [1.1, -1.16, false],
  ];
  for (const [x, z, front] of wheelPositions) {
    const pivot = wheelPivot(wheelMaterials);
    pivot.position.set(x, 0.48, z);
    pivot.userData.front = front;
    group.add(pivot);
    wheels.push(pivot);
    if (front) frontWheels.push(pivot);
  }

  const flameGeo = new THREE.ConeGeometry(0.17, 0.85, 7);
  flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flames: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(side * 0.52, 0.3, -2.15);
    flame.scale.set(0.001, 0.001, 0.001);
    body.add(flame);
    flames.push(flame);
  }

  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x2fd4c8,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shield = new THREE.Mesh(new THREE.SphereGeometry(2.25, 22, 16), shieldMat);
  shield.position.y = 0.9;
  shield.visible = false;
  shield.renderOrder = 3;
  group.add(shield);

  const shieldWire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.28, 2),
    new THREE.MeshBasicMaterial({
      color: 0x9ef6ef,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  shieldWire.position.y = 0.9;
  shieldWire.visible = false;
  group.add(shieldWire);

  const tagTexture = createNameTexture(name, colorHex);
  const tag = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tagTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  tag.scale.set(3.4, 0.85, 1);
  tag.position.y = 3.45;
  tag.renderOrder = 20;
  group.add(tag);

  const boostGlow = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 20),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  boostGlow.rotation.x = -Math.PI / 2;
  boostGlow.position.y = 0.05;
  group.add(boostGlow);

  return {
    group,
    body,
    wheels,
    frontWheels,
    flames,
    shield,
    shieldWire,
    turret,
    tag,
    boostGlow,
  };
}

function accentMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.4,
    emissive: color,
    emissiveIntensity: 0.15,
  });
}

export function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Sprite || child instanceof THREE.Points) {
      child.geometry?.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        for (const entry of material) {
          disposeMaterial(entry);
        }
      } else if (material) {
        disposeMaterial(material);
      }
    }
  });
}

function disposeMaterial(material: THREE.Material) {
  const record = material as THREE.Material & {
    map?: THREE.Texture | null;
    alphaMap?: THREE.Texture | null;
    emissiveMap?: THREE.Texture | null;
  };
  record.map?.dispose();
  record.alphaMap?.dispose();
  record.emissiveMap?.dispose();
  material.dispose();
}
