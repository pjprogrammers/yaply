import * as THREE from "three";
import { buildArena, groundHeightAt, type ArenaWorld } from "./world";
import { buildKart, disposeObject, type KartVisual } from "./kart-mesh";
import { buildPickup, type PickupVisual } from "./pickup-mesh";
import { GameAudio } from "./audio";
import { GameInput, isNewerInputSequence } from "./input";
import { ParticleField } from "./particles";
import { createSparkTexture, createSmokeTexture, cssToHex, paintHealthBar } from "./assets";
import { BOT_COLORS, BOT_NAMES, KART, OBSTACLE_RULES, PICKUP_POOL, WEAPONS } from "./constants";
import { ARENA_STANDARD, pointInHazard } from "./arena-spec";
import { getMap } from "./maps";
import type { GameStore } from "./store";
import type {
  BotBrain,
  EngineMode,
  GameOptions,
  GameSnapshot,
  KartSnapshot,
  MapDef,
  OnlinePlayer,
  PickupSnapshot,
  ProjectileKind,
  VehicleInput,
  WeaponId,
  WeaponSlot,
} from "./types";
import type {
  SmashInput,
  SmashKartSnapshot,
  SmashMatchSnapshot,
  SmashWinner,
} from "@yaply/shared/types";

interface KartActor {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  visual: KartVisual;
  x: number;
  z: number;
  y: number;
  yaw: number;
  /** Guest replication target, smoothed by the renderer between snapshots. */
  netX: number;
  netZ: number;
  netY: number;
  netYaw: number;
  vx: number;
  vz: number;
  vy: number;
  grounded: boolean;
  boostPadCooldown: number;
  speed: number;
  hp: number;
  weapon: WeaponSlot;
  ammo: number;
  cooldown: number;
  shieldTime: number;
  boostTime: number;
  slowTime: number;
  spikeTime: number;
  ramCooldown: number;
  burstLeft: number;
  invuln: number;
  respawnIn: number;
  alive: boolean;
  kills: number;
  deaths: number;
  shots: number;
  hits: number;
  input: VehicleInput;
  prevFire: boolean;
  firePressed: boolean;
  drifting: boolean;
  driftCharge: number;
  wheelSpin: number;
  bodyRoll: number;
  ai: BotBrain | null;
}

interface Projectile {
  id: number;
  ownerId: string;
  kind: ProjectileKind;
  weapon: WeaponId;
  origin: THREE.Vector3;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
  life: number;
  damage: number;
  splash: number;
  gravity: number;
  fuse: number;
  landed: boolean;
  radius: number;
  targetId: string | null;
  mesh: THREE.Object3D;
  /** Guest-only targets copied from the latest host snapshot. */
  netPosition: THREE.Vector3 | null;
  netVelocity: THREE.Vector3 | null;
}

interface TrapActor {
  id: number;
  ownerId: string;
  kind: "mine" | "fake";
  x: number;
  y: number;
  z: number;
  arm: number;
  life: number;
  phase: number;
  mesh: THREE.Group;
  lamp: THREE.Mesh | null;
  pickup: PickupVisual | null;
}

interface PickupActor {
  id: number;
  x: number;
  y: number;
  z: number;
  active: boolean;
  timer: number;
  phase: number;
  visual: PickupVisual;
}

interface Shockwave {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  radius: number;
}

const STEP = 1 / 60;
const PLAYER_ID = "player";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function damp(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function dampAngle(current: number, target: number, rate: number, dt: number): number {
  return wrapAngle(current + wrapAngle(target - current) * (1 - Math.exp(-rate * dt)));
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const PROJECTILE_WEAPONS: Record<ProjectileKind, WeaponId> = {
  tracer: "machinegun",
  bullet: "bullets",
  rocket: "rockets",
  cannonball: "cannonballs",
  nuke: "nuke",
  grenuke: "grenuke",
  snowball: "snowball",
};

export class GameEngine {
  private readonly container: HTMLElement;
  private readonly store: GameStore;
  private readonly options: GameOptions;
  private readonly arenaMap: MapDef;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: ArenaWorld;
  private readonly audio: GameAudio;
  private readonly sparkTexture: THREE.Texture;
  private readonly smokeTexture: THREE.Texture;
  private readonly pickupGlowTexture: THREE.Texture;
  private readonly sparks: ParticleField;
  private readonly smoke: ParticleField;

  private readonly karts: KartActor[] = [];
  private player!: KartActor;
  private readonly projectiles: Projectile[] = [];
  private readonly traps: TrapActor[] = [];
  private readonly pickups: PickupActor[] = [];
  private readonly shockwaves: Shockwave[] = [];
  private readonly feed: GameSnapshot["feed"] = [];
  private weaponBag: WeaponId[] = [];

  private mode: GameSnapshot["phase"] = "booting";
  private started = false;
  private disposed = false;
  private lastFrame = 0;
  private accumulator = 0;
  private elapsed = 0;
  private timeLeft: number;
  private raf = 0;
  private frames = 0;
  private fpsTimer = 0;
  private fps = 60;
  private lastPublish = 0;
  private feedId = 0;
  private projectileId = 0;
  private trapId = 0;
  private shake = 0;
  private muted: boolean;
  private readonly cameraLook = new THREE.Vector3();
  private readonly resizeObserver: ResizeObserver;
  private readonly input: GameInput;

  private readonly role: EngineMode;
  private readonly localPlayerId: string;
  private readonly round: number;
  private readonly onlineRoster = new Map<string, OnlinePlayer>();
  private readonly remoteInputs = new Map<string, VehicleInput>();
  private readonly remoteInputSeq = new Map<string, number>();
  private inputSequence = Date.now();
  private lastInputSent = 0;
  private lastSentInput: SmashInput | null = null;
  private lastSnapshotSent = 0;
  private snapshotOverSent = false;
  private netMatchSeconds = 0;
  private winner: GameSnapshot["winner"] = null;
  private seededPhase: "playing" | "over" | null = null;

  constructor(container: HTMLElement, options: GameOptions, store: GameStore) {
    this.container = container;
    this.store = store;
    this.options = options;
    this.role = options.mode ?? "local";
    this.localPlayerId = options.localPlayerId ?? PLAYER_ID;
    this.round = options.round ?? 1;
    for (const player of options.roster ?? []) {
      this.onlineRoster.set(player.id, player);
    }
    this.arenaMap = getMap(options.mapId);
    this.muted = store.getSnapshot().muted;
    this.timeLeft = options.duration;

    // Phones and small tablets get the same arena with a lighter render path:
    // no MSAA or shadow pass, a capped pixel ratio and fewer particles.
    const lowPower =
      window.matchMedia("(pointer: coarse)").matches ||
      Math.min(window.innerWidth, window.innerHeight) < 768;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !lowPower,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
    this.renderer.shadowMap.enabled = !lowPower;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.renderer.domElement.className = "game-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Smash Karts arena");
    this.renderer.domElement.tabIndex = 0;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(
      this.arenaMap.theme.fog,
      this.arenaMap.theme.fogNear,
      this.arenaMap.theme.fogFar,
    );
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.1, 620);

    this.world = buildArena(this.arenaMap);
    this.scene.add(this.world.group);

    this.sparkTexture = createSparkTexture();
    this.smokeTexture = createSmokeTexture();
    this.pickupGlowTexture = createSparkTexture();
    this.sparks = new ParticleField(
      this.scene,
      this.sparkTexture,
      THREE.AdditiveBlending,
      lowPower ? 320 : 520,
    );
    this.smoke = new ParticleField(
      this.scene,
      this.smokeTexture,
      THREE.NormalBlending,
      lowPower ? 220 : 380,
    );

    this.audio = new GameAudio(this.muted);
    this.input = new GameInput({ onActivity: () => this.audio.unlock() });

    this.buildKarts();
    this.buildPickups();
    this.placeAtSpawns();
    if (options.seedSnapshot && options.seedSnapshot.round === this.round) {
      if (this.role === "online-host") {
        this.applySeedSnapshot(options.seedSnapshot);
      } else if (this.role === "online-guest") {
        this.applyRemoteSnapshot(options.seedSnapshot, true);
      }
      this.seededPhase = options.seedSnapshot.phase;
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.setupInput();

    document.addEventListener("visibilitychange", this.onVisibility);
    this.publish();
  }

  start() {
    if (this.started || this.disposed) {
      return;
    }
    this.started = true;
    this.mode = this.seededPhase === "over" ? "over" : "playing";
    if (this.mode === "playing") this.winner = null;
    this.audio.unlock();
    this.store.set({ phase: this.mode, timeLeft: this.timeLeft, winner: this.winner });
    this.snapCamera();
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.publish();
  }

  pause() {
    // Online matches cannot be frozen by one client: the host keeps the
    // simulation authoritative and guests would desync behind a local pause.
    if (this.role !== "local" || this.mode !== "playing") {
      return;
    }
    this.mode = "paused";
    this.clearInput();
    this.audio.setEngine(0, false, false, false);
    this.store.set({ phase: "paused" });
    this.publish();
  }

  resume() {
    if (this.role !== "local" || this.mode !== "paused") {
      return;
    }
    this.mode = "playing";
    this.audio.unlock();
    this.lastFrame = performance.now();
    this.store.set({ phase: "playing" });
    this.publish();
  }

  togglePause() {
    if (this.role !== "local") {
      return;
    }
    if (this.mode === "playing") {
      this.pause();
    } else if (this.mode === "paused") {
      this.resume();
    }
  }

  setMuted(value: boolean) {
    this.muted = value;
    this.audio.setMuted(value);
    try {
      window.localStorage.setItem("smashkarts:muted", value ? "1" : "0");
    } catch {
      // storage can be unavailable in private mode
    }
    this.store.set({ muted: value });
    this.publish();
  }

  toggleMute() {
    this.setMuted(!this.muted);
  }

  /**
   * Screen-space movement from the on-screen joystick. `steer` is +1 for right
   * and `throttle` is +1 for forward, both in the -1..1 range.
   */
  setTouchMovement(steer: number, throttle: number) {
    this.input.setStick(steer, throttle);
  }

  /** Screen-space movement from the optional steering/throttle pedals. */
  setTouchPedals(steer: number, throttle: number) {
    this.input.setPedals(steer, throttle);
  }

  /** Held state of the on-screen weapon circle. */
  setTouchFire(firing: boolean) {
    this.input.setFire(firing);
  }

  /**
   * Guarantees at least one simulation tick sees the trigger, even when a tap
   * starts and ends between two animation frames.
   */
  pulseFire() {
    this.input.pulseFire();
  }

  /** Releases the on-screen controls, e.g. when the HUD unmounts. */
  clearTouchInput() {
    this.input.clearTouch();
  }

  /** Lets the HUD freeze driving while its menu drawer is open. */
  setInputEnabled(enabled: boolean) {
    this.input.setEnabled(enabled);
  }

  /** Drops every held control. Used on pause, blur, tab hide and match end. */
  private clearInput() {
    this.input.clear();
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.resizeObserver.disconnect();
    this.removeInput();
    this.audio.dispose();
    this.sparks.dispose();
    this.smoke.dispose();
    disposeObject(this.scene);
    this.sparkTexture.dispose();
    this.smokeTexture.dispose();
    this.pickupGlowTexture.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private onVisibility = () => {
    if (!document.hidden) {
      return;
    }
    if (this.role === "local" && this.mode === "playing") {
      this.pause();
      return;
    }
    // Online play must keep running, but a hidden tab should never hold the
    // throttle open after the player stops looking at the game.
    this.clearInput();
  };

  private resize() {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();    this.sparks.setViewport(height * this.renderer.getPixelRatio(), this.camera.fov);
    this.smoke.setViewport(height * this.renderer.getPixelRatio(), this.camera.fov);
  }

  private setupInput() {
    this.input.attach();
    // Touch and mouse fire live on the HUD controls, not the canvas, so taps
    // used to look around or interact with the page never fire a weapon.
    this.renderer.domElement.addEventListener("contextmenu", this.preventContext);
  }

  private removeInput() {
    this.input.detach();
    this.renderer.domElement.removeEventListener("contextmenu", this.preventContext);
  }

  private preventContext = (event: Event) => {
    event.preventDefault();
  };

  private buildKarts() {
    if (this.role !== "local") {
      const roster = [...this.onlineRoster.values()];
      if (!roster.some((entry) => entry.id === this.localPlayerId)) {
        roster.unshift({
          id: this.localPlayerId,
          name: this.options.playerName || "Driver",
          color: this.options.color,
          connected: true,
        });
        this.onlineRoster.set(this.localPlayerId, roster[0]);
      }

      for (const entry of roster) {
        if (this.karts.some((kart) => kart.id === entry.id)) continue;
        this.karts.push(
          this.createKart(entry.id, entry.name, entry.color, entry.id === this.localPlayerId, null),
        );
      }

      this.player =
        this.karts.find((kart) => kart.id === this.localPlayerId) ?? this.karts[0];
      if (!this.player) {
        this.player = this.createKart(
          this.localPlayerId,
          this.options.playerName || "Driver",
          this.options.color,
          true,
          null,
        );
        this.karts.push(this.player);
      }
      return;
    }

    const bots = shuffle(BOT_NAMES).slice(0, Math.max(0, Math.min(7, this.options.botCount)));
    const botColors = shuffle([...BOT_COLORS]);

    this.player = this.createKart(
      PLAYER_ID,
      this.options.playerName || "Driver",
      this.options.color,
      true,
      null,
    );
    this.karts.push(this.player);

    bots.forEach((name, index) => {
      const color = botColors[index % botColors.length];
      const brain: BotBrain = {
        targetId: null,
        retargetIn: Math.random() * 0.5,
        fireIn: Math.random() * 0.6,
        jitter: Math.random(),
        waypoint: Math.floor(Math.random() * this.arenaMap.waypoints.length),
        route: index % this.arenaMap.routes.length,
        routePoint: Math.floor(
          Math.random() * this.arenaMap.routes[index % this.arenaMap.routes.length].waypoints.length,
        ),
        wander: false,
        skill: 0.55 + Math.random() * 0.4,
      };
      this.karts.push(this.createKart(`bot-${index + 1}`, name, color, false, brain));
    });
  }

  private createKart(
    id: string,
    name: string,
    color: string,
    isPlayer: boolean,
    ai: BotBrain | null,
  ): KartActor {
    const visual = buildKart(name, color, "#ffc233");
    visual.tag.visible = !isPlayer;
    this.scene.add(visual.group);

    return {
      id,
      name,
      color,
      isPlayer,
      visual,
      x: 0,
      z: 0,
      y: 0,
      yaw: 0,
      netX: 0,
      netZ: 0,
      netY: 0,
      netYaw: 0,
      vx: 0,
      vz: 0,
      vy: 0,
      grounded: true,
      boostPadCooldown: 0,
      speed: 0,
      hp: KART.hp,
      weapon: "none",
      ammo: 0,
      cooldown: 0,
      shieldTime: 0,
      boostTime: 0,
      slowTime: 0,
      spikeTime: 0,
      ramCooldown: 0,
      burstLeft: 0,
      invuln: 0,
      respawnIn: 0,
      alive: true,
      kills: 0,
      deaths: 0,
      shots: 0,
      hits: 0,
      input: { throttle: 0, steer: 0, drift: false, fire: false },
      prevFire: false,
      firePressed: false,
      drifting: false,
      driftCharge: 0,
      wheelSpin: 0,
      bodyRoll: 0,
      ai,
    };
  }

  private buildPickups() {
    this.arenaMap.pickups.forEach(([x, z], index) => {
      const y = groundHeightAt(this.arenaMap, x, z, 0);
      const visual = buildPickup(this.pickupGlowTexture);
      visual.group.position.set(x, y, z);
      this.scene.add(visual.group);
      this.pickups.push({
        id: index + 1,
        x,
        y,
        z,
        active: true,
        timer: 0,
        phase: Math.random() * Math.PI * 2,
        visual,
      });
    });
  }

  /** Draws from a shuffled weighted bag so box contents stay unpredictable. */
  private drawWeapon(): WeaponId {
    if (this.weaponBag.length === 0) {
      this.weaponBag = shuffle(PICKUP_POOL);
    }
    return this.weaponBag.pop() ?? "machinegun";
  }

  private placeAtSpawns() {
    const spawns = shuffle(this.arenaMap.spawns);
    const limitX = this.arenaMap.size / 2 - 3;
    const limitZ = this.arenaMap.depth / 2 - 3;
    this.karts.forEach((kart, index) => {
      const spawn = spawns[index % spawns.length];
      const lap = Math.floor(index / spawns.length);
      let x = spawn[0];
      let z = spawn[1];
      if (lap > 0) {
        // Maps have eight grid slots. Online rooms can hold up to 40, so fan
        // extra karts out in rings instead of stacking them on one spawn.
        const radius = 2.6 * lap;
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const angle = index * 2.399963 + attempt * 0.7;
          const candidateX = clamp(spawn[0] + Math.cos(angle) * radius, -limitX, limitX);
          const candidateZ = clamp(spawn[1] + Math.sin(angle) * radius, -limitZ, limitZ);
          if (!this.pointBlocked(candidateX, candidateZ, KART.radius + 0.6)) {
            x = candidateX;
            z = candidateZ;
            break;
          }
        }
      }
      this.spawnAt(kart, x, z);
    });
  }

  private spawnAt(kart: KartActor, x: number, z: number) {
    kart.x = x;
    kart.z = z;
    kart.y = groundHeightAt(this.arenaMap, x, z, 0);
    kart.yaw = Math.atan2(-x, -z);
    kart.netX = kart.x;
    kart.netZ = kart.z;
    kart.netY = kart.y;
    kart.netYaw = kart.yaw;
    kart.vx = 0;
    kart.vz = 0;
    kart.vy = 0;
    kart.grounded = true;
    kart.boostPadCooldown = 0;
    kart.speed = 0;
    kart.hp = KART.hp;
    kart.weapon = "none";
    kart.ammo = 0;
    kart.cooldown = 0;
    kart.shieldTime = 0;
    kart.boostTime = 0;
    kart.slowTime = 0;
    kart.spikeTime = 0;
    kart.ramCooldown = 0;
    kart.burstLeft = 0;
    kart.invuln = KART.spawnProtection;
    kart.alive = true;
    kart.drifting = false;
    kart.driftCharge = 0;
    kart.visual.group.visible = true;
    kart.visual.group.position.set(x, kart.y, z);
    kart.visual.group.rotation.y = kart.yaw;
    kart.visual.shield.visible = false;
    kart.visual.shieldWire.visible = false;
    kart.visual.spikes.visible = false;
    kart.visual.tag.visible = !kart.isPlayer;
    paintHealthBar(kart.visual.healthTexture, 1);
  }

  private frame = (now: number) => {
    if (this.disposed) {
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
    const raw = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    const dt = clamp(raw, 0, 0.05);
    this.input.sample(dt);

    this.frames += 1;
    this.fpsTimer += raw;
    if (this.fpsTimer > 0.6) {
      this.fps = Math.round(this.frames / this.fpsTimer);
      this.frames = 0;
      this.fpsTimer = 0;
    }

    if (this.mode === "playing") {
      if (this.role === "online-guest") {
        // Guests render the host's authoritative frames. Input is still read
        // locally so steering feels immediate, but the host applies movement.
        this.elapsed += dt;
        this.updatePlayerInput();
        this.sendGuestInput(now);
      } else {
        this.accumulator += dt;
        let guard = 0;
        while (this.accumulator >= STEP && guard < 5) {
          this.step(STEP);
          this.accumulator -= STEP;
          guard += 1;
        }
      }
    }

    this.world.animate(now / 1000, dt);
    this.sparks.update(dt);
    this.smoke.update(dt);
    if (this.role === "online-guest") {
      this.interpolateGuestProjectiles(dt);
    }
    this.updateVisuals(dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);

    if (now - this.lastPublish > 90) {
      this.lastPublish = now;
      this.publish();
      this.emitSnapshot(now);
    }
  };

  private step(dt: number) {
    this.elapsed += dt;
    this.timeLeft = Math.max(0, this.timeLeft - dt);

    this.updatePlayerInput();
    for (const kart of this.karts) {
      if (!kart.alive) {
        this.updateTimers(kart, dt);
        continue;
      }
      if (kart.ai) {
        this.updateBot(kart, dt);
      }
      this.firePressedFor(kart);
      this.updateTimers(kart, dt);
      this.driveKart(kart, dt);
      this.resolveWorldCollision(kart);
      this.checkHazards(kart);
      this.collectPickups(kart);
      this.tryFire(kart);
    }

    this.resolveKartCollisions();
    this.resolveContactWeapons();
    this.updateProjectiles(dt);
    this.updateTraps(dt);
    this.updatePickups(dt);
    this.updateShockwaves(dt);

    if (this.timeLeft <= 0) {
      this.endMatch();
    }
  }

  private updatePlayerInput() {
    if (!this.player.alive) {
      this.player.input.throttle = 0;
      this.player.input.steer = 0;
      this.player.input.drift = false;
      this.player.input.fire = false;
      return;
    }
    const controls = this.input.read();
    this.player.input.throttle = controls.throttle;
    // Joystick, pedals, gamepad and keyboard are all screen-space: +1 means
    // right. The kart simulation uses the opposite sign (positive steer turns
    // left in world space), so invert exactly once here. Bots keep their
    // world-space input.
    this.player.input.steer = -controls.steer;
    // Drift is automatic: a hard turn at speed charges the mini-turbo, so the
    // whole game needs only movement and fire.
    this.player.input.drift =
      Math.abs(this.player.input.steer) > 0.55 && Math.abs(this.player.speed) > 7;
    this.player.input.fire = controls.fire;
  }

  private sendGuestInput(now: number) {
    if (this.role !== "online-guest" || !this.options.onInput) return;
    const input: SmashInput = this.player.alive
      ? {
          throttle: this.player.input.throttle,
          steer: this.player.input.steer,
          drift: this.player.input.drift,
          fire: this.player.input.fire,
        }
      : { throttle: 0, steer: 0, drift: false, fire: false };

    const previous = this.lastSentInput;
    const changed =
      !previous ||
      previous.throttle !== input.throttle ||
      previous.steer !== input.steer ||
      previous.drift !== input.drift ||
      previous.fire !== input.fire;
    // Send on every edge immediately so a quick trigger tap is not lost, then
    // keep a 50 ms heartbeat so the host cannot hold stale controls.
    if (!changed && now - this.lastInputSent < 50) return;
    this.lastInputSent = now;
    this.inputSequence += 1;
    const packet: SmashInput = { ...input, seq: this.inputSequence };
    this.lastSentInput = packet;
    this.options.onInput(packet);
  }

  /** Applies a guest's controls to its kart on the authoritative host. */
  setRemoteInput(playerId: string, input: SmashInput) {
    if (this.role !== "online-host" || playerId === this.localPlayerId) return;
    const kart = this.karts.find((entry) => entry.id === playerId);
    if (!kart) return;
    const previousSeq = this.remoteInputSeq.get(playerId);
    if (!isNewerInputSequence(previousSeq, input.seq)) return;
    if (input.seq !== undefined) {
      this.remoteInputSeq.set(playerId, input.seq);
    }
    const next: VehicleInput = {
      throttle: input.throttle,
      steer: input.steer,
      drift: input.drift,
      fire: input.fire,
    };
    this.remoteInputs.set(playerId, next);
    kart.input = next;
  }

  /**
   * Adds, updates and removes online karts as players join or leave. Called
   * from the room snapshot, so it also works for mid-match joins.
   */
  syncRoster(players: OnlinePlayer[]) {
    if (this.role === "local") return;
    const next = new Map(players.map((player) => [player.id, player]));
    if (!next.has(this.localPlayerId)) {
      const local =
        this.karts.find((kart) => kart.id === this.localPlayerId) ??
        this.karts.find((kart) => kart.isPlayer);
      if (local) {
        next.set(local.id, {
          id: local.id,
          name: local.name,
          color: local.color,
          connected: true,
        });
      }
    }

    for (const entry of next.values()) {
      this.onlineRoster.set(entry.id, entry);
      const existing = this.karts.find((kart) => kart.id === entry.id);
      if (existing) {
        existing.name = entry.name;
        existing.color = entry.color;
        if (!entry.connected) {
          this.remoteInputs.set(entry.id, {
            throttle: 0,
            steer: 0,
            drift: false,
            fire: false,
          });
          if (entry.id !== this.localPlayerId) {
            existing.input = { throttle: 0, steer: 0, drift: false, fire: false };
          }
        }
        continue;
      }

      const [x, z] = this.findOpenSpawn();
      const kart = this.createKart(
        entry.id,
        entry.name,
        entry.color,
        entry.id === this.localPlayerId,
        null,
      );
      this.karts.push(kart);
      this.spawnAt(kart, x, z);
      if (kart.isPlayer) this.player = kart;
    }

    for (let index = this.karts.length - 1; index >= 0; index -= 1) {
      const kart = this.karts[index];
      if (next.has(kart.id)) continue;
      kart.visual.group.removeFromParent();
      disposeObject(kart.visual.group);
      this.remoteInputs.delete(kart.id);
      this.remoteInputSeq.delete(kart.id);
      this.karts.splice(index, 1);
    }

    const local = this.karts.find((kart) => kart.id === this.localPlayerId);
    if (local) this.player = local;
  }

  private findOpenSpawn(): [number, number] {
    const limitX = this.arenaMap.size / 2 - 4;
    const limitZ = this.arenaMap.depth / 2 - 4;
    const spawns = this.arenaMap.spawns;
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const spawn = spawns[attempt % spawns.length];
      const ring = Math.floor(attempt / spawns.length);
      const angle = attempt * 2.399963;
      const radius = ring === 0 ? 0 : 2.2 + ring * 1.8;
      const x = clamp(spawn[0] + Math.cos(angle) * radius, -limitX, limitX);
      const z = clamp(spawn[1] + Math.sin(angle) * radius, -limitZ, limitZ);
      if (this.pointBlocked(x, z, KART.radius + 0.7)) continue;
      const crowded = this.karts.some(
        (kart) => kart.alive && Math.hypot(kart.x - x, kart.z - z) < KART.radius * 2.2,
      );
      if (crowded) continue;
      return [x, z];
    }
    const spawn = spawns[Math.floor(Math.random() * spawns.length)];
    return [spawn[0], spawn[1]];
  }

  /** Seeds a promoted host from the last authoritative guest frame. */
  private applySeedSnapshot(snapshot: SmashMatchSnapshot) {
    if (snapshot.round !== this.round) return;
    this.timeLeft = snapshot.timeLeft;
    this.elapsed = snapshot.matchSeconds;
    this.netMatchSeconds = snapshot.matchSeconds;
    this.winner = snapshot.winner;
    this.syncFeed(snapshot);
    this.applyPickupStates(snapshot);

    for (const kartSnapshot of snapshot.karts) {
      const kart = this.ensureKart(kartSnapshot);
      this.applyNetKart(kart, kartSnapshot, true);
    }

    // Keep ids monotonic across a host transfer. Guests still hold the frames
    // they saw from the old host for a moment, so handing out an id that is
    // already on screen would merge two different objects into one visual.
    this.projectileId = snapshot.projectiles.reduce(
      (max, projectile) => Math.max(max, projectile.id),
      this.projectileId,
    );
    this.trapId = snapshot.traps.reduce((max, trap) => Math.max(max, trap.id), this.trapId);

    // Projectiles and traps are transient: dropping them avoids handing a new
    // host half-simulated explosions it never authored.
    this.clearGuestProjectiles();
    this.clearGuestTraps();
  }

  /** Applies one host frame to a guest's renderer. */
  applyRemoteSnapshot(snapshot: SmashMatchSnapshot, immediate = false) {
    if (this.role !== "online-guest" || snapshot.round !== this.round) return;

    this.timeLeft = snapshot.timeLeft;
    this.netMatchSeconds = snapshot.matchSeconds;
    this.winner = snapshot.winner;
    this.syncFeed(snapshot);
    this.applyPickupStates(snapshot);
    this.syncGuestProjectiles(snapshot);
    this.syncGuestTraps(snapshot);

    for (const kartSnapshot of snapshot.karts) {
      const kart = this.ensureKart(kartSnapshot);
      this.applyNetKart(kart, kartSnapshot, immediate);
    }

    if (snapshot.phase === "over" && this.mode !== "over") {
      this.mode = "over";
      this.clearInput();
      this.audio.setEngine(0, false, false, false);
      this.winner = snapshot.winner ?? this.bestKartWinner();
      this.store.set({ phase: "over", winner: this.winner, timeLeft: 0 });
      this.publish();
    }
  }

  private ensureKart(snapshot: SmashKartSnapshot): KartActor {
    const existing = this.karts.find((kart) => kart.id === snapshot.id);
    if (existing) return existing;

    const [x, z] = this.findOpenSpawn();
    const kart = this.createKart(
      snapshot.id,
      snapshot.name,
      snapshot.color,
      snapshot.id === this.localPlayerId,
      null,
    );
    this.karts.push(kart);
    this.spawnAt(kart, x, z);
    this.onlineRoster.set(snapshot.id, {
      id: snapshot.id,
      name: snapshot.name,
      color: snapshot.color,
      connected: true,
    });
    if (kart.isPlayer) this.player = kart;
    return kart;
  }

  private applyNetKart(kart: KartActor, snapshot: SmashKartSnapshot, immediate: boolean) {
    const wasAlive = kart.alive;
    const previousHp = kart.hp;

    kart.netX = snapshot.x;
    kart.netZ = snapshot.z;
    kart.netY = snapshot.y;
    kart.netYaw = snapshot.yaw;
    if (immediate) {
      kart.x = snapshot.x;
      kart.z = snapshot.z;
      kart.y = snapshot.y;
      kart.yaw = snapshot.yaw;
    }
    kart.hp = snapshot.hp;
    // Snapshots do not carry spawn protection. Guests never run the timer
    // that would expire it, so clear it here instead of showing a permanent
    // spawn shield around every remote kart.
    kart.invuln = 0;
    kart.shieldTime = snapshot.shield;
    kart.boostTime = snapshot.boost;
    kart.slowTime = snapshot.slow;
    kart.spikeTime = snapshot.spike;
    kart.weapon = snapshot.weapon;
    kart.ammo = snapshot.ammo;
    kart.kills = snapshot.kills;
    kart.deaths = snapshot.deaths;
    kart.shots = snapshot.shots;
    kart.hits = snapshot.hits;
    kart.alive = snapshot.alive;
    kart.respawnIn = snapshot.respawnIn;
    kart.speed = snapshot.speed;
    kart.drifting = snapshot.drifting;
    kart.driftCharge = snapshot.driftCharge;
    kart.visual.group.visible = snapshot.alive;

    if (snapshot.id === this.localPlayerId) {
      if (snapshot.alive && snapshot.hp < previousHp) {
        this.audio.hit();
        this.shake = Math.max(this.shake, 0.18);
      }
      if (wasAlive && !snapshot.alive) {
        this.audio.explosion();
        this.shake = Math.max(this.shake, 1);
      }
    }
  }

  private syncFeed(snapshot: SmashMatchSnapshot) {
    this.feed.length = 0;
    this.feed.push(...snapshot.feed.slice(0, 6));
    this.feedId = this.feed.reduce((max, entry) => Math.max(max, entry.id), this.feedId);
  }

  private applyPickupStates(snapshot: SmashMatchSnapshot) {
    for (const state of snapshot.pickups) {
      const pickup = this.pickups.find((entry) => entry.id === state.id);
      if (!pickup) continue;
      pickup.active = state.active;
      pickup.visual.group.visible = state.active;
    }
  }

  private syncGuestProjectiles(snapshot: SmashMatchSnapshot) {
    const seen = new Set<number>();
    for (const state of snapshot.projectiles) {
      seen.add(state.id);
      let projectile = this.projectiles.find((entry) => entry.id === state.id);
      if (!projectile) {
        const weapon = PROJECTILE_WEAPONS[state.kind];
        const mesh = this.buildProjectileMesh(state.kind, weapon);
        this.scene.add(mesh);
        const position = new THREE.Vector3(state.x, state.y, state.z);
        projectile = {
          id: state.id,
          ownerId: "",
          kind: state.kind,
          weapon,
          origin: position.clone(),
          position,
          velocity: new THREE.Vector3(state.vx, state.vy, state.vz),
          speed: Math.hypot(state.vx, state.vy, state.vz) || 1,
          life: 1,
          damage: 0,
          splash: 0,
          gravity: 0,
          fuse: 0,
          landed: false,
          radius: 1.6,
          targetId: null,
          mesh,
          netPosition: null,
          netVelocity: null,
        };
        this.projectiles.push(projectile);
      }
      projectile.netPosition = new THREE.Vector3(state.x, state.y, state.z);
      projectile.netVelocity = new THREE.Vector3(state.vx, state.vy, state.vz);
      // Let the frame loop ease toward the new target instead of snapping the
      // mesh on every 10 Hz frame.
      if (projectile.netVelocity.lengthSq() > 0.001) {
        projectile.mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          projectile.netVelocity.clone().normalize(),
        );
      }
    }
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      if (seen.has(projectile.id)) continue;
      projectile.mesh.removeFromParent();
      disposeObject(projectile.mesh);
      this.projectiles.splice(index, 1);
    }
  }

  private syncGuestTraps(snapshot: SmashMatchSnapshot) {
    const seen = new Set<number>();
    for (const state of snapshot.traps) {
      seen.add(state.id);
      if (this.traps.some((trap) => trap.id === state.id)) continue;
      this.traps.push(this.buildTrap(state.id, "", state.kind, state.x, state.y, state.z));
    }
    for (let index = this.traps.length - 1; index >= 0; index -= 1) {
      const trap = this.traps[index];
      if (seen.has(trap.id)) continue;
      trap.mesh.removeFromParent();
      disposeObject(trap.mesh);
      this.traps.splice(index, 1);
    }
  }

  private clearGuestProjectiles() {
    for (const projectile of this.projectiles) {
      projectile.mesh.removeFromParent();
      disposeObject(projectile.mesh);
    }
    this.projectiles.length = 0;
  }

  private clearGuestTraps() {
    for (const trap of this.traps) {
      trap.mesh.removeFromParent();
      disposeObject(trap.mesh);
    }
    this.traps.length = 0;
  }

  private interpolateGuestProjectiles(dt: number) {
    const rate = 1 - Math.exp(-22 * dt);
    for (const projectile of this.projectiles) {
      if (!projectile.netPosition) continue;
      projectile.position.lerp(projectile.netPosition, rate);
      projectile.mesh.position.copy(projectile.position);
    }
  }

  private buildMatchSnapshot(): SmashMatchSnapshot {
    const karts: SmashKartSnapshot[] = this.karts.map((kart) => ({
      id: kart.id,
      name: kart.name,
      color: kart.color,
      x: kart.x,
      y: kart.y,
      z: kart.z,
      yaw: kart.yaw,
      hp: Math.max(0, kart.hp),
      shield: kart.shieldTime,
      boost: kart.boostTime,
      slow: kart.slowTime,
      spike: kart.spikeTime,
      weapon: kart.weapon,
      ammo: kart.ammo,
      kills: kart.kills,
      deaths: kart.deaths,
      shots: kart.shots,
      hits: kart.hits,
      alive: kart.alive,
      respawnIn: Math.max(0, kart.respawnIn),
      speed: Math.abs(kart.speed),
      drifting: kart.drifting,
      driftCharge: kart.driftCharge,
    }));

    return {
      phase: this.mode === "over" ? "over" : "playing",
      round: this.round,
      mapId: this.arenaMap.id,
      timeLeft: this.timeLeft,
      killTarget: this.options.killTarget,
      matchSeconds: this.elapsed,
      karts,
      pickups: this.pickups.map((pickup) => ({ id: pickup.id, active: pickup.active })),
      projectiles: this.projectiles.map((projectile) => ({
        id: projectile.id,
        kind: projectile.kind,
        x: projectile.position.x,
        y: projectile.position.y,
        z: projectile.position.z,
        vx: projectile.velocity.x,
        vy: projectile.velocity.y,
        vz: projectile.velocity.z,
      })),
      traps: this.traps.map((trap) => ({
        id: trap.id,
        kind: trap.kind,
        x: trap.x,
        y: trap.y,
        z: trap.z,
      })),
      feed: this.feed.map((entry) => ({ ...entry })),
      winner: this.winner,
    };
  }

  private emitSnapshot(now: number, force = false) {
    if (this.role !== "online-host" || !this.options.onSnapshot) return;
    if (this.mode !== "playing" && this.mode !== "over") return;
    if (this.mode === "over" && this.snapshotOverSent) return;
    if (!force && now - this.lastSnapshotSent < 100) return;
    const snapshot = this.buildMatchSnapshot();
    this.lastSnapshotSent = now;
    this.options.onSnapshot(snapshot);
    if (snapshot.phase === "over") this.snapshotOverSent = true;
  }

  private bestKartWinner(): SmashWinner | null {
    const best = [...this.karts].sort(
      (a, b) => b.kills - a.kills || a.deaths - b.deaths,
    )[0];
    if (!best) return null;
    return { id: best.id, name: best.name, color: best.color, kills: best.kills };
  }

  private firePressedFor(kart: KartActor) {
    kart.firePressed = kart.input.fire && !kart.prevFire;
    kart.prevFire = kart.input.fire;
  }

  private updateTimers(kart: KartActor, dt: number) {
    kart.cooldown = Math.max(0, kart.cooldown - dt);
    kart.shieldTime = Math.max(0, kart.shieldTime - dt);
    kart.boostTime = Math.max(0, kart.boostTime - dt);
    kart.boostPadCooldown = Math.max(0, kart.boostPadCooldown - dt);
    kart.slowTime = Math.max(0, kart.slowTime - dt);
    kart.spikeTime = Math.max(0, kart.spikeTime - dt);
    kart.ramCooldown = Math.max(0, kart.ramCooldown - dt);
    kart.invuln = Math.max(0, kart.invuln - dt);
    if (!kart.alive) {
      kart.respawnIn -= dt;
      if (kart.respawnIn <= 0) {
        this.respawnKart(kart);
      }
    }
  }

  private driveKart(kart: KartActor, dt: number) {
    const input = kart.input;
    const boosting = kart.boostTime > 0;
    const slowed = kart.slowTime > 0;
    const maxSpeed = (boosting ? KART.boostSpeed : KART.maxSpeed) * (slowed ? 0.62 : 1);
    const accel = KART.accel * (boosting ? 1.6 : 1) * (slowed ? 0.55 : 1);

    const steer = Math.abs(input.steer) > 0.05 ? input.steer : 0;
    const speedRatio = clamp(Math.abs(kart.speed) / 9, 0, 1);
    const reverseFactor = kart.speed < -0.5 ? -1 : 1;
    const turnRate = KART.steer * (boosting ? 1.08 : 1) * (kart.drifting ? 1.28 : 1);
    kart.yaw = wrapAngle(kart.yaw + steer * turnRate * speedRatio * reverseFactor * dt);

    const wantsDrift =
      input.drift && Math.abs(steer) > 0.15 && Math.abs(kart.speed) > 7 && kart.alive;
    if (wantsDrift) {
      kart.drifting = true;
      kart.driftCharge = Math.min(KART.driftMax, kart.driftCharge + dt);
    } else if (kart.drifting) {
      if (kart.driftCharge >= KART.driftMin) {
        kart.boostTime = Math.max(kart.boostTime, 0.55 + kart.driftCharge * 0.42);
        this.audio.boost();
        this.sparks.burst(kart.x, 0.45, kart.z, 0xffa02b, 14, 7, 0.55, 0.4, 9);
      }
      kart.drifting = false;
      kart.driftCharge = 0;
    }

    const forwardX = Math.sin(kart.yaw);
    const forwardZ = Math.cos(kart.yaw);
    const rightX = Math.cos(kart.yaw);
    const rightZ = -Math.sin(kart.yaw);

    let forwardSpeed = kart.vx * forwardX + kart.vz * forwardZ;
    let lateralSpeed = kart.vx * rightX + kart.vz * rightZ;

    if (input.throttle > 0) {
      forwardSpeed += accel * input.throttle * dt;
    } else if (input.throttle < 0) {
      const decel = forwardSpeed > 1 ? KART.brake : accel * 0.7;
      forwardSpeed -= decel * Math.abs(input.throttle) * dt;
    }

    forwardSpeed -= forwardSpeed * KART.drag * dt;
    forwardSpeed = clamp(forwardSpeed, -KART.reverseMax, maxSpeed);

    const grip = kart.drifting ? KART.driftGrip : KART.grip;
    lateralSpeed *= Math.max(0, 1 - grip * dt);
    if (kart.drifting) {
      lateralSpeed -= steer * Math.abs(forwardSpeed) * 0.24 * dt;
    }

    kart.vx = forwardX * forwardSpeed + rightX * lateralSpeed;
    kart.vz = forwardZ * forwardSpeed + rightZ * lateralSpeed;
    kart.speed = forwardSpeed;

    const previousX = kart.x;
    const previousZ = kart.z;
    kart.x += kart.vx * dt;
    kart.z += kart.vz * dt;

    // Ramps and platform decks are continuous surfaces. A rise larger than a
    // step is a side wall: refuse the move instead of teleporting the kart up.
    const ground = groundHeightAt(this.arenaMap, kart.x, kart.z, kart.y + 0.5);
    const rise = ground - kart.y;
    if (rise > KART.stepHeight) {
      kart.x = previousX;
      kart.z = previousZ;
      kart.vx *= 0.15;
      kart.vz *= 0.15;
    } else if (kart.grounded && kart.vy <= 0 && rise > -0.7) {
      kart.y = ground;
      kart.vy = 0;
    } else {
      kart.vy -= 32 * dt;
      kart.y += kart.vy * dt;
      if (kart.y <= ground) {
        if (!kart.grounded && kart.vy < -5) {
          this.smoke.burst(kart.x, ground + 0.2, kart.z, 0x6b6357, 5, 2.2, 0.9, 0.4, 1);
        }
        kart.y = ground;
        kart.vy = 0;
        kart.grounded = true;
      } else {
        kart.grounded = false;
      }
    }

    this.checkBoostPads(kart);

    if (kart.drifting && Math.random() > 0.55) {
      const rearX = kart.x - forwardX * 1.2;
      const rearZ = kart.z - forwardZ * 1.2;
      this.sparks.spawn({
        x: rearX - rightX * steer * 0.8,
        y: 0.2,
        z: rearZ - rightZ * steer * 0.8,
        vx: -kart.vx * 0.2 + (Math.random() - 0.5) * 3,
        vy: 1.5 + Math.random() * 2,
        vz: -kart.vz * 0.2 + (Math.random() - 0.5) * 3,
        color: 0xffb347,
        size: 0.28,
        life: 0.35,
        gravity: 12,
        drag: 1.4,
      });
    }
  }

  /** Launch pads give a short burst with a per-kart cooldown. */
  private checkBoostPads(kart: KartActor) {
    if (kart.boostPadCooldown > 0 || kart.y > 0.8) {
      return;
    }
    for (const pad of this.arenaMap.boostPads) {
      const dx = kart.x - pad.x;
      const dz = kart.z - pad.z;
      if (dx * dx + dz * dz > 3.1 * 3.1) {
        continue;
      }
      kart.boostTime = Math.max(kart.boostTime, KART.boostDuration);
      kart.boostPadCooldown = 2.4;
      this.sparks.burst(kart.x, kart.y + 0.45, kart.z, 0xffa02b, 16, 8, 0.55, 0.45, 6);
      if (kart.isPlayer) {
        this.audio.boost();
      }
      return;
    }
  }

  private resolveWorldCollision(kart: KartActor) {
    const limitX = this.arenaMap.size / 2 - KART.radius - 0.3;
    const limitZ = this.arenaMap.depth / 2 - KART.radius - 0.3;
    if (kart.x > limitX) {
      kart.x = limitX;
      if (kart.vx > 0) kart.vx *= -0.28;
    } else if (kart.x < -limitX) {
      kart.x = -limitX;
      if (kart.vx < 0) kart.vx *= -0.28;
    }
    if (kart.z > limitZ) {
      kart.z = limitZ;
      if (kart.vz > 0) kart.vz *= -0.28;
    } else if (kart.z < -limitZ) {
      kart.z = -limitZ;
      if (kart.vz < 0) kart.vz *= -0.28;
    }

    const solids = [
      ...this.arenaMap.obstacles.map((obstacle) => ({
        x: obstacle.x,
        z: obstacle.z,
        hx: obstacle.hx,
        hz: obstacle.hz,
        rot: obstacle.rot ?? 0,
        bottom: obstacle.base ?? 0,
        top: (obstacle.base ?? 0) + obstacle.h,
      })),
      ...this.arenaMap.platforms.map((platform) => ({
        x: platform.x,
        z: platform.z,
        hx: platform.hx,
        hz: platform.hz,
        rot: 0,
        bottom: 0,
        top: platform.height,
      })),
    ];

    for (const solid of solids) {
      // A kart above the surface has already climbed it; one far below a
      // raised prop is protected by the deck it stands on.
      if (kart.y >= solid.top - 0.45 || kart.y < solid.bottom - 0.6) {
        continue;
      }

      const cos = Math.cos(solid.rot);
      const sin = Math.sin(solid.rot);
      const dx = kart.x - solid.x;
      const dz = kart.z - solid.z;
      // Inverse-rotate the kart into the box's local frame so the collision
      // test stays a cheap axis-aligned clamp for rotated chicanes.
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;
      const nearestLocalX = clamp(localX, -solid.hx, solid.hx);
      const nearestLocalZ = clamp(localZ, -solid.hz, solid.hz);
      const offsetX = localX - nearestLocalX;
      const offsetZ = localZ - nearestLocalZ;
      const distSq = offsetX * offsetX + offsetZ * offsetZ;
      if (distSq >= KART.radius * KART.radius) {
        continue;
      }

      let normalLocalX: number;
      let normalLocalZ: number;
      let penetration: number;
      if (distSq > 0.000001) {
        const dist = Math.sqrt(distSq);
        normalLocalX = offsetX / dist;
        normalLocalZ = offsetZ / dist;
        penetration = KART.radius - dist;
      } else {
        const toRight = solid.hx - localX;
        const toLeft = localX + solid.hx;
        const toFront = solid.hz - localZ;
        const toBack = localZ + solid.hz;
        const minimum = Math.min(toRight, toLeft, toFront, toBack);
        if (minimum === toRight) {
          normalLocalX = 1;
          normalLocalZ = 0;
          penetration = toRight + KART.radius;
        } else if (minimum === toLeft) {
          normalLocalX = -1;
          normalLocalZ = 0;
          penetration = toLeft + KART.radius;
        } else if (minimum === toFront) {
          normalLocalX = 0;
          normalLocalZ = 1;
          penetration = toFront + KART.radius;
        } else {
          normalLocalX = 0;
          normalLocalZ = -1;
          penetration = toBack + KART.radius;
        }
      }

      const normalX = normalLocalX * cos + normalLocalZ * sin;
      const normalZ = -normalLocalX * sin + normalLocalZ * cos;
      const nearestX = solid.x + nearestLocalX * cos + nearestLocalZ * sin;
      const nearestZ = solid.z - nearestLocalX * sin + nearestLocalZ * cos;
      kart.x += normalX * penetration;
      kart.z += normalZ * penetration;
      const velocityAlongNormal = kart.vx * normalX + kart.vz * normalZ;
      if (velocityAlongNormal < 0) {
        kart.vx -= velocityAlongNormal * normalX * 1.22;
        kart.vz -= velocityAlongNormal * normalZ * 1.22;
        if (Math.abs(velocityAlongNormal) > 7) {
          this.sparks.burst(nearestX, kart.y + 0.7, nearestZ, 0xffc233, 6, 6, 0.4, 0.3, 10);
        }
      }
    }
  }

  /** Lava, sludge and open vents eliminate a kart that drives into them. */
  private checkHazards(kart: KartActor) {
    if (!kart.alive || kart.y > 2) return;
    if (!pointInHazard(this.arenaMap, kart.x, kart.z)) return;
    const hazard = this.arenaMap.hazards.find((entry) => {
      if (entry.radius !== undefined) {
        return Math.hypot(kart.x - entry.x, kart.z - entry.z) <= entry.radius;
      }
      return (
        Math.abs(kart.x - entry.x) <= (entry.hx ?? 0) &&
        Math.abs(kart.z - entry.z) <= (entry.hz ?? 0)
      );
    });
    const color =
      hazard?.kind === "sludge" ? 0x8fd14a : hazard?.kind === "void" ? 0xff3d81 : 0xff6a2b;
    this.sparks.burst(kart.x, kart.y + 0.7, kart.z, color, 22, 9, 0.7, 0.5, 4);
    this.damageKart(kart, 1000, kart.id, "nuke");
  }

  private resolveKartCollisions() {
    const diameter = KART.radius * 2;
    for (let i = 0; i < this.karts.length; i += 1) {
      const a = this.karts[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.karts.length; j += 1) {
        const b = this.karts[j];
        if (!b.alive) continue;
        if (Math.abs(a.y - b.y) > 1.7) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const distSq = dx * dx + dz * dz;
        if (distSq >= diameter * diameter || distSq < 0.0001) {
          continue;
        }
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = diameter - dist;
        a.x -= nx * overlap * 0.5;
        a.z -= nz * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.z += nz * overlap * 0.5;

        const relative = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (relative < 0) {
          const impulse = relative * 0.55;
          a.vx += nx * impulse;
          a.vz += nz * impulse;
          b.vx -= nx * impulse;
          b.vz -= nz * impulse;
        }
        if (Math.abs(relative) > 10 && Math.random() > 0.6) {
          this.sparks.burst((a.x + b.x) / 2, 0.8, (a.z + b.z) / 2, 0xffc233, 5, 5, 0.35, 0.25, 10);
        }
      }
    }
  }

  /**
   * Spikey-Go-Round and Invincibility turn the kart itself into a weapon.
   * Contact is lethal to unprotected karts, but spawn protection and stars
   * still absorb the hit.
   */
  private resolveContactWeapons() {
    const reach = KART.radius * 2 + 0.5;
    for (let i = 0; i < this.karts.length; i += 1) {
      const a = this.karts[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.karts.length; j += 1) {
        const b = this.karts[j];
        if (!b.alive) continue;
        if (Math.abs(a.y - b.y) > 1.9) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        if (dx * dx + dz * dz > reach * reach) continue;

        const aLethal = a.spikeTime > 0 || a.shieldTime > 0;
        const bLethal = b.spikeTime > 0 || b.shieldTime > 0;
        if (!aLethal && !bLethal) continue;

        if (aLethal) {
          const weapon: WeaponId = a.spikeTime > 0 ? "spikey" : "invincibility";
          this.damageKart(b, 1000, a.id, weapon);
          this.sparks.burst(
            (a.x + b.x) / 2,
            1.1,
            (a.z + b.z) / 2,
            WEAPONS[weapon].color,
            16,
            8,
            0.5,
            0.45,
            3,
          );
        }
        if (bLethal && b.alive) {
          const weapon: WeaponId = b.spikeTime > 0 ? "spikey" : "invincibility";
          this.damageKart(a, 1000, b.id, weapon);
          this.sparks.burst(
            (a.x + b.x) / 2,
            1.1,
            (a.z + b.z) / 2,
            WEAPONS[weapon].color,
            16,
            8,
            0.5,
            0.45,
            3,
          );
        }
      }
    }
  }

  private collectPickups(kart: KartActor) {
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      const dx = kart.x - pickup.x;
      const dz = kart.z - pickup.z;
      if (dx * dx + dz * dz > 3.4 * 3.4) continue;
      if (Math.abs(kart.y - pickup.y) > 2.2) continue;
      pickup.active = false;
      pickup.timer = ARENA_STANDARD.pickup.respawnSeconds;
      pickup.visual.group.visible = false;
      // Contents stay secret until the moment of collection.
      const weapon = this.drawWeapon();
      kart.weapon = weapon;
      kart.ammo = WEAPONS[weapon].ammo;
      kart.cooldown = Math.min(kart.cooldown, 0.2);
      if (kart.isPlayer) {
        this.audio.pickup();
        this.sparks.burst(pickup.x, pickup.y + 1.2, pickup.z, WEAPONS[weapon].color, 18, 8, 0.5, 0.6, 5);
      }
    }
  }

  private tryFire(kart: KartActor) {
    if (!kart.alive) return;
    if (kart.weapon === "none" || kart.ammo <= 0) {
      if (kart.weapon !== "none") {
        kart.weapon = "none";
        kart.ammo = 0;
      }
      kart.burstLeft = 0;
      return;
    }
    if (kart.cooldown > 0) return;

    const weapon = kart.weapon;
    const spec = WEAPONS[weapon];

    // Bullets are the only burst weapon: three rounds per pull, then a short
    // reset before the next burst.
    if (weapon === "bullets") {
      if (kart.burstLeft <= 0) {
        if (!kart.firePressed && !kart.input.fire) return;
        kart.burstLeft = 3;
      }
      this.fireBullet(kart);
      kart.burstLeft -= 1;
      kart.ammo -= 1;
      kart.cooldown = kart.burstLeft > 0 ? spec.cooldown : 0.3;
      this.noteShot(kart, "bullets");
      if (kart.ammo <= 0) {
        kart.ammo = 0;
        kart.weapon = "none";
        kart.burstLeft = 0;
      }
      return;
    }

    // Every other weapon is a single trigger pull. Machine Gun is the only
    // exception because its spec is marked as a hold weapon.
    if (!spec.hold && !kart.firePressed) return;

    switch (weapon) {
      case "machinegun":
        this.fireMachineGun(kart);
        break;
      case "rockets":
        this.fireRocket(kart);
        break;
      case "cannonballs":
        this.fireCannonball(kart);
        break;
      case "nuke":
        this.fireNuke(kart);
        break;
      case "grenuke":
        this.fireGrenuke(kart);
        break;
      case "snowball":
        this.fireSnowball(kart);
        break;
      case "mines":
        this.dropTrap(kart, "mine");
        break;
      case "spikey":
        kart.spikeTime = Math.max(kart.spikeTime, 6);
        this.audio.shield();
        this.sparks.burst(kart.x, 1.1, kart.z, WEAPONS.spikey.color, 24, 8, 0.6, 0.7, 2);
        break;
      case "invincibility":
        kart.shieldTime = Math.max(kart.shieldTime, 5);
        this.audio.shield();
        this.sparks.burst(
          kart.x,
          1.1,
          kart.z,
          WEAPONS.invincibility.color,
          28,
          9,
          0.65,
          0.7,
          2,
        );
        break;
      case "fakebox":
        this.dropTrap(kart, "fake");
        break;
      default:
        break;
    }

    kart.ammo -= 1;
    kart.cooldown = spec.cooldown;
    this.noteShot(kart, weapon);
    if (kart.ammo <= 0) {
      kart.ammo = 0;
      kart.weapon = "none";
      kart.burstLeft = 0;
    }
  }

  private noteShot(kart: KartActor, weapon: WeaponId) {
    if (kart.isPlayer) {
      kart.shots += 1;
      if (weapon === "machinegun" || weapon === "bullets" || weapon === "snowball") {
        this.audio.shot();
      } else if (
        weapon === "rockets" ||
        weapon === "cannonballs" ||
        weapon === "nuke" ||
        weapon === "grenuke"
      ) {
        this.audio.missile();
      }
      return;
    }
    if (
      (weapon === "machinegun" || weapon === "bullets") &&
      this.nearPlayer(kart.x, kart.z, 45)
    ) {
      this.audio.shot();
    }
  }

  private muzzlePoint(kart: KartActor): THREE.Vector3 {
    return new THREE.Vector3(
      kart.x + Math.sin(kart.yaw) * 1.5,
      kart.y + 1.45,
      kart.z + Math.cos(kart.yaw) * 1.5,
    );
  }

  private launchProjectile(
    kart: KartActor,
    kind: ProjectileKind,
    weapon: WeaponId,
    direction: THREE.Vector3,
    options: {
      speed: number;
      life: number;
      damage: number;
      splash?: number;
      gravity?: number;
      fuse?: number;
      radius?: number;
      targetId?: string | null;
      mesh?: THREE.Object3D;
      origin?: THREE.Vector3;
    },
  ) {
    const origin = options.origin ?? this.muzzlePoint(kart);
    const mesh = options.mesh ?? this.buildProjectileMesh(kind, weapon);
    const normalized = direction.clone().normalize();
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalized);
    this.scene.add(mesh);
    this.projectiles.push({
      id: ++this.projectileId,
      ownerId: kart.id,
      kind,
      weapon,
      origin: origin.clone(),
      position: origin.clone(),
      velocity: normalized.multiplyScalar(options.speed),
      speed: options.speed,
      life: options.life,
      damage: options.damage,
      splash: options.splash ?? 0,
      gravity: options.gravity ?? 0,
      fuse: options.fuse ?? 0,
      landed: false,
      radius: options.radius ?? 1.6,
      targetId: options.targetId ?? null,
      mesh,
      netPosition: null,
      netVelocity: null,
    });
  }

  private forwardDirection(kart: KartActor, lift = 0): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(kart.yaw), lift, Math.cos(kart.yaw)).normalize();
  }

  private fireMachineGun(kart: KartActor) {
    const target = this.findTrackingTarget(kart, 0.85, 58);
    const origin = this.muzzlePoint(kart);
    const aim = target
      ? new THREE.Vector3(target.x, target.y + 1.1, target.z)
      : new THREE.Vector3(
          kart.x + Math.sin(kart.yaw) * 40,
          kart.y + 1.4,
          kart.z + Math.cos(kart.yaw) * 40,
        );
    const direction = aim.sub(origin).normalize();
    this.launchProjectile(kart, "tracer", "machinegun", direction, {
      speed: 86,
      life: 1.1,
      damage: 9,
      radius: 1.5,
      targetId: target?.id ?? null,
    });
  }

  private fireBullet(kart: KartActor) {
    this.launchProjectile(kart, "bullet", "bullets", this.forwardDirection(kart), {
      speed: 96,
      life: 1.2,
      damage: 10,
      radius: 1.4,
    });
  }

  private fireRocket(kart: KartActor) {
    this.launchProjectile(kart, "rocket", "rockets", this.forwardDirection(kart), {
      speed: 52,
      life: 3,
      damage: 32,
      splash: 6.5,
      radius: 1.7,
    });
  }

  private fireCannonball(kart: KartActor) {
    this.launchProjectile(kart, "cannonball", "cannonballs", this.forwardDirection(kart, 0.28), {
      speed: 42,
      life: 5,
      damage: 30,
      splash: 5.5,
      gravity: 24,
      radius: 1.8,
    });
  }

  private fireNuke(kart: KartActor) {
    this.launchProjectile(kart, "nuke", "nuke", this.forwardDirection(kart, 0.12), {
      speed: 36,
      life: 5,
      damage: 72,
      splash: 17,
      gravity: 12,
      radius: 2.2,
    });
  }

  private fireGrenuke(kart: KartActor) {
    this.launchProjectile(kart, "grenuke", "grenuke", this.forwardDirection(kart, 0.55), {
      speed: 32,
      life: 6,
      damage: 52,
      splash: 9,
      gravity: 30,
      fuse: 1.35,
      radius: 1.8,
    });
  }

  private fireSnowball(kart: KartActor) {
    this.launchProjectile(kart, "snowball", "snowball", this.forwardDirection(kart), {
      speed: 68,
      life: 2.2,
      damage: 8,
      radius: 1.6,
    });
  }

  private buildProjectileMesh(kind: ProjectileKind, weapon: WeaponId): THREE.Object3D {
    switch (kind) {
      case "tracer":
        return this.buildBoltMesh(WEAPONS[weapon].color);
      case "bullet":
        return this.buildBoltMesh(WEAPONS.bullets.color);
      case "rocket":
        return this.buildMissileMesh();
      case "cannonball":
        return this.buildBallMesh(0.34, 0x4a4a44, 0.15);
      case "nuke":
        return this.buildBallMesh(0.52, 0xa8e10c, 0.55);
      case "grenuke":
        return this.buildBallMesh(0.4, 0x7bd94a, 0.45);
      case "snowball":
        return this.buildBallMesh(0.36, 0xf2fbff, 0.7);
    }
  }

  private buildBallMesh(radius: number, color: number, emissive: number): THREE.Object3D {
    const group = new THREE.Group();
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 14, 10),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.45,
        metalness: 0.35,
        emissive: color,
        emissiveIntensity: emissive,
      }),
    );
    group.add(ball);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.sparkTexture,
        color,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(radius * 4, radius * 4, 1);
    group.add(glow);
    return group;
  }

  private buildBoltMesh(color: number): THREE.Object3D {
    const geometry = new THREE.CapsuleGeometry(0.11, 0.7, 3, 6);
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.sparkTexture,
        color,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(1.9, 1.9, 1);
    mesh.add(glow);
    return mesh;
  }

  private buildMissileMesh(): THREE.Object3D {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.5, metalness: 0.6 }),
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.3, 8),
      new THREE.MeshBasicMaterial({ color: 0xff5a1f }),
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.58;
    group.add(nose);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.sparkTexture,
        color: 0xff7a1f,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(2.1, 2.1, 1);
    glow.position.z = -0.4;
    group.add(glow);
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.04, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x1b1b1b }),
    );
    fin.position.z = -0.35;
    group.add(fin);
    return group;
  }

  private buildMineVisual(x: number, z: number, y = 0): { group: THREE.Group; lamp: THREE.Mesh } {
    const group = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a2a26, roughness: 0.55, metalness: 0.65 }),
    );
    disc.position.y = 0.15;
    group.add(disc);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.07, 6, 18),
      new THREE.MeshStandardMaterial({ color: 0xe83f8b, emissive: 0xe83f8b, emissiveIntensity: 0.9 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.28;
    group.add(ring);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff3d81 }),
    );
    lamp.position.y = 0.38;
    group.add(lamp);
    group.position.set(x, y, z);
    return { group, lamp };
  }

  private buildTrap(
    id: number,
    ownerId: string,
    kind: "mine" | "fake",
    x: number,
    y: number,
    z: number,
  ): TrapActor {
    if (kind === "fake") {
      const pickup = buildPickup(this.pickupGlowTexture);
      pickup.group.position.set(x, y, z);
      this.scene.add(pickup.group);
      return {
        id,
        ownerId,
        kind,
        x,
        y,
        z,
        arm: 0.8,
        life: 30,
        phase: Math.random() * Math.PI * 2,
        mesh: pickup.group,
        lamp: null,
        pickup,
      };
    }
    const { group, lamp } = this.buildMineVisual(x, z, y);
    this.scene.add(group);
    return {
      id,
      ownerId,
      kind,
      x,
      y,
      z,
      arm: 0.8,
      life: 22,
      phase: 0,
      mesh: group,
      lamp,
      pickup: null,
    };
  }

  private dropTrap(kart: KartActor, kind: "mine" | "fake") {
    const limit = kind === "mine" ? 12 : 6;
    const sameKind = this.traps.filter((trap) => trap.kind === kind);
    if (sameKind.length >= limit) {
      const oldest = sameKind[0];
      oldest.mesh.removeFromParent();
      disposeObject(oldest.mesh);
      this.traps.splice(this.traps.indexOf(oldest), 1);
    }
    const x = kart.x - Math.sin(kart.yaw) * 2.4;
    const z = kart.z - Math.cos(kart.yaw) * 2.4;
    const y = groundHeightAt(this.arenaMap, x, z, kart.y + 0.6);
    this.traps.push(this.buildTrap(++this.trapId, kart.id, kind, x, y, z));
    if (kart.isPlayer) {
      if (kind === "mine") {
        this.audio.missile();
      } else {
        this.audio.pickup();
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.life -= dt;

      // Machine Gun is the only tracking weapon in the arsenal.
      if (projectile.kind === "tracer" && projectile.targetId) {
        const target = this.karts.find(
          (kart) => kart.id === projectile.targetId && kart.alive,
        );
        if (target) {
          const desired = new THREE.Vector3(target.x, target.y + 1.05, target.z)
            .sub(projectile.position)
            .normalize();
          const current = projectile.velocity.clone().normalize();
          const angle = current.angleTo(desired);
          const turn = 5.5 * dt;
          if (angle > 0.0001) {
            const next = current.lerp(desired, Math.min(1, turn / angle)).normalize();
            projectile.velocity.copy(next.multiplyScalar(projectile.speed));
          }
        }
      }

      if (projectile.kind === "grenuke" && projectile.landed) {
        projectile.fuse -= dt;
        projectile.mesh.position.copy(projectile.position);
        if (Math.random() > 0.72) {
          this.sparks.spawn({
            x: projectile.position.x + (Math.random() - 0.5) * 0.5,
            y: projectile.position.y + 0.25,
            z: projectile.position.z + (Math.random() - 0.5) * 0.5,
            vx: 0,
            vy: 1.5,
            vz: 0,
            color: WEAPONS.grenuke.color,
            size: 0.24,
            life: 0.28,
            gravity: 4,
          });
        }
        if (projectile.fuse <= 0) {
          this.detonateProjectile(projectile);
          this.removeProjectile(i);
        }
        continue;
      }

      if (projectile.gravity > 0) {
        projectile.velocity.y -= projectile.gravity * dt;
      }

      projectile.position.addScaledVector(projectile.velocity, dt);
      projectile.mesh.position.copy(projectile.position);

      if (
        projectile.kind === "rocket" ||
        projectile.kind === "tracer" ||
        projectile.kind === "bullet" ||
        projectile.kind === "snowball"
      ) {
        projectile.mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          projectile.velocity.clone().normalize(),
        );
      }

      if (projectile.kind === "rocket" || projectile.kind === "nuke") {
        if (Math.random() > 0.3) {
          this.smoke.spawn({
            x: projectile.position.x,
            y: projectile.position.y,
            z: projectile.position.z,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2,
            vz: (Math.random() - 0.5) * 1.2,
            color: 0x9a9288,
            size: 0.6,
            life: 0.55,
            gravity: -1,
            drag: 1,
          });
        }
      } else if (projectile.kind === "tracer" || projectile.kind === "bullet") {
        if (Math.random() > 0.5) {
          this.sparks.spawn({
            x: projectile.position.x,
            y: projectile.position.y,
            z: projectile.position.z,
            vx: 0,
            vy: 0,
            vz: 0,
            color: WEAPONS[projectile.weapon].color,
            size: 0.28,
            life: 0.16,
            gravity: 0,
          });
        }
      } else if (projectile.kind === "snowball" && Math.random() > 0.45) {
        this.sparks.spawn({
          x: projectile.position.x,
          y: projectile.position.y,
          z: projectile.position.z,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 1.5,
          vz: (Math.random() - 0.5) * 1.5,
          color: 0xdff6ff,
          size: 0.3,
          life: 0.3,
          gravity: 3,
        });
      }

      // Cannon balls, nukes and lob-grenukes arc. Grenukes settle on the
      // ground, tick down their fuse and then detonate.
      if (projectile.gravity > 0) {
        const ground = groundHeightAt(
          this.arenaMap,
          projectile.position.x,
          projectile.position.z,
          projectile.position.y + 0.6,
        );
        if (projectile.position.y <= ground + 0.24) {
          projectile.position.y = ground + 0.24;
          projectile.mesh.position.copy(projectile.position);
          if (projectile.kind === "grenuke") {
            projectile.landed = true;
            projectile.velocity.set(0, 0, 0);
            this.smoke.burst(
              projectile.position.x,
              projectile.position.y,
              projectile.position.z,
              0x6b6357,
              5,
              2,
              0.7,
              0.35,
              1,
            );
            continue;
          }
          this.detonateProjectile(projectile);
          this.removeProjectile(i);
          continue;
        }
      }

      let hit = projectile.life <= 0;
      let victim: KartActor | null = null;

      if (!hit) {
        const halfX = this.arenaMap.size / 2;
        const halfZ = this.arenaMap.depth / 2;
        if (
          Math.abs(projectile.position.x) > halfX ||
          Math.abs(projectile.position.z) > halfZ ||
          projectile.position.y < 0.1
        ) {
          hit = true;
        }
      }

      if (!hit) {
        for (const obstacle of this.arenaMap.obstacles) {
          const base = obstacle.base ?? 0;
          if (projectile.position.y > base + obstacle.h || projectile.position.y < base) {
            continue;
          }
          const rot = obstacle.rot ?? 0;
          const cos = Math.cos(rot);
          const sin = Math.sin(rot);
          const dx = projectile.position.x - obstacle.x;
          const dz = projectile.position.z - obstacle.z;
          const localX = dx * cos - dz * sin;
          const localZ = dx * sin + dz * cos;
          if (
            Math.abs(localX) < obstacle.hx + 0.2 &&
            Math.abs(localZ) < obstacle.hz + 0.2
          ) {
            hit = true;
            break;
          }
        }
      }

      if (!hit) {
        for (const platform of this.arenaMap.platforms) {
          if (projectile.position.y > platform.height + 0.1) continue;
          if (
            Math.abs(projectile.position.x - platform.x) < platform.hx + 0.2 &&
            Math.abs(projectile.position.z - platform.z) < platform.hz + 0.2
          ) {
            hit = true;
            break;
          }
        }
      }

      if (!hit) {
        for (const kart of this.karts) {
          if (!kart.alive || kart.id === projectile.ownerId) continue;
          const dx = kart.x - projectile.position.x;
          const dz = kart.z - projectile.position.z;
          const reach = projectile.radius + KART.radius * 0.5;
          if (
            dx * dx + dz * dz < reach * reach &&
            Math.abs(kart.y + 1.05 - projectile.position.y) < 2.3
          ) {
            victim = kart;
            hit = true;
            break;
          }
        }
      }

      if (!hit) continue;

      if (projectile.splash > 0) {
        this.detonateProjectile(projectile);
      } else if (victim) {
        const falloff =
          projectile.kind === "tracer"
            ? clamp(1 - projectile.position.distanceTo(projectile.origin) / 58, 0.28, 1)
            : 1;
        this.damageKart(
          victim,
          projectile.damage * falloff,
          projectile.ownerId,
          projectile.weapon,
        );
        if (projectile.kind === "snowball") {
          victim.slowTime = Math.max(victim.slowTime, 2.8);
          this.sparks.burst(
            victim.x,
            victim.y + 1.1,
            victim.z,
            WEAPONS.snowball.color,
            14,
            7,
            0.5,
            0.4,
            4,
          );
        } else {
          this.sparks.burst(
            projectile.position.x,
            projectile.position.y,
            projectile.position.z,
            WEAPONS[projectile.weapon].color,
            6,
            5,
            0.35,
            0.3,
            6,
          );
        }
      }
      this.removeProjectile(i);
    }
  }

  private detonateProjectile(projectile: Projectile) {
    this.explode(
      projectile.position.x,
      projectile.position.z,
      projectile.position.y,
      projectile.splash,
      projectile.damage,
      projectile.ownerId,
      projectile.weapon,
    );
  }

  private removeProjectile(index: number) {
    const projectile = this.projectiles[index];
    if (!projectile) return;
    projectile.mesh.removeFromParent();
    disposeObject(projectile.mesh);
    this.projectiles.splice(index, 1);
  }

  private updateTraps(dt: number) {
    for (let i = this.traps.length - 1; i >= 0; i -= 1) {
      const trap = this.traps[i];
      trap.arm = Math.max(0, trap.arm - dt);
      trap.life -= dt;
      if (trap.lamp) {
        const material = trap.lamp.material as THREE.MeshBasicMaterial;
        const blink = Math.sin(this.elapsed * (trap.arm > 0 ? 20 : 7)) > 0 ? 1 : 0.15;
        material.opacity = blink;
        material.transparent = true;
      }

      let detonate = trap.life <= 0;
      if (!detonate && trap.arm <= 0) {
        for (const kart of this.karts) {
          if (!kart.alive) continue;
          if (trap.kind === "fake" && kart.id === trap.ownerId) continue;
          if (Math.abs(kart.y - trap.y) > 1.9) continue;
          const dx = kart.x - trap.x;
          const dz = kart.z - trap.z;
          const reach = trap.kind === "mine" ? 2.7 : 3.1;
          if (dx * dx + dz * dz < reach * reach) {
            detonate = true;
            break;
          }
        }
      }

      if (!detonate) continue;
      if (trap.kind === "mine") {
        this.explode(trap.x, trap.z, trap.y, 7.5, 55, trap.ownerId, "mines");
      } else {
        this.explode(trap.x, trap.z, trap.y, 8.5, 48, trap.ownerId, "fakebox");
      }
      trap.mesh.removeFromParent();
      disposeObject(trap.mesh);
      this.traps.splice(i, 1);
    }
  }

  private explode(
    x: number,
    z: number,
    y: number,
    radius: number,
    damage: number,
    ownerId: string,
    weapon: WeaponId,
  ) {
    const color = WEAPONS[weapon].color;
    this.createShockwave(x, z, y, color, radius, 0.5);
    this.sparks.burst(x, y + 1, z, 0xffb347, 30, 13, 0.7, 0.55, 9);
    this.sparks.burst(x, y + 1, z, color, 16, 9, 0.5, 0.45, 5);
    this.smoke.burst(x, y + 1.1, z, 0x3b352e, 20, 5, 2.6, 1.3, -2);
    const distToPlayer = Math.hypot(this.player.x - x, this.player.z - z);
    if (distToPlayer < 55) {
      this.audio.explosion();
    }
    this.shake = Math.max(this.shake, clamp(1.1 - distToPlayer / 55, 0, 1));

    for (const kart of this.karts) {
      if (!kart.alive) continue;
      const dx = kart.x - x;
      const dz = kart.z - z;
      const dist = Math.hypot(dx, dz);
      if (dist > radius) continue;
      const falloff = 1 - (dist / radius) * 0.65;
      this.damageKart(kart, damage * falloff, ownerId, weapon);
      const nx = dist < 0.001 ? 1 : dx / dist;
      const nz = dist < 0.001 ? 0 : dz / dist;
      kart.vx += nx * 13 * falloff;
      kart.vz += nz * 13 * falloff;
      kart.vy = Math.max(kart.vy, 4.2 * falloff);
    }
  }

  private createShockwave(
    x: number,
    z: number,
    y: number,
    color: number,
    radius: number,
    duration: number,
  ) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y + 0.18, z);
    this.scene.add(mesh);
    this.shockwaves.push({ mesh, material, life: duration, maxLife: duration, radius });
  }

  private updateShockwaves(dt: number) {
    for (let i = this.shockwaves.length - 1; i >= 0; i -= 1) {
      const wave = this.shockwaves[i];
      wave.life -= dt;
      const progress = 1 - wave.life / wave.maxLife;
      const scale = 0.3 + progress * wave.radius;
      wave.mesh.scale.set(scale, scale, scale);
      wave.material.opacity = Math.max(0, 0.8 * (1 - progress));
      if (wave.life <= 0) {
        wave.mesh.removeFromParent();
        wave.mesh.geometry.dispose();
        wave.material.dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private damageKart(target: KartActor, amount: number, ownerId: string, weapon: WeaponId) {
    if (!target.alive || target.invuln > 0) {
      return;
    }
    if (target.shieldTime > 0) {
      this.sparks.burst(
        target.x,
        1.2,
        target.z,
        WEAPONS.invincibility.color,
        8,
        6,
        0.35,
        0.3,
        4,
      );
      if (target.isPlayer) {
        this.audio.shield();
      }
      return;
    }
    target.hp -= amount;

    if (ownerId === PLAYER_ID && ownerId !== target.id) {
      this.player.hits += 1;
    }
    if (target.isPlayer || ownerId === PLAYER_ID) {
      this.audio.hit();
      this.shake = Math.max(this.shake, 0.18);
    }
    this.sparks.burst(target.x, target.y + 1.1, target.z, 0xffc233, 4, 4, 0.3, 0.25, 8);

    if (target.hp <= 0) {
      this.killKart(target, ownerId, weapon);
    }
  }

  private killKart(victim: KartActor, ownerId: string, weapon: WeaponId) {
    if (!victim.alive) {
      return;
    }
    victim.alive = false;
    victim.hp = 0;
    victim.deaths += 1;
    victim.respawnIn = KART.respawn;
    victim.visual.group.visible = false;
    victim.vx = 0;
    victim.vz = 0;
    victim.vy = 0;
    victim.grounded = false;
    victim.boostTime = 0;
    victim.shieldTime = 0;
    victim.spikeTime = 0;
    victim.weapon = "none";
    victim.ammo = 0;
    victim.cooldown = 0;
    victim.burstLeft = 0;
    victim.drifting = false;
    victim.driftCharge = 0;
    victim.visual.spikes.visible = false;

    const killer = this.karts.find((kart) => kart.id === ownerId);
    const self = !killer || killer.id === victim.id;
    if (killer && !self) {
      killer.kills += 1;
    }

    this.feed.unshift({
      id: ++this.feedId,
      killer: killer && !self ? killer.name : victim.name,
      victim: victim.name,
      weapon,
      self,
      at: this.elapsed,
    });
    if (this.feed.length > 6) {
      this.feed.length = 6;
    }

    this.explode(
      victim.x,
      victim.z,
      victim.y,
      6,
      22,
      killer && !self ? killer.id : victim.id,
      weapon,
    );
    this.shake = Math.max(this.shake, victim.isPlayer ? 1.2 : 0.35);
    this.audio.explosion();

    const winner = this.karts.find((kart) => kart.kills >= this.options.killTarget);
    if (winner) {
      this.endMatch(winner);
    }
  }

  private respawnKart(kart: KartActor) {
    let bestX = this.arenaMap.spawns[0][0];
    let bestZ = this.arenaMap.spawns[0][1];
    let bestScore = -1;
    for (const [x, z] of this.arenaMap.spawns) {
      let closest = 999;
      for (const other of this.karts) {
        if (other.id === kart.id || !other.alive) continue;
        closest = Math.min(closest, Math.hypot(other.x - x, other.z - z));
      }
      if (closest > bestScore) {
        bestScore = closest;
        bestX = x;
        bestZ = z;
      }
    }
    this.spawnAt(kart, bestX, bestZ);
    this.sparks.burst(bestX, kart.y + 1, bestZ, cssToHex(kart.color), 24, 8, 0.6, 0.6, 2);
    if (kart.isPlayer) {
      this.audio.respawn();
      this.snapCamera();
    }
  }

  private endMatch(winner?: KartActor) {
    if (this.mode === "over") {
      return;
    }
    this.mode = "over";
    this.audio.setEngine(0, false, false, false);
    this.clearInput();

    let champion = winner;
    if (!champion) {
      const sorted = [...this.karts].sort(
        (a, b) => b.kills - a.kills || a.deaths - b.deaths,
      );
      champion = sorted[0];
    }

    this.winner = champion
      ? {
          id: champion.id,
          name: champion.name,
          color: champion.color,
          kills: champion.kills,
        }
      : null;

    this.store.set({
      phase: "over",
      winner: this.winner,
      timeLeft: 0,
    });
    this.publish();
    if (this.role === "online-host") {
      this.emitSnapshot(performance.now(), true);
    }
  }

  private findTrackingTarget(kart: KartActor, cone = 0.9, range = 62): KartActor | null {
    const forwardX = Math.sin(kart.yaw);
    const forwardZ = Math.cos(kart.yaw);
    let best: KartActor | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const other of this.karts) {
      if (!other.alive || other.id === kart.id) continue;
      const dx = other.x - kart.x;
      const dz = other.z - kart.z;
      const dist = Math.hypot(dx, dz);
      if (dist > range || dist < 0.5) continue;
      const angle = Math.abs(wrapAngle(Math.atan2(dx, dz) - kart.yaw));
      if (angle > cone) continue;
      if (!this.hasLineOfSight(kart.x, kart.z, other.x, other.z)) continue;
      const score = angle * 26 + dist * 0.32;
      if (score < bestScore) {
        bestScore = score;
        best = other;
      }
    }
    return best;
  }

  private findNearestEnemy(kart: KartActor): KartActor | null {
    let best: KartActor | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const other of this.karts) {
      if (!other.alive || other.id === kart.id) continue;
      const dist = Math.hypot(other.x - kart.x, other.z - kart.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = other;
      }
    }
    return best;
  }

  private hasLineOfSight(x1: number, z1: number, x2: number, z2: number): boolean {
    for (const obstacle of this.arenaMap.obstacles) {
      if (obstacle.h < 1.5 || (obstacle.base ?? 0) > 1.5) continue;
      if (!OBSTACLE_RULES[obstacle.kind].blocksProjectiles) continue;
      if (this.segmentHitsAABB(x1, z1, x2, z2, obstacle)) {
        return false;
      }
    }
    return true;
  }

  private segmentHitsAABB(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    obstacle: { x: number; z: number; hx: number; hz: number; rot?: number },
  ): boolean {
    const rot = obstacle.rot ?? 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const dx1 = x1 - obstacle.x;
    const dz1 = z1 - obstacle.z;
    const dx2 = x2 - obstacle.x;
    const dz2 = z2 - obstacle.z;
    const localX1 = dx1 * cos - dz1 * sin;
    const localZ1 = dx1 * sin + dz1 * cos;
    const localX2 = dx2 * cos - dz2 * sin;
    const localZ2 = dx2 * sin + dz2 * cos;

    const dx = localX2 - localX1;
    const dz = localZ2 - localZ1;
    let tMin = 0;
    let tMax = 1;
    const axes: Array<[number, number, number, number]> = [
      [localX1, dx, -obstacle.hx, obstacle.hx],
      [localZ1, dz, -obstacle.hz, obstacle.hz],
    ];
    for (const [origin, delta, min, max] of axes) {
      if (Math.abs(delta) < 0.000001) {
        if (origin < min || origin > max) {
          return false;
        }
      } else {
        let t1 = (min - origin) / delta;
        let t2 = (max - origin) / delta;
        if (t1 > t2) {
          [t1, t2] = [t2, t1];
        }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) {
          return false;
        }
      }
    }
    return true;
  }

  private pointBlocked(x: number, z: number, padding: number): boolean {
    const limitX = this.arenaMap.size / 2 - padding;
    const limitZ = this.arenaMap.depth / 2 - padding;
    if (x > limitX || x < -limitX || z > limitZ || z < -limitZ) {
      return true;
    }
    for (const obstacle of this.arenaMap.obstacles) {
      const rot = obstacle.rot ?? 0;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const dx = x - obstacle.x;
      const dz = z - obstacle.z;
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;
      if (
        Math.abs(localX) < obstacle.hx + padding &&
        Math.abs(localZ) < obstacle.hz + padding
      ) {
        return true;
      }
    }
    for (const platform of this.arenaMap.platforms) {
      if (
        x > platform.x - platform.hx - padding &&
        x < platform.x + platform.hx + padding &&
        z > platform.z - platform.hz - padding &&
        z < platform.z + platform.hz + padding
      ) {
        return true;
      }
    }
    // Bots treat lethal terrain as solid so path steering never sends them
    // straight through a vent or a slag pool.
    for (const hazard of this.arenaMap.hazards) {
      const clearance = KART.radius + padding;
      if (hazard.radius !== undefined) {
        if (Math.hypot(x - hazard.x, z - hazard.z) < hazard.radius + clearance) {
          return true;
        }
      } else if (
        Math.abs(x - hazard.x) < (hazard.hx ?? 0) + clearance &&
        Math.abs(z - hazard.z) < (hazard.hz ?? 0) + clearance
      ) {
        return true;
      }
    }
    return false;
  }

  private pathBlocked(x: number, z: number, yaw: number, distance: number): boolean {
    const padding = KART.radius + 0.5;
    for (const fraction of [0.35, 0.65, 1]) {
      const px = x + Math.sin(yaw) * distance * fraction;
      const pz = z + Math.cos(yaw) * distance * fraction;
      if (this.pointBlocked(px, pz, padding)) {
        return true;
      }
    }
    return false;
  }

  private nearestPickup(kart: KartActor, maxDistance: number): PickupActor | null {
    let best: PickupActor | null = null;
    let bestDist = maxDistance;
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      const dist =
        Math.hypot(pickup.x - kart.x, pickup.z - kart.z) +
        Math.abs(pickup.y - kart.y) * 0.5;
      if (dist < bestDist) {
        bestDist = dist;
        best = pickup;
      }
    }
    return best;
  }

  private updateBot(kart: KartActor, dt: number) {
    const brain = kart.ai;
    if (!brain) return;
    brain.retargetIn -= dt;
    brain.fireIn -= dt;

    let target = brain.targetId
      ? this.karts.find((other) => other.id === brain.targetId && other.alive) ?? null
      : null;
    if (!target || brain.retargetIn <= 0) {
      target = this.findNearestEnemy(kart);
      brain.targetId = target?.id ?? null;
      brain.retargetIn = 0.7 + Math.random() * 0.9;
    }

    const pickup = this.nearestPickup(kart, 30);
    const needsWeapon = kart.weapon === "none" || kart.ammo <= 0;
    let destinationX = kart.x + Math.sin(kart.yaw) * 20;
    let destinationZ = kart.z + Math.cos(kart.yaw) * 20;

    if (needsWeapon && pickup) {
      destinationX = pickup.x;
      destinationZ = pickup.z;
    } else if (target) {
      const dist = Math.hypot(target.x - kart.x, target.z - kart.z);
      if (dist > 26) {
        destinationX = target.x;
        destinationZ = target.z;
      } else if (dist < 11) {
        destinationX = kart.x - (target.x - kart.x);
        destinationZ = kart.z - (target.z - kart.z);
      } else {
        const angle =
          Math.atan2(kart.z - target.z, kart.x - target.x) + (brain.jitter - 0.5) * 1.6;
        destinationX = target.x + Math.cos(angle) * 18;
        destinationZ = target.z + Math.sin(angle) * 18;
      }
    } else {
      const routes = this.arenaMap.routes;
      if (routes.length > 0) {
        const route = routes[brain.route % routes.length];
        let point = route.waypoints[brain.routePoint % route.waypoints.length];
        if (Math.hypot(point[0] - kart.x, point[1] - kart.z) < 7) {
          brain.routePoint = (brain.routePoint + 1) % route.waypoints.length;
          point = route.waypoints[brain.routePoint];
        }
        destinationX = point[0];
        destinationZ = point[1];
      } else {
        const waypoint =
          this.arenaMap.waypoints[brain.waypoint % this.arenaMap.waypoints.length];
        if (Math.hypot(waypoint[0] - kart.x, waypoint[1] - kart.z) < 7) {
          brain.waypoint = (brain.waypoint + 1) % this.arenaMap.waypoints.length;
        }
        destinationX = waypoint[0];
        destinationZ = waypoint[1];
      }
    }

    // If the direct line is blocked, aim for an open shoulder instead.
    let desiredYaw = Math.atan2(destinationX - kart.x, destinationZ - kart.z);
    let angleDiff = wrapAngle(desiredYaw - kart.yaw);
    const lookAhead = 7 + Math.min(6, Math.abs(kart.speed) * 0.3);
    if (this.pathBlocked(kart.x, kart.z, kart.yaw, lookAhead)) {
      const leftOpen = !this.pathBlocked(kart.x, kart.z, kart.yaw - 0.65, lookAhead);
      const rightOpen = !this.pathBlocked(kart.x, kart.z, kart.yaw + 0.65, lookAhead);
      if (leftOpen && !rightOpen) {
        angleDiff = -0.8;
      } else if (rightOpen && !leftOpen) {
        angleDiff = 0.8;
      } else if (leftOpen === rightOpen) {
        angleDiff = brain.jitter > 0.5 ? 0.95 : -0.95;
      }
    }

    const steer = clamp(angleDiff * 1.9, -1, 1);
    kart.input.steer = clamp(steer + (brain.jitter - 0.5) * 0.12, -1, 1);
    kart.input.throttle = Math.abs(angleDiff) > 1.7 ? 0.45 : 1;
    if (Math.abs(angleDiff) > 2.2 && Math.abs(kart.speed) < 4) {
      kart.input.throttle = -0.75;
      kart.input.steer = -kart.input.steer;
    }
    kart.input.drift =
      Math.abs(angleDiff) > 0.75 && Math.abs(kart.speed) > 12 && brain.jitter > 0.35;

    const fireTarget = target;
    if (fireTarget) {
      const dx = fireTarget.x - kart.x;
      const dz = fireTarget.z - kart.z;
      const dist = Math.hypot(dx, dz);
      const angle = Math.abs(wrapAngle(Math.atan2(dx, dz) - kart.yaw));
      const clear = this.hasLineOfSight(kart.x, kart.z, fireTarget.x, fireTarget.z);
      if (dist < 50 && angle < 0.5 + brain.skill * 0.12 && clear && brain.fireIn <= 0) {
        kart.input.fire = true;
        brain.fireIn = 0.16 + Math.random() * (0.5 - brain.skill * 0.22);
      } else {
        kart.input.fire = false;
      }
    } else {
      kart.input.fire = false;
    }
  }

  private nearPlayer(x: number, z: number, distance: number): boolean {
    return Math.hypot(this.player.x - x, this.player.z - z) < distance;
  }

  private updatePickups(dt: number) {
    for (const pickup of this.pickups) {
      if (pickup.active) continue;
      pickup.timer -= dt;
      if (pickup.timer > 0) continue;
      // Do not respawn a crate underneath a waiting kart.
      const occupied = this.karts.some(
        (kart) =>
          kart.alive &&
          Math.abs(kart.y - pickup.y) < 2.2 &&
          Math.hypot(kart.x - pickup.x, kart.z - pickup.z) < 2.8,
      );
      if (occupied) {
        pickup.timer = 0.5;
        continue;
      }
      pickup.active = true;
      pickup.visual.group.visible = true;
      pickup.visual.group.position.y = pickup.y;
      pickup.phase = Math.random() * Math.PI * 2;
    }
  }

  private updateVisuals(dt: number) {
    for (const kart of this.karts) {
      if (this.role === "online-guest") {
        // Snapshots arrive around 10 Hz; easing between authoritative targets
        // keeps remote karts from teleporting across the arena.
        kart.x = damp(kart.x, kart.netX, 22, dt);
        kart.z = damp(kart.z, kart.netZ, 22, dt);
        kart.y = damp(kart.y, kart.netY, 22, dt);
        kart.yaw = dampAngle(kart.yaw, kart.netYaw, 22, dt);
      }
      const visual = kart.visual;
      if (!kart.alive) {
        visual.group.visible = false;
        continue;
      }
      visual.group.visible = true;
      visual.group.position.set(kart.x, kart.y, kart.z);
      visual.group.rotation.y = kart.yaw;
      paintHealthBar(visual.healthTexture, clamp(kart.hp / KART.hp, 0, 1));

      const speedRatio = clamp(Math.abs(kart.speed) / KART.maxSpeed, 0, 1.4);
      kart.wheelSpin += (kart.speed * dt) / 0.47;
      for (const wheel of visual.wheels) {
        wheel.rotation.x = kart.wheelSpin;
      }
      for (const wheel of visual.frontWheels) {
        wheel.rotation.y = damp(wheel.rotation.y, kart.input.steer * 0.42, 12, dt);
      }

      // Positive steer is a left turn, so lean the body toward the outside of
      // the corner (local -X) instead of into it.
      const targetRoll = kart.input.steer * 0.085 * clamp(speedRatio, 0, 1);
      kart.bodyRoll = damp(kart.bodyRoll, targetRoll, 8, dt);
      visual.body.rotation.z = kart.bodyRoll;
      visual.body.rotation.x = damp(visual.body.rotation.x, -0.015 * speedRatio, 6, dt);

      const boosting = kart.boostTime > 0;
      for (const flame of visual.flames) {
        if (Math.abs(kart.speed) < 1) {
          flame.visible = false;
          continue;
        }
        flame.visible = true;
        const flicker = 0.8 + Math.random() * 0.5;
        const length = (boosting ? 1.8 : 0.7) * flicker + speedRatio * 0.35;
        flame.scale.set(boosting ? 1.25 : 0.75, length, boosting ? 1.25 : 0.75);
      }

      const stars = kart.shieldTime > 0;
      const spawnShield = kart.invuln > 0 && !stars;
      if (stars || spawnShield) {
        visual.shield.visible = true;
        visual.shieldWire.visible = true;
        const pulse = 0.7 + Math.sin(this.elapsed * 6) * 0.2;
        const shieldColor = stars ? WEAPONS.invincibility.css : kart.color;
        (visual.shield.material as THREE.MeshBasicMaterial).color.set(shieldColor);
        (visual.shieldWire.material as THREE.MeshBasicMaterial).color.set(shieldColor);
        (visual.shield.material as THREE.MeshBasicMaterial).opacity = stars
          ? 0.1 + pulse * 0.08
          : 0.035 + pulse * 0.035;
        (visual.shieldWire.material as THREE.MeshBasicMaterial).opacity = stars
          ? 0.16 + pulse * 0.1
          : 0.08 + pulse * 0.06;
        visual.shield.rotation.y += dt * (stars ? 2.1 : 0.6);
        visual.shieldWire.rotation.y -= dt * (stars ? 1.4 : 0.35);
        visual.shieldWire.rotation.x += dt * 0.2;
      } else {
        visual.shield.visible = false;
        visual.shieldWire.visible = false;
      }

      if (kart.spikeTime > 0) {
        visual.spikes.visible = true;
        visual.spikes.rotation.y += dt * 5.2;
        visual.spikes.position.y = 0.9 + Math.sin(this.elapsed * 9) * 0.08;
      } else {
        visual.spikes.visible = false;
      }

      const glowMaterial = visual.boostGlow.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = damp(glowMaterial.opacity, boosting ? 0.34 : 0, 8, dt);
      const glowScale = 1 + Math.sin(this.elapsed * 18) * 0.08 + (boosting ? 0.25 : 0);
      visual.boostGlow.scale.set(glowScale, glowScale, 1);

      // Turrets are decorative now: only the Machine Gun tracks targets, and
      // it does so in flight rather than with a lock-on reticle.
      visual.turret.rotation.y = damp(visual.turret.rotation.y, 0, 12, dt);

      if ((kart.invuln > 0 || stars) && Math.sin(this.elapsed * 30) > 0) {
        visual.tag.visible = false;
      } else {
        visual.tag.visible = !kart.isPlayer;
      }

      const tagBob = Math.sin(this.elapsed * 2 + kart.x) * 0.04;
      visual.tag.position.y = 3.75 + tagBob;
      visual.healthBar.position.y = 3.05 + tagBob;
    }

    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      const bob = Math.sin(this.elapsed * 2 + pickup.phase) * 0.18;
      pickup.visual.crate.position.y = 1.6 + bob;
      pickup.visual.crate.rotation.y += dt * 0.75;
      pickup.visual.halo.position.y = 1.65 + bob * 0.55;
      pickup.visual.halo.rotation.z += dt * 0.7;
      pickup.visual.ring.rotation.z += dt * 0.4;
      const ringScale = 1 + Math.sin(this.elapsed * 2.6 + pickup.phase) * 0.07;
      pickup.visual.ring.scale.set(ringScale, ringScale, 1);
      pickup.visual.column.rotation.y += dt * 0.5;
      const pulse = 0.58 + Math.sin(this.elapsed * 3 + pickup.phase) * 0.18;
      (pickup.visual.ring.material as THREE.MeshBasicMaterial).opacity = pulse;
      (pickup.visual.halo.material as THREE.MeshBasicMaterial).opacity = pulse * 0.8;
      (pickup.visual.glow.material as THREE.SpriteMaterial).opacity = 0.32 + pulse * 0.22;
      (pickup.visual.column.material as THREE.MeshBasicMaterial).opacity = 0.04 + pulse * 0.05;
    }

    for (const trap of this.traps) {
      if (trap.kind === "mine") {
        trap.mesh.rotation.y += dt * 0.6;
        continue;
      }
      if (!trap.pickup) continue;
      const bob = Math.sin(this.elapsed * 2 + trap.phase) * 0.18;
      trap.pickup.crate.position.y = 1.6 + bob;
      trap.pickup.crate.rotation.y += dt * 0.75;
      trap.pickup.halo.position.y = 1.65 + bob * 0.55;
      trap.pickup.halo.rotation.z += dt * 0.7;
      trap.pickup.ring.rotation.z += dt * 0.4;
      const ringScale = 1 + Math.sin(this.elapsed * 2.6 + trap.phase) * 0.07;
      trap.pickup.ring.scale.set(ringScale, ringScale, 1);
      trap.pickup.column.rotation.y += dt * 0.5;
      const pulse = 0.58 + Math.sin(this.elapsed * 3 + trap.phase) * 0.18;
      (trap.pickup.ring.material as THREE.MeshBasicMaterial).opacity = pulse;
      (trap.pickup.halo.material as THREE.MeshBasicMaterial).opacity = pulse * 0.8;
      (trap.pickup.glow.material as THREE.SpriteMaterial).opacity = 0.32 + pulse * 0.22;
      (trap.pickup.column.material as THREE.MeshBasicMaterial).opacity = 0.04 + pulse * 0.05;
    }

    if (this.shockwaves.length > 0) {
      this.shake = Math.max(0, this.shake - dt * 1.6);
    }

    const active = this.mode === "playing" && this.player.alive;
    this.audio.setEngine(
      clamp(Math.abs(this.player.speed) / KART.boostSpeed, 0, 1),
      this.player.boostTime > 0,
      this.player.drifting,
      active,
    );
  }

  private updateCamera(dt: number) {
    const target = this.computeCameraTarget();
    const positionRate = this.mode === "over" ? 2 : 7;
    this.camera.position.lerp(target.position, 1 - Math.exp(-positionRate * dt));
    this.cameraLook.lerp(target.look, 1 - Math.exp(-9 * dt));

    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.4;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.28;
      this.camera.position.z += (Math.random() - 0.5) * this.shake * 0.4;
    }

    this.camera.lookAt(this.cameraLook);
    const targetFov =
      this.fovForAspect() + (this.player.boostTime > 0 && this.player.alive ? 9 : 0);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = damp(this.camera.fov, targetFov, 5, dt);
      this.camera.updateProjectionMatrix();
      this.sparks.setViewport(
        this.renderer.domElement.height,
        this.camera.fov,
      );
      this.smoke.setViewport(this.renderer.domElement.height, this.camera.fov);
    }
  }

  /** Portrait screens need a wider lens so the arena still reads clearly. */
  private fovForAspect(): number {
    const aspect = this.camera.aspect;
    if (aspect < 0.75) return 82;
    if (aspect < 1.15) return 74;
    return 68;
  }

  private computeCameraTarget(): { position: THREE.Vector3; look: THREE.Vector3 } {
    const player = this.player;
    const halfX = this.arenaMap.size / 2;
    const halfZ = this.arenaMap.depth / 2;
    const focus = new THREE.Vector3(player.x, player.y + 1.2, player.z);

    if (!player.alive) {
      const angle = this.elapsed * 0.28 + 1.4;
      const position = new THREE.Vector3(
        player.x + Math.sin(angle) * 12,
        player.y + 8,
        player.z + Math.cos(angle) * 12,
      );
      return { position, look: new THREE.Vector3(player.x, 0.8, player.z) };
    }

    const forwardX = Math.sin(player.yaw);
    const forwardZ = Math.cos(player.yaw);
    const distance = player.boostTime > 0 ? 12.4 : 10.6;
    const position = new THREE.Vector3(
      focus.x - forwardX * distance,
      focus.y + 5.6,
      focus.z - forwardZ * distance,
    );
    // Keep the camera inside the arena walls. When the player is backed against
    // a wall the camera would otherwise sit outside and the wall would hide the
    // kart; lifting it keeps the view over the chassis instead.
    const limitX = halfX - 0.7;
    const limitZ = halfZ - 0.7;
    position.x = clamp(position.x, -limitX, limitX);
    position.z = clamp(position.z, -limitZ, limitZ);
    const horizontalDistance = Math.hypot(position.x - focus.x, position.z - focus.z);
    position.y += Math.max(0, distance - horizontalDistance) * 0.55;
    position.y = Math.max(position.y, 6.4);
    position.y = clamp(position.y, 2.6, 18);

    // Tall crate stacks can sit between the chase camera and the kart. Pull the
    // camera in front of the nearest blocker rather than rendering its back.
    const blockedAt = this.cameraOcclusionT(focus, position);
    if (blockedAt !== null) {
      const t = Math.max(0.14, blockedAt - 0.06);
      position.x = focus.x + (position.x - focus.x) * t;
      position.z = focus.z + (position.z - focus.z) * t;
      position.y = Math.max(position.y, focus.y + 3.6);
    }

    const look = new THREE.Vector3(
      focus.x + forwardX * 4.4,
      focus.y + 0.4,
      focus.z + forwardZ * 4.4,
    );
    look.x = clamp(look.x, -halfX + 1, halfX - 1);
    look.z = clamp(look.z, -halfZ + 1, halfZ - 1);
    return { position, look };
  }

  /**
   * Entry point of the focus-to-camera segment into the nearest tall prop.
   * Returns null when the view is clear.
   */
  private cameraOcclusionT(
    focus: THREE.Vector3,
    camera: THREE.Vector3,
  ): number | null {
    let nearest: number | null = null;
    const padding = 0.35;
    for (const obstacle of this.arenaMap.obstacles) {
      if (!OBSTACLE_RULES[obstacle.kind].solid) continue;
      const base = obstacle.base ?? 0;
      const top = base + obstacle.h;
      if (top < 2.6) continue;

      const rot = obstacle.rot ?? 0;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const fx = focus.x - obstacle.x;
      const fz = focus.z - obstacle.z;
      const cx = camera.x - obstacle.x;
      const cz = camera.z - obstacle.z;
      const localFx = fx * cos - fz * sin;
      const localFz = fx * sin + fz * cos;
      const localCx = cx * cos - cz * sin;
      const localCz = cx * sin + cz * cos;
      const dx = localCx - localFx;
      const dz = localCz - localFz;

      let tMin = 0;
      let tMax = 1;
      let hit = true;
      const axes: Array<[number, number, number, number]> = [
        [localFx, dx, -obstacle.hx - padding, obstacle.hx + padding],
        [localFz, dz, -obstacle.hz - padding, obstacle.hz + padding],
      ];
      for (const [origin, delta, min, max] of axes) {
        if (Math.abs(delta) < 0.000001) {
          if (origin < min || origin > max) {
            hit = false;
            break;
          }
        } else {
          let t1 = (min - origin) / delta;
          let t2 = (max - origin) / delta;
          if (t1 > t2) {
            [t1, t2] = [t2, t1];
          }
          tMin = Math.max(tMin, t1);
          tMax = Math.min(tMax, t2);
          if (tMin > tMax) {
            hit = false;
            break;
          }
        }
      }
      if (!hit || tMin <= 0.02 || tMin >= 1) continue;
      const yAt = focus.y + (camera.y - focus.y) * tMin;
      if (yAt < base - 0.2 || yAt > top + 0.3) continue;
      if (nearest === null || tMin < nearest) nearest = tMin;
    }
    return nearest;
  }

  private snapCamera() {
    const target = this.computeCameraTarget();
    this.camera.position.copy(target.position);
    this.cameraLook.copy(target.look);
    this.camera.lookAt(this.cameraLook);
  }

  private publish() {
    if (this.disposed) {
      return;
    }
    const karts: KartSnapshot[] = this.karts.map((kart) => ({
      id: kart.id,
      name: kart.name,
      color: kart.color,
      isPlayer: kart.isPlayer,
      x: kart.x,
      y: kart.y,
      z: kart.z,
      yaw: kart.yaw,
      hp: Math.max(0, Math.round(kart.hp)),
      shield: kart.shieldTime,
      boost: kart.boostTime,
      slow: kart.slowTime,
      spike: kart.spikeTime,
      weapon: kart.weapon,
      ammo: kart.ammo,
      kills: kart.kills,
      deaths: kart.deaths,
      alive: kart.alive,
      respawnIn: Math.max(0, kart.respawnIn),
      speed: Math.abs(kart.speed),
      drifting: kart.drifting,
      driftCharge: kart.driftCharge,
    }));

    const pickups: PickupSnapshot[] = this.pickups.map((pickup) => ({
      id: pickup.id,
      x: pickup.x,
      z: pickup.z,
      active: pickup.active,
    }));

    this.store.set({
      phase: this.mode,
      mapId: this.arenaMap.id,
      playerId: this.player.id,
      karts,
      pickups,
      timeLeft: this.timeLeft,
      killTarget: this.options.killTarget,
      feed: [...this.feed],
      muted: this.muted,
      matchSeconds:
        this.role === "online-guest" ? this.netMatchSeconds : this.elapsed,
      shots: this.player.shots,
      hits: this.player.hits,
      winner: this.winner,
      fps: this.fps,
    });
  }
}
