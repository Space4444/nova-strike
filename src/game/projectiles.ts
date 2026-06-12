export interface Projectile {
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
}

export function makeLaser(
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  crit: boolean,
): Projectile {
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    crit,
    life: 1.6,
    radius: crit ? 5 : 3.5,
    friendly: true,
    color: crit ? "#fef08a" : "#67e8f9",
  };
}

export function makeEnemyShot(
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
): Projectile {
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    crit: false,
    life: 3,
    radius: 4,
    friendly: false,
    color: "#fb7185",
  };
}

export function updateProjectiles(projectiles: Projectile[], dt: number) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    if (p.life <= 0) {
      projectiles[i] = projectiles[projectiles.length - 1];
      projectiles.pop();
      continue;
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
) {
  ctx.globalCompositeOperation = "lighter";
  for (const p of projectiles) {
    const sx = p.x - camX;
    const sy = p.y - camY;
    const angle = Math.atan2(p.vy, p.vx);
    const len = p.friendly ? 16 : 10;

    // Glow halo
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, p.radius * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Laser bolt
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.radius;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx - Math.cos(angle) * len, sy - Math.sin(angle) * len);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    // Bright core
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = p.radius * 0.4;
    ctx.beginPath();
    ctx.moveTo(
      sx - Math.cos(angle) * len * 0.6,
      sy - Math.sin(angle) * len * 0.6,
    );
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
