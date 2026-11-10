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

interface SmokeParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
  color: THREE.Color;
}

interface Ring {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  target: number;
  spin: number;
}

interface Swirl {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  spin: number;
}

const SPARK_CAPACITY = 900;
const SMOKE_CAPACITY = 420;
const FX_BASE = "/assets/fx";

function loadTexture(name: string) {
  const texture = new THREE.TextureLoader().load(`${FX_BASE}/${name}.png`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/** Textured sparks, smoke puffs and shockwave rings from the reference build. */
export class Effects {
  private readonly sparkPoints: THREE.Points;
  private readonly sparkGeometry: THREE.BufferGeometry;
  private readonly sparkPositions: Float32Array;
  private readonly sparkColors: Float32Array;
  private readonly sparkParticles: Particle[] = [];
  private readonly smokePoints: THREE.Points;
  private readonly smokeGeometry: THREE.BufferGeometry;
  private readonly smokePositions: Float32Array;
  private readonly smokeColors: Float32Array;
  private readonly smokeSizes: Float32Array;
  private readonly smokeAlphas: Float32Array;
  private readonly smokeParticles: SmokeParticle[] = [];
  private readonly rings: Ring[] = [];
  private readonly swirls: Swirl[] = [];
  private readonly scene: THREE.Scene;
  private readonly ringGeometry: THREE.PlaneGeometry;
  private readonly textures: THREE.Texture[] = [];
  private readonly sparkTexture: THREE.Texture;
  private readonly smokeTexture: THREE.Texture;
  private readonly ringTexture: THREE.Texture;
  private readonly shockTexture: THREE.Texture;
  private readonly swirlTexture: THREE.Texture;
  private sparkCursor = 0;
  private smokeCursor = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sparkTexture = loadTexture("Effect_Sparkle_01_0");
    this.smokeTexture = loadTexture("CFX3_T_SmokePuff");
    this.ringTexture = loadTexture("ring");
    this.shockTexture = loadTexture("ring_shockwave");
    this.swirlTexture = loadTexture("spiral_02");
    this.textures.push(
      this.sparkTexture,
      this.smokeTexture,
      this.ringTexture,
      this.shockTexture,
      this.swirlTexture,
    );

    this.sparkPositions = new Float32Array(SPARK_CAPACITY * 3);
    this.sparkColors = new Float32Array(SPARK_CAPACITY * 3);
    for (let i = 0; i < SPARK_CAPACITY; i += 1) {
      this.sparkPositions[i * 3 + 1] = -1000;
      this.sparkParticles.push({
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
    this.sparkGeometry = new THREE.BufferGeometry();
    this.sparkGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.sparkPositions, 3),
    );
    this.sparkGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.sparkColors, 3),
    );
    this.sparkPoints = new THREE.Points(
      this.sparkGeometry,
      new THREE.PointsMaterial({
        map: this.sparkTexture,
        size: 0.9,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        alphaTest: 0.01,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    this.sparkPoints.frustumCulled = false;
    this.sparkPoints.renderOrder = 4;
    scene.add(this.sparkPoints);

    this.smokePositions = new Float32Array(SMOKE_CAPACITY * 3);
    this.smokeColors = new Float32Array(SMOKE_CAPACITY * 3);
    this.smokeSizes = new Float32Array(SMOKE_CAPACITY);
    this.smokeAlphas = new Float32Array(SMOKE_CAPACITY);
    for (let i = 0; i < SMOKE_CAPACITY; i += 1) {
      this.smokePositions[i * 3 + 1] = -1000;
      this.smokeParticles.push({
        x: 0,
        y: -1000,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        alpha: 0,
        color: new THREE.Color("#ffffff"),
      });
    }
    this.smokeGeometry = new THREE.BufferGeometry();
    this.smokeGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.smokePositions, 3),
    );
    this.smokeGeometry.setAttribute(
      "aColor",
      new THREE.BufferAttribute(this.smokeColors, 3),
    );
    this.smokeGeometry.setAttribute(
      "aSize",
      new THREE.BufferAttribute(this.smokeSizes, 1),
    );
    this.smokeGeometry.setAttribute(
      "aAlpha",
      new THREE.BufferAttribute(this.smokeAlphas, 1),
    );
    const smokeMaterial = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: this.smokeTexture } },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (420.0 / max(1.0, -view.z));
          gl_Position = projectionMatrix * view;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          float alpha = tex.a * vAlpha;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor * tex.rgb, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });
    this.smokePoints = new THREE.Points(this.smokeGeometry, smokeMaterial);
    this.smokePoints.frustumCulled = false;
    this.smokePoints.renderOrder = 3;
    scene.add(this.smokePoints);

    this.ringGeometry = new THREE.PlaneGeometry(2, 2);
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
      const particle = this.sparkParticles[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % SPARK_CAPACITY;
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

  /** Soft dust plume that blooms out of a hole rim. */
  smoke(
    x: number,
    y: number,
    z: number,
    color: THREE.ColorRepresentation,
    count = 10,
    power = 2.2,
    size = 2.2,
  ) {
    const tint = new THREE.Color(color);
    tint.lerp(new THREE.Color("#d9d4c4"), 0.45);
    for (let i = 0; i < count; i += 1) {
      const particle = this.smokeParticles[this.smokeCursor];
      this.smokeCursor = (this.smokeCursor + 1) % SMOKE_CAPACITY;
      const angle = Math.random() * Math.PI * 2;
      const speed = power * (0.25 + Math.random() * 0.75);
      particle.x = x + Math.cos(angle) * Math.random() * 0.8;
      particle.y = y + Math.random() * 0.35;
      particle.z = z + Math.sin(angle) * Math.random() * 0.8;
      particle.vx = Math.cos(angle) * speed;
      particle.vz = Math.sin(angle) * speed;
      particle.vy = 0.6 + Math.random() * power * 0.55;
      particle.life = 0.75 + Math.random() * 0.9;
      particle.maxLife = particle.life;
      particle.size = size * (0.6 + Math.random() * 0.8);
      particle.alpha = 0.34 + Math.random() * 0.2;
      particle.color.copy(tint);
    }
  }

  /** Exact reference ring sprite: sold colour expanding shockwave. */
  ring(
    x: number,
    z: number,
    color: THREE.ColorRepresentation,
    target: number,
    shockwave = false,
  ) {
    const material = new THREE.MeshBasicMaterial({
      map: shockwave ? this.shockTexture : this.ringTexture,
      color,
      transparent: true,
      opacity: shockwave ? 0.9 : 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(this.ringGeometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    mesh.scale.setScalar(0.5);
    mesh.renderOrder = 2;
    this.scene.add(mesh);
    this.rings.push({
      mesh,
      material,
      life: 0,
      maxLife: shockwave ? 0.7 : 0.55,
      target,
      spin: (Math.random() - 0.5) * 0.8,
    });
  }

  /** Ground-level spiral flash used when a hole collapses. */
  swirl(x: number, z: number, color: THREE.ColorRepresentation, radius: number) {
    const material = new THREE.MeshBasicMaterial({
      map: this.swirlTexture,
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(this.ringGeometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.08, z);
    mesh.scale.setScalar(radius * 1.6);
    mesh.renderOrder = 2;
    this.scene.add(mesh);
    this.swirls.push({
      mesh,
      material,
      life: 0,
      maxLife: 0.9,
      spin: Math.random() < 0.5 ? -1 : 1,
    });
  }

  /** Full swallow feedback: dust at the rim, sparks, and a pressure ring. */
  swallow(
    x: number,
    z: number,
    color: THREE.ColorRepresentation,
    radius: number,
    big = false,
  ) {
    this.ring(x, z, color, radius * (big ? 2.6 : 1.8), big);
    this.smoke(x, 0.25, z, color, big ? 16 : 7, big ? 3.6 : 2.2, 2.4);
    this.burst(x, 0.4, z, color, big ? 24 : 10, big ? 7 : 3.6);
  }

  update(dt: number) {
    this.updateSparks(dt);
    this.updateSmoke(dt);

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
      const scale = 0.5 + (ring.target - 0.5) * (1 - Math.pow(1 - t, 3));
      ring.mesh.scale.setScalar(scale);
      ring.mesh.rotation.z += ring.spin * dt;
      ring.material.opacity = (ring.maxLife === 0.7 ? 0.9 : 0.72) * (1 - t);
    }

    for (let i = this.swirls.length - 1; i >= 0; i -= 1) {
      const swirl = this.swirls[i];
      swirl.life += dt;
      const t = swirl.life / swirl.maxLife;
      if (t >= 1) {
        this.scene.remove(swirl.mesh);
        swirl.material.dispose();
        this.swirls.splice(i, 1);
        continue;
      }
      swirl.mesh.rotation.z += swirl.spin * dt * (1.2 + t * 3.4);
      swirl.mesh.scale.multiplyScalar(1 + dt * 0.9);
      swirl.material.opacity = 0.85 * (1 - t) * (1 - t);
    }
  }

  private updateSparks(dt: number) {
    for (let i = 0; i < this.sparkParticles.length; i += 1) {
      const particle = this.sparkParticles[i];
      if (particle.life <= 0) {
        this.sparkPositions[i * 3 + 1] = -1000;
        continue;
      }
      particle.life -= dt;
      if (particle.life <= 0) {
        this.sparkPositions[i * 3 + 1] = -1000;
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
      this.sparkPositions[i * 3] = particle.x;
      this.sparkPositions[i * 3 + 1] = particle.y;
      this.sparkPositions[i * 3 + 2] = particle.z;
      this.sparkColors[i * 3] = particle.color.r * fade;
      this.sparkColors[i * 3 + 1] = particle.color.g * fade;
      this.sparkColors[i * 3 + 2] = particle.color.b * fade;
    }
    (this.sparkGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.sparkGeometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateSmoke(dt: number) {
    for (let i = 0; i < this.smokeParticles.length; i += 1) {
      const particle = this.smokeParticles[i];
      if (particle.life <= 0) {
        this.smokePositions[i * 3 + 1] = -1000;
        this.smokeAlphas[i] = 0;
        continue;
      }
      particle.life -= dt;
      if (particle.life <= 0) {
        this.smokePositions[i * 3 + 1] = -1000;
        this.smokeAlphas[i] = 0;
        continue;
      }
      const t = 1 - particle.life / particle.maxLife;
      particle.vx *= 1 - Math.min(0.92, dt * 2.2);
      particle.vz *= 1 - Math.min(0.92, dt * 2.2);
      particle.vy += dt * 0.65;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      this.smokePositions[i * 3] = particle.x;
      this.smokePositions[i * 3 + 1] = particle.y;
      this.smokePositions[i * 3 + 2] = particle.z;
      this.smokeColors[i * 3] = particle.color.r;
      this.smokeColors[i * 3 + 1] = particle.color.g;
      this.smokeColors[i * 3 + 2] = particle.color.b;
      this.smokeSizes[i] = particle.size * (0.7 + t * 1.8);
      this.smokeAlphas[i] = particle.alpha * (1 - t) * (1 - t);
    }
    (this.smokeGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.smokeGeometry.getAttribute("aColor") as THREE.BufferAttribute).needsUpdate = true;
    (this.smokeGeometry.getAttribute("aSize") as THREE.BufferAttribute).needsUpdate = true;
    (this.smokeGeometry.getAttribute("aAlpha") as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.sparkPoints);
    this.sparkGeometry.dispose();
    (this.sparkPoints.material as THREE.Material).dispose();
    this.scene.remove(this.smokePoints);
    this.smokeGeometry.dispose();
    (this.smokePoints.material as THREE.Material).dispose();
    for (const ring of this.rings) {
      this.scene.remove(ring.mesh);
      ring.material.dispose();
    }
    for (const swirl of this.swirls) {
      this.scene.remove(swirl.mesh);
      swirl.material.dispose();
    }
    for (const texture of this.textures) texture.dispose();
    this.ringGeometry.dispose();
  }
}
