import type { Enemy } from "./enemies";
import type { PickupSystem } from "./pickups";
import type { Vec2 } from "./types";
import type { Anomaly } from "./world";

const ENEMY_DOT: Record<string, string> = {
  scout: "#4ade80",
  fighter: "#fb923c",
  tank: "#a78bfa",
  elite: "#facc15",
  sniper: "#f87171",
  carrier: "#fb7185",
  drone: "#a3e635",
  boss: "#ef4444",
};

const ANOMALY_DOT: Record<string, string> = {
  cache: "#f59e0b",
  wormhole: "#a78bfa",
  beacon: "#fde68a",
};

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  player: Vec2,
  aimAngle: number,
  enemies: Enemy[],
  pickups: PickupSystem,
  anomalies: Anomaly[],
  rangeMult: number,
  time: number,
) {
  const R = 78;
  const cx = w - R - 18;
  const cy = h - R - 18;
  const range = 2100 * rangeMult;
  const k = R / range;

  ctx.save();
  // Backdrop
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(8,13,28,0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(125,211,252,0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Range rings
  ctx.strokeStyle = "rgba(125,211,252,0.12)";
  ctx.lineWidth = 1;
  for (const f of [0.33, 0.66]) {
    ctx.beginPath();
    ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Radar sweep
  const sweep = (time * 1.1) % (Math.PI * 2);
  const grad = ctx.createConicGradient
    ? (() => {
        const g = ctx.createConicGradient(sweep, cx, cy);
        g.addColorStop(0, "rgba(56,189,248,0.30)");
        g.addColorStop(0.12, "rgba(56,189,248,0)");
        g.addColorStop(1, "rgba(56,189,248,0)");
        return g;
      })()
    : null;
  if (grad) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
  ctx.clip();

  // Pickups (dim gold)
  ctx.fillStyle = "rgba(251,191,36,0.5)";
  for (const p of pickups.pickups) {
    const dx = (p.x - player.x) * k;
    const dy = (p.y - player.y) * k;
    if (dx * dx + dy * dy > R * R) continue;
    ctx.fillRect(cx + dx - 1, cy + dy - 1, 2, 2);
  }

  // Enemies
  for (const e of enemies) {
    let dx = (e.x - player.x) * k;
    let dy = (e.y - player.y) * k;
    const d = Math.hypot(dx, dy);
    const isBoss = e.kind === "boss";
    if (d > R - 4) {
      if (!isBoss) continue;
      // Clamp boss to rim so it's always visible
      dx = (dx / d) * (R - 7);
      dy = (dy / d) * (R - 7);
    }
    ctx.fillStyle = ENEMY_DOT[e.kind];
    if (isBoss) {
      const blink = Math.sin(time * 6) > 0 ? 1 : 0.45;
      ctx.globalAlpha = blink;
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + dy - 5);
      ctx.lineTo(cx + dx + 5, cy + dy + 4);
      ctx.lineTo(cx + dx - 5, cy + dy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      const s =
        e.kind === "drone"
          ? 1.4
          : e.kind === "tank" || e.kind === "carrier"
            ? 2.6
            : 2;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Anomalies (clamped to rim when out of range)
  for (const a of anomalies) {
    let dx = (a.x - player.x) * k;
    let dy = (a.y - player.y) * k;
    const d = Math.hypot(dx, dy);
    if (d > R - 6) {
      dx = (dx / d) * (R - 8);
      dy = (dy / d) * (R - 8);
    }
    ctx.fillStyle = ANOMALY_DOT[a.kind];
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 3);
    ctx.beginPath();
    if (a.kind === "cache") {
      ctx.fillRect(cx + dx - 2.5, cy + dy - 2.5, 5, 5);
    } else if (a.kind === "wormhole") {
      ctx.arc(cx + dx, cy + dy, 3.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = ANOMALY_DOT[a.kind];
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else {
      // Beacon: 4-point star
      ctx.moveTo(cx + dx, cy + dy - 4);
      ctx.lineTo(cx + dx + 1.4, cy + dy - 1.4);
      ctx.lineTo(cx + dx + 4, cy + dy);
      ctx.lineTo(cx + dx + 1.4, cy + dy + 1.4);
      ctx.lineTo(cx + dx, cy + dy + 4);
      ctx.lineTo(cx + dx - 1.4, cy + dy + 1.4);
      ctx.lineTo(cx + dx - 4, cy + dy);
      ctx.lineTo(cx + dx - 1.4, cy + dy - 1.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Player arrow (center)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(aimAngle);
  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath();
  ctx.moveTo(5.5, 0);
  ctx.lineTo(-3.5, -3.5);
  ctx.lineTo(-1.5, 0);
  ctx.lineTo(-3.5, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
