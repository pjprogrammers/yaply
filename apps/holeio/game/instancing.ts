import * as THREE from "three";

/**
 * A thin wrapper around InstancedMesh. Every city object keeps a pool + index
 * so it can be moved, hidden or shrunk without touching the scene graph.
 */
export class InstancePool {
  readonly mesh: THREE.InstancedMesh;
  private readonly scratch = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly euler = new THREE.Euler();
  private readonly zero = new THREE.Matrix4().makeScale(0, 0, 0);
  private used = 0;

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    capacity: number,
    scene: THREE.Object3D,
    castShadow = false,
    receiveShadow = false,
  ) {
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;
    this.mesh.count = 0;
    for (let i = 0; i < capacity; i += 1) {
      this.mesh.setMatrixAt(i, this.zero);
    }
    scene.add(this.mesh);
  }

  allocate(): number {
    const index = this.used;
    if (index >= this.mesh.instanceMatrix.count) {
      throw new Error("InstancePool capacity exceeded");
    }
    this.used += 1;
    this.mesh.count = this.used;
    return index;
  }

  setTransform(
    index: number,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    sx: number,
    sy: number,
    sz: number,
  ): void {
    this.position.set(x, y, z);
    this.euler.set(rx, ry, rz);
    this.quaternion.setFromEuler(this.euler);
    this.scale.set(sx, sy, sz);
    this.scratch.compose(this.position, this.quaternion, this.scale);
    this.mesh.setMatrixAt(index, this.scratch);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  hide(index: number): void {
    this.mesh.setMatrixAt(index, this.zero);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setColor(index: number, color: THREE.ColorRepresentation): void {
    this.mesh.setColorAt(index, new THREE.Color(color));
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  setColorRaw(index: number, color: THREE.Color): void {
    this.mesh.setColorAt(index, color);
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  setOpacity(): void {
    // Instanced opacity is handled through the shared material.
  }

  dispose(scene: THREE.Object3D): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    const material = this.mesh.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else {
      material.dispose();
    }
    this.mesh.dispose();
  }
}

/**
 * Instanced pool for imported meshes that may be split into several glTF
 * primitives. All primitives share the same per-instance transform.
 */
export class PrimitivePool {
  readonly meshes: THREE.InstancedMesh[] = [];
  private readonly zero = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(
    primitives: { geometry: THREE.BufferGeometry; material: THREE.Material }[],
    capacity: number,
    parent: THREE.Object3D,
    castShadow = true,
    receiveShadow = true,
  ) {
    for (const primitive of primitives) {
      const mesh = new THREE.InstancedMesh(
        primitive.geometry,
        primitive.material,
        Math.max(1, capacity),
      );
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      for (let index = 0; index < capacity; index += 1) {
        mesh.setMatrixAt(index, this.zero);
      }
      mesh.count = capacity;
      parent.add(mesh);
      this.meshes.push(mesh);
    }
  }

  setMatrix(index: number, matrix: THREE.Matrix4): void {
    for (const mesh of this.meshes) {
      mesh.setMatrixAt(index, matrix);
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  hide(index: number): void {
    for (const mesh of this.meshes) {
      mesh.setMatrixAt(index, this.zero);
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.removeFromParent();
      mesh.dispose();
    }
    this.meshes.length = 0;
  }
}

export function composeMatrix(
  matrix: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  sx: number,
  sy: number,
  sz: number,
): void {
  const position = new THREE.Vector3(x, y, z);
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rx, ry, rz),
  );
  const scale = new THREE.Vector3(sx, sy, sz);
  matrix.compose(position, quaternion, scale);
}
