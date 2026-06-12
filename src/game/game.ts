import { ENEMY_TYPES, Enemy } from "./enemies";
import { drawHud } from "./hud";
import { Input } from "./input";
import { drawMinimap } from "./minimap";
import { ParticleSystem } from "./particles";
import { PickupSystem } from "./pickups";
import { Player } from "./player";
import {
  drawProjectiles,
  makeEnemyMissile,
  makeEnemyShot,
  makeLaser,
  makeMissile,
  makePlasma,
  makeSniperShot,
  type Projectile,
  updateProjectiles,
} from "./projectiles";
import { loadSave, persistSave, type SaveData } from "./save";
import { SHIP_CLASSES } from "./ships";
import { Starfield } from "./starfield";
import { applyResearch, buyNode } from "./techtree";
import type {
  EnemyKind,
  GameCallbacks,
  GamePhase,
  HudState,
  RunStats,
  ShipClassId,
  UpgradeDef,
  WeaponId,
} from "./types";
import { clamp } from "./types";
import { rollUpgradeChoices, UPGRADES } from "./upgrades";
import { WEAPON_ORDER, WEAPONS } from "./weapons";
import { AnomalyField, NebulaField } from "./world";

const MAX_ENEMIES = 110;
const FIRST_BOSS_AT = 150;
const BOSS_INTERVAL = 170;

interface ActiveEvent {
  id: string;
  timer: number;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameCallbacks;
  private input: Input;
  private starfield = new Starfield();
  private nebulae = new NebulaField();
  private anomalies = new AnomalyField();
  private particles = new ParticleSystem();
  private pickups = new PickupSystem();

  private player = new Player();
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];

  save: SaveData = loadSave();

  phase: GamePhase = "menu";
  private rafId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private spawnTimer = 1;

  private level = 1;
  private xp = 0;
  private runCredits = 0;
  private runMaterials = 0;
  private kills = 0;
  private bossKills = 0;
  private acquiredUpgrades = new Map<string, number>();
  private pendingChoices: UpgradeDef[] = [];
  /** Levels gained but not yet redeemed — each entry rolls 3 new choices. */
  private levelQueue: number[] = [];

  // Weapons & abilities
  private weapon: WeaponId = "laser";
  private abilityCooldown = 0;
  private abilityCooldownMax = 14;
  private overdriveTimer = 0;
  private reconTimer = 0;

  // Bosses & events
  private nextBossAt = FIRST_BOSS_AT;
  private boss: Enemy | null = null;
  private eventTimer = 55;
  private activeEvent: ActiveEvent | null = null;
  private banner: { text: string; sub: string; t: number } | null = null;

  private camX = 0;
  private camY = 0;
  private shake = 0;

  private width = 0;
  private height = 0;
  private resizeObserver: ResizeObserver;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.input = new Input(canvas);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private resize() {
    // Cap DPR at 1.5 — full retina resolution costs too much fill rate
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── Public API (called from React) ────────────────────────────

  startGame(ship?: ShipClassId) {
    const shipId = ship ?? this.save.selectedShip;
    if (ship && this.save.ships.includes(ship)) {
      this.save.selectedShip = ship;
      persistSave(this.save);
    }
    this.player = new Player();
    this.player.ship = shipId;
    applyResearch(this.player.stats, this.save.research);
    SHIP_CLASSES[shipId].applyMods(this.player.stats);
    this.player.health = this.player.stats.maxHealth;
    this.player.shield = this.player.stats.shieldMax;
    this.abilityCooldownMax = SHIP_CLASSES[shipId].ability.cooldown;
    this.abilityCooldown = 0;
    this.overdriveTimer = 0;
    this.reconTimer = 0;
    this.weapon = "laser";

    this.enemies = [];
    this.projectiles = [];
    this.particles = new ParticleSystem();
    this.pickups = new PickupSystem();
    this.anomalies = new AnomalyField();
    this.elapsed = 0;
    this.spawnTimer = 0.8;
    this.level = 1;
    this.xp = 0;
    this.runCredits = 0;
    this.runMaterials = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.nextBossAt = FIRST_BOSS_AT;
    this.boss = null;
    this.eventTimer = 55;
    this.activeEvent = null;
    this.banner = null;
    this.acquiredUpgrades = new Map();
    this.pendingChoices = [];
    this.levelQueue = [];
    this.callbacks.onLevelUp([], 0);
    this.setPhase("playing");
  }

  chooseUpgrade(id: string) {
    const def = this.pendingChoices.find(u => u.id === id);
    if (!def || (this.phase !== "playing" && this.phase !== "paused")) return;
    this.applyUpgrade(def);
    this.pendingChoices = [];
    // More level-ups queued? Roll the next three choices right away.
    if (this.levelQueue.length > 0) this.rollNextChoices();
    else this.callbacks.onLevelUp([], 0);
  }

  /** Pops the next queued level and offers 3 upgrade choices for it. */
  private rollNextChoices() {
    const level = this.levelQueue.shift();
    if (level === undefined) return;
    // Every 5th level guarantees rare+ choices
    this.pendingChoices =
      level % 5 === 0 ? rollUpgradeChoices(3, "rare") : rollUpgradeChoices(3);
    this.callbacks.onLevelUp(this.pendingChoices, this.levelQueue.length);
  }

  private applyUpgrade(def: UpgradeDef) {
    const before = this.player.stats.maxHealth;
    def.apply(this.player.stats);
    if (this.player.stats.maxHealth > before) {
      this.player.health += this.player.stats.maxHealth - before; // heal the bonus
    }
    this.acquiredUpgrades.set(
      def.id,
      (this.acquiredUpgrades.get(def.id) ?? 0) + 1,
    );
  }

  togglePause() {
    if (this.phase === "playing") this.setPhase("paused");
    else if (this.phase === "paused") this.setPhase("playing");
  }

  /** Buy a tech-tree node with banked credits/materials. */
  buyTech(id: string): boolean {
    const ok = buyNode(this.save, id);
    if (ok) persistSave(this.save);
    return ok;
  }

  selectShip(id: ShipClassId) {
    if (!this.save.ships.includes(id)) return;
    this.save.selectedShip = id;
    persistSave(this.save);
  }

  getHudState(): HudState {
    const ability = SHIP_CLASSES[this.player.ship].ability;
    return {
      health: this.player.health,
      maxHealth: this.player.stats.maxHealth,
      shield: this.player.shield,
      shieldMax: this.player.stats.shieldMax,
      xp: this.xp,
      xpToNext: this.xpToNext(),
      level: this.level,
      credits: Math.round(this.runCredits),
      materials: Math.round(this.runMaterials),
      kills: this.kills,
      time: this.elapsed,
      upgrades: this.acquiredUpgrades,
      weapon: this.weapon,
      unlockedWeapons: this.save.weapons,
      abilityName: ability.name,
      abilityIcon: ability.icon,
      abilityCooldown: this.abilityCooldown,
      abilityCooldownMax: this.abilityCooldownMax,
      boss: this.boss
        ? {
            name: this.boss.bossName,
            health: this.boss.health,
            maxHealth: this.boss.maxHealth,
            phase: this.boss.phase,
          }
        : null,
      banner: this.banner,
    };
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.input.destroy();
  }

  // ── Internals ────────────────────────────────────────────────

  private setPhase(phase: GamePhase) {
    this.phase = phase;
    this.callbacks.onPhaseChange(phase);
  }

  private xpToNext(): number {
    return Math.floor(10 * 1.28 ** (this.level - 1));
  }

  /** Difficulty multiplier for enemy health/damage, grows with time. */
  private difficultyMult(): number {
    return 1 + (this.elapsed / 60) * 0.42 + this.bossKills * 0.25;
  }

  private showBanner(text: string, sub: string) {
    this.banner = { text, sub, t: 4 };
  }

  private loop = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (
      this.input.consumePause() &&
      (this.phase === "playing" || this.phase === "paused")
    ) {
      this.togglePause();
    }

    if (this.phase === "playing") {
      this.update(dt);
    }
    this.render(now / 1000);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.elapsed += dt;
    const p = this.player;

    // Keys 1/2/3: pick a pending upgrade if choices are showing,
    // otherwise switch weapons.
    const wkey = this.input.consumeWeapon();
    if (wkey !== null) {
      if (this.pendingChoices.length > 0) {
        const def = this.pendingChoices[wkey];
        if (def) this.chooseUpgrade(def.id);
      } else {
        const target = WEAPON_ORDER[wkey];
        if (target && this.save.weapons.includes(target)) this.weapon = target;
      }
    }

    // Ability
    if (this.abilityCooldown > 0) this.abilityCooldown -= dt;
    if (this.input.consumeAbility() && this.abilityCooldown <= 0) {
      this.activateAbility();
    }
    if (this.overdriveTimer > 0) this.overdriveTimer -= dt;
    if (this.reconTimer > 0) {
      this.reconTimer -= dt;
      if (this.reconTimer <= 0) p.speedBoost = 1;
    }

    p.update(dt, this.input, this.camX, this.camY, this.particles);
    this.updateShooting();
    this.updateSpawning(dt);
    this.updateBossSchedule();
    this.updateEvents(dt);

    // Anomalies
    const effect = this.anomalies.update(dt, p);
    if (effect) this.triggerAnomaly(effect.kind, effect.x, effect.y);

    const slowMult = 1 - p.stats.enemySlow;
    for (const e of this.enemies) {
      e.update(dt, p, this.elapsed, slowMult);
      const d = Math.hypot(e.x - p.x, e.y - p.y);

      // Drain queued shots
      if (e.pendingShots.length > 0) {
        for (const shot of e.pendingShots) {
          if (shot.kind === "sniper") {
            this.projectiles.push(
              makeSniperShot(e.x, e.y, shot.angle, shot.damage),
            );
          } else if (shot.kind === "missile") {
            this.projectiles.push(
              makeEnemyMissile(e.x, e.y, shot.angle, shot.damage),
            );
          } else {
            this.projectiles.push(
              makeEnemyShot(
                e.x,
                e.y,
                shot.angle,
                shot.speed * slowMult,
                shot.damage,
                shot.color,
              ),
            );
          }
        }
        e.pendingShots.length = 0;
      }
      // Boss drone summons
      if (e.pendingSpawns > 0) {
        for (let i = 0; i < e.pendingSpawns; i++) {
          const a = Math.random() * Math.PI * 2;
          this.enemies.push(
            new Enemy(
              "drone",
              e.x + Math.cos(a) * 80,
              e.y + Math.sin(a) * 80,
              this.difficultyMult(),
            ),
          );
        }
        e.pendingSpawns = 0;
      }
      // Warp elite teleport
      if (e.kind === "elite" && e.variant === "warp" && e.warpTimer <= 0) {
        e.warpTimer = 3.2 + Math.random() * 2;
        this.particles.explosion(e.x, e.y, "#f472b6", 0.8);
        const a = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 160;
        e.x = p.x + Math.cos(a) * dist;
        e.y = p.y + Math.sin(a) * dist;
        this.particles.explosion(e.x, e.y, "#f472b6", 0.8);
      }

      // Contact damage
      if (d < e.radius + p.radius && e.contactCooldown <= 0) {
        e.contactCooldown = 0.6;
        this.hitPlayer(e.damage, e, d);
      }
    }

    updateProjectiles(this.projectiles, dt, this.enemies, p, this.particles);
    this.handleProjectileHits();
    this.particles.update(dt);

    // Pickups
    const collected = this.pickups.update(dt, p, p.stats, this.reconTimer > 0);
    if (collected.credits > 0)
      this.runCredits += collected.credits * p.stats.creditBonus;
    if (collected.materials > 0)
      this.runMaterials += collected.materials * p.stats.materialBonus;
    if (collected.healed > 0) {
      p.health = clamp(p.health + collected.healed, 0, p.stats.maxHealth);
    }

    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }

    // Camera follows player with slight lead toward the mouse
    const leadX = (this.input.mouseX - this.width / 2) * 0.12;
    const leadY = (this.input.mouseY - this.height / 2) * 0.12;
    const targetCamX = p.x - this.width / 2 + leadX;
    const targetCamY = p.y - this.height / 2 + leadY;
    const ease = 1 - Math.exp(-8 * dt);
    this.camX += (targetCamX - this.camX) * ease;
    this.camY += (targetCamY - this.camY) * ease;
    this.shake = Math.max(0, this.shake - dt * 30);

    if (p.health <= 0) this.endRun();
  }

  private hitPlayer(damage: number, source: Enemy | null, dist: number) {
    const p = this.player;
    if (p.takeDamage(damage)) {
      this.shake = Math.min(this.shake + 7, 14);
      this.particles.emit({
        x: p.x,
        y: p.y,
        count: 10,
        speed: 160,
        life: 0.4,
        size: 2.4,
        colors: ["#f87171", "#fca5a5", "#ffffff"],
      });
      // Nova Reactor: hull hits emit a retaliatory blast
      if (p.stats.novaDamage > 0) {
        const novaR = 190;
        this.particles.emit({
          x: p.x,
          y: p.y,
          count: 26,
          speed: 420,
          life: 0.45,
          size: 3,
          colors: ["#fde68a", "#fbbf24", "#ffffff"],
        });
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e2 = this.enemies[j];
          if (Math.hypot(e2.x - p.x, e2.y - p.y) < novaR + e2.radius) {
            e2.applyDamage(p.stats.damage * p.stats.novaDamage);
            if (e2.health <= 0) this.killEnemy(j);
          }
        }
      }
      if (source) {
        const kb = 220;
        source.vx -= ((p.x - source.x) / (dist || 1)) * kb;
        source.vy -= ((p.y - source.y) / (dist || 1)) * kb;
      }
    }
  }

  private endRun() {
    const p = this.player;
    this.particles.explosion(p.x, p.y, "#38bdf8", 2.5);
    // Bank run earnings into persistent save
    const credits = Math.round(this.runCredits);
    const materials = Math.round(this.runMaterials);
    this.save.credits += credits;
    this.save.materials += materials;
    this.save.totalRuns += 1;
    this.save.totalKills += this.kills;
    this.save.bossKills += this.bossKills;
    this.save.best.time = Math.max(this.save.best.time, this.elapsed);
    this.save.best.level = Math.max(this.save.best.level, this.level);
    this.save.best.kills = Math.max(this.save.best.kills, this.kills);
    persistSave(this.save);
    this.boss = null;
    this.pendingChoices = [];
    this.levelQueue = [];
    this.callbacks.onLevelUp([], 0);
    this.setPhase("gameover");
    const stats: RunStats = {
      level: this.level,
      credits,
      materials,
      kills: this.kills,
      bossKills: this.bossKills,
      time: this.elapsed,
    };
    this.callbacks.onGameOver(stats);
  }

  // ── Abilities ────────────────────────────────────────────────

  private activateAbility() {
    const p = this.player;
    this.abilityCooldown = this.abilityCooldownMax;
    switch (p.ship) {
      case "fighter":
        this.overdriveTimer = 4;
        this.particles.emit({
          x: p.x,
          y: p.y,
          count: 16,
          speed: 200,
          life: 0.5,
          size: 2.6,
          colors: ["#fb923c", "#fde68a", "#ffffff"],
        });
        break;
      case "interceptor": {
        // Blink toward movement direction (or aim if standing still)
        const axis = this.input.axis();
        const a = axis.x || axis.y ? Math.atan2(axis.y, axis.x) : p.aimAngle;
        this.particles.explosion(p.x, p.y, "#a78bfa", 1.2);
        p.x += Math.cos(a) * 260;
        p.y += Math.sin(a) * 260;
        p.invulnTimer = 0.5;
        this.particles.explosion(p.x, p.y, "#a78bfa", 1.2);
        break;
      }
      case "gunship": {
        // Ring of 16 plasma shells
        const damage = p.stats.damage * 2.2;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          this.projectiles.push(
            makePlasma(
              p.x,
              p.y,
              a,
              p.stats.projectileSpeed * 0.7,
              damage,
              false,
              60,
              0,
            ),
          );
        }
        this.shake = Math.min(this.shake + 6, 14);
        break;
      }
      case "explorer":
        this.reconTimer = 3;
        p.speedBoost = 1.4;
        this.particles.emit({
          x: p.x,
          y: p.y,
          count: 24,
          speed: 380,
          life: 0.6,
          size: 2.4,
          colors: ["#34d399", "#a7f3d0", "#ffffff"],
        });
        break;
    }
  }

  // ── Shooting ─────────────────────────────────────────────────

  private updateShooting() {
    const p = this.player;
    if (!this.input.mouseDown || p.fireCooldown > 0) return;
    const wdef = WEAPONS[this.weapon];
    const fireRate =
      p.stats.fireRate * wdef.rateMult * (this.overdriveTimer > 0 ? 2 : 1);
    p.fireCooldown = 1 / fireRate;

    const n = p.stats.projectileCount;
    const spreadStep = this.weapon === "missile" ? 0.16 : 0.09;
    for (let i = 0; i < n; i++) {
      const offset = (i - (n - 1) / 2) * spreadStep;
      const crit = Math.random() < p.stats.critChance;
      const damage =
        p.stats.damage * wdef.damageMult * (crit ? p.stats.critMultiplier : 1);
      const speed = p.stats.projectileSpeed * wdef.speedMult;
      const muzzleX = p.x + Math.cos(p.aimAngle) * (p.radius + 6);
      const muzzleY = p.y + Math.sin(p.aimAngle) * (p.radius + 6);
      const angle = p.aimAngle + offset;
      if (this.weapon === "laser") {
        this.projectiles.push(
          makeLaser(
            muzzleX,
            muzzleY,
            angle,
            speed,
            damage,
            crit,
            p.stats.pierce,
          ),
        );
      } else if (this.weapon === "plasma") {
        this.projectiles.push(
          makePlasma(
            muzzleX,
            muzzleY,
            angle,
            speed,
            damage,
            crit,
            wdef.splash,
            p.stats.pierce,
          ),
        );
      } else {
        this.projectiles.push(
          makeMissile(
            muzzleX,
            muzzleY,
            angle,
            speed,
            damage,
            crit,
            wdef.splash,
          ),
        );
      }
    }
    // Muzzle flash
    const flashColors =
      this.weapon === "laser"
        ? ["#67e8f9", "#ffffff"]
        : this.weapon === "plasma"
          ? ["#c084fc", "#f0abfc"]
          : ["#fdba74", "#fef3c7"];
    this.particles.emit({
      x: p.x + Math.cos(p.aimAngle) * (p.radius + 8),
      y: p.y + Math.sin(p.aimAngle) * (p.radius + 8),
      count: 3,
      speed: 120,
      life: 0.15,
      size: 2,
      colors: flashColors,
      spread: 0.7,
      baseAngle: p.aimAngle,
    });
  }

  // ── Spawning, bosses & events ────────────────────────────────

  private spawnAt(kind: EnemyKind, angle: number, distMult = 1): Enemy {
    const spawnDist =
      (Math.max(this.width, this.height) * 0.62 + Math.random() * 160) *
      distMult;
    const e = new Enemy(
      kind,
      this.player.x + Math.cos(angle) * spawnDist,
      this.player.y + Math.sin(angle) * spawnDist,
      this.difficultyMult(),
    );
    this.enemies.push(e);
    return e;
  }

  private updateSpawning(dt: number) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0 || this.enemies.length >= MAX_ENEMIES) return;
    const rate = 0.8 + this.elapsed / 120;
    this.spawnTimer = 1 / Math.min(rate, 4);
    this.spawnAt(this.pickEnemyKind(), Math.random() * Math.PI * 2);
  }

  private pickEnemyKind(): EnemyKind {
    const t = this.elapsed;
    const weights: Array<[EnemyKind, number]> = [
      ["scout", 10],
      ["fighter", t > 25 ? 6 : 0],
      ["drone", t > 45 ? 4 : 0],
      ["tank", t > 70 ? 3.5 : 0],
      ["sniper", t > 100 ? 2.5 : 0],
      ["carrier", t > 130 ? 1.6 : 0],
      ["elite", t > 140 ? 1.2 : 0],
    ];
    const total = weights.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [kind, w] of weights) {
      r -= w;
      if (r <= 0) return kind;
    }
    return "scout";
  }

  private updateBossSchedule() {
    if (this.boss && this.boss.health <= 0) this.boss = null;
    if (this.boss || this.elapsed < this.nextBossAt) return;
    this.nextBossAt = this.elapsed + BOSS_INTERVAL;
    this.boss = this.spawnAt("boss", Math.random() * Math.PI * 2, 0.85);
    this.showBanner(
      `⚠ ${this.boss.bossName} ⚠`,
      "A capital ship has entered the sector",
    );
    this.shake = Math.min(this.shake + 10, 14);
  }

  private updateEvents(dt: number) {
    this.eventTimer -= dt;
    if (this.activeEvent) {
      this.activeEvent.timer -= dt;
      if (this.activeEvent.timer <= 0) this.activeEvent = null;
    }
    if (this.eventTimer > 0 || this.boss) return;
    this.eventTimer = 60 + Math.random() * 35;
    const roll = Math.random();
    if (roll < 0.3) {
      this.showBanner("DRONE AMBUSH", "A swarm closes in from all sides");
      for (let i = 0; i < 14; i++)
        this.spawnAt("drone", (i / 14) * Math.PI * 2, 0.8);
    } else if (roll < 0.55) {
      this.showBanner(
        "ELITE CONVOY",
        "High-value targets detected — heavy loot",
      );
      const a = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const e = this.spawnAt("elite", a + (i - 1) * 0.25);
        e.credits *= 2;
        e.materials *= 2;
      }
    } else if (roll < 0.8) {
      this.showBanner("SWARM SURGE", "Scout squadrons inbound");
      for (let i = 0; i < 18; i++)
        this.spawnAt("scout", Math.random() * Math.PI * 2);
    } else {
      this.showBanner("NEBULA BLOOM", "Material yields doubled for 25s");
      this.activeEvent = { id: "bloom", timer: 25 };
    }
  }

  private triggerAnomaly(
    kind: "cache" | "wormhole" | "beacon",
    x: number,
    y: number,
  ) {
    const p = this.player;
    if (kind === "cache") {
      this.showBanner("SUPPLY CACHE", "Salvage recovered");
      this.particles.explosion(x, y, "#fbbf24", 1.6);
      const credits = 40 + Math.round(Math.random() * 60) + this.level * 5;
      this.pickups.dropLoot(x, y, credits, 2 + Math.random() * 2, 0.8);
    } else if (kind === "wormhole") {
      this.showBanner("WORMHOLE TRANSIT", "Spacetime folds around your ship");
      this.particles.explosion(p.x, p.y, "#a78bfa", 2);
      const a = Math.random() * Math.PI * 2;
      p.x += Math.cos(a) * 1400;
      p.y += Math.sin(a) * 1400;
      p.invulnTimer = 1.2;
      this.camX = p.x - this.width / 2;
      this.camY = p.y - this.height / 2;
      this.particles.explosion(p.x, p.y, "#a78bfa", 2);
      // Loot sometimes waits on the far side
      if (Math.random() < 0.5) {
        this.pickups.dropLoot(p.x + 120, p.y, 30, 1.5, 0.4);
      }
    } else {
      // Ancient beacon: grants a random rare/legendary upgrade
      const pool = UPGRADES.filter(u => u.rarity !== "common");
      const def = pool[Math.floor(Math.random() * pool.length)];
      this.applyUpgrade(def);
      this.showBanner("ANCIENT BEACON", `${def.icon} ${def.name} acquired!`);
      this.particles.explosion(x, y, "#fde68a", 2.2);
    }
  }

  // ── Combat resolution ────────────────────────────────────────

  private splashDamage(
    x: number,
    y: number,
    radius: number,
    damage: number,
    exclude: Enemy | null,
  ) {
    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const e = this.enemies[j];
      if (e === exclude) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < radius + e.radius) {
        e.applyDamage(damage * (1 - (d / (radius + e.radius)) * 0.5));
        if (e.health <= 0) this.killEnemy(j);
      }
    }
  }

  private handleProjectileHits() {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      let consumed = false;

      if (proj.friendly) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (proj.hit?.has(e.id)) continue;
          const r = e.radius + proj.radius;
          const dx = e.x - proj.x;
          const dy = e.y - proj.y;
          if (dx * dx + dy * dy < r * r) {
            e.applyDamage(proj.damage);
            if (p.stats.lifesteal > 0) {
              p.health = clamp(
                p.health + proj.damage * p.stats.lifesteal,
                0,
                p.stats.maxHealth,
              );
            }
            this.particles.emit({
              x: proj.x,
              y: proj.y,
              count: proj.crit ? 8 : 4,
              speed: 140,
              life: 0.3,
              size: proj.crit ? 2.6 : 1.8,
              colors: proj.crit
                ? ["#fef08a", "#ffffff"]
                : [proj.color, "#ffffff"],
            });
            // Splash (plasma/missile)
            if (proj.splash > 0) {
              this.particles.explosion(
                proj.x,
                proj.y,
                proj.color,
                proj.splash / 55,
              );
              this.splashDamage(
                proj.x,
                proj.y,
                proj.splash,
                proj.damage * 0.6,
                e,
              );
            }
            // Volatile Munitions: crits explode
            if (proj.crit && p.stats.critExplodeRadius > 0) {
              this.particles.explosion(proj.x, proj.y, "#fbbf24", 1.3);
              this.splashDamage(
                proj.x,
                proj.y,
                p.stats.critExplodeRadius,
                proj.damage * 0.5,
                e,
              );
            }
            if (e.health <= 0) this.killEnemy(this.enemies.indexOf(e));
            // Pierce
            if (proj.hit && proj.pierce > 0) {
              proj.hit.add(e.id);
              proj.pierce--;
            } else {
              consumed = true;
            }
            break;
          }
        }
      } else {
        const r = p.radius + proj.radius;
        const dx = p.x - proj.x;
        const dy = p.y - proj.y;
        if (dx * dx + dy * dy < r * r) {
          this.hitPlayer(proj.damage, null, 0);
          if (proj.kind === "enemyMissile") {
            this.particles.explosion(proj.x, proj.y, "#fda4af", 1.2);
          }
          consumed = true;
        }
      }

      if (consumed) {
        const idx = this.projectiles.indexOf(proj);
        if (idx >= 0) {
          this.projectiles[idx] = this.projectiles[this.projectiles.length - 1];
          this.projectiles.pop();
        }
      }
    }
  }

  private killEnemy(index: number) {
    if (index < 0 || index >= this.enemies.length) return;
    const e = this.enemies[index];
    this.enemies[index] = this.enemies[this.enemies.length - 1];
    this.enemies.pop();
    this.kills++;

    const big = e.kind === "tank" || e.kind === "elite" || e.kind === "carrier";
    this.particles.explosion(
      e.x,
      e.y,
      ENEMY_TYPES[e.kind].glow,
      e.kind === "boss" ? 3.5 : big ? 1.8 : 1,
    );
    if (e.kind === "elite" || e.kind === "boss")
      this.shake = Math.min(this.shake + 8, 16);

    // Loot drops
    const bloomMult = this.activeEvent?.id === "bloom" ? 2 : 1;
    this.pickups.dropLoot(
      e.x,
      e.y,
      e.credits,
      e.materials * bloomMult,
      e.kind === "boss" ? 1 : big ? 0.12 : 0.025,
    );

    if (e.kind === "boss") {
      this.bossKills++;
      this.boss = null;
      this.showBanner("BOSS DESTROYED", "+massive salvage recovered");
    }

    this.xp += e.xp;
    while (this.xp >= this.xpToNext()) {
      this.xp -= this.xpToNext();
      this.level++;
      this.levelQueue.push(this.level);
    }
    // The game keeps running — offer choices if none are showing yet.
    if (this.pendingChoices.length === 0 && this.levelQueue.length > 0) {
      this.rollNextChoices();
    }
  }

  // ── Rendering ────────────────────────────────────────────────

  private render(time: number) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Background
    const bg = ctx.createRadialGradient(
      w / 2,
      h / 2,
      0,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.8,
    );
    bg.addColorStop(0, "#0b1228");
    bg.addColorStop(1, "#05070f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    let camX = this.camX;
    let camY = this.camY;
    if (this.shake > 0) {
      camX += (Math.random() - 0.5) * this.shake;
      camY += (Math.random() - 0.5) * this.shake;
    }

    this.nebulae.draw(ctx, camX, camY, w, h);
    this.starfield.draw(ctx, camX, camY, w, h, time);
    this.anomalies.draw(ctx, camX, camY, w, h, time);
    this.pickups.draw(ctx, camX, camY, w, h, time);
    this.particles.draw(ctx, camX, camY, w, h);
    drawProjectiles(ctx, this.projectiles, camX, camY, w, h, time);
    for (const e of this.enemies) {
      const sx = e.x - camX;
      const sy = e.y - camY;
      const m = e.kind === "boss" ? 200 : 60;
      if (sx < -m || sy < -m || sx > w + m || sy > h + m) continue;
      e.draw(ctx, camX, camY, time);
    }
    if (this.phase !== "gameover" && this.phase !== "menu") {
      this.player.draw(ctx, camX, camY, time);
    }

    if (this.phase !== "menu") {
      drawHud(ctx, w, h, this.getHudState());
      if (this.phase === "playing" || this.phase === "paused") {
        drawMinimap(
          ctx,
          w,
          h,
          this.player,
          this.player.aimAngle,
          this.enemies,
          this.pickups,
          this.anomalies.anomalies,
          this.player.ship === "explorer" ? 1.4 : 1,
          time,
        );
      }
    }

    // Low-health vignette
    const hpFrac = this.player.health / this.player.stats.maxHealth;
    if (this.phase === "playing" && hpFrac < 0.3) {
      const intensity = (0.3 - hpFrac) / 0.3;
      const vg = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.3,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.7,
      );
      vg.addColorStop(0, "rgba(220,38,38,0)");
      vg.addColorStop(
        1,
        `rgba(220,38,38,${clamp(0.35 * intensity * (0.7 + 0.3 * Math.sin(time * 5)), 0, 0.4)})`,
      );
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
