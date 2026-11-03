import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { WEAPONS } from "./constants";
import type { WeaponId } from "./types";

export interface PickupVisual {
  group: THREE.Group;
  icon: THREE.Group;
  ring: THREE.Mesh;
  column: THREE.Mesh;
}

function iconMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.3,
    roughness: 0.35,
    metalness: 0.45,
  });
}

function buildIcon(weapon: WeaponId): THREE.Group {
  const group = new THREE.Group();
  const material = iconMaterial(WEAPONS[weapon].color);
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b18, roughness: 0.55, metalness: 0.5 });

  if (weapon === "missile") {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.9, 10), material);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 10), dark);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.62;
    group.add(nose);
    const finGeo = new THREE.BoxGeometry(0.3, 0.04, 0.24);
    for (let i = 0; i < 4; i += 1) {
      const fin = new THREE.Mesh(finGeo, dark);
      fin.rotation.z = (i / 4) * Math.PI * 2;
      fin.position.z = -0.32;
      group.add(fin);
    }
  } else if (weapon === "mine") {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.18, 12), material);
    group.add(disc);
    const spikeGeo = new THREE.ConeGeometry(0.1, 0.3, 6);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const spike = new THREE.Mesh(spikeGeo, dark);
      spike.position.set(Math.cos(angle) * 0.55, 0, Math.sin(angle) * 0.55);
      spike.rotation.z = Math.PI / 2;
      spike.rotation.y = -angle;
      group.add(spike);
    }
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3d81 }));
    light.position.y = 0.22;
    group.add(light);
  } else if (weapon === "shield") {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      material,
    );
    group.add(dome);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 18), dark);
    rim.rotation.x = Math.PI / 2;
    group.add(rim);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), new THREE.MeshBasicMaterial({ color: 0xeaffff }));
    core.position.y = 0.16;
    group.add(core);
  } else if (weapon === "turbo") {
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 4), material);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 6, 14), dark);
    ring.position.z = -0.34;
    group.add(ring);
    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.3), dark);
      fin.position.set(side * 0.25, 0, -0.26);
      group.add(fin);
    }
  } else if (weapon === "shock") {
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.48, 1),
      new THREE.MeshBasicMaterial({ color: WEAPONS.shock.color, wireframe: true }),
    );
    group.add(shell);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), material);
    group.add(core);
  } else {
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), material);
    group.add(core);
  }

  return group;
}

export function buildPickup(weapon: WeaponId, glowTexture: THREE.Texture): PickupVisual {
  const group = new THREE.Group();
  const color = WEAPONS[weapon].color;
  const css = WEAPONS[weapon].css;

  const crateMaterial = new THREE.MeshStandardMaterial({
    color: 0x262622,
    roughness: 0.45,
    metalness: 0.65,
    emissive: new THREE.Color(css),
    emissiveIntensity: 0.12,
  });
  const crate = new THREE.Mesh(new RoundedBoxGeometry(1.65, 1.65, 1.65, 2, 0.09), crateMaterial);
  crate.position.y = 0.9;
  crate.castShadow = true;
  group.add(crate);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, 1.7, 1.7)),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }),
  );
  edge.position.y = 0.9;
  group.add(edge);

  const bracketMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 });
  const bracketGeo = new THREE.BoxGeometry(0.28, 0.1, 0.28);
  for (const x of [-0.72, 0.72]) {
    for (const z of [-0.72, 0.72]) {
      for (const y of [0.18, 1.62]) {
        const bracket = new THREE.Mesh(bracketGeo, bracketMaterial);
        bracket.position.set(x, y, z);
        group.add(bracket);
      }
    }
  }

  const icon = buildIcon(weapon);
  icon.position.y = 2.5;
  group.add(icon);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.scale.set(2.6, 2.6, 1);
  glow.position.y = 2.5;
  group.add(glow);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.28, 28),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.035;
  group.add(ring);

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.9, 3.4, 14, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.075,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  column.position.y = 1.7;
  group.add(column);

  return { group, icon, ring, column };
}
