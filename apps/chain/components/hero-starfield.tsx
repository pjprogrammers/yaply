"use client";

import { useEffect, useRef } from "react";

type ThreeModule = typeof import("three");

const PARTICLE_COUNT = 1800;
const PRIMARY = "#4cb3f0";
const SECONDARY = "#4260ec";
const ACCENT = "#ffffff";

function buildParticles(THREE: ThreeModule, count: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const primary = new THREE.Color(PRIMARY);
  const secondary = new THREE.Color(SECONDARY);
  const accent = new THREE.Color(ACCENT);
  let randomState = 0x51ed2701;

  const random = () => {
    randomState = (randomState + 0x6d2b79f5) | 0;
    let value = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = 0; index < count; index++) {
    const radius = 3 + random() * 9;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);

    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const tint = random();
    const color =
      tint < 0.45
        ? primary.clone()
        : tint < 0.8
          ? secondary.clone()
          : accent.clone();
    color.multiplyScalar(0.45 + random() * 0.55);

    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  return { positions, colors };
}

export function HeroStarfield() {
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
        antialias: false,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 80);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);

      const { positions, colors } = buildParticles(THREE, PARTICLE_COUNT);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const field = new THREE.Points(geometry, material);
      field.frustumCulled = false;
      scene.add(field);

      const layout = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      layout();

      let elapsed = 0.4;
      let lastTimestamp: number | null = null;
      let pointerX = 0;
      let pointerY = 0;
      let rotationX = 0;
      let rotationY = 0;
      let scrollOffset = 0;

      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        pointerX = event.clientX / window.innerWidth - 0.5;
        pointerY = event.clientY / window.innerHeight - 0.5;
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });

      const update = (time: number) => {
        rotationY += (pointerX * 0.62 - rotationY) * 0.025;
        rotationX += (pointerY * 0.4 - rotationX) * 0.025;

        const scrollTarget = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.4) * 1.2;
        scrollOffset += (scrollTarget - scrollOffset) * 0.04;

        field.rotation.y = time * 0.012 + rotationY;
        field.rotation.x = Math.sin(time * 0.006) * 0.08 + rotationX;
        field.position.y = scrollOffset;
      };

      update(elapsed);
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
        { rootMargin: "260px 0px" },
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
        geometry.dispose();
        material.dispose();
        renderer.domElement.remove();
      };
    };

    idleHandle = window.setTimeout(() => {
      boot().catch(() => {
        host.dataset.failed = "true";
      });
    }, 120);

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) window.clearTimeout(idleHandle);
      dispose?.();
    };
  }, []);

  return <div ref={hostRef} className="cr-starfield" aria-hidden="true" />;
}
