import * as THREE from "three";

interface SpawnOptions {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: number;
  size: number;
  life: number;
  gravity?: number;
  drag?: number;
}

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uScale;

  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(0.1, -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(vColor, 1.0) * tex * vAlpha;
    if (gl_FragColor.a < 0.01) discard;
  }
`;

export class ParticleField {
  private readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly alphas: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly gravity: Float32Array;
  private readonly drag: Float32Array;
  private readonly max: number;
  private cursor = 0;

  constructor(scene: THREE.Scene, texture: THREE.Texture, blending: THREE.Blending, max = 420) {
    this.max = max;
    this.positions = new Float32Array(max * 3);
    this.velocities = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.gravity = new Float32Array(max);
    this.drag = new Float32Array(max);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(this.alphas, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uScale: { value: 700 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);
  }

  setViewport(height: number, fov: number) {
    this.material.uniforms.uScale.value = height / (2 * Math.tan((fov * Math.PI) / 360));
  }

  spawn(options: SpawnOptions) {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const p = index * 3;
    this.positions[p] = options.x;
    this.positions[p + 1] = options.y;
    this.positions[p + 2] = options.z;
    this.velocities[p] = options.vx;
    this.velocities[p + 1] = options.vy;
    this.velocities[p + 2] = options.vz;
    const color = new THREE.Color(options.color);
    this.colors[p] = color.r;
    this.colors[p + 1] = color.g;
    this.colors[p + 2] = color.b;
    this.sizes[index] = options.size;
    this.life[index] = options.life;
    this.maxLife[index] = options.life;
    this.alphas[index] = 1;
    this.gravity[index] = options.gravity ?? 0;
    this.drag[index] = options.drag ?? 0;
  }

  burst(
    x: number,
    y: number,
    z: number,
    color: number,
    count: number,
    speed: number,
    size: number,
    life: number,
    gravity = 8,
  ) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const vertical = Math.random() * 1.2 - 0.2;
      const magnitude = speed * (0.35 + Math.random() * 0.9);
      this.spawn({
        x,
        y,
        z,
        vx: Math.cos(angle) * magnitude,
        vy: vertical * magnitude * 0.8,
        vz: Math.sin(angle) * magnitude,
        color,
        size: size * (0.6 + Math.random() * 0.9),
        life: life * (0.6 + Math.random() * 0.7),
        gravity,
        drag: 0.9,
      });
    }
  }

  update(dt: number) {
    const geometry = this.points.geometry;
    for (let i = 0; i < this.max; i += 1) {
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }
      const p = i * 3;
      this.velocities[p + 1] -= this.gravity[i] * dt;
      const damping = Math.max(0, 1 - this.drag[i] * dt);
      this.velocities[p] *= damping;
      this.velocities[p + 1] *= damping;
      this.velocities[p + 2] *= damping;
      this.positions[p] += this.velocities[p] * dt;
      this.positions[p + 1] += this.velocities[p + 1] * dt;
      this.positions[p + 2] += this.velocities[p + 2] * dt;
      if (this.positions[p + 1] < 0.03) {
        this.positions[p + 1] = 0.03;
        this.velocities[p + 1] *= -0.2;
      }
      const t = Math.max(0, this.life[i] / this.maxLife[i]);
      this.alphas[i] = t * t;
    }
    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
    this.points.removeFromParent();
  }
}
