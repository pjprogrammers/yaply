import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export interface PickupVisual {
  group: THREE.Group;
  crate: THREE.Group;
  ring: THREE.Mesh;
  column: THREE.Mesh;
  glow: THREE.Sprite;
  halo: THREE.Mesh;
  shadow: THREE.Mesh;
}

const GOLD = 0xffc233;

let questionTexture: THREE.Texture | null = null;

function getQuestionTexture(): THREE.Texture {
  if (questionTexture) {
    return questionTexture;
  }
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.font = '900 96px "Arial Black", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 12;
    ctx.strokeStyle = "rgba(24, 18, 8, 0.9)";
    ctx.strokeText("?", size / 2, size / 2 + 7);
    ctx.fillStyle = "#ffe8a8";
    ctx.fillText("?", size / 2, size / 2 + 7);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  questionTexture = texture;
  return texture;
}

/**
 * One neutral mystery crate for every pickup. The weapon is chosen by the
 * engine at collection time, so nothing here can reveal the contents.
 */
export function buildPickup(glowTexture: THREE.Texture): PickupVisual {
  const group = new THREE.Group();
  const glyphTexture = getQuestionTexture();

  const crate = new THREE.Group();
  crate.position.y = 1.65;

  const crateMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2822,
    roughness: 0.42,
    metalness: 0.62,
    emissive: new THREE.Color(GOLD),
    emissiveIntensity: 0.08,
  });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.7, 1.7, 2, 0.09), crateMaterial);
  body.castShadow = true;
  crate.add(body);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.74, 1.74, 1.74)),
    new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.95 }),
  );
  crate.add(edge);

  const bracketMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    roughness: 0.35,
    metalness: 0.55,
    emissive: 0xff9a1f,
    emissiveIntensity: 0.4,
  });
  const bracketGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
  for (const x of [-0.72, 0.72]) {
    for (const z of [-0.72, 0.72]) {
      for (const y of [-0.72, 0.72]) {
        const bracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
        bracket.position.set(x, y, z);
        crate.add(bracket);
      }
    }
  }

  const glyphGeometry = new THREE.PlaneGeometry(0.95, 0.95);
  const glyphMaterial = new THREE.MeshBasicMaterial({
    map: glyphTexture,
    color: 0xffe8a8,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glyphFaces: Array<[number, number, number, number, number, number]> = [
    [0, 0, 0.86, 0, 0, 0],
    [0, 0, -0.86, 0, Math.PI, 0],
    [0.86, 0, 0, 0, Math.PI / 2, 0],
    [-0.86, 0, 0, 0, -Math.PI / 2, 0],
    [0, 0.86, 0, -Math.PI / 2, 0, 0],
  ];
  for (const [x, y, z, rx, ry, rz] of glyphFaces) {
    const glyph = new THREE.Mesh(glyphGeometry, glyphMaterial);
    glyph.position.set(x, y, z);
    glyph.rotation.set(rx, ry, rz);
    crate.add(glyph);
  }

  group.add(crate);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: GOLD,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.scale.set(3.2, 3.2, 1);
  glow.position.y = 1.65;
  group.add(glow);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.035, 6, 32),
    new THREE.MeshBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.65;
  group.add(halo);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.38, 32),
    new THREE.MeshBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.035;
  group.add(ring);

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.95, 1.55, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  column.position.y = 0.78;
  group.add(column);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.25, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, crate, ring, column, glow, halo, shadow };
}
