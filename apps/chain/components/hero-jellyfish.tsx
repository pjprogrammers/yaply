"use client";

import { useEffect, useRef } from "react";

type ThreeModule = typeof import("three");

const VERTEX_BELL = /* glsl */ `
  uniform float uTime;

  varying vec3 vLocal;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying float vAngle;
  varying float vRim;

  void main() {
    vec3 p = position;
    float angle = atan(p.z, p.x);
    float rim = clamp((1.0 - p.y) / 1.16, 0.0, 1.0);
    float edge = smoothstep(0.5, 1.0, rim);

    float pulse = sin(uTime * 1.9);
    float ripple = sin(p.y * 6.2 - uTime * 2.3) * 0.016;

    p.xz *= 1.0 + pulse * 0.055 * (0.32 + edge * 0.68);
    p.y = p.y * (1.0 - pulse * 0.035) + pulse * 0.018;

    // Softly scalloped rim, like a moon jelly swimming against the grid.
    p.xz *= 1.0 + sin(angle * 10.0) * 0.032 * edge;

    p.y += ripple * (0.45 + edge);
    p.x += sin(uTime * 0.6 + p.y * 3.0) * 0.01;

    vLocal = p;
    vAngle = angle;
    vRim = rim;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_BELL = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uBright;
  uniform vec3 uEdge;
  uniform float uOpacity;

  varying vec3 vLocal;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying float vAngle;
  varying float vRim;

  void main() {
    vec3 normal = normalize(vNormalView);
    float fresnel = pow(1.0 - clamp(abs(dot(normal, normalize(vViewDir))), 0.0, 1.0), 2.15);

    float heightMix = smoothstep(-0.35, 1.0, vLocal.y);
    vec3 color = mix(uDeep, uBright, heightMix);
    color = mix(color, uEdge, fresnel * 0.78);

    float ribs = smoothstep(0.62, 1.0, sin(vAngle * 12.0 + 0.4) * 0.5 + 0.5);
    float rings = smoothstep(0.55, 1.0, sin(vRim * 22.0 - 1.4) * 0.5 + 0.5);

    color += uEdge * ribs * (0.05 + vRim * 0.08);
    color += uBright * rings * 0.035;

    float alpha = uOpacity * (0.2 + fresnel * 0.7 + heightMix * 0.14);
    alpha += ribs * 0.028 * (0.35 + vRim);
    alpha *= smoothstep(0.0, 0.08, vRim);

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

const VERTEX_TENTACLE = /* glsl */ `
  uniform float uTime;
  uniform float uWidth;

  attribute float aSide;
  attribute vec2 aRadial;
  attribute float aPhase;
  attribute float aLength;

  varying float vT;
  varying float vSide;
  varying float vSeed;

  void main() {
    float t = clamp(-position.y / aLength, 0.0, 1.0);
    float taper = mix(0.042, 0.0025, pow(t, 0.72));

    vec3 p = position;

    float sway = sin(uTime * 1.18 - t * 3.3 + aPhase);
    float sway2 = cos(uTime * 0.86 + t * 2.5 + aPhase * 1.6);
    float amp = 0.03 + t * t * 0.5;

    p.x += sway * amp;
    p.z += sway2 * amp * 0.72;
    p.y += sin(uTime * 0.82 + aPhase) * 0.018 * t;
    p.xz += aRadial * aSide * taper * uWidth;

    vT = t;
    vSide = aSide;
    vSeed = aPhase;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT_TENTACLE = /* glsl */ `
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform float uOpacity;

  varying float vT;
  varying float vSide;
  varying float vSeed;

  void main() {
    float edge = 1.0 - abs(vSide);
    float body = smoothstep(0.0, 0.35, edge);
    float fadeTip = 1.0 - smoothstep(0.55, 1.0, vT);
    float fadeBase = smoothstep(0.0, 0.06, vT);
    float shimmer = 0.86 + 0.14 * sin(vSeed * 9.0 + vT * 12.0);

    vec3 color = mix(uBaseColor, uTipColor, smoothstep(0.05, 0.95, vT));
    float alpha = uOpacity * (0.18 + body * 0.82) * fadeTip * fadeBase * shimmer;

    gl_FragColor = vec4(color, alpha);
  }
`;

const VERTEX_PARTICLES = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;

  attribute float aSeed;
  varying float vTwinkle;

  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.24 + aSeed * 6.2831) * 0.16;
    p.x += cos(uTime * 0.18 + aSeed * 6.2831) * 0.07;
    p.z += sin(uTime * 0.14 + aSeed * 12.0) * 0.05;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (1.2 + aSeed * 2.4) * uPixelRatio * (36.0 / max(1.0, -mvPosition.z));

    vTwinkle = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.1 + aSeed * 20.0));
  }
`;

const FRAGMENT_PARTICLES = /* glsl */ `
  varying float vTwinkle;

  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float dotShape = smoothstep(0.5, 0.02, distanceToCenter);
    float alpha = dotShape * vTwinkle * 0.52;
    gl_FragColor = vec4(vec3(0.64, 0.92, 1.0), alpha);
  }
`;

type TentacleSpec = {
  angle: number;
  length: number;
  phase: number;
};

function buildTentacleGeometry(
  THREE: ThreeModule,
  specs: TentacleSpec[],
  segments: number,
  baseRadius: number,
): import("three").BufferGeometry {
  const positions: number[] = [];
  const side: number[] = [];
  const radial: number[] = [];
  const phase: number[] = [];
  const length: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  for (const spec of specs) {
    const radialX = Math.cos(spec.angle);
    const radialZ = Math.sin(spec.angle);

    for (let segment = 0; segment <= segments; segment++) {
      const t = segment / segments;
      const radius = baseRadius + t * 0.2 + Math.sin(t * Math.PI) * 0.06;
      const x = radialX * radius;
      const z = radialZ * radius;
      const y = -0.12 - t * spec.length;

      for (const direction of [-1, 1]) {
        positions.push(x, y, z);
        side.push(direction);
        radial.push(radialX, radialZ);
        phase.push(spec.phase);
        length.push(spec.length);
      }

      if (segment < segments) {
        const start = vertexOffset + segment * 2;
        indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
      }
    }

    vertexOffset += (segments + 1) * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  geometry.setAttribute("aRadial", new THREE.Float32BufferAttribute(radial, 2));
  geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phase, 1));
  geometry.setAttribute("aLength", new THREE.Float32BufferAttribute(length, 1));
  geometry.setIndex(indices);

  return geometry;
}

function makeGlowTexture(THREE: ThreeModule) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
  gradient.addColorStop(0.22, "rgba(150, 228, 255, 0.34)");
  gradient.addColorStop(0.55, "rgba(76, 179, 240, 0.12)");
  gradient.addColorStop(1, "rgba(76, 179, 240, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function HeroJellyfish() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let dispose: (() => void) | undefined;
    let idleHandle: number | undefined;

    const boot = async () => {
      const THREE = await import("three");
      if (cancelled) return;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        premultipliedAlpha: true,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
      camera.position.set(0, 0, 7);
      camera.lookAt(0, 0, 0);

      const swimmer = new THREE.Group();
      scene.add(swimmer);

      const glowTexture = makeGlowTexture(THREE);
      if (glowTexture) {
        const halo = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTexture,
            color: 0x72d4ff,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        halo.scale.set(4.2, 4.2, 1);
        halo.position.set(0, 0.05, -0.7);
        swimmer.add(halo);
      }

      const bellUniforms = {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color("#071a2c") },
        uBright: { value: new THREE.Color("#3aa7ea") },
        uEdge: { value: new THREE.Color("#c9f4ff") },
        uOpacity: { value: 0.66 },
      };

      const bellGeometry = new THREE.SphereGeometry(
        1,
        72,
        44,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.55,
      );
      const bellMaterial = new THREE.ShaderMaterial({
        vertexShader: VERTEX_BELL,
        fragmentShader: FRAGMENT_BELL,
        uniforms: bellUniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const bell = new THREE.Mesh(bellGeometry, bellMaterial);
      bell.scale.set(1.28, 0.84, 1.28);
      swimmer.add(bell);

      const rimMaterial = new THREE.ShaderMaterial({
        vertexShader: VERTEX_BELL,
        fragmentShader: FRAGMENT_BELL,
        uniforms: {
          ...bellUniforms,
          uOpacity: { value: 0.32 },
          uBright: { value: new THREE.Color("#7ee0ff") },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const rim = new THREE.Mesh(bellGeometry, rimMaterial);
      rim.scale.set(1.36, 0.68, 1.36);
      rim.position.y = -0.02;
      swimmer.add(rim);

      const tentacleSpecs: TentacleSpec[] = Array.from({ length: 16 }, (_, index) => ({
        angle: (index / 16) * Math.PI * 2 + Math.sin(index * 1.7) * 0.08,
        length: 2.35 + (index % 4) * 0.28,
        phase: index * 0.83,
      }));

      const tentacleUniforms = {
        uTime: { value: 0 },
        uWidth: { value: 1 },
        uBaseColor: { value: new THREE.Color("#51c8ff") },
        uTipColor: { value: new THREE.Color("#b8ffd9") },
        uOpacity: { value: 0.82 },
      };

      const tentacleGeometry = buildTentacleGeometry(THREE, tentacleSpecs, 44, 1.24);
      const tentacleMaterial = new THREE.ShaderMaterial({
        vertexShader: VERTEX_TENTACLE,
        fragmentShader: FRAGMENT_TENTACLE,
        uniforms: tentacleUniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const tentacles = new THREE.Mesh(tentacleGeometry, tentacleMaterial);
      swimmer.add(tentacles);

      const glowUniforms = {
        ...tentacleUniforms,
        uWidth: { value: 3.6 },
        uOpacity: { value: 0.18 },
        uBaseColor: { value: new THREE.Color("#2f8cd2") },
        uTipColor: { value: new THREE.Color("#7df2c1") },
      };
      const tentacleGlow = new THREE.Mesh(tentacleGeometry, new THREE.ShaderMaterial({
        vertexShader: VERTEX_TENTACLE,
        fragmentShader: FRAGMENT_TENTACLE,
        uniforms: glowUniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }));
      swimmer.add(tentacleGlow);

      const armSpecs: TentacleSpec[] = Array.from({ length: 5 }, (_, index) => ({
        angle: (index / 5) * Math.PI * 2 + 0.3,
        length: 1.35 + (index % 2) * 0.22,
        phase: 1.4 + index * 1.1,
      }));
      const armGeometry = buildTentacleGeometry(THREE, armSpecs, 30, 0.85);

      const armUniforms = {
        uTime: { value: 0 },
        uWidth: { value: 4.6 },
        uBaseColor: { value: new THREE.Color("#58baff") },
        uTipColor: { value: new THREE.Color("#e0fff7") },
        uOpacity: { value: 0.27 },
      };
      const arms = new THREE.Mesh(armGeometry, new THREE.ShaderMaterial({
        vertexShader: VERTEX_TENTACLE,
        fragmentShader: FRAGMENT_TENTACLE,
        uniforms: armUniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }));
      swimmer.add(arms);

      const particleCount = 84;
      const particlePositions = new Float32Array(particleCount * 3);
      const particleSeeds = new Float32Array(particleCount);

      for (let index = 0; index < particleCount; index++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.45 + Math.random() * 1.55;
        particlePositions[index * 3] = Math.cos(angle) * radius;
        particlePositions[index * 3 + 1] = 1.15 - Math.random() * 3.8;
        particlePositions[index * 3 + 2] = Math.sin(angle) * radius * 0.55;
        particleSeeds[index] = Math.random();
      }

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(particlePositions, 3),
      );
      particleGeometry.setAttribute("aSeed", new THREE.BufferAttribute(particleSeeds, 1));

      const particleUniforms = {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
      };
      const particles = new THREE.Points(
        particleGeometry,
        new THREE.ShaderMaterial({
          vertexShader: VERTEX_PARTICLES,
          fragmentShader: FRAGMENT_PARTICLES,
          uniforms: particleUniforms,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      swimmer.add(particles);

      let baseX = 0;
      let baseY = 0;
      let baseScale = 0.8;

      const layout = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (!width || !height) return;

        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        const visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
        const visibleWidth = visibleHeight * camera.aspect;

        const mobile = width < 700;
        const tablet = width < 980;
        const screenFraction = mobile ? 0.34 : tablet ? 0.24 : 0.185;
        const xFraction = mobile ? 0.78 : tablet ? 0.8 : 0.52;
        const yFraction = mobile ? 0.08 : tablet ? 0.1 : 0.145;

        baseScale = (visibleWidth * screenFraction) / 2.56;
        baseX = (xFraction - 0.5) * visibleWidth;
        baseY = (0.5 - yFraction) * visibleHeight;

        swimmer.scale.setScalar(baseScale);
        particleUniforms.uPixelRatio.value = renderer.getPixelRatio();
      };

      layout();

      let elapsed = 0;
      let lastTimestamp: number | null = null;
      let pointerX = 0;
      let pointerY = 0;
      let targetX = 0;
      let targetY = 0;

      const onPointerMove = (event: PointerEvent) => {
        targetX = event.clientX / window.innerWidth - 0.5;
        targetY = event.clientY / window.innerHeight - 0.5;
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });

      const update = (time: number) => {
        const pulse = Math.sin(time * 1.9);
        const driftX = Math.sin(time * 0.27) * 0.2;
        const driftY = Math.sin(time * 0.42 + 0.8) * 0.15 + pulse * 0.035;
        const driftZ = Math.sin(time * 0.23 + 0.4) * 0.18;

        pointerX += (targetX - pointerX) * 0.045;
        pointerY += (targetY - pointerY) * 0.045;

        swimmer.position.set(
          baseX + driftX + pointerX * 0.34,
          baseY + driftY - pointerY * 0.22,
          driftZ,
        );
        swimmer.rotation.set(
          Math.sin(time * 0.31 + 1.1) * 0.06 + pointerY * 0.1,
          -0.16 + Math.sin(time * 0.24) * 0.22 + pointerX * 0.18,
          Math.sin(time * 0.36) * 0.09 - pointerX * 0.06,
        );

        bellUniforms.uTime.value = time;
        rimMaterial.uniforms.uTime.value = time;
        tentacleUniforms.uTime.value = time;
        glowUniforms.uTime.value = time;
        armUniforms.uTime.value = time;
        particleUniforms.uTime.value = time;

        particles.rotation.y = time * 0.015;
      };

      update(0.6);
      renderer.render(scene, camera);

      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      let reduced = motionQuery.matches;
      let visible = true;
      let looping = false;

      const renderFrame = (timestamp: number) => {
        if (lastTimestamp !== null) {
          elapsed += Math.min((timestamp - lastTimestamp) / 1000, 0.05);
        }
        lastTimestamp = timestamp;
        update(elapsed);
        renderer.render(scene, camera);
      };

      const setLooping = (next: boolean) => {
        if (next === looping) return;
        looping = next;
        if (next) {
          lastTimestamp = null;
          renderer.setAnimationLoop(renderFrame);
        } else {
          renderer.setAnimationLoop(null);
        }
      };

      const syncLoop = () => {
        setLooping(!reduced && visible && !document.hidden);
      };

      const resizeObserver = new ResizeObserver(() => {
        layout();
        update(elapsed);
        renderer.render(scene, camera);
      });
      resizeObserver.observe(host);

      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            visible = entry.isIntersecting;
          }
          syncLoop();
        },
        { rootMargin: "220px 0px" },
      );
      intersectionObserver.observe(host);

      const onMotionPreference = () => {
        reduced = motionQuery.matches;
        syncLoop();
        if (reduced) {
          update(elapsed);
          renderer.render(scene, camera);
        }
      };

      const onVisibilityChange = () => syncLoop();

      motionQuery.addEventListener("change", onMotionPreference);
      document.addEventListener("visibilitychange", onVisibilityChange);
      syncLoop();

      const markReady = window.setTimeout(() => {
        host.dataset.ready = "true";
      }, 80);

      dispose = () => {
        window.clearTimeout(markReady);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        motionQuery.removeEventListener("change", onMotionPreference);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("pointermove", onPointerMove);
        renderer.setAnimationLoop(null);
        renderer.dispose();
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
            object.geometry.dispose();
            const material = object.material;
            if (Array.isArray(material)) {
              material.forEach((item) => item.dispose());
            } else {
              material.dispose();
            }
          } else if (object instanceof THREE.Sprite) {
            object.material.dispose();
          }
        });
        if (glowTexture) glowTexture.dispose();
        renderer.domElement.remove();
      };
    };

    idleHandle = window.setTimeout(() => {
      boot().catch(() => {
        host.dataset.failed = "true";
      });
    }, 300);

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) window.clearTimeout(idleHandle);
      dispose?.();
    };
  }, []);

  return <div ref={hostRef} className="cr-jellyfish" aria-hidden="true" />;
}
