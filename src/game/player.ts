import type { Input } from "./input";
import type { ParticleSystem } from "./particles";
import type { PlayerStats } from "./types";
import { clamp } from "./types";
import { baseStats } from "./upgrades";

const ACCEL = 6.5; // how quickly velocity approaches target (per second)

export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  aimAngle = 0;
  radius = 14;
  stats: PlayerStats = baseStats();
  health = this.stats.maxHealth;
  fireCooldown = 0;
  invulnTimer = 0;
  engineEmitTimer = 0;

  update(
    dt: number,
    input: Input,
    camX: number,
    camY: number,
    particles: ParticleSystem,
  ) {
    // Movement: velocity eases toward desired direction * moveSpeed
    const axis = input.axis();
    const targetVx = axis.x * this.stats.moveSpeed;
    const targetVy = axis.y * this.stats.moveSpeed;
    const ease = 1 - Math.exp(-ACCEL * dt);
    this.vx += (targetVx - this.vx) * ease;
    this.vy += (targetVy - this.vy) * ease;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Aim at mouse (mouse is in screen space)
    const worldMx = input.mouseX + camX;
    const worldMy = input.mouseY + camY;
    this.aimAngle = Math.atan2(worldMy - this.y, worldMx - this.x);

    // Health regen
    this.health = clamp(
      this.health + this.stats.healthRegen * dt,
      0,
      this.stats.maxHealth,
    );

    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    // Engine trail
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 40) {
      this.engineEmitTimer -= dt;
      if (this.engineEmitTimer <= 0) {
        this.engineEmitTimer = 0.025;
        const back = this.aimAngle + Math.PI;
        particles.emit({
          x: this.x + Math.cos(back) * this.radius,
          y: this.y + Math.sin(back) * this.radius,
          count: 1,
          speed: 60,
          life: 0.35,
          size: 2.2,
          colors: ["#38bdf8", "#818cf8", "#22d3ee"],
          spread: 0.9,
          baseAngle: Math.atan2(-this.vy, -this.vx),
        });
      }
    }
  }

  /** Returns true if damage was applied (not invulnerable). */
  takeDamage(amount: number): boolean {
    if (this.invulnTimer > 0) return false;
    this.health -= amount;
    this.invulnTimer = 0.35;
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    const sx = this.x - camX;
    const sy = this.y - camY;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.aimAngle);

    const flicker =
      this.invulnTimer > 0 && Math.floor(this.invulnTimer * 20) % 2 === 0;
    ctx.globalAlpha = flicker ? 0.35 : 1;

    // Glow
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 16;

    // Hull
    const r = this.radius;
    ctx.beginPath();
    ctx.moveTo(r * 1.25, 0);
    ctx.lineTo(-r * 0.85, r * 0.8);
    ctx.lineTo(-r * 0.45, 0);
    ctx.lineTo(-r * 0.85, -r * 0.8);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-r, 0, r, 0);
    grad.addColorStop(0, "#0ea5e9");
    grad.addColorStop(1, "#e0f2fe");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cockpit
    ctx.beginPath();
    ctx.arc(r * 0.25, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = "#fef9c3";
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
