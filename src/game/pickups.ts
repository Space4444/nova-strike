import type { PickupKind, PlayerStats, Vec2 } from "./types";

export interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  life: number;
  phase: number;
  /** Seconds spent inside the magnet radius — attraction speed ramps up. */
  magnetT: number;
}

export interface CollectResult {
  credits: number;
  materials: number;
  healed: number;
}

const COLLECT_RADIUS = 26;
const MAX_PICKUPS = 220;

export class PickupSystem {
  pickups: Pickup[] = [];

  spawn(kind: PickupKind, x: number, y: number, value: number) {
    if (this.pickups.length >= MAX_PICKUPS) this.pickups.shift();
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 90;
    this.pickups.push({
      kind,
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      value,
      life: 28,
      phase: Math.random() * Math.PI * 2,
      magnetT: 0,
    });
  }

  /** Scatter a kill's loot. */
  dropLoot(
    x: number,
    y: number,
    credits: number,
    materials: number,
    healthChance: number,
  ) {
    // Split credits into 1-3 chips
    let remaining = Math.round(credits);
    const chips = Math.min(3, Math.max(1, Math.round(credits / 15)));
    for (let i = 0; i < chips; i++) {
      const v =
        i === chips - 1 ? remaining : Math.ceil(remaining / (chips - i));
      remaining -= v;
      if (v > 0) this.spawn("credit", x, y, v);
    }
    let mats = Math.floor(materials);
    if (Math.random() < materials - mats) mats++;
    for (let i = 0; i < mats; i++) this.spawn("material", x, y, 1);
    if (Math.random() < healthChance) this.spawn("health", x, y, 10);
  }

  update(
    dt: number,
    player: Vec2,
    stats: PlayerStats,
    magnetAll: boolean,
  ): CollectResult {
    const result: CollectResult = { credits: 0, materials: 0, healed: 0 };
    const magnetR2 = magnetAll
      ? Infinity
      : stats.pickupRadius * stats.pickupRadius;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pickups[i] = this.pickups[this.pickups.length - 1];
        this.pickups.pop();
        continue;
      }
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < magnetR2) {
        // Homing pull: velocity is steered directly at the player and the
        // speed ramps up the longer the item is attracted. Tangential
        // velocity is damped away, so items can never orbit the ship —
        // they always converge, no matter how large the magnet radius is.
        p.magnetT += dt;
        const d = Math.sqrt(d2) || 1;
        const speed =
          Math.min(1500, 240 + p.magnetT * 1100) + (magnetAll ? 400 : 0);
        const k = 1 - Math.exp(-10 * dt); // strong steering kills orbits fast
        p.vx += ((dx / d) * speed - p.vx) * k;
        p.vy += ((dy / d) * speed - p.vy) * k;
      } else {
        p.magnetT = 0;
        p.vx *= 0.92 ** (dt * 60);
        p.vy *= 0.92 ** (dt * 60);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (d2 < COLLECT_RADIUS * COLLECT_RADIUS) {
        if (p.kind === "credit") result.credits += p.value;
        else if (p.kind === "material") result.materials += p.value;
        else result.healed += p.value;
        this.pickups[i] = this.pickups[this.pickups.length - 1];
        this.pickups.pop();
      }
    }
    return result;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    w: number,
    h: number,
    time: number,
  ) {
    for (const p of this.pickups) {
      const sx = p.x - camX;
      const sy = p.y - camY;
      if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue;
      const fade = p.life < 3 ? Math.max(0.15, p.life / 3) : 1;
      const bob = Math.sin(time * 3 + p.phase) * 0.15 + 1;
      ctx.globalAlpha = fade;

      if (p.kind === "credit") {
        // Gold diamond chip
        const s = (p.value > 20 ? 7 : 5) * bob;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(time * 1.5 + p.phase);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.fillStyle = "#fef3c7";
        ctx.fillRect(-s / 4, -s / 4, s / 2, s / 2);
        ctx.restore();
      } else if (p.kind === "material") {
        // Cyan crystal
        const s = 7 * bob;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.sin(time * 2 + p.phase) * 0.4);
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.6, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.6, 0);
        ctx.closePath();
        ctx.fillStyle = "#22d3ee";
        ctx.fill();
        ctx.strokeStyle = "#a5f3fc";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.5);
        ctx.lineTo(s * 0.3, 0);
        ctx.lineTo(0, s * 0.5);
        ctx.lineTo(-s * 0.3, 0);
        ctx.closePath();
        ctx.fillStyle = "#cffafe";
        ctx.fill();
        ctx.restore();
      } else {
        // Health cross
        const s = 5 * bob;
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(sx - s, sy - s / 3, s * 2, (s * 2) / 3);
        ctx.fillRect(sx - s / 3, sy - s, (s * 2) / 3, s * 2);
      }
    }
    ctx.globalAlpha = 1;
  }
}
