import type { ParticleSystem } from "./particles";
import type { Vec2 } from "./types";

export type ProjectileKind =
  | "laser"
  | "plasma"
  | "missile"
  | "enemy"
  | "sniper"
  | "enemyMissile";

export interface Projectile {
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  crit: boolean;
  life: number;
  radius: number;
  friendly: boolean;
  color: string;
  pierce: number;
  hit: Set<unknown> | null;
  splash: number;
  /** Homing turn rate in rad/s (0 = ballistic). */
  homing: number;
  trailTimer: number;
}

function base(kind: ProjectileKind): Projectile {
  return {
    kind,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    damage: 0,
    crit: false,
    life: 2,
    radius: 4,
    friendly: false,
    color: "#ffffff",
    pierce: 0,
    hit: null,
    splash: 0,
    homing: 0,
    trailTimer: 0,
  };
}

export function makeLaser(
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  crit: boolean,
  pierce: number,
): Projectile {
  const p = base("laser");
  p.x = x;
  p.y = y;
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
  p.damage = damage;
  p.crit = crit;
  p.life = 1.6;
  p.radius = crit ? 5 : 3.5;
  p.friendly = true;
  p.color = crit ? "#fef08a" : "#67e8f9";
  p.pierce = pierce;
  if (pierce > 0) p.hit = new Set();
  return p;
}

export function makePlasma(
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  crit: boolean,
  splash: number,
  pierce: number,
): Projectile {
  const p = base("plasma");
  p.x = x;
  p.y = y;
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
  p.damage = damage;
  p.crit = crit;
  p.life = 2.4;
  p.radius = crit ? 10 : 8;
  p.friendly = true;
  p.color = crit ? "#f0abfc" : "#c084fc";
  p.splash = splash;
  p.pierce = pierce;
  if (pierce > 0) p.hit = new Set();
  return p;
}

export function makeMissile(
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  crit: boolean,
  splash: number,
): Projectile {
  const p = base("missile");
  p.x = x;
  p.y = y;
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
  p.damage = damage;
  p.crit = crit;
  p.life = 4;
  p.radius = 6;
  p.friendly = true;
  p.color = "#fdba74";
  p.splash = splash;
  p.homing = 4.2;
  return p;
}

export function makeEnemyShot(
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  color = "#fb7185",
): Projectile {
  const p = base("enemy");
  p.x = x;
  p.y = y;
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
  p.damage = damage;
  p.life = 3;
  p.radius = 4;
  p.color = color;
  return p;
}

export function makeSniperShot(
  x: number,
  y: number,
  angle: number,
  damage: number,
): Projectile {
  const p = base("sniper");
  p.x = x;
  p.y = y;
  p.vx = Math.cos(angle) * 780;
  p.vy = Math.sin(angle) * 780;
  p.damage = damage;
  p.life = 2.2;
  p.radius = 4.5;
  p.color = "#f87171";
  return p;
}

export function makeEnemyMissile(
  x: number,
  y: number,
  angle: number,
  damage: number,
): Projectile {
  const p = base("enemyMissile");
  p.x = x;
  p.y = y;
  p.vx = Math.cos(angle) * 150;
  p.vy = Math.sin(angle) * 150;
  p.damage = damage;
  p.life = 6;
  p.radius = 5;
  p.color = "#fda4af";
  p.homing = 2.1;
  return p;
}

interface HomingTarget extends Vec2 {
  health?: number;
}

function steerToward(p: Projectile, target: Vec2, dt: number) {
  const desired = Math.atan2(target.y - p.y, target.x - p.x);
  const current = Math.atan2(p.vy, p.vx);
  let diff = desired - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-p.homing * dt, Math.min(p.homing * dt, diff));
  const speed = Math.hypot(p.vx, p.vy);
  const angle = current + turn;
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
}

export function updateProjectiles(
  projectiles: Projectile[],
  dt: number,
  enemies: HomingTarget[],
  player: Vec2,
  particles: ParticleSystem,
) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    if (p.life <= 0) {
      projectiles[i] = projectiles[projectiles.length - 1];
      projectiles.pop();
      continue;
    }

    if (p.homing > 0) {
      if (p.friendly) {
        // Seek nearest enemy within range
        let best: HomingTarget | null = null;
        let bestD = 640 * 640;
        for (const e of enemies) {
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = e;
          }
        }
        if (best) steerToward(p, best, dt);
      } else {
        steerToward(p, player, dt);
        // Enemy missiles slowly accelerate
        const speed = Math.hypot(p.vx, p.vy);
        if (speed < 320) {
          const ns = speed + 110 * dt;
          p.vx = (p.vx / speed) * ns;
          p.vy = (p.vy / speed) * ns;
        }
      }
      // Exhaust trail
      p.trailTimer -= dt;
      if (p.trailTimer <= 0) {
        p.trailTimer = 0.035;
        particles.emit({
          x: p.x,
          y: p.y,
          count: 1,
          speed: 30,
          life: 0.3,
          size: p.friendly ? 2.4 : 2,
          colors: p.friendly ? ["#fdba74", "#fef3c7"] : ["#fda4af", "#fecdd3"],
          spread: 0.6,
          baseAngle: Math.atan2(-p.vy, -p.vx),
        });
      }
    } else if (p.kind === "plasma") {
      p.trailTimer -= dt;
      if (p.trailTimer <= 0) {
        p.trailTimer = 0.05;
        particles.emit({
          x: p.x,
          y: p.y,
          count: 1,
          speed: 20,
          life: 0.35,
          size: 3,
          colors: ["#c084fc", "#e9d5ff"],
          spread: Math.PI * 2,
        });
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: Projectile[],
  camX: number,
  camY: number,
  w: number,
  h: number,
  time: number,
) {
  ctx.globalCompositeOperation = "lighter";
  for (const p of projectiles) {
    const sx = p.x - camX;
    const sy = p.y - camY;
    if (sx < -40 || sy < -40 || sx > w + 40 || sy > h + 40) continue;
    const angle = Math.atan2(p.vy, p.vx);

    if (p.kind === "plasma") {
      // Pulsing orb with bright core
      const pulse = 1 + Math.sin(time * 18 + p.x * 0.01) * 0.15;
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.radius * 2.4 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(sx, sy, p.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, p.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    if (p.kind === "missile" || p.kind === "enemyMissile") {
      // Missile body
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.fillStyle = p.friendly ? "#e2e8f0" : "#fda4af";
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(2, -2.6);
      ctx.lineTo(-6, -2.2);
      ctx.lineTo(-6, 2.2);
      ctx.lineTo(2, 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-4, -2.2);
      ctx.lineTo(-8, -4);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-8, 4);
      ctx.lineTo(-4, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Exhaust glow
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(
        sx - Math.cos(angle) * 8,
        sy - Math.sin(angle) * 8,
        3.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      continue;
    }

    // Laser / enemy bolt / sniper bolt — elongated beam with halo + core
    const len = p.kind === "sniper" ? 30 : p.friendly ? 20 : 10;

    ctx.globalAlpha = 0.35;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, p.radius * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Outer beam
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.radius * 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx - Math.cos(angle) * len, sy - Math.sin(angle) * len);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    // Bright core
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = p.radius * 0.45;
    ctx.beginPath();
    ctx.moveTo(
      sx - Math.cos(angle) * len * 0.55,
      sy - Math.sin(angle) * len * 0.55,
    );
    ctx.lineTo(sx, sy);
    ctx.stroke();

    // Tip spark
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(sx, sy, p.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
