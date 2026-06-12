/**
 * Endless world: procedural nebulae (pre-rendered per chunk, LRU cached)
 * and anomalies — supply caches, wormholes and ancient beacons that the
 * player can fly into.
 */

import type { Vec2 } from "./types";
import { hash01 } from "./types";

// ── Nebulae ─────────────────────────────────────────────────────

const CHUNK = 1500;
const NEBULA_PARALLAX = 0.5;
const NEBULA_TEX = 256;
const PALETTES: Array<[string, string]> = [
  ["rgba(139,92,246,0.20)", "rgba(76,29,149,0)"],
  ["rgba(34,211,238,0.15)", "rgba(8,51,68,0)"],
  ["rgba(244,114,182,0.14)", "rgba(131,24,67,0)"],
  ["rgba(99,102,241,0.18)", "rgba(49,46,129,0)"],
  ["rgba(52,211,153,0.12)", "rgba(6,78,59,0)"],
];

interface NebulaBlob {
  x: number; // within chunk, world units
  y: number;
  r: number;
  tex: HTMLCanvasElement;
}

function makeNebulaTexture(
  palette: [string, string],
  seed: number,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = NEBULA_TEX;
  c.height = NEBULA_TEX;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const cx = NEBULA_TEX / 2;
  // Layer 4-6 soft blobs for a wispy look
  const blobs = 4 + Math.floor(hash01(seed, 7, 1) * 3);
  for (let i = 0; i < blobs; i++) {
    const bx = cx + (hash01(seed, i, 2) - 0.5) * NEBULA_TEX * 0.5;
    const by = cx + (hash01(seed, i, 3) - 0.5) * NEBULA_TEX * 0.5;
    const br = NEBULA_TEX * (0.18 + hash01(seed, i, 4) * 0.3);
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, palette[0]);
    g.addColorStop(1, palette[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, NEBULA_TEX, NEBULA_TEX);
  }
  return c;
}

export class NebulaField {
  private cache = new Map<string, NebulaBlob[]>();

  private chunkBlobs(cx: number, cy: number): NebulaBlob[] {
    const key = `${cx},${cy}`;
    let blobs = this.cache.get(key);
    if (blobs) return blobs;
    blobs = [];
    const count =
      hash01(cx, cy, 11) < 0.55 ? 1 + Math.floor(hash01(cx, cy, 12) * 2) : 0;
    for (let i = 0; i < count; i++) {
      const seed = cx * 7919 + cy * 104729 + i * 31;
      const palette =
        PALETTES[Math.floor(hash01(cx, cy, 13 + i) * PALETTES.length)];
      blobs.push({
        x: hash01(cx, cy, 20 + i) * CHUNK,
        y: hash01(cx, cy, 30 + i) * CHUNK,
        r: 380 + hash01(cx, cy, 40 + i) * 520,
        tex: makeNebulaTexture(palette, seed),
      });
    }
    this.cache.set(key, blobs);
    // LRU-ish: cap cache
    if (this.cache.size > 40) {
      const first = this.cache.keys().next().value;
      if (first !== undefined) this.cache.delete(first);
    }
    return blobs;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    w: number,
    h: number,
  ) {
    const ox = camX * NEBULA_PARALLAX;
    const oy = camY * NEBULA_PARALLAX;
    const x0 = Math.floor((ox - 900) / CHUNK);
    const y0 = Math.floor((oy - 900) / CHUNK);
    const x1 = Math.floor((ox + w + 900) / CHUNK);
    const y1 = Math.floor((oy + h + 900) / CHUNK);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (const b of this.chunkBlobs(cx, cy)) {
          const sx = cx * CHUNK + b.x - ox;
          const sy = cy * CHUNK + b.y - oy;
          if (sx + b.r < 0 || sy + b.r < 0 || sx - b.r > w || sy - b.r > h)
            continue;
          ctx.drawImage(b.tex, sx - b.r, sy - b.r, b.r * 2, b.r * 2);
        }
      }
    }
  }
}

// ── Anomalies ───────────────────────────────────────────────────

export type AnomalyKind = "cache" | "wormhole" | "beacon";

export interface Anomaly {
  kind: AnomalyKind;
  x: number;
  y: number;
  radius: number;
  age: number;
}

export interface AnomalyEffect {
  kind: AnomalyKind;
  x: number;
  y: number;
}

export class AnomalyField {
  anomalies: Anomaly[] = [];
  private spawnTimer = 8;

  update(dt: number, player: Vec2): AnomalyEffect | null {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 11 + Math.random() * 8;
      // Cull far-away anomalies, keep max 4 nearby
      this.anomalies = this.anomalies.filter(
        a => Math.hypot(a.x - player.x, a.y - player.y) < 3200,
      );
      if (this.anomalies.length < 4) {
        const roll = Math.random();
        const kind: AnomalyKind =
          roll < 0.55 ? "cache" : roll < 0.87 ? "wormhole" : "beacon";
        const angle = Math.random() * Math.PI * 2;
        const dist = 900 + Math.random() * 1300;
        this.anomalies.push({
          kind,
          x: player.x + Math.cos(angle) * dist,
          y: player.y + Math.sin(angle) * dist,
          radius: kind === "cache" ? 26 : kind === "wormhole" ? 34 : 30,
          age: 0,
        });
      }
    }

    for (let i = this.anomalies.length - 1; i >= 0; i--) {
      const a = this.anomalies[i];
      a.age += dt;
      const d = Math.hypot(a.x - player.x, a.y - player.y);
      if (d < a.radius + 16) {
        this.anomalies.splice(i, 1);
        return { kind: a.kind, x: a.x, y: a.y };
      }
    }
    return null;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    w: number,
    h: number,
    time: number,
  ) {
    for (const a of this.anomalies) {
      const sx = a.x - camX;
      const sy = a.y - camY;
      if (sx < -80 || sy < -80 || sx > w + 80 || sy > h + 80) continue;
      const pulse = 1 + Math.sin(time * 2.4 + a.age) * 0.12;

      if (a.kind === "cache") {
        // Supply crate: amber box with beacon light
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.sin(time * 0.8) * 0.15);
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-14, -11, 28, 22);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.strokeRect(-14, -11, 28, 22);
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(14, 0);
        ctx.moveTo(0, -11);
        ctx.lineTo(0, 11);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 4);
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(sx, sy - 18, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (a.kind === "wormhole") {
        // Swirling violet ring
        ctx.save();
        ctx.translate(sx, sy);
        for (let ring = 0; ring < 3; ring++) {
          const rr = (a.radius - ring * 8) * pulse;
          ctx.strokeStyle = ["#a78bfa", "#7c3aed", "#ddd6fe"][ring];
          ctx.globalAlpha = 0.55 - ring * 0.12;
          ctx.lineWidth = 3 - ring * 0.7;
          ctx.beginPath();
          ctx.arc(
            0,
            0,
            rr,
            time * (1.4 + ring * 0.7),
            time * (1.4 + ring * 0.7) + Math.PI * 1.6,
          );
          ctx.stroke();
        }
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, a.radius * 0.6);
        core.addColorStop(0, "rgba(237,233,254,0.8)");
        core.addColorStop(1, "rgba(124,58,237,0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, a.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Ancient beacon: golden obelisk
        ctx.save();
        ctx.translate(sx, sy);
        ctx.globalAlpha = 0.18 + 0.1 * Math.sin(time * 3);
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(0, 0, a.radius * 1.8 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(9, 0);
        ctx.lineTo(0, 22);
        ctx.lineTo(-9, 0);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, -22, 0, 22);
        g.addColorStop(0, "#fef3c7");
        g.addColorStop(0.5, "#f59e0b");
        g.addColorStop(1, "#78350f");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Runes
        ctx.fillStyle = "#fffbeb";
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 5);
        ctx.fillRect(-1.5, -10, 3, 3);
        ctx.fillRect(-1.5, -3, 3, 3);
        ctx.fillRect(-1.5, 4, 3, 3);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
  }
}
