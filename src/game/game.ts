import { ENEMY_TYPES, Enemy } from "./enemies";
import { drawHud } from "./hud";
import { Input } from "./input";
import { ParticleSystem } from "./particles";
import { Player } from "./player";
import {
  drawProjectiles,
  makeEnemyShot,
  makeLaser,
  type Projectile,
  updateProjectiles,
} from "./projectiles";
import { Starfield } from "./starfield";
import type {
  EnemyKind,
  GameCallbacks,
  GamePhase,
  HudState,
  UpgradeDef,
} from "./types";
import { clamp } from "./types";
import { rollUpgradeChoices } from "./upgrades";

const MAX_ENEMIES = 90;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameCallbacks;
  private input: Input;
  private starfield = new Starfield();
  private particles = new ParticleSystem();

  private player = new Player();
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];

  phase: GamePhase = "menu";
  private rafId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private spawnTimer = 1;

  private level = 1;
  private xp = 0;
  private credits = 0;
  private kills = 0;
  private acquiredUpgrades = new Map<string, number>();
  private pendingChoices: UpgradeDef[] = [];

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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── Public API (called from React) ────────────────────────────

  startGame() {
    this.player = new Player();
    this.enemies = [];
    this.projectiles = [];
    this.particles = new ParticleSystem();
    this.elapsed = 0;
    this.spawnTimer = 0.8;
    this.level = 1;
    this.xp = 0;
    this.credits = 0;
    this.kills = 0;
    this.acquiredUpgrades = new Map();
    this.setPhase("playing");
  }

  chooseUpgrade(id: string) {
    const def = this.pendingChoices.find(u => u.id === id);
    if (!def || this.phase !== "levelup") return;
    const before = this.player.stats.maxHealth;
    def.apply(this.player.stats);
    if (this.player.stats.maxHealth > before) {
      this.player.health += this.player.stats.maxHealth - before; // heal the bonus
    }
    this.acquiredUpgrades.set(id, (this.acquiredUpgrades.get(id) ?? 0) + 1);
    this.pendingChoices = [];
    this.setPhase("playing");
  }

  togglePause() {
    if (this.phase === "playing") this.setPhase("paused");
    else if (this.phase === "paused") this.setPhase("playing");
  }

  getHudState(): HudState {
    return {
      health: this.player.health,
      maxHealth: this.player.stats.maxHealth,
      xp: this.xp,
      xpToNext: this.xpToNext(),
      level: this.level,
      credits: this.credits,
      kills: this.kills,
      time: this.elapsed,
      upgrades: this.acquiredUpgrades,
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
    return 1 + (this.elapsed / 60) * 0.4;
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

    p.update(dt, this.input, this.camX, this.camY, this.particles);
    this.updateShooting();
    this.updateSpawning(dt);

    for (const e of this.enemies) {
      e.update(dt, p, this.elapsed);
      const d = Math.hypot(e.x - p.x, e.y - p.y);

      // Enemy ranged attacks
      if (e.tryShoot(d)) {
        const a = e.archetype;
        const baseAngle = Math.atan2(p.y - e.y, p.x - e.x);
        for (let i = 0; i < a.shotCount; i++) {
          const offset = (i - (a.shotCount - 1) / 2) * 0.22;
          this.projectiles.push(
            makeEnemyShot(
              e.x,
              e.y,
              baseAngle + offset,
              a.shotSpeed,
              e.damage * 0.6,
            ),
          );
        }
      }

      // Contact damage
      if (d < e.radius + p.radius && e.contactCooldown <= 0) {
        e.contactCooldown = 0.6;
        if (p.takeDamage(e.damage)) {
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
          // Knock the enemy back a bit
          const kb = 220;
          e.vx -= ((p.x - e.x) / (d || 1)) * kb;
          e.vy -= ((p.y - e.y) / (d || 1)) * kb;
        }
      }
    }

    updateProjectiles(this.projectiles, dt);
    this.handleProjectileHits();
    this.particles.update(dt);

    // Camera follows player with slight lead toward the mouse
    const leadX = (this.input.mouseX - this.width / 2) * 0.12;
    const leadY = (this.input.mouseY - this.height / 2) * 0.12;
    const targetCamX = p.x - this.width / 2 + leadX;
    const targetCamY = p.y - this.height / 2 + leadY;
    const ease = 1 - Math.exp(-8 * dt);
    this.camX += (targetCamX - this.camX) * ease;
    this.camY += (targetCamY - this.camY) * ease;
    this.shake = Math.max(0, this.shake - dt * 30);

    if (p.health <= 0) {
      this.particles.explosion(p.x, p.y, "#38bdf8", 2.5);
      this.setPhase("gameover");
      this.callbacks.onGameOver({
        level: this.level,
        credits: this.credits,
        kills: this.kills,
        time: this.elapsed,
      });
    }
  }

  private updateShooting() {
    const p = this.player;
    if (!this.input.mouseDown || p.fireCooldown > 0) return;
    p.fireCooldown = 1 / p.stats.fireRate;

    const n = p.stats.projectileCount;
    const spreadStep = 0.09;
    for (let i = 0; i < n; i++) {
      const offset = (i - (n - 1) / 2) * spreadStep;
      const crit = Math.random() < p.stats.critChance;
      const damage = p.stats.damage * (crit ? p.stats.critMultiplier : 1);
      const muzzleX = p.x + Math.cos(p.aimAngle) * (p.radius + 6);
      const muzzleY = p.y + Math.sin(p.aimAngle) * (p.radius + 6);
      this.projectiles.push(
        makeLaser(
          muzzleX,
          muzzleY,
          p.aimAngle + offset,
          p.stats.projectileSpeed,
          damage,
          crit,
        ),
      );
    }
    // Muzzle flash
    this.particles.emit({
      x: p.x + Math.cos(p.aimAngle) * (p.radius + 8),
      y: p.y + Math.sin(p.aimAngle) * (p.radius + 8),
      count: 3,
      speed: 120,
      life: 0.15,
      size: 2,
      colors: ["#67e8f9", "#ffffff"],
      spread: 0.7,
      baseAngle: p.aimAngle,
    });
  }

  private updateSpawning(dt: number) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0 || this.enemies.length >= MAX_ENEMIES) return;

    // Spawn rate ramps up over time: ~0.8/s at start → ~3.3/s at 5 min
    const rate = 0.8 + this.elapsed / 120;
    this.spawnTimer = 1 / Math.min(rate, 4);

    const kind = this.pickEnemyKind();
    const angle = Math.random() * Math.PI * 2;
    const spawnDist =
      Math.max(this.width, this.height) * 0.62 + Math.random() * 160;
    const x = this.player.x + Math.cos(angle) * spawnDist;
    const y = this.player.y + Math.sin(angle) * spawnDist;
    this.enemies.push(new Enemy(kind, x, y, this.difficultyMult()));
  }

  private pickEnemyKind(): EnemyKind {
    const t = this.elapsed;
    const weights: Array<[EnemyKind, number]> = [
      ["scout", 10],
      ["fighter", t > 25 ? 6 : 0],
      ["tank", t > 70 ? 3.5 : 0],
      ["elite", t > 140 ? 1 : 0],
    ];
    const total = weights.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [kind, w] of weights) {
      r -= w;
      if (r <= 0) return kind;
    }
    return "scout";
  }

  private handleProjectileHits() {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      let consumed = false;

      if (proj.friendly) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const r = e.radius + proj.radius;
          const dx = e.x - proj.x;
          const dy = e.y - proj.y;
          if (dx * dx + dy * dy < r * r) {
            e.health -= proj.damage;
            e.hitFlash = 0.08;
            this.particles.emit({
              x: proj.x,
              y: proj.y,
              count: proj.crit ? 8 : 4,
              speed: 140,
              life: 0.3,
              size: proj.crit ? 2.6 : 1.8,
              colors: proj.crit
                ? ["#fef08a", "#ffffff"]
                : ["#67e8f9", "#ffffff"],
            });
            if (e.health <= 0) this.killEnemy(j);
            consumed = true;
            break;
          }
        }
      } else {
        const r = p.radius + proj.radius;
        const dx = p.x - proj.x;
        const dy = p.y - proj.y;
        if (dx * dx + dy * dy < r * r) {
          if (p.takeDamage(proj.damage)) {
            this.shake = Math.min(this.shake + 5, 14);
          }
          consumed = true;
        }
      }

      if (consumed) {
        this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
        this.projectiles.pop();
      }
    }
  }

  private killEnemy(index: number) {
    const e = this.enemies[index];
    this.enemies[index] = this.enemies[this.enemies.length - 1];
    this.enemies.pop();
    this.kills++;
    this.credits += e.credits;
    this.particles.explosion(
      e.x,
      e.y,
      ENEMY_TYPES[e.kind].glow,
      e.kind === "tank" || e.kind === "elite" ? 1.8 : 1,
    );
    if (e.kind === "elite") this.shake = Math.min(this.shake + 6, 14);

    this.xp += e.xp;
    while (this.xp >= this.xpToNext() && this.phase === "playing") {
      this.xp -= this.xpToNext();
      this.level++;
      this.pendingChoices = rollUpgradeChoices(3);
      this.setPhase("levelup");
      this.callbacks.onLevelUp(this.pendingChoices);
    }
  }

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

    this.starfield.draw(ctx, camX, camY, w, h, time);
    this.particles.draw(ctx, camX, camY);
    drawProjectiles(ctx, this.projectiles, camX, camY);
    for (const e of this.enemies) {
      // Skip off-screen enemies
      const sx = e.x - camX;
      const sy = e.y - camY;
      if (sx < -60 || sy < -60 || sx > w + 60 || sy > h + 60) continue;
      e.draw(ctx, camX, camY, time);
    }
    if (this.phase !== "gameover" && this.phase !== "menu") {
      this.player.draw(ctx, camX, camY);
    }

    if (this.phase !== "menu") {
      drawHud(ctx, w, h, this.getHudState());
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
