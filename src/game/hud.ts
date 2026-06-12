import type { HudState, WeaponId } from "./types";
import { UPGRADES } from "./upgrades";
import { WEAPON_ORDER, WEAPONS } from "./weapons";

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
  ctx.fillText(`LEVEL ${hud.level}`, w / 2, 28);

  // ── Boss bar (top center, under level badge) ────────────────
  if (hud.boss) {
    const bw = Math.min(560, w * 0.6);
    const bx = w / 2 - bw / 2;
    const by = 52;
    ctx.textAlign = "center";
    ctx.font = "700 13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#fca5a5";
    ctx.fillText(`${hud.boss.name}  —  PHASE ${hud.boss.phase}`, w / 2, by - 2);
    roundRect(ctx, bx, by + 6, bw, 12, 6);
    ctx.fillStyle = "rgba(15,23,42,0.8)";
    ctx.fill();
    ctx.strokeStyle = "rgba(248,113,113,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    const frac = Math.max(0, hud.boss.health / hud.boss.maxHealth);
    if (frac > 0) {
      roundRect(ctx, bx + 1.5, by + 7.5, (bw - 3) * frac, 9, 4.5);
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, "#dc2626");
      g.addColorStop(1, "#fb923c");
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  // ── Event banner (center top) ───────────────────────────────
  if (hud.banner && hud.banner.t > 0) {
    const alpha = Math.min(1, hud.banner.t / 0.5);
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.font = "800 26px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 18;
    ctx.fillText(hud.banner.text, w / 2, h * 0.22);
    ctx.shadowBlur = 0;
    ctx.font = "500 14px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#fde68a";
    ctx.fillText(hud.banner.sub, w / 2, h * 0.22 + 26);
    ctx.globalAlpha = 1;
  }

  // ── Bottom-left: health + shield ────────────────────────────
  const barW = 220;
  const barX = 18;
  const barY = h - 40;

  // Shield bar (above health when present)
  if (hud.shieldMax > 0) {
    const sFrac = Math.max(0, hud.shield / hud.shieldMax);
    roundRect(ctx, barX, barY - 16, barW, 10, 5);
    ctx.fillStyle = "rgba(15,23,42,0.8)";
    ctx.fill();
    if (sFrac > 0) {
      roundRect(ctx, barX + 1.5, barY - 14.5, (barW - 3) * sFrac, 7, 3.5);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(56,189,248,0.5)";
    ctx.lineWidth = 1;
    roundRect(ctx, barX, barY - 16, barW, 10, 5);
    ctx.stroke();
  }

  const healthFrac = Math.max(0, hud.health / hud.maxHealth);
  roundRect(ctx, barX, barY, barW, 18, 9);
  ctx.fillStyle = "rgba(15,23,42,0.8)";
  ctx.fill();
  if (healthFrac > 0) {
    roundRect(ctx, barX + 2, barY + 2, (barW - 4) * healthFrac, 14, 7);
    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    if (healthFrac > 0.35) {
      hpGrad.addColorStop(0, "#22c55e");
      hpGrad.addColorStop(1, "#86efac");
    } else {
      hpGrad.addColorStop(0, "#dc2626");
      hpGrad.addColorStop(1, "#f87171");
    }
    ctx.fillStyle = hpGrad;
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(148,163,184,0.35)";
  ctx.lineWidth = 1;
  roundRect(ctx, barX, barY, barW, 18, 9);
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.font = "600 11px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `${Math.ceil(Math.max(0, hud.health))} / ${Math.round(hud.maxHealth)}`,
    barX + barW / 2,
    barY + 9.5,
  );

  // ── Weapon slots + ability (bottom center) ──────────────────
  const slotSize = 40;
  const gap = 8;
  const totalSlots = WEAPON_ORDER.length + 1; // 3 weapons + ability
  const slotsW = totalSlots * slotSize + (totalSlots - 1) * gap + 10;
  let slotX = w / 2 - slotsW / 2;
  const slotY = h - slotSize - 14;

  WEAPON_ORDER.forEach((wid: WeaponId, i: number) => {
    const unlocked = hud.unlockedWeapons.includes(wid);
    const active = hud.weapon === wid;
    roundRect(ctx, slotX, slotY, slotSize, slotSize, 8);
    ctx.fillStyle = active ? "rgba(56,189,248,0.22)" : "rgba(15,23,42,0.78)";
    ctx.fill();
    ctx.strokeStyle = active ? "#38bdf8" : "rgba(148,163,184,0.3)";
    ctx.lineWidth = active ? 2 : 1;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = "16px 'Segoe UI', system-ui, sans-serif";
    ctx.globalAlpha = unlocked ? 1 : 0.28;
    ctx.fillText(
      WEAPONS[wid].icon,
      slotX + slotSize / 2,
      slotY + slotSize / 2 - 3,
    );
    ctx.globalAlpha = 1;
    ctx.font = "600 9px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = unlocked ? "#94a3b8" : "#475569";
    ctx.fillText(`${i + 1}`, slotX + slotSize / 2, slotY + slotSize - 7);
    slotX += slotSize + gap;
  });

  // Ability slot
  slotX += 10;
  roundRect(ctx, slotX - 10, slotY, slotSize, slotSize, 8);
  const abilityReady = hud.abilityCooldown <= 0;
  ctx.fillStyle = abilityReady ? "rgba(251,191,36,0.2)" : "rgba(15,23,42,0.78)";
  ctx.fill();
  ctx.strokeStyle = abilityReady ? "#fbbf24" : "rgba(148,163,184,0.3)";
  ctx.lineWidth = abilityReady ? 2 : 1;
  ctx.stroke();
  ctx.font = "16px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    hud.abilityIcon,
    slotX - 10 + slotSize / 2,
    slotY + slotSize / 2 - 3,
  );
  if (!abilityReady) {
    // Cooldown sweep overlay
    const frac = hud.abilityCooldown / hud.abilityCooldownMax;
    ctx.fillStyle = "rgba(2,6,23,0.65)";
    ctx.beginPath();
    ctx.moveTo(slotX - 10 + slotSize / 2, slotY + slotSize / 2);
    ctx.arc(
      slotX - 10 + slotSize / 2,
      slotY + slotSize / 2,
      slotSize,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * frac,
    );
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fcd34d";
    ctx.font = "700 12px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(
      `${Math.ceil(hud.abilityCooldown)}`,
      slotX - 10 + slotSize / 2,
      slotY + slotSize / 2 - 3,
    );
  } else {
    ctx.font = "600 9px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText("SPC", slotX - 10 + slotSize / 2, slotY + slotSize - 7);
  }

  // ── Top-left: credits, materials, kills, time ───────────────
  ctx.textAlign = "left";
  ctx.font = "600 13px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(`◈ ${hud.credits.toLocaleString()}`, 18, 26);
  ctx.fillStyle = "#22d3ee";
  ctx.fillText(`⬡ ${hud.materials.toLocaleString()}`, 18, 46);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 12px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(`☠ ${hud.kills}`, 18, 66);
  ctx.fillText(`⏱ ${formatTime(hud.time)}`, 18, 84);

  // ── Top-right: acquired upgrades ────────────────────────────
  if (hud.upgrades.size > 0) {
    let ux = w - 18;
    ctx.font = "13px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "right";
    const entries = [...hud.upgrades.entries()];
    for (let i = entries.length - 1; i >= 0; i--) {
      const [id, count] = entries[i];
      const def = UPGRADES.find(u => u.id === id);
      if (!def) continue;
      const label = count > 1 ? `${def.icon}×${count}` : def.icon;
      const tw = ctx.measureText(label).width;
      roundRect(ctx, ux - tw - 10, 14, tw + 10, 22, 6);
      ctx.fillStyle =
        def.rarity === "legendary"
          ? "rgba(120,53,15,0.7)"
          : def.rarity === "rare"
            ? "rgba(30,58,138,0.6)"
            : "rgba(15,23,42,0.7)";
      ctx.fill();
      if (def.rarity !== "common") {
        ctx.strokeStyle =
          def.rarity === "legendary"
            ? "rgba(251,191,36,0.6)"
            : "rgba(96,165,250,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(label, ux - 5, 25);
      ux -= tw + 16;
      if (ux < w * 0.45) break;
    }
  }

  ctx.restore();
}
