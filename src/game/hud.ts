import type { HudState } from "./types";
import { UPGRADES } from "./upgrades";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hud: HudState,
) {
  ctx.save();
  ctx.textBaseline = "middle";

  // ── XP bar (top, full width) ────────────────────────────────
  const xpFrac = Math.min(1, hud.xp / hud.xpToNext);
  ctx.fillStyle = "rgba(15,23,42,0.75)";
  ctx.fillRect(0, 0, w, 8);
  const xpGrad = ctx.createLinearGradient(0, 0, w, 0);
  xpGrad.addColorStop(0, "#22d3ee");
  xpGrad.addColorStop(1, "#a78bfa");
  ctx.fillStyle = xpGrad;
  ctx.fillRect(0, 0, w * xpFrac, 8);

  // Level badge
  roundRect(ctx, w / 2 - 56, 14, 112, 28, 14);
  ctx.fillStyle = "rgba(15,23,42,0.8)";
  ctx.fill();
  ctx.strokeStyle = "rgba(125,211,252,0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#e0f2fe";
  ctx.font = "600 13px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`LEVEL ${hud.level}`, w / 2, 28.5);

  // ── Top-left: time + kills ──────────────────────────────────
  ctx.textAlign = "left";
  ctx.font = "600 14px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "rgba(226,232,240,0.9)";
  ctx.fillText(`⏱ ${formatTime(hud.time)}`, 16, 28);
  ctx.fillStyle = "rgba(148,163,184,0.9)";
  ctx.font = "500 13px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(`☠ ${hud.kills} kills`, 16, 50);

  // ── Top-right: credits ──────────────────────────────────────
  ctx.textAlign = "right";
  ctx.font = "600 15px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(`◈ ${hud.credits.toLocaleString()}`, w - 16, 28);

  // ── Bottom-left: health bar ─────────────────────────────────
  const hbW = 240;
  const hbH = 16;
  const hbX = 16;
  const hbY = h - 36;
  const hpFrac = Math.max(0, hud.health / hud.maxHealth);
  roundRect(ctx, hbX, hbY, hbW, hbH, 8);
  ctx.fillStyle = "rgba(15,23,42,0.8)";
  ctx.fill();
  if (hpFrac > 0) {
    roundRect(ctx, hbX, hbY, Math.max(hbH, hbW * hpFrac), hbH, 8);
    const hpGrad = ctx.createLinearGradient(hbX, 0, hbX + hbW, 0);
    if (hpFrac > 0.35) {
      hpGrad.addColorStop(0, "#22c55e");
      hpGrad.addColorStop(1, "#86efac");
    } else {
      hpGrad.addColorStop(0, "#dc2626");
      hpGrad.addColorStop(1, "#f87171");
    }
    ctx.fillStyle = hpGrad;
    ctx.fill();
  }
  roundRect(ctx, hbX, hbY, hbW, hbH, 8);
  ctx.strokeStyle = "rgba(148,163,184,0.5)";
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.font = "600 12px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#f1f5f9";
  ctx.fillText(
    `${Math.ceil(hud.health)} / ${Math.round(hud.maxHealth)}`,
    hbX + 8,
    hbY + hbH / 2 + 0.5,
  );

  // ── Bottom-right: active upgrades ───────────────────────────
  if (hud.upgrades.size > 0) {
    ctx.textAlign = "right";
    ctx.font = "500 12px 'Segoe UI', system-ui, sans-serif";
    let y = h - 20;
    for (const [id, count] of [...hud.upgrades.entries()].reverse()) {
      const def = UPGRADES.find(u => u.id === id);
      if (!def) continue;
      ctx.fillStyle = "rgba(203,213,225,0.85)";
      ctx.fillText(`${def.icon} ${def.name} ×${count}`, w - 16, y);
      y -= 20;
    }
  }

  ctx.restore();
}
