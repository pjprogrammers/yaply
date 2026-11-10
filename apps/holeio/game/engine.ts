import * as THREE from "three";
import type { HoleioInput, HoleioMatchSnapshot } from "@yaply/shared/types";
import { City, writeObject, type WorldObject } from "./city";
import type { BigCityAssets } from "./bigcity";
import { Effects } from "./effects";
import { GameAudio } from "./audio";
import {
  BOT_COUNT,
  BOT_NAMES,
  BOT_PERSONALITY,
  COUNTDOWN_SECONDS,
  MATCH_SECONDS,
  PLAYER_COLOR,
  START_RADIUS,
  HOLE_COLORS,
  radiusForScore,
  speedForRadius,
  tierForRadius,
} from "./constants";
import { damp, distance2, mulberry32, shuffle } from "./rng";
import type {
  EngineRole,
  FeedItem,
  GameSnapshot,
  HoleSnapshot,
  OnlinePlayer,
  Phase,
} from "./types";

const PLAYER_ID = "player";
const BEST_KEY = "holeio:best";
/** MoveCameraIntoHole: 72 frames @ 60 fps, OnEnd at 1.1667 s. */
const FALL_CAMERA_SECONDS = 1.1667;
/** OnEnterInteriorEvent from the same reference clip. */
const FALL_INTERIOR_SECONDS = 0.7833;
/** BlackHoleTop frame count / sample rate (67 frames @ 60 fps). */
const HOLE_COLLAPSE_SECONDS = 67 / 60;

interface AiState {
  cooldown: number;
  target: WorldObject | null;
  targetHole: HoleActor | null;
  angle: number;
  wander: number;
  personality: (typeof BOT_PERSONALITY)[number];
}

interface HoleActor {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  score: number;
  alive: boolean;
  respawnIn: number;
  eaten: number;
  eatenHoles: number;
  eatenBy: string | null;
  collapse: number;
  spawnGuard: number;
  remoteX: number;
  remoteZ: number;
  inputSeq: number;
  group: THREE.Group;
  disc: THREE.Mesh;
  discUniforms: { uColor: { value: THREE.Color }; uTime: { value: number } };
  swirl: THREE.Mesh;
  rim: THREE.Mesh;
  rimUnder: THREE.Mesh;
  centerRing: THREE.Mesh;
  label: THREE.Sprite;
  labelMaterial: THREE.SpriteMaterial;
  labelCanvas: HTMLCanvasElement;
  ai: AiState | null;
}

interface EngineOptions {
  name: string;
  muted: boolean;
  /** Preloaded BigCity map, meshes, and gameplay layout. */
  assets: BigCityAssets;
  /** Local bot match, authoritative host, or snapshot-driven guest. */
  mode?: EngineRole;
  localPlayerId?: string;
  roster?: OnlinePlayer[];
  botCount?: number;
  round?: number;
  seedSnapshot?: HoleioMatchSnapshot | null;
  onSnapshot: (snapshot: GameSnapshot) => void;
  /** Guest direction packets. */
  onInput?: (input: HoleioInput) => void;
  /** Host relay frames. */
  onMatchSnapshot?: (snapshot: HoleioMatchSnapshot) => void;
}

const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export class HoleEngine {
  private readonly container: HTMLElement;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly city: City;
  private readonly effects: Effects;
  private readonly audio = new GameAudio();
  private readonly options: EngineOptions;
  private readonly role: EngineRole;
  private readonly localPlayerId: string;
  private readonly round: number;
  private readonly configuredBots: number;
  private readonly raycaster = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly pointerPoint = new THREE.Vector3();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly keys = new Set<string>();
  private readonly holes: HoleActor[] = [];
  private readonly feed: (FeedItem & { expires: number })[] = [];
  private light!: THREE.DirectionalLight;
  private readonly lightTarget = new THREE.Object3D();
  private readonly rng = mulberry32(0x51a7e);
  private readonly resizeObserver: ResizeObserver;
  private readonly onKeyDown: (event: KeyboardEvent) => void;
  private readonly onKeyUp: (event: KeyboardEvent) => void;
  private readonly onPointerMove: (event: PointerEvent) => void;
  private readonly onPointerLeave: () => void;

  private phase: Phase = "menu";
  private pausedFrom: Phase = "playing";
  private timeLeft = MATCH_SECONDS;
  private countdown = 0;
  private lastCountdownDisplay = 3;
  private lastTickSecond = -1;
  private elapsed = 0;
  private wallTime = 0;
  private matchSeconds = 0;
  private lastSnapshot = 0;
  private fps = 60;
  private frameAccumulator = 0;
  private frameCount = 0;
  private animationFrame = 0;
  private lastFrame = 0;
  private playerName = "You";
  private pointerActive = false;
  private stickX = 0;
  private stickY = 0;
  private muted: boolean;
  private best = 0;
  private botsEaten = 0;
  private playerEaten = 0;
  private winnerName: string | null = null;
  private swallowedBy: string | null = null;
  private finishTimer = -1;
  private cameraAngle = 0.6;
  private snapCamera = true;
  private shake = 0;
  private lastPlayerFeed = 0;
  private playerTier = -1;
  private fallDive: {
    x: number;
    z: number;
    radius: number;
    time: number;
    duration: number;
    fromX: number;
    fromY: number;
    fromZ: number;
  } | null = null;
  private readonly swirlTexture: THREE.CanvasTexture;
  private readonly holeRimTop: THREE.Texture;
  private readonly holeRimBottom: THREE.Texture;
  private readonly holeCenter: THREE.Texture;
  private disposed = false;
  private inputAccumulator = 0;
  private inputSeq = 0;
  private lastCityState = "";
  private guestFinished = false;

  constructor(container: HTMLElement, options: EngineOptions) {
    this.container = container;
    this.options = options;
    this.role = options.mode ?? "local";
    this.localPlayerId = options.localPlayerId ?? PLAYER_ID;
    this.round = options.round ?? 1;
    this.configuredBots = options.botCount ?? BOT_COUNT;
    this.playerName = options.name;
    this.muted = options.muted;
    this.best = this.readBest();

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
      });
    } catch {
      throw new Error("WebGL is not available in this browser.");
    }
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = "holeio-canvas";
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);
    this.scene.background = new THREE.Color("#a9d8e7");
    this.scene.fog = new THREE.Fog("#c6e3e3", 300, 720);

    this.buildSky();
    this.buildLights();

    this.city = new City(this.scene, options.assets, 20261108);
    this.effects = new Effects(this.scene);
    this.swirlTexture = this.createSwirlTexture();
    this.holeRimTop = this.loadHoleTexture("rim-top");
    this.holeRimBottom = this.loadHoleTexture("rim-bottom");
    this.holeCenter = this.loadHoleTexture("center-ring");
    this.audio.setMuted(options.muted);

    this.holes.push(...this.createInitialHoles());
    this.setHolesVisible(false);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(
          key,
        )
      ) {
        if (key.startsWith("arrow")) event.preventDefault();
        this.keys.add(key);
      }
    };
    this.onKeyUp = (event: KeyboardEvent) => {
      this.keys.delete(event.key.toLowerCase());
    };
    this.onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointerNdc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.pointerActive = true;
    };
    this.onPointerLeave = () => {
      this.pointerActive = false;
    };

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clearKeys);
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.addEventListener("pointerleave", this.onPointerLeave);

    this.lastFrame = performance.now();
    this.loop = this.loop.bind(this);
    this.animationFrame = requestAnimationFrame(this.loop);
    this.phase = "menu";
    this.publish();
  }

  // ---------------------------------------------------------------- public

  startMatch(name: string, muted = this.muted) {
    this.playerName = (name || "You").trim().slice(0, 14) || "You";
    this.muted = muted;
    this.audio.setMuted(muted);
    this.audio.unlock();
    this.audio.playMusic();
    this.resetMatch();
    this.phase = "countdown";
    this.countdown = COUNTDOWN_SECONDS;
    this.lastCountdownDisplay = 3;
    this.audio.countdown(3);
    this.snapCamera = true;
    this.publish();
  }

  /** Host engine entry point for a fresh online match. */
  startOnlineMatch() {
    this.audio.unlock();
    this.audio.playMusic();
    this.resetMatch();
    this.phase = "countdown";
    this.countdown = COUNTDOWN_SECONDS;
    this.lastCountdownDisplay = 3;
    this.audio.countdown(3);
    this.snapCamera = true;
    this.publish();
    this.publishMatch();
  }

  /**
   * A guest promoted after the old host dropped boots from the last relayed
   * frame instead of restarting the city from zero.
   */
  startOnlineHost(seed?: HoleioMatchSnapshot | null) {
    this.audio.unlock();
    this.audio.playMusic();
    if (seed && seed.round === this.round) {
      this.applySnapshotState(seed);
      this.snapCamera = true;
      this.publish();
      this.publishMatch();
      return;
    }
    this.startOnlineMatch();
  }

  /** Applies an authoritative host frame to a guest renderer. */
  applyRemoteSnapshot(snapshot: HoleioMatchSnapshot) {
    if (this.role !== "online-guest") return;
    // A frame queued just before a rematch must not repaint round two with the
    // previous round's holes or city state.
    if (snapshot.round !== this.round) return;
    this.applySnapshotState(snapshot);
    this.publish();
  }

  /** Host: stores the newest direction packet from a guest. */
  setRemoteInput(playerId: string, input: HoleioInput) {
    if (this.role !== "online-host") return;
    const hole = this.holes.find((entry) => entry.id === playerId);
    if (!hole || hole.isPlayer || hole.ai) return;
    if (input.seq !== undefined && input.seq <= hole.inputSeq) return;
    if (input.seq !== undefined) hole.inputSeq = input.seq;
    hole.remoteX = Math.max(-1, Math.min(1, input.x));
    hole.remoteZ = Math.max(-1, Math.min(1, input.z));
  }

  /** Host: reconciles the live table with the room roster. */
  syncRoster(players: OnlinePlayer[]) {
    if (this.role !== "online-host") return;
    const roster = new Map(players.map((player) => [player.id, player]));
    const humans = players.length;

    for (const hole of [...this.holes]) {
      if (hole.isPlayer || hole.ai) continue;
      if (!roster.has(hole.id)) this.removeHole(hole);
    }

    for (const player of players) {
      const existing = this.holes.find((hole) => hole.id === player.id);
      if (existing) {
        existing.name = player.name;
        existing.color = player.color;
        existing.discUniforms.uColor.value.set(player.color);
        (existing.swirl.material as THREE.MeshBasicMaterial).color.set(player.color);
        (existing.rim.material as THREE.MeshBasicMaterial).color.set(player.color);
        (existing.rimUnder.material as THREE.MeshBasicMaterial).color.set(player.color);
        this.drawLabel(existing);
        continue;
      }
      if (player.id === this.localPlayerId) continue;
      const hole = this.createHole(player.id, player.name, player.color, false, null);
      this.placeNewHole(hole, true);
      this.holes.push(hole);
    }

    const desiredBots = Math.min(
      this.configuredBots,
      Math.max(0, 8 - humans),
    );
    const botHoles = this.holes.filter((hole) => hole.ai);
    for (let index = botHoles.length; index > desiredBots; index -= 1) {
      const hole = botHoles[index - 1];
      if (hole) this.removeHole(hole);
    }
    if (botHoles.length < desiredBots) {
      const created: HoleActor[] = [];
      this.appendBots(created, humans);
      for (const hole of created.slice(0, desiredBots - botHoles.length)) {
        this.placeNewHole(hole, true);
        this.holes.push(hole);
      }
    }
  }

  restart() {
    this.startMatch(this.playerName, this.muted);
  }

  toMenu() {
    this.phase = "menu";
    this.countdown = 0;
    this.timeLeft = MATCH_SECONDS;
    this.finishTimer = -1;
    this.swallowedBy = null;
    this.winnerName = null;
    this.feed.length = 0;
    this.fallDive = null;
    this.audio.stopMusic();
    this.audio.setMoving(false);
    this.city.reset();
    this.setHolesVisible(false);
    this.cameraAngle = 0.6;
    this.camera.fov = this.camera.aspect < 0.9 ? 58 : 50;
    this.camera.updateProjectionMatrix();
    this.publish();
  }

  pause() {
    if (this.role !== "local") return;
    if (this.phase !== "playing" && this.phase !== "countdown") return;
    this.pausedFrom = this.phase;
    this.phase = "paused";
    this.clearKeys();
    this.stickX = 0;
    this.stickY = 0;
    this.audio.setMoving(false);
    this.publish();
  }

  resume() {
    if (this.phase !== "paused") return;
    this.phase = this.pausedFrom;
    this.publish();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.audio.setMuted(muted);
    this.publish();
  }

  setStick(x: number, y: number) {
    this.stickX = x;
    this.stickY = y;
  }

  setPlayerName(name: string) {
    this.playerName = name.trim().slice(0, 14) || "You";
    const player = this.holes.find((hole) => hole.isPlayer);
    if (player) {
      player.name = this.playerName;
      this.drawLabel(player);
    }
  }

  getBest() {
    return this.best;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clearKeys);
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.removeEventListener("pointerleave", this.onPointerLeave);
    this.resizeObserver.disconnect();
    for (const hole of this.holes) this.disposeHole(hole);
    this.city.dispose();
    this.effects.dispose();
    this.audio.dispose();
    this.swirlTexture.dispose();
    this.holeRimTop.dispose();
    this.holeRimBottom.dispose();
    this.holeCenter.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // --------------------------------------------------------------- building

  private buildSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(650, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color("#4fa8e0") },
          bottom: { value: new THREE.Color("#cfe9f7") },
        },
        vertexShader: /* glsl */ `
          varying float vHeight;
          void main() {
            vHeight = normalize(position).y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vHeight;
          uniform vec3 top;
          uniform vec3 bottom;
          void main() {
            float t = smoothstep(-0.15, 0.65, vHeight);
            gl_FragColor = vec4(mix(bottom, top, t), 1.0);
          }
        `,
      }),
    );
    this.scene.add(sky);

    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const cloudGeometry = new THREE.IcosahedronGeometry(1, 1);
    for (let c = 0; c < 9; c += 1) {
      const cloud = new THREE.Group();
      const pieces = 3 + Math.floor(this.rng() * 4);
      for (let i = 0; i < pieces; i += 1) {
        const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
        puff.position.set(
          (this.rng() - 0.5) * 26,
          (this.rng() - 0.5) * 4,
          (this.rng() - 0.5) * 12,
        );
        const s = 6 + this.rng() * 10;
        puff.scale.set(s, s * 0.55, s * 0.8);
        cloud.add(puff);
      }
      const angle = (c / 9) * Math.PI * 2 + this.rng() * 0.5;
      const radius = 240 + this.rng() * 180;
      cloud.position.set(
        Math.cos(angle) * radius,
        85 + this.rng() * 55,
        Math.sin(angle) * radius,
      );
      this.scene.add(cloud);
    }
  }

  private buildLights() {
    const hemi = new THREE.HemisphereLight("#d8ecff", "#7d786a", 1.15);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight("#fff4e2", 0.22);
    this.scene.add(ambient);

    const light = new THREE.DirectionalLight("#fff0d2", 1.85);
    light.position.set(70, 105, 45);
    light.castShadow = true;
    light.shadow.mapSize.set(
      typeof window !== "undefined" && window.devicePixelRatio > 1 ? 2048 : 2048,
      2048,
    );
    light.shadow.camera.left = -75;
    light.shadow.camera.right = 75;
    light.shadow.camera.top = 75;
    light.shadow.camera.bottom = -75;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 260;
    light.shadow.bias = -0.0006;
    light.shadow.normalBias = 0.03;
    this.light = light;
    this.scene.add(light);
    this.scene.add(this.lightTarget);
    light.target = this.lightTarget;
  }

  private createInitialHoles(): HoleActor[] {
    if (this.role === "local") return this.createLocalHoles();
    if (
      this.role === "online-guest" &&
      this.options.seedSnapshot &&
      this.options.seedSnapshot.round === this.round
    ) {
      const holes = this.options.seedSnapshot.holes
        .slice(0, 8)
        .map((hole) =>
          this.createHole(
            hole.id,
            hole.name,
            hole.color,
            hole.id === this.localPlayerId,
            null,
          ),
        );
      if (holes.length > 0) return holes;
    }
    return this.createOnlineHoles();
  }

  private createLocalHoles(): HoleActor[] {
    const shuffledNames = shuffle(this.rng, [...BOT_NAMES]);
    const colours = shuffle(
      this.rng,
      HOLE_COLORS.filter((colour) => colour.id !== PLAYER_COLOR.id),
    );
    const holes: HoleActor[] = [];
    holes.push(this.createHole(PLAYER_ID, this.playerName, PLAYER_COLOR.hex, true, null));
    for (let i = 0; i < BOT_COUNT; i += 1) {
      const colour = colours[i % colours.length];
      holes.push(
        this.createHole(
          `bot-${i + 1}`,
          shuffledNames[i % shuffledNames.length],
          colour.hex,
          false,
          BOT_PERSONALITY[i % BOT_PERSONALITY.length],
        ),
      );
    }
    return holes;
  }

  private createOnlineHoles(): HoleActor[] {
    const roster = this.options.roster ?? [];
    const local =
      roster.find((player) => player.id === this.localPlayerId) ?? null;
    const holes: HoleActor[] = [
      this.createHole(
        this.localPlayerId,
        local?.name ?? this.playerName,
        local?.color ?? PLAYER_COLOR.hex,
        true,
        null,
      ),
    ];
    for (const player of roster) {
      if (player.id === this.localPlayerId) continue;
      holes.push(
        this.createHole(player.id, player.name, player.color, false, null),
      );
    }
    if (this.role === "online-host") {
      this.appendBots(holes, roster.length);
    }
    return holes;
  }

  /** Adds the host's seats of bots, never exceeding the eight-hole table. */
  private appendBots(holes: HoleActor[], humans: number): void {
    const wanted = Math.min(
      this.configuredBots,
      Math.max(0, 8 - humans),
      holes.length >= 8 ? 0 : 8 - holes.length,
    );
    if (wanted <= 0) return;
    const names = shuffle(this.rng, [...BOT_NAMES]);
    const used = new Set(holes.map((hole) => hole.color.toLowerCase()));
    const colours = HOLE_COLORS.filter((colour) => !used.has(colour.hex.toLowerCase()));
    for (let index = 0; index < wanted; index += 1) {
      const id = `bot-${index + 1}`;
      if (holes.some((hole) => hole.id === id)) continue;
      const colour = colours[index % Math.max(1, colours.length)] ?? PLAYER_COLOR;
      holes.push(
        this.createHole(
          id,
          names[index % names.length],
          colour.hex,
          false,
          BOT_PERSONALITY[index % BOT_PERSONALITY.length],
        ),
      );
    }
  }

  private createHole(
    id: string,
    name: string,
    color: string,
    isPlayer: boolean,
    personality: (typeof BOT_PERSONALITY)[number] | null,
  ): HoleActor {
    const group = new THREE.Group();
    const influence = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1.42, 56),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    influence.rotation.x = -Math.PI / 2;
    influence.position.y = 0.015;
    group.add(influence);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform vec3 uColor;
          uniform float uTime;
          void main() {
            vec2 p = vUv - 0.5;
            float d = length(p) * 2.0;
            float edge = smoothstep(0.62, 1.0, d);
            float angle = atan(p.y, p.x);
            float swirl = sin(angle * 7.0 + uTime * 2.6 - d * 11.0) * 0.5 + 0.5;
            vec3 ink = mix(vec3(0.003, 0.004, 0.006), uColor * 0.52, edge * (0.28 + swirl * 0.5));
            gl_FragColor = vec4(ink, 1.0);
          }
        `,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.035;
    group.add(disc);
    const discUniforms = (disc.material as THREE.ShaderMaterial).uniforms as {
      uColor: { value: THREE.Color };
      uTime: { value: number };
    };

    const swirl = new THREE.Mesh(
      new THREE.CircleGeometry(1.04, 64),
      new THREE.MeshBasicMaterial({
        map: this.swirlTexture,
        color,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    swirl.rotation.x = -Math.PI / 2;
    swirl.position.y = 0.055;
    swirl.renderOrder = 2;
    group.add(swirl);

    const ringGeometry = new THREE.PlaneGeometry(1, 1);
    const ringMaterial = (
      map: THREE.Texture,
      tint: THREE.ColorRepresentation,
    ) =>
      new THREE.MeshBasicMaterial({
        map,
        color: tint,
        transparent: true,
        alphaTest: 0.01,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      });

    // Prefab BlackHole/Skin: Bottom (5.252 x 5.369 * 0.335), Up
    // (4.601 x 4.671 * 0.335) and Center (2 x 2 * 0.096).
    const rim = new THREE.Mesh(
      ringGeometry,
      ringMaterial(this.holeRimTop, color),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.075;
    rim.scale.set(1.54149, 1.56481, 1);
    rim.renderOrder = 4;
    group.add(rim);

    const rimUnder = new THREE.Mesh(
      ringGeometry,
      ringMaterial(this.holeRimBottom, color),
    );
    rimUnder.rotation.x = -Math.PI / 2;
    rimUnder.position.y = 0.068;
    rimUnder.scale.set(1.75951, 1.79897, 1);
    rimUnder.renderOrder = 3;
    group.add(rimUnder);

    const centerRing = new THREE.Mesh(
      ringGeometry,
      ringMaterial(this.holeCenter, new THREE.Color(0.149, 0.063, 0.275)),
    );
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.1;
    centerRing.scale.setScalar(0.192568);
    centerRing.renderOrder = 5;
    group.add(centerRing);

    group.visible = false;
    this.scene.add(group);

    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    const labelMaterial = new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const label = new THREE.Sprite(labelMaterial);
    label.scale.set(5, 1.25, 1);
    label.visible = false;
    label.renderOrder = 20;
    this.scene.add(label);

    const hole: HoleActor = {
      id,
      name,
      color,
      isPlayer,
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      radius: START_RADIUS,
      score: 0,
      alive: true,
      respawnIn: 0,
      eaten: 0,
      eatenHoles: 0,
      eatenBy: null,
      collapse: 0,
      spawnGuard: 0,
      remoteX: 0,
      remoteZ: 0,
      inputSeq: -1,
      group,
      disc,
      discUniforms,
      swirl,
      rim,
      rimUnder,
      centerRing,
      label,
      labelMaterial,
      labelCanvas,
      ai: personality
        ? {
            cooldown: 0,
            target: null,
            targetHole: null,
            angle: this.rng() * Math.PI * 2,
            wander: 0,
            personality,
          }
        : null,
    };
    this.drawLabel(hole);
    return hole;
  }

  private drawLabel(hole: HoleActor) {
    const ctx = hole.labelCanvas.getContext("2d");
    if (!ctx) return;
    const w = hole.labelCanvas.width;
    const h = hole.labelCanvas.height;
    ctx.clearRect(0, 0, w, h);
    const name = hole.name.trim();
    const text =
      hole.isPlayer && name.toLowerCase() !== "you"
        ? `YOU · ${name}`
        : hole.isPlayer
          ? "YOU"
          : name;
    ctx.font = "700 46px Inter, system-ui, sans-serif";
    const measured = ctx.measureText(text).width;
    const pad = 28;
    const boxWidth = Math.min(w - 8, measured + pad * 2);
    const x = (w - boxWidth) / 2;
    ctx.fillStyle = "rgba(8, 11, 8, 0.82)";
    ctx.beginPath();
    const radius = 34;
    ctx.roundRect(x, 18, boxWidth, 76, radius);
    ctx.fill();
    ctx.strokeStyle = hole.color;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, 58, boxWidth - pad);
    const texture = hole.labelMaterial.map;
    if (texture) texture.needsUpdate = true;
  }

  /**
   * Exact BlackHole sprite layers. The reference prefab uses two ring sprites
   * plus a small centre ring (SharedAssets1: trou noir dessus/dessous,
   * CircleBig) around an inverted black cylinder.
   */
  private loadHoleTexture(name: string): THREE.Texture {
    const texture = new THREE.TextureLoader().load(`/assets/hole/${name}.png`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    return texture;
  }

  private createSwirlTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 256, 256);
      ctx.translate(128, 128);
      for (let i = 0; i < 90; i += 1) {
        const radius = 26 + Math.random() * 94;
        const start = Math.random() * Math.PI * 2;
        const length = 0.18 + Math.random() * 0.75;
        ctx.beginPath();
        ctx.arc(0, 0, radius, start, start + length);
        ctx.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.38})`;
        ctx.lineWidth = 0.7 + Math.random() * 2.2;
        ctx.stroke();
      }
      const gradient = ctx.createRadialGradient(0, 0, 20, 0, 0, 120);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.65, "rgba(255,255,255,0.12)");
      gradient.addColorStop(0.94, "rgba(255,255,255,0.5)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 120, 0, Math.PI * 2);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // --------------------------------------------------------------- lifecycle

  private resetMatch() {
    this.city.reset();
    if (this.holes.length === 0) {
      this.holes.push(...this.createInitialHoles());
    }
    const player = this.holes.find((hole) => hole.isPlayer);
    if (!player) return;

    const names = shuffle(this.rng, [...BOT_NAMES]);
    this.holes
      .filter((hole) => hole.ai)
      .forEach((hole, index) => {
        hole.name = names[index % names.length];
        this.drawLabel(hole);
      });
    this.drawLabel(player);
    player.name = this.playerName;
    this.drawLabel(player);

    const spawnPoints = this.spawnPoints();
    const cleared = spawnPoints.filter(
      (point) =>
        this.spawnLandShare(point.x, point.z) >= 0.9 &&
        this.spawnClearance(point.x, point.z) >= 5,
    );
    const playerPool = cleared.length > 0 ? cleared : spawnPoints;
    const playerSpawn =
      playerPool[Math.floor(this.rng() * playerPool.length)] ?? { x: 0, z: 0 };
    player.x = playerSpawn.x;
    player.z = playerSpawn.z;
    player.score = 0;
    player.radius = START_RADIUS;
    player.alive = true;
    player.respawnIn = 0;
    player.eaten = 0;
    player.eatenHoles = 0;
    player.eatenBy = null;
    player.collapse = 0;
    player.spawnGuard = 5;
    player.vx = 0;
    player.vz = 0;

    let index = 1;
    for (const hole of this.holes) {
      if (hole.isPlayer) continue;
      let point = spawnPoints[index % spawnPoints.length];
      index += 1;
      let guard = 0;
      while (guard < 40 && distance2(point.x, point.z, player.x, player.z) < 42 * 42) {
        point = spawnPoints[(index + guard) % spawnPoints.length];
        guard += 1;
      }
      hole.x = point.x;
      hole.z = point.z;
      hole.score = 0;
      hole.radius = START_RADIUS;
      hole.alive = true;
      hole.respawnIn = 0;
      hole.eaten = 0;
      hole.eatenHoles = 0;
      hole.eatenBy = null;
      hole.collapse = 0;
      hole.spawnGuard = 2.2;
      hole.vx = 0;
      hole.vz = 0;
      hole.remoteX = 0;
      hole.remoteZ = 0;
      hole.inputSeq = -1;
      if (hole.ai) {
        hole.ai.target = null;
        hole.ai.targetHole = null;
        hole.ai.cooldown = 0;
        hole.ai.angle = this.rng() * Math.PI * 2;
      }
    }

    this.timeLeft = MATCH_SECONDS;
    this.matchSeconds = 0;
    this.lastTickSecond = -1;
    this.botsEaten = 0;
    this.playerEaten = 0;
    this.winnerName = null;
    this.swallowedBy = null;
    this.finishTimer = -1;
    this.feed.length = 0;
    this.lastPlayerFeed = 0;
    this.shake = 0;
    this.playerTier = -1;
    this.fallDive = null;
    this.camera.fov = this.camera.aspect < 0.9 ? 58 : 50;
    this.camera.updateProjectionMatrix();
    this.setHolesVisible(true);
    for (const hole of this.holes) {
      hole.group.visible = true;
      hole.label.visible = true;
    }
    this.addFeed("Swallow the city. Everything is food.", "info");
  }

  private spawnPoints(): { x: number; z: number }[] {
    return shuffle(
      this.rng,
      this.city.spawns.map((point) => ({ x: point.x, z: point.z })),
    );
  }

  /** Distance from a point to the nearest building footprint. */
  private spawnClearance(x: number, z: number): number {
    let nearest = Infinity;
    for (const obj of this.city.objects) {
      if (obj.kind !== "building") continue;
      const dx = Math.max(Math.abs(x - obj.x) - obj.width / 2, 0);
      const dz = Math.max(Math.abs(z - obj.z) - obj.depth / 2, 0);
      const distance = Math.hypot(dx, dz);
      if (distance < nearest) nearest = distance;
    }
    return nearest;
  }

  /** Share of dry land in a square around a spawn point. */
  private spawnLandShare(x: number, z: number): number {
    let land = 0;
    let total = 0;
    for (let dx = -18; dx <= 18; dx += 3) {
      for (let dz = -18; dz <= 18; dz += 3) {
        total += 1;
        if (this.city.isLand(x + dx, z + dz)) land += 1;
      }
    }
    return land / total;
  }

  private placeNewHole(hole: HoleActor, guard: boolean) {
    const local = this.holes.find((entry) => entry.isPlayer);
    const points = this.spawnPoints();
    let choice = points[0] ?? { x: 0, z: 0 };
    for (const point of points) {
      if (!local || distance2(point.x, point.z, local.x, local.z) > 34 * 34) {
        choice = point;
        break;
      }
    }
    hole.x = choice.x;
    hole.z = choice.z;
    hole.vx = 0;
    hole.vz = 0;
    hole.score = 0;
    hole.radius = START_RADIUS;
    hole.alive = true;
    hole.respawnIn = 0;
    hole.eaten = 0;
    hole.eatenHoles = 0;
    hole.eatenBy = null;
    hole.collapse = 0;
    hole.spawnGuard = guard ? 2.2 : 0;
    hole.remoteX = 0;
    hole.remoteZ = 0;
    hole.inputSeq = -1;
    if (hole.ai) {
      hole.ai.target = null;
      hole.ai.targetHole = null;
      hole.ai.cooldown = 0;
      hole.ai.angle = this.rng() * Math.PI * 2;
    }
    this.drawLabel(hole);
  }

  private removeHole(hole: HoleActor) {
    const index = this.holes.indexOf(hole);
    if (index >= 0) this.holes.splice(index, 1);
    this.disposeHole(hole);
  }

  private countdownValue(): number {
    if (this.phase !== "countdown") return 0;
    return this.countdown > 2.4
      ? 3
      : this.countdown > 1.4
        ? 2
        : this.countdown > 0.4
          ? 1
          : 0;
  }

  private sendGuestInput(dt: number) {
    if (!this.options.onInput) return;
    this.inputAccumulator += dt;
    if (this.inputAccumulator < 0.07) return;
    this.inputAccumulator = 0;
    const player = this.holes.find((hole) => hole.isPlayer);
    const direction =
      player && player.alive && this.phase === "playing"
        ? this.playerDesiredDirection(player)
        : { x: 0, z: 0 };
    this.inputSeq += 1;
    this.options.onInput({
      seq: this.inputSeq,
      x: Math.round(direction.x * 1000) / 1000,
      z: Math.round(direction.z * 1000) / 1000,
    });
  }

  private applySnapshotState(snapshot: HoleioMatchSnapshot) {
    if (this.disposed) return;
    const wasFinished = this.phase === "finished";
    this.applyCityState(snapshot.city);
    this.syncHolesFromSnapshot(snapshot);

    this.timeLeft = Math.max(0, snapshot.timeLeft);
    this.matchSeconds = Math.max(0, MATCH_SECONDS - this.timeLeft);
    this.countdown = snapshot.countdown;
    this.phase =
      snapshot.phase === "over"
        ? "finished"
        : snapshot.phase === "countdown"
          ? "countdown"
          : "playing";
    // The guest starts hidden behind the menu; the first authoritative frame
    // is what puts the holes on the street.
    this.setHolesVisible(true);

    const local = this.holes.find((hole) => hole.isPlayer);
    this.swallowedBy =
      local && !local.alive && local.eatenBy
        ? this.holes.find((hole) => hole.id === local.eatenBy)?.name ?? null
        : null;
    const top = [...this.holes].sort((a, b) => b.score - a.score)[0];
    this.winnerName = snapshot.winner?.name ?? top?.name ?? null;
    this.botsEaten = local?.eatenHoles ?? 0;

    if (!this.guestFinished && snapshot.phase === "over") {
      this.guestFinished = true;
      if (local && local.score > this.best) {
        this.best = Math.floor(local.score);
        try {
          window.localStorage.setItem(BEST_KEY, String(this.best));
        } catch {
          // private mode still plays.
        }
      }
      this.audio.finish(Boolean(local && top?.id === local.id && local.alive));
    }

    if (!wasFinished) this.snapCamera = true;

    this.feed.length = 0;
    for (const entry of snapshot.feed.slice(-6)) {
      this.feed.push({
        id: entry.id,
        text: entry.text,
        tone: entry.tone,
        expires: this.wallTime + Math.max(0.25, entry.ttl),
      });
    }
  }

  private syncHolesFromSnapshot(snapshot: HoleioMatchSnapshot) {
    const incoming = new Set(snapshot.holes.map((hole) => hole.id));
    for (const hole of [...this.holes]) {
      if (!incoming.has(hole.id)) this.removeHole(hole);
    }

    for (const entry of snapshot.holes) {
      let hole = this.holes.find((candidate) => candidate.id === entry.id);
      if (!hole) {
        hole = this.createHole(
          entry.id,
          entry.name,
          entry.color,
          entry.id === this.localPlayerId,
          null,
        );
        this.holes.push(hole);
      }
      if (hole.name !== entry.name) {
        hole.name = entry.name;
        this.drawLabel(hole);
      }
      if (hole.color !== entry.color) {
        hole.color = entry.color;
        hole.discUniforms.uColor.value.set(entry.color);
        (hole.swirl.material as THREE.MeshBasicMaterial).color.set(entry.color);
        (hole.rim.material as THREE.MeshBasicMaterial).color.set(entry.color);
        (hole.rimUnder.material as THREE.MeshBasicMaterial).color.set(entry.color);
        this.drawLabel(hole);
      }
      hole.x = entry.x;
      hole.z = entry.z;
      hole.radius = entry.radius;
      hole.score = entry.score;
      hole.alive = entry.alive;
      hole.respawnIn = entry.respawnIn;
      hole.eaten = entry.eaten;
      hole.eatenHoles = entry.eatenHoles ?? hole.eatenHoles;
      hole.eatenBy = entry.eatenBy ?? null;
      hole.vx = 0;
      hole.vz = 0;
      if (entry.alive) {
        hole.collapse = 0;
      } else {
        hole.collapse = Math.max(hole.collapse, HOLE_COLLAPSE_SECONDS);
      }
    }
  }

  private applyCityState(city: string | undefined) {
    if (!city || city === this.lastCityState) return;
    this.lastCityState = city;
    this.city.applyState(city, this.holes);
  }

  private publishMatch() {
    if (this.role !== "online-host" || !this.options.onMatchSnapshot) return;
    if (this.phase === "boot" || this.phase === "menu") return;
    this.options.onMatchSnapshot(this.createMatchSnapshot());
  }

  private createMatchSnapshot(): HoleioMatchSnapshot {
    const ranked = [...this.holes].sort((a, b) => b.score - a.score);
    const top = ranked[0];
    const over = this.phase === "finished";
    return {
      phase: over ? "over" : this.phase === "countdown" ? "countdown" : "playing",
      round: this.round,
      timeLeft: Math.round(this.timeLeft * 10) / 10,
      countdown: Math.round(this.countdownValue() * 10) / 10,
      holes: this.holes.map((hole) => ({
        id: hole.id,
        name: hole.name,
        color: hole.color,
        x: Math.round(hole.x * 100) / 100,
        z: Math.round(hole.z * 100) / 100,
        radius: Math.round(hole.radius * 1000) / 1000,
        score: Math.round(hole.score),
        alive: hole.alive,
        respawnIn: Math.max(0, Math.round(hole.respawnIn * 10) / 10),
        eaten: hole.eaten,
        eatenHoles: hole.eatenHoles,
        eatenBy: hole.eatenBy,
      })),
      feed: this.feed
        .filter((item) => item.expires > this.wallTime)
        .slice(-4)
        .map(({ id, text, tone, expires }) => ({
          id,
          text,
          tone,
          ttl: Math.max(0, Math.round((expires - this.wallTime) * 10) / 10),
        })),
      winner:
        over && top
          ? {
              id: top.id,
              name: top.name,
              color: top.color,
              score: Math.round(top.score),
            }
          : null,
      city: this.city.encodeState(),
    };
  }

  private clearKeys = () => {
    this.keys.clear();
  };

  private resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = this.camera.aspect < 0.9 ? 58 : 50;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------- loop

  private loop(now: number) {
    if (this.disposed) return;
    const rawDt = Math.max(0, (now - this.lastFrame) / 1000);
    const dt = Math.min(0.05, rawDt);
    this.lastFrame = now;
    this.frameAccumulator += rawDt;
    this.frameCount += 1;
    if (this.frameAccumulator >= 0.5) {
      this.fps = this.frameCount / this.frameAccumulator;
      this.frameAccumulator = 0;
      this.frameCount = 0;
    }

    if (this.phase !== "paused") {
      this.update(dt, Math.min(1, rawDt));
    }
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.loop);
  }

  private update(dt: number, clockDt = dt) {
    this.wallTime += clockDt;
    this.elapsed += clockDt;

    if (this.role === "online-guest") {
      this.sendGuestInput(dt);
    } else if (this.phase === "countdown") {
      this.countdown -= clockDt;
      const display =
        this.countdown > 2.4 ? 3 : this.countdown > 1.4 ? 2 : this.countdown > 0.4 ? 1 : 0;
      if (display !== this.lastCountdownDisplay) {
        this.lastCountdownDisplay = display;
        this.audio.countdown(display);
      }
      if (this.countdown <= 0) {
        this.phase = "playing";
        this.timeLeft = MATCH_SECONDS;
        this.snapCamera = true;
        this.publish();
      }
    } else if (this.phase === "playing") {
      this.matchSeconds += clockDt;
      this.timeLeft = Math.max(0, this.timeLeft - clockDt);
      const second = Math.ceil(this.timeLeft);
      if (second !== this.lastTickSecond && second <= 10) {
        this.lastTickSecond = second;
        if (second > 0) this.audio.tick(second <= 5);
      }
      if (this.timeLeft <= 0) {
        this.finishMatch();
      }
    }

    this.city.update(
      dt,
      this.phase === "menu" || this.phase === "boot" ? [] : this.holes,
    );
    this.updateHoles(dt);
    this.updateFalling(dt);
    this.updateRespawns(dt);
    this.effects.update(dt);
    if (this.fallDive) {
      this.fallDive.time = Math.min(
        this.fallDive.duration,
        this.fallDive.time + clockDt,
      );
    }
    this.updateFeed();
    this.publishIfDue();

    if (this.finishTimer > 0) {
      this.finishTimer -= clockDt;
      if (this.finishTimer <= 0) this.finishMatch();
    }

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 4);
  }

  private updateHoles(dt: number) {
    if (this.role === "online-guest") {
      for (const hole of this.holes) {
        if (!hole.alive && hole.collapse > 0) {
          hole.collapse = Math.max(0, hole.collapse - dt);
        }
        this.updateHoleVisual(hole, dt);
      }
      return;
    }
    for (const hole of this.holes) {
      if (!hole.alive) {
        if (hole.collapse > 0) hole.collapse = Math.max(0, hole.collapse - dt);
        // In an online match every seat respawns, including the host's. A
        // local solo run still ends when the player is swallowed.
        if (
          (!hole.isPlayer || this.role === "online-host") &&
          this.phase === "playing"
        ) {
          hole.respawnIn -= dt;
          if (hole.respawnIn <= 0) this.respawnBot(hole);
        }
        this.updateHoleVisual(hole, dt);
        continue;
      }
      if (hole.spawnGuard > 0) hole.spawnGuard = Math.max(0, hole.spawnGuard - dt);
      if (hole.isPlayer && this.phase === "playing") this.syncPlayerTier(hole);

      if (this.phase === "playing") {
        const desired = hole.isPlayer
          ? this.playerDesiredDirection(hole)
          : hole.ai
            ? this.botDesiredDirection(hole, dt)
            : this.remoteDesiredDirection(hole);
        const speed = speedForRadius(hole.radius) * (hole.isPlayer || !hole.ai ? 1 : 0.95);
        const targetVx = desired.x * speed;
        const targetVz = desired.z * speed;
        const response = hole.isPlayer || !hole.ai ? 12 : 8;
        hole.vx = damp(hole.vx, targetVx, response, dt);
        hole.vz = damp(hole.vz, targetVz, response, dt);
        const { minX, maxX, minZ, maxZ } = this.city.bounds;
        const margin = 2;
        const nextX = Math.max(
          minX + margin,
          Math.min(maxX - margin, hole.x + hole.vx * dt),
        );
        const nextZ = Math.max(
          minZ + margin,
          Math.min(maxZ - margin, hole.z + hole.vz * dt),
        );
        if (this.city.isLand(nextX, nextZ)) {
          hole.x = nextX;
          hole.z = nextZ;
        } else {
          if (this.city.isLand(nextX, hole.z)) {
            hole.x = nextX;
          } else {
            hole.vx *= 0.2;
          }
          if (this.city.isLand(hole.x, nextZ)) {
            hole.z = nextZ;
          } else {
            hole.vz *= 0.2;
          }
        }
        this.captureObjects(hole, dt);
      } else {
        hole.vx = 0;
        hole.vz = 0;
      }

      this.updateHoleVisual(hole, dt);
    }

    const player = this.holes.find((hole) => hole.isPlayer);
    this.audio.setMoving(
      this.phase === "playing" &&
        Boolean(player?.alive) &&
        Math.hypot(player?.vx ?? 0, player?.vz ?? 0) > 0.7,
    );

    if (this.phase === "playing") {
      this.resolveHoleCollisions();
    }
  }

  private remoteDesiredDirection(hole: HoleActor): { x: number; z: number } {
    const length = Math.hypot(hole.remoteX, hole.remoteZ);
    if (length < 0.001) return { x: 0, z: 0 };
    return { x: hole.remoteX / Math.max(1, length), z: hole.remoteZ / Math.max(1, length) };
  }

  private playerDesiredDirection(hole: HoleActor): { x: number; z: number } {
    let dx = 0;
    let dz = 0;
    const keyboard =
      (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
      (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
    const vertical =
      (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) -
      (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0);
    if (keyboard !== 0 || vertical !== 0) {
      dx = keyboard;
      dz = vertical;
      const length = Math.hypot(dx, dz);
      if (length > 0) {
        dx /= length;
        dz /= length;
      }
      return { x: dx, z: dz };
    }

    const stickLength = Math.hypot(this.stickX, this.stickY);
    if (stickLength > 0.12) {
      return {
        x: this.stickX / Math.max(1, stickLength),
        z: this.stickY / Math.max(1, stickLength),
      };
    }

    if (this.pointerActive) {
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      if (this.raycaster.ray.intersectPlane(this.groundPlane, this.pointerPoint)) {
        dx = this.pointerPoint.x - hole.x;
        dz = this.pointerPoint.z - hole.z;
        const distance = Math.hypot(dx, dz);
        if (distance > 0.35) {
          return { x: dx / distance, z: dz / distance };
        }
      }
    }
    return { x: 0, z: 0 };
  }

  private botDesiredDirection(hole: HoleActor, dt: number): { x: number; z: number } {
    const ai = hole.ai;
    if (!ai) return { x: 0, z: 0 };
    ai.cooldown -= dt;
    if (ai.cooldown <= 0) {
      ai.cooldown = 0.25 + this.rng() * 0.3;
      this.chooseBotTarget(hole);
    }

    let dx = 0;
    let dz = 0;
    let target: { x: number; z: number } | null = null;
    if (ai.targetHole && ai.targetHole.alive) {
      target = ai.targetHole;
    } else if (ai.target && ai.target.state === "idle") {
      target = ai.target;
    }

    if (target) {
      dx = target.x - hole.x;
      dz = target.z - hole.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.5) {
        dx = 0;
        dz = 0;
      } else {
        dx /= distance;
        dz /= distance;
      }
    } else {
      ai.angle += (this.rng() - 0.5) * dt * 3;
      ai.wander -= dt;
      if (ai.wander <= 0) {
        ai.wander = 2 + this.rng() * 2;
        ai.angle = this.rng() * Math.PI * 2;
      }
      dx = Math.cos(ai.angle);
      dz = Math.sin(ai.angle);
    }

    // Run from anything that can swallow us.
    for (const other of this.holes) {
      if (other === hole || !other.alive) continue;
      if (other.radius > hole.radius * 1.18) {
        const ox = hole.x - other.x;
        const oz = hole.z - other.z;
        const distance = Math.hypot(ox, oz);
        const danger = other.radius + 12;
        if (distance < danger && distance > 0.001) {
          const weight = (1 - distance / danger) * ai.personality.caution * 2.4;
          dx += (ox / distance) * weight;
          dz += (oz / distance) * weight;
        }
      }
    }

    const length = Math.hypot(dx, dz);
    if (length < 0.001) {
      return { x: Math.cos(ai.angle), z: Math.sin(ai.angle) };
    }
    return { x: dx / length, z: dz / length };
  }

  private chooseBotTarget(hole: HoleActor) {
    const ai = hole.ai;
    if (!ai) return;
    let bestScore = 0.0001;
    let bestObject: WorldObject | null = null;
    let bestHole: HoleActor | null = null;
    const greed = ai.personality.greed;

    for (const obj of this.city.objects) {
      if (obj.state !== "idle") continue;
      if (hole.radius < obj.need) continue;
      const d2 = distance2(hole.x, hole.z, obj.x, obj.z);
      if (d2 > 70 * 70) continue;
      const distance = Math.sqrt(d2);
      let score = (obj.value * greed * 1.1) / (distance + 9);
      if (obj.kind === "building") {
        score *= hole.radius > obj.need * 1.2 ? 1.25 : 0.65;
      }
      if (obj.kind === "person" && hole.radius < 2.4) score *= 1.4;
      if (this.isNearBiggerHole(obj.x, obj.z, hole)) score *= 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestObject = obj;
        bestHole = null;
      }
    }

    for (const other of this.holes) {
      if (other === hole || !other.alive) continue;
      if (other.radius > hole.radius * 0.82) continue;
      const d2 = distance2(hole.x, hole.z, other.x, other.z);
      if (d2 > 45 * 45) continue;
      const distance = Math.sqrt(d2);
      const score = ((other.score + 90) * 1.7) / (distance + 8);
      if (score > bestScore) {
        bestScore = score;
        bestHole = other;
        bestObject = null;
      }
    }

    ai.target = bestObject;
    ai.targetHole = bestHole;
  }

  private isNearBiggerHole(x: number, z: number, self: HoleActor): boolean {
    for (const other of this.holes) {
      if (other === self || !other.alive) continue;
      if (other.radius > self.radius * 1.2) {
        if (distance2(x, z, other.x, other.z) < (other.radius + 7) ** 2) {
          return true;
        }
      }
    }
    return false;
  }

  private captureObjects(hole: HoleActor, dt: number) {
    let capturedValue = 0;
    let capturedCount = 0;
    let largest: WorldObject | null = null;
    for (const obj of this.city.objects) {
      if (obj.state !== "idle") continue;
      if (hole.radius < obj.need) continue;
      const reach = Math.max(0.25, hole.radius - Math.min(obj.width, obj.depth) * 0.16);
      const d2 = distance2(hole.x, hole.z, obj.x, obj.z);
      if (d2 > reach * reach) continue;
      capturedValue += obj.value;
      capturedCount += 1;
      if (!largest || obj.value > largest.value) largest = obj;
      this.capture(obj, hole);
    }
    if (capturedValue <= 0) return;
    hole.score += capturedValue;
    hole.eaten += capturedCount;
    hole.radius = radiusForScore(hole.score);
    if (hole.isPlayer) {
      this.playerEaten += capturedCount;
      if (largest && largest.value >= 6) this.audio.swallow(largest.value);
      if (largest && largest.value >= 80) {
        this.shake = Math.min(0.5, this.shake + 0.22);
        this.effects.swallow(
          hole.x,
          hole.z,
          hole.color,
          Math.max(2, hole.radius * 1.6),
          largest.value >= 160,
        );
      }
      if (largest && largest.value >= 220 && this.wallTime - this.lastPlayerFeed > 1.1) {
        this.lastPlayerFeed = this.wallTime;
        this.addFeed(`Swallowed a ${largest.label} +${largest.value}`, "player");
      }
    } else if (largest && largest.value >= 200 && this.rng() < 0.25) {
      this.effects.smoke(largest.x, largest.y + 0.5, largest.z, largest.color, 6, 2);
      this.addFeed(`${hole.name} swallowed a ${largest.label}`, "rival");
    }
    void dt;
  }

  private capture(obj: WorldObject, hole: HoleActor) {
    obj.state = "falling";
    obj.fall = 0;
    obj.fallX = hole.x;
    obj.fallZ = hole.z;
    // The reference leans every swallowed prop into the drain: it arcs around
    // the rim, tumbles faster as it is pulled down, and shrinks out of sight.
    obj.fallAngle = Math.atan2(obj.z - hole.z, obj.x - hole.x);
    obj.fallRadius = Math.hypot(obj.x - hole.x, obj.z - hole.z);
    obj.fallSpin = (this.rng() - 0.5) * 5.5;
    obj.fallTilt = (this.rng() - 0.5) * 0.6;
    if (obj.windowIndices.length > 0) this.city.hideWindows();
    if (hole.isPlayer) {
      this.effects.smoke(obj.x, obj.y + 0.25, obj.z, obj.color, 3, 1.6, 1.4);
    } else if (obj.value >= 120 && this.rng() < 0.2) {
      this.effects.smoke(obj.x, obj.y + 0.25, obj.z, obj.color, 2, 1.4, 1.2);
    }
  }

  private updateFalling(dt: number) {
    for (const obj of this.city.objects) {
      if (obj.state !== "falling") continue;
      obj.fall += dt / obj.fallDuration;
      if (obj.fall >= 1) {
        obj.state = "gone";
        obj.fall = 1;
        for (const part of obj.parts) part.pool.hide(part.index);
        if (obj.mesh) obj.mesh.visible = false;
        obj.respawn = obj.respawnable ? obj.respawnDelay : 0;
        continue;
      }
      const t = obj.fall;
      const pull = easeIn(t);
      const holeX = obj.fallX ?? obj.x;
      const holeZ = obj.fallZ ?? obj.z;
      if (obj.fallRadius !== undefined) {
        const radius = obj.fallRadius * (1 - pull);
        const angle =
          (obj.fallAngle ?? 0) + pull * (Math.PI * 1.15 + Math.abs(obj.fallSpin ?? 0) * 0.12);
        obj.x = holeX + Math.cos(angle) * radius;
        obj.z = holeZ + Math.sin(angle) * radius;
      }
      const drop = pull * (obj.height + 5.5);
      const scale = Math.max(0.035, 1 - pull * 0.95);
      const spin = (obj.fallSpin ?? 2.4) * t + t * 4.2;
      const tilt = (obj.fallTilt ?? 0.35) * t + t * 0.35;
      writeObject(obj, drop, spin, scale, tilt);
    }
  }

  private updateRespawns(dt: number) {
    if (this.phase !== "playing" || this.role === "online-guest") return;
    for (const obj of this.city.objects) {
      if (obj.state !== "gone" || !obj.respawnable) continue;
      obj.respawn -= dt;
      if (obj.respawn > 0) continue;
      if (!this.isSpotClear(obj.homeX, obj.homeZ, obj.width)) {
        obj.respawn = 0.8;
        continue;
      }
      obj.state = "idle";
      obj.fall = 0;
      if (obj.motion?.kind === "car" || obj.kind === "car" || obj.kind === "bus") {
        if (obj.respawnable) this.city.respawnCar(obj);
      } else if (obj.kind === "person") {
        this.city.respawnPerson(obj);
      } else {
        obj.x = obj.homeX;
        obj.y = obj.homeY;
        obj.z = obj.homeZ;
      }
      if (obj.windowIndices.length > 0) this.city.showWindows();
      writeObject(obj);
      if (obj.mesh) obj.mesh.visible = true;
      this.effects.burst(obj.x, obj.y + 0.4, obj.z, obj.color, 4, 2);
    }
  }

  private isSpotClear(x: number, z: number, radius: number): boolean {
    for (const hole of this.holes) {
      if (!hole.alive) continue;
      if (distance2(x, z, hole.x, hole.z) < (hole.radius + radius + 1) ** 2) {
        return false;
      }
    }
    return true;
  }

  private resolveHoleCollisions() {
    for (let i = 0; i < this.holes.length; i += 1) {
      const a = this.holes[i];
      if (!a.alive || a.spawnGuard > 0) continue;
      for (let j = i + 1; j < this.holes.length; j += 1) {
        const b = this.holes[j];
        if (!b.alive || b.spawnGuard > 0) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const distance = Math.hypot(dx, dz);
        const big = a.radius >= b.radius ? a : b;
        const small = big === a ? b : a;
        if (distance < big.radius * 0.82 && big.radius > small.radius * 1.16) {
          this.eatHole(big, small);
          continue;
        }
        const overlap = (a.radius + b.radius) * 0.42;
        if (distance < overlap && distance > 0.001) {
          const push = (overlap - distance) * 0.5;
          const nx = dx / distance;
          const nz = dz / distance;
          a.x -= nx * push;
          a.z -= nz * push;
          b.x += nx * push;
          b.z += nz * push;
        }
      }
    }
  }

  private eatHole(big: HoleActor, small: HoleActor) {
    small.alive = false;
    small.collapse = HOLE_COLLAPSE_SECONDS;
    small.respawnIn = 5;
    small.vx = 0;
    small.vz = 0;
    small.eatenBy = big.id;
    big.eatenHoles += 1;
    big.score += Math.round(small.score * 0.5 + 100);
    big.radius = radiusForScore(big.score);
    this.effects.swallow(
      small.x,
      small.z,
      small.color,
      Math.max(3, big.radius * 1.5),
      true,
    );
    this.effects.swirl(small.x, small.z, big.color, Math.max(2.5, big.radius));
    if (big.isPlayer) {
      this.botsEaten += 1;
      this.shake = Math.min(0.6, this.shake + 0.45);
      this.addFeed(`You swallowed ${small.name}`, "player");
      this.audio.holeEaten();
      this.audio.killOpponent();
    } else if (small.isPlayer) {
      this.swallowedBy = big.name;
      this.playerEaten += 1;
      this.addFeed(`${big.name} swallowed you`, "danger");
      this.audio.bigEat();
      // The reference camera dives into the winning hole and fades out while
      // the swallowed hole collapses, then the death/results screen appears.
      this.fallDive = {
        x: small.x,
        z: small.z,
        radius: Math.max(3, small.radius),
        time: 0,
        duration: FALL_CAMERA_SECONDS,
        fromX: this.camera.position.x,
        fromY: this.camera.position.y,
        fromZ: this.camera.position.z,
      };
      // Solo runs are over the moment the player is eaten. Online holes come
      // back like every other seat so the match keeps its full two minutes.
      if (this.role === "local") this.finishTimer = FALL_CAMERA_SECONDS + 0.18;
      this.shake = 0.7;
    } else {
      this.audio.holeEaten();
      this.addFeed(`${big.name} swallowed ${small.name}`, "rival");
    }
  }

  private respawnBot(hole: HoleActor) {
    const points = this.spawnPoints();
    const player = this.holes.find((entry) => entry.isPlayer);
    let choice = points[Math.floor(this.rng() * points.length)];
    for (const point of points) {
      if (
        !player ||
        !player.alive ||
        distance2(point.x, point.z, player.x, player.z) > 38 * 38
      ) {
        choice = point;
        break;
      }
    }
    hole.x = choice.x;
    hole.z = choice.z;
    hole.score = Math.floor(hole.score * 0.52);
    hole.radius = radiusForScore(hole.score);
    hole.alive = true;
    hole.collapse = 0;
    hole.spawnGuard = 1.4;
    hole.respawnIn = 0;
    hole.eatenBy = null;
    hole.vx = 0;
    hole.vz = 0;
    if (hole.isPlayer) {
      this.swallowedBy = null;
      this.fallDive = null;
      this.snapCamera = true;
      this.camera.fov = this.camera.aspect < 0.9 ? 58 : 50;
      this.camera.updateProjectionMatrix();
    }
    if (hole.ai) {
      hole.ai.target = null;
      hole.ai.targetHole = null;
      hole.ai.cooldown = 0.4;
    }
    this.audio.respawn();
    this.effects.ring(hole.x, hole.z, hole.color, hole.radius * 1.8);
    this.effects.burst(hole.x, 0.5, hole.z, hole.color, 10, 4);
  }

  /** Plays the reference size-up sting the moment the hole crosses a tier. */
  private syncPlayerTier(hole: HoleActor) {
    const index = tierForRadius(hole.radius).index;
    if (index <= this.playerTier) return;
    if (this.playerTier >= 0) {
      this.audio.sizeUp();
      this.effects.swallow(hole.x, hole.z, hole.color, hole.radius * 1.35, true);
    }
    this.playerTier = index;
  }

  private updateHoleVisual(hole: HoleActor, dt: number) {
    const visible =
      (this.phase !== "menu" && this.phase !== "boot") &&
      (hole.alive || hole.collapse > 0);
    hole.group.visible = visible;
    hole.label.visible = visible && (hole.alive || hole.collapse > 0.25);
    if (!visible) return;

    let scale = hole.radius;
    if (!hole.alive) {
      const t = Math.max(0, hole.collapse) / HOLE_COLLAPSE_SECONDS;
      scale = Math.max(0.001, hole.radius * t);
    }
    hole.group.position.set(hole.x, 0, hole.z);
    hole.group.scale.setScalar(scale);
    hole.discUniforms.uTime.value += dt;
    (hole.swirl.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.sin(this.elapsed * 2.2 + hole.x) * 0.06;
    hole.swirl.rotation.z += dt * 0.75;

    if (hole.label.visible) {
      const labelScale = 0.78 + Math.min(1.1, hole.radius * 0.085);
      hole.label.scale.set(4.8 * labelScale, 1.2 * labelScale, 1);
      hole.label.position.set(
        hole.x,
        2.2 + Math.max(1.5, hole.radius * 0.62),
        hole.z,
      );
      hole.labelMaterial.opacity = hole.alive
        ? 1
        : Math.max(0, hole.collapse / HOLE_COLLAPSE_SECONDS);
    }
  }

  private setHolesVisible(visible: boolean) {
    for (const hole of this.holes) {
      hole.group.visible = visible;
      hole.label.visible = visible;
    }
  }

  private finishMatch() {
    if (this.phase === "finished") return;
    this.phase = "finished";
    this.finishTimer = -1;
    this.holes.sort((a, b) => b.score - a.score);
    const top = this.holes[0];
    this.winnerName = top ? top.name : null;
    const player = this.holes.find((hole) => hole.isPlayer);
    if (player && player.score > this.best) {
      this.best = Math.floor(player.score);
      try {
        window.localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        // private mode still plays.
      }
    }
    this.audio.setMoving(false);
    this.audio.finish(Boolean(player && top === player && player.alive));
    this.publish();
  }

  // ------------------------------------------------------------------ camera

  /**
   * Hole Arena's MoveCameraIntoHole: the camera spirals from its follow offset
   * into the winning hole while the FOV opens up and the screen drops to black.
   */
  private updateFallCamera() {
    const dive = this.fallDive;
    if (!dive) return;
    const t = Math.min(1, dive.time / dive.duration);
    const e = t * t * (3 - 2 * t);
    const startRadius = Math.max(
      2, Math.hypot(dive.fromX - dive.x, dive.fromZ - dive.z),
    );
    const startAngle = Math.atan2(dive.fromZ - dive.z, dive.fromX - dive.x);
    const radius = startRadius * (1 - e * e);
    const angle = startAngle + e * Math.PI * 1.45;
    this.camera.position.set(
      dive.x + Math.cos(angle) * radius,
      dive.fromY + (-2.4 - dive.fromY) * e * e,
      dive.z + Math.sin(angle) * radius,
    );
    this.camera.lookAt(dive.x, -3 * e, dive.z);
    this.camera.fov = (this.camera.aspect < 0.9 ? 58 : 50) + e * 26;
    this.camera.updateProjectionMatrix();
  }

  private updateCamera(dt: number) {
    if (this.fallDive) {
      this.updateFallCamera();
      return;
    }
    const baseFov = this.camera.aspect < 0.9 ? 58 : 50;
    if (Math.abs(this.camera.fov - baseFov) > 0.01) {
      this.camera.fov = baseFov;
      this.camera.updateProjectionMatrix();
    }
    if (this.phase === "menu" || this.phase === "boot") {
      this.cameraAngle += dt * 0.045;
      const { minX, maxX, minZ, maxZ } = this.city.bounds;
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      const target = new THREE.Vector3(
        cx + Math.cos(this.cameraAngle) * 140,
        150 + Math.sin(this.cameraAngle * 1.7) * 5,
        cz + Math.sin(this.cameraAngle) * 140,
      );
      this.camera.position.lerp(target, 1 - Math.exp(-dt * 1.4));
      this.camera.lookAt(cx, 0, cz);
      this.lightTarget.position.set(cx, 0, cz);
      this.light.position.set(cx + 70, 105, cz + 45);
      return;
    }

    const player = this.holes.find((hole) => hole.isPlayer);
    const winner = [...this.holes].sort((a, b) => b.score - a.score)[0];
    const focus =
      player && player.alive
        ? player
        : this.phase === "finished" && winner
          ? winner
          : player ?? winner;
    if (!focus) return;
    const portrait = this.camera.aspect < 1;
    const back = (19 + focus.radius * 1.7) * (portrait ? 1.12 : 1);
    const height = (34 + focus.radius * 2.2) * (portrait ? 1.08 : 1);
    const desired = new THREE.Vector3(focus.x, height, focus.z + back);
    if (this.snapCamera) {
      this.camera.position.copy(desired);
      this.snapCamera = false;
    } else {
      this.camera.position.x = damp(this.camera.position.x, desired.x, 4.2, dt);
      this.camera.position.y = damp(this.camera.position.y, desired.y, 4.2, dt);
      this.camera.position.z = damp(this.camera.position.z, desired.z, 4.2, dt);
    }
    if (this.shake > 0.001) {
      const amount = this.shake * 0.55;
      this.camera.position.x += (this.rng() - 0.5) * amount;
      this.camera.position.y += (this.rng() - 0.5) * amount * 0.5;
      this.camera.position.z += (this.rng() - 0.5) * amount;
    }
    this.camera.lookAt(
      focus.x + focus.vx * 0.18,
      0,
      focus.z + focus.vz * 0.18,
    );

    this.lightTarget.position.set(focus.x, 0, focus.z);
    this.light.position.set(focus.x + 70, 105, focus.z + 45);
  }

  // ---------------------------------------------------------------- snapshot

  private publishIfDue() {
    if (this.elapsed - this.lastSnapshot >= 0.1) {
      this.publish();
    }
  }

  private publish() {
    this.lastSnapshot = this.elapsed;
    const ranked = [...this.holes].sort((a, b) => b.score - a.score);
    const player = this.holes.find((hole) => hole.isPlayer);
    const tier = tierForRadius(player?.radius ?? START_RADIUS);
    const holes: HoleSnapshot[] = ranked.map((hole, index) => ({
      id: hole.id,
      name: hole.name,
      color: hole.color,
      isPlayer: hole.isPlayer,
      x: hole.x,
      z: hole.z,
      radius: hole.radius,
      score: Math.round(hole.score),
      rank: index + 1,
      alive: hole.alive,
      respawnIn: Math.max(0, hole.respawnIn),
      eaten: hole.eaten,
    }));

    const feed = this.feed
      .filter((item) => item.expires > this.wallTime)
      .slice(-4)
      .map(({ id, text, tone }) => ({ id, text, tone }));

    const snapshot: GameSnapshot = {
      phase: this.phase,
      timeLeft: this.timeLeft,
      countdown: this.countdownValue(),
      holes,
      playerScore: Math.round(player?.score ?? 0),
      playerRank: player ? ranked.indexOf(player) + 1 : holes.length,
      playerRadius: player?.radius ?? START_RADIUS,
      playerAlive: player?.alive ?? false,
      playerEaten: Math.round(player?.eaten ?? this.playerEaten),
      botsEaten: this.botsEaten,
      bestScore: this.best,
      winnerName: this.winnerName,
      swallowedBy: this.swallowedBy,
      feed,
      muted: this.muted,
      matchSeconds: this.matchSeconds,
      fps: Math.round(this.fps),
      tierLabel: tier.label,
      tierProgress: tier.progress,
      totalRivals: Math.max(0, holes.length - 1),
      fallProgress: this.fallDive
        ? Math.min(1, this.fallDive.time / this.fallDive.duration)
        : 0,
    };
    this.options.onSnapshot(snapshot);
    this.publishMatch();
  }

  private addFeed(text: string, tone: FeedItem["tone"]) {
    this.feed.push({
      id: Math.floor(this.wallTime * 1000) + Math.floor(this.rng() * 999),
      text,
      tone,
      expires: this.wallTime + 4.2,
    });
    if (this.feed.length > 12) this.feed.splice(0, this.feed.length - 12);
  }

  private updateFeed() {
    for (let i = this.feed.length - 1; i >= 0; i -= 1) {
      if (this.feed[i].expires < this.wallTime - 2) this.feed.splice(i, 1);
    }
  }

  private readBest(): number {
    if (typeof window === "undefined") return 0;
    try {
      const raw = window.localStorage.getItem(BEST_KEY);
      return raw ? Number(raw) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private disposeHole(hole: HoleActor) {
    this.scene.remove(hole.group);
    this.scene.remove(hole.label);
    hole.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      }
    });
    hole.labelMaterial.map?.dispose();
    hole.labelMaterial.dispose();
  }
}
