import type { Input } from "./input";
import type { ParticleSystem } from "./particles";
import { SHIP_CLASSES } from "./ships";
import { drawSprite, getPlayerSprite } from "./sprites";
import type { PlayerStats, ShipClassId } from "./types";
import { clamp } from "./types";
import { baseStats } from "./upgrades";

const ACCEL = 6.5; // how quickly velocity approaches target (per second)
const SHIELD_REGEN_DELAY = 5;
const SHIELD_REGEN_RATE = 0.25; // fraction of max per second

const ENGINE_COLORS: Record<ShipClassId, string[]> = {
  fighter: ["#38bdf8", "#818cf8", "#22d3ee"],
  interceptor: ["#a78bfa", "#c4b5fd", "#f0abfc"],
  gunship: ["#fb923c", "#fdba74", "#fbbf24"],
  explorer: ["#34d399", "#6ee7b7", "#a7f3d0"],
};

export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  aimAngle = 0;
  radius = 14;
  ship: ShipClassId = "fighter";
  stats: PlayerStats = baseStats();
  health = this.stats.maxHealth;
  shield = 0;
  shieldRegenTimer = 0;
  fireCooldown = 0;
  invulnTimer = 0;
  engineEmitTimer = 0;
  /** Speed multiplier from abilities (Recon Pulse, Overdrive etc). */
  speedBoost = 1;

  update(
    dt: number,
    input: Input,
    camX: number,
    camY: number,
    particles: ParticleSystem,
  ) {
    // Movement: velocity eases toward desired direction * moveSpeed
    const axis = input.axis();
    const speedStat = this.stats.moveSpeed * this.speedBoost;
    const targetVx = axis.x * speedStat;
    const targetVy = axis.y * speedStat;
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

    // Shield regen (after delay)
    if (this.stats.shieldMax > 0) {
      if (this.shieldRegenTimer > 0) this.shieldRegenTimer -= dt;
      else if (this.shield < this.stats.shieldMax) {
        this.shield = Math.min(
          this.stats.shieldMax,
          this.shield + this.stats.shieldMax * SHIELD_REGEN_RATE * dt,
        );
      }
    }

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
          colors: ENGINE_COLORS[this.ship],
          spread: 0.9,
          baseAngle: Math.atan2(-this.vy, -this.vx),
        });
      }
    }
  }

  /** Returns true if hull damage was applied (not invulnerable). */
  takeDamage(amount: number): boolean {
    if (this.invulnTimer > 0) return false;
    this.shieldRegenTimer = SHIELD_REGEN_DELAY;
    if (this.shield > 0) {
      this.shield -= amount;
      if (this.shield >= 0) {
        this.invulnTimer = 0.2;
        return false;
      }
      amount = -this.shield;
      this.shield = 0;
    }
    this.health -= amount;
    this.invulnTimer = 0.35;
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

    const flicker =
      this.invulnTimer > 0 && Math.floor(this.invulnTimer * 20) % 2 === 0;
    const sprite = getPlayerSprite(this.ship);
    const scale = (this.radius * 2) / (sprite.size * 0.55);
    drawSprite(ctx, sprite, sx, sy, this.aimAngle, scale, flicker ? 0.35 : 1);

    // Shield bubble
    if (this.shield > 0 && this.stats.shieldMax > 0) {
      const frac = this.shield / this.stats.shieldMax;
      ctx.globalAlpha = 0.18 + 0.3 * frac;
      ctx.strokeStyle = SHIP_CLASSES[this.ship].color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        sx,
        sy,
        this.radius * 1.9 + Math.sin(time * 5) * 1.5,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
