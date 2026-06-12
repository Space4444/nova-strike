import { drawSprite, getEnemySprite } from "./sprites";
import type { EliteVariant, EnemyKind, Vec2 } from "./types";

export interface PendingShot {
  angle: number;
  speed: number;
  damage: number;
  kind: "bolt" | "sniper" | "missile";
  color?: string;
}

interface EnemyArchetype {
  health: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
  credits: number;
  materials: number; // average materials dropped
  glow: string;
}

export const ENEMY_TYPES: Record<EnemyKind, EnemyArchetype> = {
  scout: {
    health: 18,
    speed: 185,
    damage: 8,
    radius: 11,
    xp: 4,
    credits: 5,
    materials: 0.04,
    glow: "#22c55e",
  },
  fighter: {
    health: 48,
    speed: 115,
    damage: 12,
    radius: 14,
    xp: 9,
    credits: 12,
    materials: 0.08,
    glow: "#f97316",
  },
  tank: {
    health: 160,
    speed: 55,
    damage: 20,
    radius: 22,
    xp: 20,
    credits: 30,
    materials: 0.25,
    glow: "#8b5cf6",
  },
  elite: {
    health: 360,
    speed: 92,
    damage: 26,
    radius: 19,
    xp: 60,
    credits: 100,
    materials: 1.6,
    glow: "#eab308",
  },
  sniper: {
    health: 60,
    speed: 130,
    damage: 30,
    radius: 14,
    xp: 16,
    credits: 22,
    materials: 0.2,
    glow: "#ef4444",
  },
  carrier: {
    health: 240,
    speed: 45,
    damage: 14,
    radius: 26,
    xp: 35,
    credits: 55,
    materials: 0.7,
    glow: "#fb7185",
  },
  drone: {
    health: 10,
    speed: 235,
    damage: 5,
    radius: 7,
    xp: 2,
    credits: 2,
    materials: 0.02,
    glow: "#a3e635",
  },
  boss: {
    health: 5200,
    speed: 42,
    damage: 40,
    radius: 58,
    xp: 600,
    credits: 800,
    materials: 25,
    glow: "#dc2626",
  },
};

export const BOSS_NAMES = [
  "VX DREADNOUGHT",
  "OBSIDIAN MAW",
  "STAR REAPER",
  "VOID HARBINGER",
];

let nextId = 1;

export class Enemy {
  id = nextId++;
  kind: EnemyKind;
  variant: EliteVariant = "spread";
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  radius: number;
  xp: number;
  credits: number;
  materials: number;
  contactCooldown = 0;
  wobblePhase = Math.random() * Math.PI * 2;
  hitFlash = 0;
  facing = 0;

  // Shooting
  shotTimer: number;
  pendingShots: PendingShot[] = [];
  /** Boss requests game to spawn escorts. */
  pendingSpawns = 0;

  // Sniper telegraph
  aimTelegraph = 0; // counts down while aiming
  lockedAngle = 0;

  // Shield elite
  shield = 0;
  shieldMax = 0;
  shieldRegenDelay = 0;

  // Warp elite
  warpTimer = 4;

  // Boss
  bossName = "";
  bossIndex = 0;
  phase = 1;
  private t1 = 1.5; // attack timer 1
  private t2 = 3; // attack timer 2
  private t3 = 6; // attack timer 3
  private spiralAngle = 0;

  constructor(kind: EnemyKind, x: number, y: number, difficultyMult: number) {
    const a = ENEMY_TYPES[kind];
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.health = a.health * difficultyMult;
    this.maxHealth = this.health;
    this.damage = a.damage * (1 + (difficultyMult - 1) * 0.5);
    this.speed = a.speed;
    this.radius = a.radius;
    this.xp = a.xp;
    this.credits = a.credits;
    this.materials = a.materials;
    this.shotTimer = 1 + Math.random() * 2;
    if (kind === "elite") {
      const variants: EliteVariant[] = ["spread", "shield", "warp"];
      this.variant = variants[Math.floor(Math.random() * variants.length)];
      if (this.variant === "shield") {
        this.shieldMax = 180 * difficultyMult;
        this.shield = this.shieldMax;
      }
    }
    if (kind === "boss") {
      this.bossIndex = Math.floor(Math.random() * BOSS_NAMES.length);
      this.bossName = BOSS_NAMES[this.bossIndex];
    }
  }

  /** Apply damage respecting elite shields. Returns true if hull was hit. */
  applyDamage(amount: number): boolean {
    this.hitFlash = 0.08;
    if (this.shield > 0) {
      this.shieldRegenDelay = 4;
      this.shield -= amount;
      if (this.shield < 0) {
        this.health += this.shield; // overflow
        this.shield = 0;
      }
      return this.shield <= 0;
    }
    this.health -= amount;
    return true;
  }

  update(dt: number, player: Vec2, time: number, slowMult: number) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    let dirX = dx / dist;
    let dirY = dy / dist;
    const speed = this.speed * slowMult;

    switch (this.kind) {
      case "scout":
      case "drone": {
        const weave =
          Math.sin(time * (this.kind === "drone" ? 7 : 5) + this.wobblePhase) *
          0.55;
        dirX += -dirY * weave;
        dirY += dirX * weave;
        break;
      }
      case "fighter": {
        if (dist < 220) {
          const strafe = Math.sin(time * 2 + this.wobblePhase) * 0.8;
          const px = -dirY;
          const py = dirX;
          dirX = dirX * 0.4 + px * strafe;
          dirY = dirY * 0.4 + py * strafe;
        }
        break;
      }
      case "sniper": {
        // Keep 440–640 range, strafe sideways
        const strafe = Math.sin(time * 1.4 + this.wobblePhase);
        if (dist < 420) {
          dirX = -dirX + -dirY * strafe * 0.5;
          dirY = -dirY + dirX * strafe * 0.5;
        } else if (dist < 640) {
          dirX = -dirY * strafe;
          dirY = dirX * strafe;
        }
        break;
      }
      case "carrier": {
        // Hold ~450 distance
        if (dist < 430) {
          dirX = -dirX;
          dirY = -dirY;
        } else if (dist < 560) {
          const orbit = Math.sin(time * 0.8 + this.wobblePhase);
          dirX = -dirY * orbit;
          dirY = dirX * orbit;
        }
        break;
      }
      default:
        break;
    }

    const norm = Math.hypot(dirX, dirY) || 1;
    const ease = 1 - Math.exp(-4 * dt);
    this.vx += ((dirX / norm) * speed - this.vx) * ease;
    this.vy += ((dirY / norm) * speed - this.vy) * ease;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Face the player for shooters, velocity otherwise
    if (
      this.kind === "sniper" ||
      this.kind === "carrier" ||
      this.kind === "boss"
    ) {
      this.facing = Math.atan2(dy, dx);
    } else {
      this.facing = Math.atan2(this.vy, this.vx);
    }

    if (this.contactCooldown > 0) this.contactCooldown -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Shield elite regen
    if (this.shieldMax > 0) {
      if (this.shieldRegenDelay > 0) this.shieldRegenDelay -= dt;
      else if (this.shield < this.shieldMax) {
        this.shield = Math.min(
          this.shieldMax,
          this.shield + this.shieldMax * 0.12 * dt,
        );
      }
    }

    this.updateAttacks(dt, player, dist);
  }

  private updateAttacks(dt: number, player: Vec2, dist: number) {
    const aimAt = Math.atan2(player.y - this.y, player.x - this.x);

    switch (this.kind) {
      case "fighter":
        this.shotTimer -= dt;
        if (this.shotTimer <= 0 && dist < 620) {
          this.shotTimer = 2.4;
          this.pendingShots.push({
            angle: aimAt,
            speed: 260,
            damage: this.damage * 0.6,
            kind: "bolt",
          });
        }
        break;

      case "elite":
        this.shotTimer -= dt;
        if (this.variant === "warp") {
          this.warpTimer -= dt;
        }
        if (this.shotTimer <= 0 && dist < 640) {
          this.shotTimer = this.variant === "spread" ? 2.0 : 2.6;
          const count =
            this.variant === "spread" ? 3 : this.variant === "warp" ? 5 : 2;
          for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * 0.22;
            this.pendingShots.push({
              angle: aimAt + offset,
              speed: 300,
              damage: this.damage * 0.6,
              kind: "bolt",
            });
          }
        }
        break;

      case "sniper":
        if (this.aimTelegraph > 0) {
          this.aimTelegraph -= dt;
          // Track until last 0.25s, then the angle is locked
          if (this.aimTelegraph > 0.25) this.lockedAngle = aimAt;
          if (this.aimTelegraph <= 0) {
            this.pendingShots.push({
              angle: this.lockedAngle,
              speed: 780,
              damage: this.damage,
              kind: "sniper",
            });
            this.shotTimer = 2.6 + Math.random();
          }
        } else {
          this.shotTimer -= dt;
          if (this.shotTimer <= 0 && dist < 700 && dist > 260) {
            this.aimTelegraph = 1.0;
            this.lockedAngle = aimAt;
          }
        }
        break;

      case "carrier":
        this.shotTimer -= dt;
        if (this.shotTimer <= 0 && dist < 720) {
          this.shotTimer = 4.2;
          for (let i = 0; i < 2; i++) {
            this.pendingShots.push({
              angle: aimAt + (i === 0 ? 0.5 : -0.5),
              speed: 150,
              damage: this.damage,
              kind: "missile",
            });
          }
        }
        break;

      case "boss":
        this.updateBoss(dt, aimAt);
        break;

      default:
        break;
    }
  }

  private updateBoss(dt: number, aimAt: number) {
    const frac = this.health / this.maxHealth;
    this.phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    // Enrage: faster in phase 3
    this.speed = ENEMY_TYPES.boss.speed * (this.phase === 3 ? 2.2 : 1);

    // Attack 1: aimed burst (all phases)
    this.t1 -= dt;
    if (this.t1 <= 0) {
      this.t1 = this.phase === 3 ? 1.1 : 1.7;
      for (let i = 0; i < 3; i++) {
        this.pendingShots.push({
          angle: aimAt + (i - 1) * 0.14,
          speed: 330,
          damage: this.damage * 0.5,
          kind: "bolt",
          color: "#f87171",
        });
      }
    }

    // Attack 2: radial ring (all phases, denser later)
    this.t2 -= dt;
    if (this.t2 <= 0) {
      this.t2 = this.phase === 1 ? 3.2 : 2.6;
      const n = this.phase === 1 ? 14 : 20;
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        this.pendingShots.push({
          angle: base + (i / n) * Math.PI * 2,
          speed: 210,
          damage: this.damage * 0.4,
          kind: "bolt",
          color: "#fb923c",
        });
      }
    }

    // Attack 3: phase 2+ → missiles + drone summons; phase 3 → spiral stream
    this.t3 -= dt;
    if (this.phase >= 2 && this.t3 <= 0) {
      this.t3 = 5;
      for (let i = 0; i < 4; i++) {
        this.pendingShots.push({
          angle: (i / 4) * Math.PI * 2,
          speed: 150,
          damage: this.damage * 0.7,
          kind: "missile",
        });
      }
      this.pendingSpawns += this.phase === 2 ? 4 : 6;
    }
    if (this.phase === 3) {
      this.spiralAngle += dt * 5.2;
      // Continuous spiral stream
      if (
        Math.floor(this.spiralAngle / 0.45) >
        Math.floor((this.spiralAngle - dt * 5.2) / 0.45)
      ) {
        for (const off of [0, Math.PI]) {
          this.pendingShots.push({
            angle: this.spiralAngle + off,
            speed: 250,
            damage: this.damage * 0.35,
            kind: "bolt",
            color: "#fbbf24",
          });
        }
      }
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    time: number,
  ) {
    const sx = this.x - camX;
    const sy = this.y - camY;
    const a = ENEMY_TYPES[this.kind];
    const r = this.radius;

    // Elite aura
    if (this.kind === "elite" || this.kind === "boss") {
      const pulse = 1 + Math.sin(time * 4 + this.wobblePhase) * 0.12;
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = a.glow;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 1.8 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Sniper telegraph: aiming laser sight
    if (this.kind === "sniper" && this.aimTelegraph > 0) {
      const len = 720;
      const alpha = this.aimTelegraph > 0.25 ? 0.25 : 0.7;
      ctx.strokeStyle = `rgba(248,113,113,${alpha})`;
      ctx.lineWidth = this.aimTelegraph > 0.25 ? 1 : 2.4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(
        sx + Math.cos(this.lockedAngle) * len,
        sy + Math.sin(this.lockedAngle) * len,
      );
      ctx.stroke();
    }

    const sprite = getEnemySprite(
      this.kind,
      this.hitFlash > 0,
      this.variant,
      this.bossIndex,
    );
    const scale = (r * 2) / (sprite.size * 0.62);
    drawSprite(ctx, sprite, sx, sy, this.facing, scale);

    // Shield bubble
    if (this.shield > 0) {
      const frac = this.shield / this.shieldMax;
      ctx.globalAlpha = 0.25 + 0.3 * frac;
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const ha = (i / 6) * Math.PI * 2 + time * 0.6;
        const px = sx + Math.cos(ha) * r * 1.7;
        const py = sy + Math.sin(ha) * r * 1.7;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Health bar (only when damaged; boss uses the big HUD bar)
    if (this.health < this.maxHealth && this.kind !== "boss") {
      const w = r * 2.2;
      const frac = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle = "rgba(15,23,42,0.7)";
      ctx.fillRect(sx - w / 2, sy - r - 10, w, 4);
      ctx.fillStyle = frac > 0.4 ? "#4ade80" : "#f87171";
      ctx.fillRect(sx - w / 2, sy - r - 10, w * frac, 4);
    }
  }
}
