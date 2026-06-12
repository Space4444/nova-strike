import type { EnemyKind, Vec2 } from "./types";

interface EnemyArchetype {
  health: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
  credits: number;
  color: string;
  glow: string;
  shoots: boolean;
  shotInterval: number;
  shotSpeed: number;
  shotCount: number;
}

export const ENEMY_TYPES: Record<EnemyKind, EnemyArchetype> = {
  scout: {
    health: 18,
    speed: 185,
    damage: 8,
    radius: 11,
    xp: 4,
    credits: 5,
    color: "#4ade80",
    glow: "#22c55e",
    shoots: false,
    shotInterval: 0,
    shotSpeed: 0,
    shotCount: 0,
  },
  fighter: {
    health: 48,
    speed: 115,
    damage: 12,
    radius: 14,
    xp: 9,
    credits: 12,
    color: "#fb923c",
    glow: "#f97316",
    shoots: true,
    shotInterval: 2.4,
    shotSpeed: 260,
    shotCount: 1,
  },
  tank: {
    health: 150,
    speed: 55,
    damage: 20,
    radius: 22,
    xp: 20,
    credits: 30,
    color: "#a78bfa",
    glow: "#8b5cf6",
    shoots: false,
    shotInterval: 0,
    shotSpeed: 0,
    shotCount: 0,
  },
  elite: {
    health: 340,
    speed: 92,
    damage: 26,
    radius: 19,
    xp: 60,
    credits: 100,
    color: "#facc15",
    glow: "#eab308",
    shoots: true,
    shotInterval: 2.0,
    shotSpeed: 300,
    shotCount: 3,
  },
};

export class Enemy {
  kind: EnemyKind;
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
  shotTimer: number;
  contactCooldown = 0;
  wobblePhase = Math.random() * Math.PI * 2;
  hitFlash = 0;

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
    this.shotTimer = a.shoots
      ? a.shotInterval * (0.5 + Math.random())
      : Infinity;
  }

  get archetype(): EnemyArchetype {
    return ENEMY_TYPES[this.kind];
  }

  update(dt: number, player: Vec2, time: number) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    let dirX = dx / dist;
    let dirY = dy / dist;

    // Scouts weave; fighters strafe slightly at close range
    if (this.kind === "scout") {
      const weave = Math.sin(time * 5 + this.wobblePhase) * 0.55;
      const px = -dirY;
      const py = dirX;
      dirX += px * weave;
      dirY += py * weave;
    } else if (this.kind === "fighter" && dist < 220) {
      const strafe = Math.sin(time * 2 + this.wobblePhase) * 0.8;
      const px = -dirY;
      const py = dirX;
      dirX = dirX * 0.4 + px * strafe;
      dirY = dirY * 0.4 + py * strafe;
    }

    const norm = Math.hypot(dirX, dirY) || 1;
    const ease = 1 - Math.exp(-4 * dt);
    this.vx += ((dirX / norm) * this.speed - this.vx) * ease;
    this.vy += ((dirY / norm) * this.speed - this.vy) * ease;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.contactCooldown > 0) this.contactCooldown -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.shotTimer !== Infinity) this.shotTimer -= dt;
  }

  /** True when this enemy wants to fire (and resets its timer). */
  tryShoot(distToPlayer: number): boolean {
    const a = this.archetype;
    if (!a.shoots || this.shotTimer > 0 || distToPlayer > 620) return false;
    this.shotTimer = a.shotInterval;
    return true;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    time: number,
  ) {
    const sx = this.x - camX;
    const sy = this.y - camY;
    const a = this.archetype;
    const angle = Math.atan2(this.vy, this.vx);
    const r = this.radius;

    ctx.save();
    ctx.translate(sx, sy);

    // Elite aura
    if (this.kind === "elite") {
      const pulse = 1 + Math.sin(time * 4) * 0.12;
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = a.glow;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.9 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.rotate(angle);
    ctx.shadowColor = a.glow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : a.color;
    ctx.strokeStyle = a.glow;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    switch (this.kind) {
      case "scout": // slim dart
        ctx.moveTo(r * 1.3, 0);
        ctx.lineTo(-r * 0.8, r * 0.65);
        ctx.lineTo(-r * 0.4, 0);
        ctx.lineTo(-r * 0.8, -r * 0.65);
        break;
      case "fighter": // winged arrow
        ctx.moveTo(r * 1.2, 0);
        ctx.lineTo(-r * 0.2, r * 0.55);
        ctx.lineTo(-r * 0.9, r * 1.0);
        ctx.lineTo(-r * 0.55, 0);
        ctx.lineTo(-r * 0.9, -r * 1.0);
        ctx.lineTo(-r * 0.2, -r * 0.55);
        break;
      case "tank": // heavy hexagon
        for (let i = 0; i < 6; i++) {
          const ha = (i / 6) * Math.PI * 2;
          const hr = r * (i % 2 === 0 ? 1 : 0.85);
          if (i === 0) ctx.moveTo(Math.cos(ha) * hr, Math.sin(ha) * hr);
          else ctx.lineTo(Math.cos(ha) * hr, Math.sin(ha) * hr);
        }
        break;
      case "elite": // five-pointed star ship
        for (let i = 0; i < 10; i++) {
          const ea = (i / 10) * Math.PI * 2;
          const er = i % 2 === 0 ? r * 1.25 : r * 0.6;
          if (i === 0) ctx.moveTo(Math.cos(ea) * er, Math.sin(ea) * er);
          else ctx.lineTo(Math.cos(ea) * er, Math.sin(ea) * er);
        }
        break;
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();

    // Health bar (only when damaged)
    if (this.health < this.maxHealth) {
      const w = r * 2.2;
      const frac = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle = "rgba(15,23,42,0.7)";
      ctx.fillRect(sx - w / 2, sy - r - 10, w, 4);
      ctx.fillStyle = frac > 0.4 ? "#4ade80" : "#f87171";
      ctx.fillRect(sx - w / 2, sy - r - 10, w * frac, 4);
    }
  }
}
