import * as THREE from "three";

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface Ring {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  target: number;
}

const CAPACITY = 900;

export class Effects {
  private readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly particles: Particle[] = [];
  private readonly rings: Ring[] = [];
  private readonly scene: THREE.Scene;
  private readonly ringGeometry: THREE.RingGeometry;
  private cursor = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.positions = new Float32Array(CAPACITY * 3);
    this.colors = new Float32Array(CAPACITY * 3);
    for (let i = 0; i < CAPACITY; i += 1) {
      this.positions[i * 3 + 1] = -1000;
      this.particles.push({
        x: 0,
        y: -1000,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        color: new THREE.Color("#ffffff"),
      });
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.points = new THREE.Points(
      this.geometry,
      new THREE.PointsMaterial({
        size: 0.75,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.ringGeometry = new THREE.RingGeometry(0.86, 1, 56);
  }

  burst(
    x: number,
    y: number,
    z: number,
    color: THREE.ColorRepresentation,
    count = 12,
    power = 4,
  ) {
    const tint = new THREE.Color(color);
    for (let i = 0; i < count; i += 1) {
      const particle = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % CAPACITY;
      const angle = Math.random() * Math.PI * 2;
      const speed = power * (0.35 + Math.random() * 0.8);
      particle.x = x + (Math.random() - 0.5) * 0.6;
      particle.y = y + Math.random() * 0.5;
      particle.z = z + (Math.random() - 0.5) * 0.6;
      particle.vx = Math.cos(angle) * speed;
      particle.vz = Math.sin(angle) * speed;
      particle.vy = 1.5 + Math.random() * power * 0.8;
      particle.life = 0.5 + Math.random() * 0.7;
      particle.maxLife = particle.life;
      particle.size = 0.4 + Math.random() * 0.8;
      particle.color.copy(tint);
      if (Math.random() < 0.4) particle.color.offsetHSL(0, 0, 0.2);
    }
  }

  ring(x: number, z: number, color: THREE.ColorRepresentation, target: number) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.ringGeometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.05, z);
    mesh.scale.setScalar(0.5);
    this.scene.add(mesh);
    this.rings.push({
      mesh,
      material,
      life: 0,
      maxLife: 0.8,
      target,
    });
  }

  update(dt: number) {
    for (let i = 0; i < this.particles.length; i += 1) {
      const particle = this.particles[i];
      if (particle.life <= 0) {
        this.positions[i * 3 + 1] = -1000;
        continue;
      }
      particle.life -= dt;
      if (particle.life <= 0) {
        this.positions[i * 3 + 1] = -1000;
        continue;
      }
      particle.vy -= 7 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      if (particle.y < 0.05) {
        particle.y = 0.05;
        particle.vy *= -0.25;
        particle.vx *= 0.7;
        particle.vz *= 0.7;
      }
      const fade = particle.life / particle.maxLife;
      this.positions[i * 3] = particle.x;
      this.positions[i * 3 + 1] = particle.y;
      this.positions[i * 3 + 2] = particle.z;
      this.colors[i * 3] = particle.color.r * fade;
      this.colors[i * 3 + 1] = particle.color.g * fade;
      this.colors[i * 3 + 2] = particle.color.b * fade;
    }
    (this.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;

    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const ring = this.rings[i];
      ring.life += dt;
      const t = ring.life / ring.maxLife;
      if (t >= 1) {
        this.scene.remove(ring.mesh);
        ring.material.dispose();
        this.rings.splice(i, 1);
        continue;
      }
      const scale = 0.5 + (ring.target - 0.5) * (1 - Math.pow(1 - t, 2));
      ring.mesh.scale.setScalar(scale);
      ring.material.opacity = 0.6 * (1 - t);
    }
  }

  dispose() {
    this.scene.remove(this.points);
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    for (const ring of this.rings) {
      this.scene.remove(ring.mesh);
      ring.material.dispose();
    }
    this.ringGeometry.dispose();
  }
}
