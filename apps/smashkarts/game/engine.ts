import * as THREE from "three";
import { buildArena, groundHeightAt, type ArenaWorld } from "./world";
import { buildKart, disposeObject, type KartVisual } from "./kart-mesh";
import { buildPickup, type PickupVisual } from "./pickup-mesh";
import { GameAudio } from "./audio";
import { ParticleField } from "./particles";
import { createSparkTexture, createSmokeTexture, cssToHex, paintHealthBar } from "./assets";
import { BOT_COLORS, BOT_NAMES, KART, PICKUP_POOL, WEAPONS } from "./constants";
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
  VehicleInput,
  WeaponId,
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
  weapon: WeaponId;
  ammo: number;
  cooldown: number;
  shieldTime: number;
  boostTime: number;
  slowTime: number;
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
  lockId: string | null;
  lastHitBy: string | null;
  lastHitWeapon: WeaponId;
  ai: BotBrain | null;
}

interface Projectile {
  id: number;
  ownerId: string;
  kind: "bolt" | "missile";
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
  life: number;
  damage: number;
  splash: number;
  targetId: string | null;
  mesh: THREE.Object3D;
  /** Guest-only targets copied from the latest host snapshot. */
  netPosition: THREE.Vector3 | null;
  netVelocity: THREE.Vector3 | null;
}

interface MineActor {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  arm: number;
  life: number;
  mesh: THREE.Group;
  lamp: THREE.Mesh;
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
  private readonly mines: MineActor[] = [];
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
  private mineId = 0;
  private shake = 0;
  private muted: boolean;
  private readonly cameraLook = new THREE.Vector3();
  private readonly resizeObserver: ResizeObserver;

  private readonly keys = new Set<string>();
  private keyFire = false;
  private touchSteer = 0;
  private touchThrottle = 0;
  private touchFire = false;

  private readonly role: EngineMode;
  private readonly localPlayerId: string;
  private readonly round: number;
  private readonly onlineRoster = new Map<string, OnlinePlayer>();
  private readonly remoteInputs = new Map<string, VehicleInput>();
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

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
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
    this.sparks = new ParticleField(this.scene, this.sparkTexture, THREE.AdditiveBlending, 520);
    this.smoke = new ParticleField(this.scene, this.smokeTexture, THREE.NormalBlending, 380);

    this.audio = new GameAudio(this.muted);

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
    this.touchSteer = clamp(steer, -1, 1);
    this.touchThrottle = clamp(throttle, -1, 1);
    this.audio.unlock();
  }

  /** Held state of the on-screen fire button. */
  setTouchFire(firing: boolean) {
    this.touchFire = firing;
    if (firing) {
      this.audio.unlock();
    }
  }

  /** Releases the on-screen controls, e.g. when the HUD unmounts. */
  clearTouchInput() {
    this.touchSteer = 0;
    this.touchThrottle = 0;
    this.touchFire = false;
  }

  /** Drops every held control. Used on pause, blur, tab hide and match end. */
  private clearInput() {
    this.keys.clear();
    this.keyFire = false;
    this.clearTouchInput();
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
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    // Touch and mouse fire live on the HUD controls, not the canvas, so taps
    // used to look around or interact with the page never fire a weapon.
    this.renderer.domElement.addEventListener("contextmenu", this.preventContext);
  }

  private removeInput() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.renderer.domElement.removeEventListener("contextmenu", this.preventContext);
  }

  private preventContext = (event: Event) => {
    event.preventDefault();
  };

  private onBlur = () => {
    this.clearInput();
  };

  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    // Never eat keystrokes meant for a text field layered over the canvas.
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }

    const code = event.code;
    // Arrows and Space scroll the page by default. Prevent that before the
    // repeat guard so holding a key down does not start scrolling.
    if (
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "ArrowLeft" ||
      code === "ArrowRight" ||
      code === "Space"
    ) {
      event.preventDefault();
    }
    if (event.repeat) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    this.keys.add(code);
    if (code === "Space") {
      this.keyFire = true;
    }
    this.audio.unlock();
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    if (event.code === "Space") {
      this.keyFire = false;
    }
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
      weapon: "pulse",
      ammo: 0,
      cooldown: 0,
      shieldTime: 0,
      boostTime: 0,
      slowTime: 0,
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
      lockId: null,
      lastHitBy: null,
      lastHitWeapon: "pulse",
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
    return this.weaponBag.pop() ?? "missile";
  }

  private placeAtSpawns() {
    const spawns = shuffle(this.arenaMap.spawns);
    const limit = this.arenaMap.size / 2 - 3;
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
          const candidateX = clamp(spawn[0] + Math.cos(angle) * radius, -limit, limit);
          const candidateZ = clamp(spawn[1] + Math.sin(angle) * radius, -limit, limit);
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
    kart.weapon = "pulse";
    kart.ammo = 0;
    kart.cooldown = 0;
    kart.shieldTime = 0;
    kart.boostTime = 0;
    kart.slowTime = 0;
    kart.invuln = KART.spawnProtection;
    kart.alive = true;
    kart.drifting = false;
    kart.driftCharge = 0;
    kart.lastHitBy = null;
    kart.lockId = null;
    kart.visual.group.visible = true;
    kart.visual.group.position.set(x, kart.y, z);
    kart.visual.group.rotation.y = kart.yaw;
    kart.visual.shield.visible = false;
    kart.visual.shieldWire.visible = false;
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
      this.animateGuestMines();
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
      this.collectPickups(kart);
      this.tryFire(kart);
    }

    this.resolveKartCollisions();
    this.updateProjectiles(dt);
    this.updateMines(dt);
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
    const up = this.keys.has("KeyW") || this.keys.has("ArrowUp");
    const down = this.keys.has("KeyS") || this.keys.has("ArrowDown");
    const left = this.keys.has("KeyA") || this.keys.has("ArrowLeft");
    const right = this.keys.has("KeyD") || this.keys.has("ArrowRight");
    const keyboardThrottle = (up ? 1 : 0) - (down ? 1 : 0);
    const keyboardSteer = (right ? 1 : 0) - (left ? 1 : 0);

    this.player.input.throttle = clamp(
      keyboardThrottle + this.touchThrottle,
      -1,
      1,
    );
    // Joystick and keyboard are both screen-space: +1 means right. The kart
    // simulation uses the opposite sign (positive steer turns left in world
    // space), so invert exactly once here. Bots keep their world-space input.
    this.player.input.steer = -clamp(keyboardSteer + this.touchSteer, -1, 1);
    // Drift is automatic: a hard turn at speed charges the mini-turbo, so the
    // whole game needs only movement and fire.
    this.player.input.drift =
      Math.abs(this.player.input.steer) > 0.55 && Math.abs(this.player.speed) > 7;
    this.player.input.fire = this.keyFire || this.touchFire;
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
    this.lastSentInput = input;
    this.options.onInput(input);
  }

  /** Applies a guest's controls to its kart on the authoritative host. */
  setRemoteInput(playerId: string, input: SmashInput) {
    if (this.role !== "online-host" || playerId === this.localPlayerId) return;
    const kart = this.karts.find((entry) => entry.id === playerId);
    if (!kart) return;
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
      this.karts.splice(index, 1);
    }

    const local = this.karts.find((kart) => kart.id === this.localPlayerId);
    if (local) this.player = local;
  }

  private findOpenSpawn(): [number, number] {
    const limit = this.arenaMap.size / 2 - 4;
    const spawns = this.arenaMap.spawns;
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const spawn = spawns[attempt % spawns.length];
      const ring = Math.floor(attempt / spawns.length);
      const angle = attempt * 2.399963;
      const radius = ring === 0 ? 0 : 2.2 + ring * 1.8;
      const x = clamp(spawn[0] + Math.cos(angle) * radius, -limit, limit);
      const z = clamp(spawn[1] + Math.sin(angle) * radius, -limit, limit);
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
    this.mineId = snapshot.mines.reduce((max, mine) => Math.max(max, mine.id), this.mineId);

    // Projectiles and mines are transient: dropping them avoids handing a new
    // host half-simulated explosions it never authored.
    this.clearGuestProjectiles();
    this.clearGuestMines();
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
    this.syncGuestMines(snapshot);

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
        const mesh = state.kind === "missile" ? this.buildMissileMesh() : this.buildBoltMesh(WEAPONS.pulse.color);
        this.scene.add(mesh);
        projectile = {
          id: state.id,
          ownerId: "",
          kind: state.kind,
          position: new THREE.Vector3(state.x, state.y, state.z),
          velocity: new THREE.Vector3(state.vx, state.vy, state.vz),
          speed: Math.hypot(state.vx, state.vy, state.vz) || 1,
          life: 1,
          damage: 0,
          splash: 0,
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

  private syncGuestMines(snapshot: SmashMatchSnapshot) {
    const seen = new Set<number>();
    for (const state of snapshot.mines) {
      seen.add(state.id);
      if (this.mines.some((mine) => mine.id === state.id)) continue;
      const { group, lamp } = this.buildMineVisual(state.x, state.z, state.y);
      this.scene.add(group);
      this.mines.push({
        id: state.id,
        ownerId: "",
        x: state.x,
        y: state.y,
        z: state.z,
        arm: 0,
        life: 1,
        mesh: group,
        lamp,
      });
    }
    for (let index = this.mines.length - 1; index >= 0; index -= 1) {
      const mine = this.mines[index];
      if (seen.has(mine.id)) continue;
      mine.mesh.removeFromParent();
      disposeObject(mine.mesh);
      this.mines.splice(index, 1);
    }
  }

  private clearGuestProjectiles() {
    for (const projectile of this.projectiles) {
      projectile.mesh.removeFromParent();
      disposeObject(projectile.mesh);
    }
    this.projectiles.length = 0;
  }

  private clearGuestMines() {
    for (const mine of this.mines) {
      mine.mesh.removeFromParent();
      disposeObject(mine.mesh);
    }
    this.mines.length = 0;
  }

  private interpolateGuestProjectiles(dt: number) {
    const rate = 1 - Math.exp(-22 * dt);
    for (const projectile of this.projectiles) {
      if (!projectile.netPosition) continue;
      projectile.position.lerp(projectile.netPosition, rate);
      projectile.mesh.position.copy(projectile.position);
    }
  }

  private animateGuestMines() {
    for (const mine of this.mines) {
      const material = mine.lamp.material as THREE.MeshBasicMaterial;
      material.transparent = true;
      material.opacity = Math.sin(this.elapsed * 7) > 0 ? 1 : 0.15;
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
      weapon: kart.weapon,
      ammo: kart.weapon === "pulse" ? 0 : kart.ammo,
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
      mines: this.mines.map((mine) => ({ id: mine.id, x: mine.x, y: mine.y, z: mine.z })),
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
    if (rise > 0.6) {
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
    const limit = this.arenaMap.size / 2 - KART.radius - 0.3;
    if (kart.x > limit) {
      kart.x = limit;
      if (kart.vx > 0) kart.vx *= -0.28;
    } else if (kart.x < -limit) {
      kart.x = -limit;
      if (kart.vx < 0) kart.vx *= -0.28;
    }
    if (kart.z > limit) {
      kart.z = limit;
      if (kart.vz > 0) kart.vz *= -0.28;
    } else if (kart.z < -limit) {
      kart.z = -limit;
      if (kart.vz < 0) kart.vz *= -0.28;
    }

    for (const obstacle of this.arenaMap.obstacles) {
      if (kart.y > obstacle.h * 0.85) {
        continue;
      }
      const nearestX = clamp(kart.x, obstacle.x - obstacle.hx, obstacle.x + obstacle.hx);
      const nearestZ = clamp(kart.z, obstacle.z - obstacle.hz, obstacle.z + obstacle.hz);
      let dx = kart.x - nearestX;
      let dz = kart.z - nearestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= KART.radius * KART.radius) {
        continue;
      }
      let normalX: number;
      let normalZ: number;
      let penetration: number;
      if (distSq > 0.000001) {
        const dist = Math.sqrt(distSq);
        normalX = dx / dist;
        normalZ = dz / dist;
        penetration = KART.radius - dist;
      } else {
        const toRight = obstacle.x + obstacle.hx - kart.x;
        const toLeft = kart.x - (obstacle.x - obstacle.hx);
        const toFront = obstacle.z + obstacle.hz - kart.z;
        const toBack = kart.z - (obstacle.z - obstacle.hz);
        const minimum = Math.min(toRight, toLeft, toFront, toBack);
        if (minimum === toRight) {
          normalX = 1;
          normalZ = 0;
          penetration = toRight + KART.radius;
        } else if (minimum === toLeft) {
          normalX = -1;
          normalZ = 0;
          penetration = toLeft + KART.radius;
        } else if (minimum === toFront) {
          normalX = 0;
          normalZ = 1;
          penetration = toFront + KART.radius;
        } else {
          normalX = 0;
          normalZ = -1;
          penetration = toBack + KART.radius;
        }
      }
      kart.x += normalX * penetration;
      kart.z += normalZ * penetration;
      const velocityAlongNormal = kart.vx * normalX + kart.vz * normalZ;
      if (velocityAlongNormal < 0) {
        kart.vx -= velocityAlongNormal * normalX * 1.22;
        kart.vz -= velocityAlongNormal * normalZ * 1.22;
        if (Math.abs(velocityAlongNormal) > 7) {
          this.sparks.burst(nearestX, 0.7, nearestZ, 0xffc233, 6, 6, 0.4, 0.3, 10);
        }
      }
    }
  }

  private resolveKartCollisions() {
    const diameter = KART.radius * 2;
    for (let i = 0; i < this.karts.length; i += 1) {
      const a = this.karts[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.karts.length; j += 1) {
        const b = this.karts[j];
        if (!b.alive) continue;
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

  private collectPickups(kart: KartActor) {
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      const dx = kart.x - pickup.x;
      const dz = kart.z - pickup.z;
      if (dx * dx + dz * dz > 3.4 * 3.4) continue;
      pickup.active = false;
      pickup.timer = 9;
      pickup.visual.group.visible = false;
      kart.weapon = pickup.weapon;
      kart.ammo = WEAPONS[pickup.weapon].ammo;
      kart.cooldown = Math.min(kart.cooldown, 0.2);
      if (kart.isPlayer) {
        this.audio.pickup();
        this.sparks.burst(pickup.x, 1.2, pickup.z, WEAPONS[pickup.weapon].color, 18, 8, 0.5, 0.6, 5);
      }
    }
  }

  private tryFire(kart: KartActor) {
    if (!kart.alive || kart.cooldown > 0) {
      return;
    }
    let weapon = kart.weapon;
    if (weapon !== "pulse" && kart.ammo <= 0) {
      weapon = "pulse";
      kart.weapon = "pulse";
    }
    const spec = WEAPONS[weapon];
    const isProjectile = weapon === "pulse" || weapon === "missile" || weapon === "mine";
    if (isProjectile && !kart.input.fire) {
      return;
    }
    if (!isProjectile && !kart.firePressed) {
      return;
    }

    if (weapon === "pulse") {
      this.fireBolt(kart);
      kart.cooldown = spec.cooldown;
      if (kart.isPlayer) {
        kart.shots += 1;
        this.audio.shot();
      } else if (this.nearPlayer(kart.x, kart.z, 45)) {
        this.audio.shot();
      }
    } else if (weapon === "missile") {
      this.fireMissile(kart);
      kart.ammo -= 1;
      kart.cooldown = spec.cooldown;
      if (kart.isPlayer) {
        kart.shots += 1;
        this.audio.missile();
      }
    } else if (weapon === "mine") {
      this.dropMine(kart);
      kart.ammo -= 1;
      kart.cooldown = spec.cooldown;
      if (kart.isPlayer) {
        this.audio.missile();
      }
    } else if (weapon === "shield") {
      kart.ammo -= 1;
      kart.cooldown = spec.cooldown;
      kart.shieldTime = 7;
      this.audio.shield();
      this.sparks.burst(kart.x, 1.2, kart.z, 0x2fd4c8, 22, 7, 0.55, 0.7, 2);
    } else if (weapon === "turbo") {
      kart.ammo -= 1;
      kart.cooldown = spec.cooldown;
      kart.boostTime = Math.max(kart.boostTime, 2.6);
      kart.vx += Math.sin(kart.yaw) * 7;
      kart.vz += Math.cos(kart.yaw) * 7;
      this.audio.boost();
      this.sparks.burst(kart.x, 0.5, kart.z, 0xa8e10c, 18, 8, 0.5, 0.5, 6);
    } else if (weapon === "shock") {
      kart.ammo -= 1;
      kart.cooldown = spec.cooldown;
      this.triggerShock(kart);
    }

    if (kart.ammo <= 0 && kart.weapon !== "pulse") {
      kart.weapon = "pulse";
      kart.ammo = 0;
    }
  }

  private fireBolt(kart: KartActor) {
    const target = this.findAimTarget(kart);
    const aim = this.aimPoint(kart, target);
    const origin = new THREE.Vector3(
      kart.x + Math.sin(kart.yaw) * 1.3,
      kart.y + 2.15,
      kart.z + Math.cos(kart.yaw) * 1.3,
    );
    const direction = aim.clone().sub(origin).normalize();
    const mesh = this.buildBoltMesh(WEAPONS.pulse.color);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    this.scene.add(mesh);
    this.projectiles.push({
      id: ++this.projectileId,
      ownerId: kart.id,
      kind: "bolt",
      position: origin,
      velocity: direction.clone().multiplyScalar(92),
      speed: 92,
      life: 1.15,
      damage: 7,
      splash: 0,
      targetId: null,
      mesh,
      netPosition: null,
      netVelocity: null,
    });
    this.sparks.spawn({
      x: origin.x,
      y: origin.y,
      z: origin.z,
      vx: direction.x * 3,
      vy: direction.y * 3,
      vz: direction.z * 3,
      color: 0xfff0b0,
      size: 0.7,
      life: 0.12,
      gravity: 0,
    });
  }

  private fireMissile(kart: KartActor) {
    const target = this.findAimTarget(kart, 0.95, 78);
    const aim = this.aimPoint(kart, target);
    const origin = new THREE.Vector3(
      kart.x + Math.sin(kart.yaw) * 1.2,
      kart.y + 2.15,
      kart.z + Math.cos(kart.yaw) * 1.2,
    );
    const direction = aim.clone().sub(origin).normalize();
    const mesh = this.buildMissileMesh();
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    this.scene.add(mesh);
    this.projectiles.push({
      id: ++this.projectileId,
      ownerId: kart.id,
      kind: "missile",
      position: origin,
      velocity: direction.clone().multiplyScalar(46),
      speed: 46,
      life: 3.2,
      damage: 32,
      splash: 7,
      targetId: target?.id ?? null,
      mesh,
      netPosition: null,
      netVelocity: null,
    });
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

  private buildMineVisual(x: number, z: number): { group: THREE.Group; lamp: THREE.Mesh } {
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
    group.position.set(x, 0, z);
    return { group, lamp };
  }

  private dropMine(kart: KartActor) {
    if (this.mines.length >= 10) {
      const oldest = this.mines.shift();
      if (oldest) {
        oldest.mesh.removeFromParent();
        disposeObject(oldest.mesh);
      }
    }
    const x = kart.x - Math.sin(kart.yaw) * 2.3;
    const z = kart.z - Math.cos(kart.yaw) * 2.3;
    const { group, lamp } = this.buildMineVisual(x, z);
    this.scene.add(group);
    this.mines.push({
      id: ++this.mineId,
      ownerId: kart.id,
      x,
      z,
      arm: 0.8,
      life: 22,
      mesh: group,
      lamp,
    });
  }

  private triggerShock(kart: KartActor) {
    const radius = 17;
    this.createShockwave(kart.x, kart.z, WEAPONS.shock.color, radius, 0.55);
    this.audio.shock();
    this.shake = Math.max(this.shake, 0.6);
    for (const other of this.karts) {
      if (!other.alive || other.id === kart.id) continue;
      const dx = other.x - kart.x;
      const dz = other.z - kart.z;
      if (dx * dx + dz * dz > radius * radius) continue;
      if (!this.hasLineOfSight(kart.x, kart.z, other.x, other.z)) continue;
      other.slowTime = Math.max(other.slowTime, 2.6);
      this.damageKart(other, 16, kart.id, "shock");
    }
    this.sparks.burst(kart.x, 1.1, kart.z, WEAPONS.shock.color, 36, 15, 0.6, 0.7, 0);
  }

  private updateProjectiles(dt: number) {
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.life -= dt;

      if (projectile.kind === "missile" && projectile.targetId) {
        const target = this.karts.find((kart) => kart.id === projectile.targetId);
        if (target && target.alive) {
          const desired = new THREE.Vector3(target.x, target.y + 1.1, target.z)
            .sub(projectile.position)
            .normalize();
          const current = projectile.velocity.clone().normalize();
          const angle = current.angleTo(desired);
          const turn = 3.1 * dt;
          if (angle > 0.0001) {
            const next = current.lerp(desired, Math.min(1, turn / angle)).normalize();
            projectile.velocity.copy(next.multiplyScalar(projectile.speed));
          }
        }
      }

      projectile.position.addScaledVector(projectile.velocity, dt);
      projectile.mesh.position.copy(projectile.position);
      if (projectile.kind === "missile") {
        projectile.mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          projectile.velocity.clone().normalize(),
        );
        if (Math.random() > 0.35) {
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
      } else if (Math.random() > 0.5) {
        this.sparks.spawn({
          x: projectile.position.x,
          y: projectile.position.y,
          z: projectile.position.z,
          vx: 0,
          vy: 0,
          vz: 0,
          color: WEAPONS.pulse.color,
          size: 0.28,
          life: 0.16,
          gravity: 0,
        });
      }

      let hit = false;
      if (projectile.life <= 0) {
        hit = true;
      }

      if (!hit) {
        const half = this.arenaMap.size / 2;
        if (
          Math.abs(projectile.position.x) > half ||
          Math.abs(projectile.position.z) > half ||
          projectile.position.y < 0.1
        ) {
          hit = true;
        }
      }

      if (!hit) {
        for (const obstacle of this.arenaMap.obstacles) {
          if (projectile.position.y > obstacle.h) continue;
          if (
            Math.abs(projectile.position.x - obstacle.x) < obstacle.hx + 0.2 &&
            Math.abs(projectile.position.z - obstacle.z) < obstacle.hz + 0.2
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
          if (dx * dx + dz * dz < 2.1 * 2.1 && Math.abs(kart.y + 1.1 - projectile.position.y) < 2.2) {
            hit = true;
            break;
          }
        }
      }

      if (hit) {
        if (projectile.splash > 0) {
          this.explode(
            projectile.position.x,
            projectile.position.z,
            projectile.splash,
            projectile.damage,
            projectile.ownerId,
            "missile",
          );
        } else {
          const victim = this.karts.find((kart) => {
            if (!kart.alive || kart.id === projectile.ownerId) return false;
            const dx = kart.x - projectile.position.x;
            const dz = kart.z - projectile.position.z;
            return dx * dx + dz * dz < 2.2 * 2.2;
          });
          if (victim) {
            this.damageKart(victim, projectile.damage, projectile.ownerId, "pulse");
            this.sparks.burst(projectile.position.x, projectile.position.y, projectile.position.z, 0xffc233, 6, 5, 0.35, 0.3, 6);
          } else if (projectile.life <= 0) {
            this.sparks.burst(projectile.position.x, projectile.position.y, projectile.position.z, 0xffc233, 3, 2, 0.25, 0.2, 4);
          }
        }
        projectile.mesh.removeFromParent();
        disposeObject(projectile.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateMines(dt: number) {
    for (let i = this.mines.length - 1; i >= 0; i -= 1) {
      const mine = this.mines[i];
      mine.arm = Math.max(0, mine.arm - dt);
      mine.life -= dt;
      const material = mine.lamp.material as THREE.MeshBasicMaterial;
      const blink = Math.sin(this.elapsed * (mine.arm > 0 ? 20 : 7)) > 0 ? 1 : 0.15;
      material.opacity = blink;
      material.transparent = true;

      let detonate = mine.life <= 0;
      if (mine.arm <= 0) {
        for (const kart of this.karts) {
          if (!kart.alive) continue;
          const dx = kart.x - mine.x;
          const dz = kart.z - mine.z;
          if (dx * dx + dz * dz < 2.7 * 2.7) {
            detonate = true;
            break;
          }
        }
      }

      if (detonate) {
        this.explode(mine.x, mine.z, 7.5, 52, mine.ownerId, "mine");
        mine.mesh.removeFromParent();
        disposeObject(mine.mesh);
        this.mines.splice(i, 1);
      }
    }
  }

  private explode(
    x: number,
    z: number,
    radius: number,
    damage: number,
    ownerId: string,
    weapon: WeaponId,
  ) {
    this.createShockwave(x, z, weapon === "mine" ? 0xe83f8b : 0xff7a1f, radius, 0.5);
    this.sparks.burst(x, 1, z, 0xffb347, 30, 13, 0.7, 0.55, 9);
    this.sparks.burst(x, 1, z, weapon === "mine" ? 0xe83f8b : 0xff5a1f, 16, 9, 0.5, 0.45, 5);
    this.smoke.burst(x, 1.1, z, 0x3b352e, 20, 5, 2.6, 1.3, -2);
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

  private createShockwave(x: number, z: number, color: number, radius: number, duration: number) {
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
    mesh.position.set(x, 0.18, z);
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
      this.sparks.burst(target.x, 1.2, target.z, 0x2fd4c8, 8, 6, 0.35, 0.3, 4);
      if (target.isPlayer) {
        this.audio.shield();
      }
      return;
    }
    target.hp -= amount;
    target.lastHitBy = ownerId;
    target.lastHitWeapon = weapon;

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
    victim.boostTime = 0;
    victim.shieldTime = 0;
    victim.drifting = false;
    victim.driftCharge = 0;

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
    });
    if (this.feed.length > 6) {
      this.feed.length = 6;
    }

    this.explode(
      victim.x,
      victim.z,
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
    this.sparks.burst(bestX, 1, bestZ, cssToHex(kart.color), 24, 8, 0.6, 0.6, 2);
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

  private findAimTarget(kart: KartActor, cone = 0.9, range = 62): KartActor | null {
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

  private aimPoint(kart: KartActor, target: KartActor | null): THREE.Vector3 {
    if (target) {
      return new THREE.Vector3(target.x, target.y + 1.15, target.z);
    }
    return new THREE.Vector3(
      kart.x + Math.sin(kart.yaw) * 40,
      kart.y + 1.6,
      kart.z + Math.cos(kart.yaw) * 40,
    );
  }

  private hasLineOfSight(x1: number, z1: number, x2: number, z2: number): boolean {
    for (const obstacle of this.arenaMap.obstacles) {
      if (obstacle.h < 1.5) continue;
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
    obstacle: { x: number; z: number; hx: number; hz: number },
  ): boolean {
    const dx = x2 - x1;
    const dz = z2 - z1;
    let tMin = 0;
    let tMax = 1;
    const axes: Array<[number, number, number, number]> = [
      [x1, dx, obstacle.x - obstacle.hx, obstacle.x + obstacle.hx],
      [z1, dz, obstacle.z - obstacle.hz, obstacle.z + obstacle.hz],
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
    const limit = this.arenaMap.size / 2 - padding;
    if (x > limit || x < -limit || z > limit || z < -limit) {
      return true;
    }
    for (const obstacle of this.arenaMap.obstacles) {
      if (
        x > obstacle.x - obstacle.hx - padding &&
        x < obstacle.x + obstacle.hx + padding &&
        z > obstacle.z - obstacle.hz - padding &&
        z < obstacle.z + obstacle.hz + padding
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
      const dist = Math.hypot(pickup.x - kart.x, pickup.z - kart.z);
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
    const needsWeapon = kart.weapon === "pulse" || kart.ammo <= 0;
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
      const waypoint = this.arenaMap.waypoints[brain.waypoint % this.arenaMap.waypoints.length];
      if (Math.hypot(waypoint[0] - kart.x, waypoint[1] - kart.z) < 7) {
        brain.waypoint = (brain.waypoint + 1) % this.arenaMap.waypoints.length;
      }
      destinationX = waypoint[0];
      destinationZ = waypoint[1];
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
      if (pickup.timer <= 0) {
        pickup.active = true;
        pickup.visual.group.visible = true;
        pickup.phase = Math.random() * Math.PI * 2;
      }
    }
  }

  private updateVisuals(dt: number) {
    for (const kart of this.karts) {
      if (this.role === "online-guest") {
        // Snapshots arrive around 10 Hz; easing between authoritative targets
        // keeps remote karts from teleporting across the arena.
        kart.x = damp(kart.x, kart.netX, 22, dt);
        kart.z = damp(kart.z, kart.netZ, 22, dt);
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

      const shielded = kart.shieldTime > 0 || kart.invuln > 0;
      if (shielded) {
        visual.shield.visible = true;
        visual.shieldWire.visible = true;
        const pulse = 0.7 + Math.sin(this.elapsed * 6) * 0.2;
        const spawnShield = kart.invuln > 0 && kart.shieldTime <= 0;
        const shieldColor = spawnShield ? kart.color : "#2fd4c8";
        (visual.shield.material as THREE.MeshBasicMaterial).color.set(shieldColor);
        (visual.shieldWire.material as THREE.MeshBasicMaterial).color.set(shieldColor);
        (visual.shield.material as THREE.MeshBasicMaterial).opacity = spawnShield
          ? 0.035 + pulse * 0.035
          : 0.07 + pulse * 0.06;
        (visual.shieldWire.material as THREE.MeshBasicMaterial).opacity = spawnShield
          ? 0.08 + pulse * 0.06
          : 0.1 + pulse * 0.08;
        visual.shield.rotation.y += dt * 0.6;
        visual.shieldWire.rotation.y -= dt * 0.35;
        visual.shieldWire.rotation.x += dt * 0.2;
      } else {
        visual.shield.visible = false;
        visual.shieldWire.visible = false;
      }

      const glowMaterial = visual.boostGlow.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = damp(glowMaterial.opacity, boosting ? 0.34 : 0, 8, dt);
      const glowScale = 1 + Math.sin(this.elapsed * 18) * 0.08 + (boosting ? 0.25 : 0);
      visual.boostGlow.scale.set(glowScale, glowScale, 1);

      const target =
        this.role === "local" || kart.id === this.localPlayerId
          ? this.findAimTarget(kart)
          : null;
      kart.lockId = target?.id ?? null;
      let aimYaw = kart.yaw;
      if (target) {
        aimYaw = Math.atan2(target.x - kart.x, target.z - kart.z);
      }
      const relative = clamp(wrapAngle(aimYaw - kart.yaw), -0.9, 0.9);
      visual.turret.rotation.y = damp(visual.turret.rotation.y, relative, 12, dt);

      if (kart.invuln > 0 && Math.sin(this.elapsed * 30) > 0) {
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
      pickup.visual.group.rotation.y += dt * 0.2;
      pickup.visual.group.position.y = Math.sin(this.elapsed * 1.6 + pickup.phase) * 0.05;
      const bob = Math.sin(this.elapsed * 2 + pickup.phase) * 0.16;
      pickup.visual.icon.position.y = 2.5 + bob;
      pickup.visual.icon.rotation.y += dt * 1.4;
      pickup.visual.ring.rotation.z += dt * 0.8;
      pickup.visual.column.rotation.y += dt * 0.4;
      const pulse = 0.65 + Math.sin(this.elapsed * 3 + pickup.phase) * 0.16;
      (pickup.visual.ring.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    for (const mine of this.mines) {
      mine.mesh.rotation.y += dt * 0.6;
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
    const half = this.arenaMap.size / 2;
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
    const limit = half + 3.6;
    position.x = clamp(position.x, -limit, limit);
    position.z = clamp(position.z, -limit, limit);
    position.y = Math.max(position.y, 6.4);
    position.y = clamp(position.y, 2.6, 16);

    const look = new THREE.Vector3(
      focus.x + forwardX * 4.4,
      focus.y + 0.4,
      focus.z + forwardZ * 4.4,
    );
    look.x = clamp(look.x, -half + 1, half - 1);
    look.z = clamp(look.z, -half + 1, half - 1);
    return { position, look };
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
      weapon: kart.weapon,
      ammo: kart.weapon === "pulse" ? 0 : kart.ammo,
      kills: kart.kills,
      deaths: kart.deaths,
      alive: kart.alive,
      respawnIn: Math.max(0, kart.respawnIn),
      speed: Math.abs(kart.speed),
      drifting: kart.drifting,
      driftCharge: kart.driftCharge,
      locked: kart.lockId === kart.id ? false : Boolean(kart.lockId),
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
      aimTargetId: this.player.lockId,
      matchSeconds:
        this.role === "online-guest" ? this.netMatchSeconds : this.elapsed,
      shots: this.player.shots,
      hits: this.player.hits,
      winner: this.winner,
      fps: this.fps,
    });
  }
}
