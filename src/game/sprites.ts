/**
 * Pre-rendered sprite cache. All ships are drawn once to offscreen canvases
 * (with glow baked in) and then blitted with drawImage — far cheaper than
 * per-frame path drawing with shadowBlur.
 *
 * All art faces +X. Sprites are rendered at 2x supersampling for crispness.
 */

import type { EliteVariant, EnemyKind, ShipClassId } from "./types";

export interface Sprite {
  canvas: HTMLCanvasElement;
  /** Half-size in world units (drawn size = size x size). */
  half: number;
  size: number;
}

const SS = 2; // supersample factor

function makeSprite(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, r: number) => void,
): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = size * SS;
  canvas.height = size * SS;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(SS, 0, 0, SS, (size * SS) / 2, (size * SS) / 2);
    draw(ctx, size / 2);
  }
  return { canvas, half: size / 2, size };
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
  angle: number,
  scale = 1,
  alpha = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  const s = sprite.size * scale;
  ctx.drawImage(sprite.canvas, -s / 2, -s / 2, s, s);
  ctx.restore();
}

// ── Drawing helpers ─────────────────────────────────────────────

function glow(ctx: CanvasRenderingContext2D, color: string, blur: number) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function noGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowBlur = 0;
}

function poly(ctx: CanvasRenderingContext2D, pts: number[][]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

function hullGradient(
  ctx: CanvasRenderingContext2D,
  r: number,
  dark: string,
  light: string,
): CanvasGradient {
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, dark);
  g.addColorStop(1, light);
  return g;
}

function cockpit(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  h: number,
  color = "#bae6fd",
) {
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, "#0c4a6e");
  g.addColorStop(0.55, color);
  g.addColorStop(1, "#f0f9ff");
  ctx.beginPath();
  ctx.ellipse(x, 0, w, h, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(8,47,73,0.8)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function engines(
  ctx: CanvasRenderingContext2D,
  positions: Array<[number, number]>,
  w: number,
  h: number,
  flame = "#7dd3fc",
) {
  for (const [x, y] of positions) {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x - w * 0.4, y - h / 2, w, h);
    glow(ctx, flame, 8);
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.ellipse(x - w * 0.45, y, w * 0.55, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    noGlow(ctx);
  }
}

// ── Player ships ────────────────────────────────────────────────

function drawFighter(ctx: CanvasRenderingContext2D, r: number) {
  const u = r / 16;
  glow(ctx, "#38bdf8", 10);
  // Wings (swept back)
  poly(ctx, [
    [2 * u, -2 * u],
    [-7 * u, -13 * u],
    [-11 * u, -12 * u],
    [-6 * u, -2 * u],
  ]);
  ctx.fillStyle = "#155e75";
  ctx.fill();
  poly(ctx, [
    [2 * u, 2 * u],
    [-7 * u, 13 * u],
    [-11 * u, 12 * u],
    [-6 * u, 2 * u],
  ]);
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 0.9;
  poly(ctx, [
    [2 * u, -2 * u],
    [-7 * u, -13 * u],
    [-11 * u, -12 * u],
    [-6 * u, -2 * u],
  ]);
  ctx.stroke();
  poly(ctx, [
    [2 * u, 2 * u],
    [-7 * u, 13 * u],
    [-11 * u, 12 * u],
    [-6 * u, 2 * u],
  ]);
  ctx.stroke();
  // Wing tip lights
  glow(ctx, "#f0abfc", 6);
  ctx.fillStyle = "#f0abfc";
  ctx.fillRect(-10.4 * u, -12.9 * u, 2.4 * u, 1.4 * u);
  ctx.fillRect(-10.4 * u, 11.5 * u, 2.4 * u, 1.4 * u);
  noGlow(ctx);
  // Fuselage
  glow(ctx, "#38bdf8", 12);
  poly(ctx, [
    [14 * u, 0],
    [6 * u, -3.4 * u],
    [-8 * u, -4.2 * u],
    [-11 * u, -2 * u],
    [-11 * u, 2 * u],
    [-8 * u, 4.2 * u],
    [6 * u, 3.4 * u],
  ]);
  ctx.fillStyle = hullGradient(ctx, r, "#075985", "#e0f2fe");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Panel lines
  ctx.strokeStyle = "rgba(8,47,73,0.55)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(5 * u, -3.2 * u);
  ctx.lineTo(5 * u, 3.2 * u);
  ctx.moveTo(-2 * u, -4 * u);
  ctx.lineTo(-2 * u, 4 * u);
  ctx.stroke();
  // Nose stripe
  ctx.fillStyle = "#f59e0b";
  poly(ctx, [
    [12.4 * u, 0],
    [9 * u, -1.6 * u],
    [9 * u, 1.6 * u],
  ]);
  ctx.fill();
  cockpit(ctx, 3.4 * u, 3.4 * u, 2.1 * u);
  engines(
    ctx,
    [
      [-11 * u, -1.6 * u],
      [-11 * u, 1.6 * u],
    ],
    2.6 * u,
    2.6 * u,
  );
}

function drawInterceptor(ctx: CanvasRenderingContext2D, r: number) {
  const u = r / 16;
  // Forward-swept blades
  glow(ctx, "#a78bfa", 10);
  poly(ctx, [
    [-4 * u, -1.5 * u],
    [8 * u, -12 * u],
    [11 * u, -10.5 * u],
    [0, -2.8 * u],
  ]);
  ctx.fillStyle = "#4c1d95";
  ctx.fill();
  poly(ctx, [
    [-4 * u, 1.5 * u],
    [8 * u, 12 * u],
    [11 * u, 10.5 * u],
    [0, 2.8 * u],
  ]);
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#c4b5fd";
  ctx.lineWidth = 0.9;
  poly(ctx, [
    [-4 * u, -1.5 * u],
    [8 * u, -12 * u],
    [11 * u, -10.5 * u],
    [0, -2.8 * u],
  ]);
  ctx.stroke();
  poly(ctx, [
    [-4 * u, 1.5 * u],
    [8 * u, 12 * u],
    [11 * u, 10.5 * u],
    [0, 2.8 * u],
  ]);
  ctx.stroke();
  // Needle fuselage
  glow(ctx, "#a78bfa", 12);
  poly(ctx, [
    [15 * u, 0],
    [4 * u, -2.6 * u],
    [-10 * u, -3 * u],
    [-13 * u, 0],
    [-10 * u, 3 * u],
    [4 * u, 2.6 * u],
  ]);
  ctx.fillStyle = hullGradient(ctx, r, "#5b21b6", "#ede9fe");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#c4b5fd";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(46,16,101,0.6)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(2 * u, -2.5 * u);
  ctx.lineTo(2 * u, 2.5 * u);
  ctx.stroke();
  ctx.fillStyle = "#f0abfc";
  poly(ctx, [
    [13.6 * u, 0],
    [10 * u, -1.3 * u],
    [10 * u, 1.3 * u],
  ]);
  ctx.fill();
  cockpit(ctx, 2.5 * u, 3.6 * u, 1.8 * u, "#ddd6fe");
  engines(ctx, [[-12.5 * u, 0]], 3 * u, 3.4 * u, "#c4b5fd");
}

function drawGunship(ctx: CanvasRenderingContext2D, r: number) {
  const u = r / 16;
  // Broad armored wings
  glow(ctx, "#fb923c", 9);
  poly(ctx, [
    [4 * u, -3 * u],
    [-2 * u, -13 * u],
    [-11 * u, -13 * u],
    [-9 * u, -3.5 * u],
  ]);
  ctx.fillStyle = "#7c2d12";
  ctx.fill();
  poly(ctx, [
    [4 * u, 3 * u],
    [-2 * u, 13 * u],
    [-11 * u, 13 * u],
    [-9 * u, 3.5 * u],
  ]);
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#fdba74";
  ctx.lineWidth = 1;
  poly(ctx, [
    [4 * u, -3 * u],
    [-2 * u, -13 * u],
    [-11 * u, -13 * u],
    [-9 * u, -3.5 * u],
  ]);
  ctx.stroke();
  poly(ctx, [
    [4 * u, 3 * u],
    [-2 * u, 13 * u],
    [-11 * u, 13 * u],
    [-9 * u, 3.5 * u],
  ]);
  ctx.stroke();
  // Wing cannons
  ctx.fillStyle = "#451a03";
  ctx.fillRect(-1 * u, -12 * u, 8 * u, 2.2 * u);
  ctx.fillRect(-1 * u, 9.8 * u, 8 * u, 2.2 * u);
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(6 * u, -11.6 * u, 1.6 * u, 1.4 * u);
  ctx.fillRect(6 * u, 10.2 * u, 1.6 * u, 1.4 * u);
  // Heavy hull
  glow(ctx, "#fb923c", 12);
  poly(ctx, [
    [13 * u, 0],
    [8 * u, -4.5 * u],
    [-7 * u, -5.5 * u],
    [-12 * u, -3 * u],
    [-12 * u, 3 * u],
    [-7 * u, 5.5 * u],
    [8 * u, 4.5 * u],
  ]);
  ctx.fillStyle = hullGradient(ctx, r, "#9a3412", "#ffedd5");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#fdba74";
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // Armor plates
  ctx.strokeStyle = "rgba(67,20,7,0.65)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(6 * u, -4.3 * u);
  ctx.lineTo(6 * u, 4.3 * u);
  ctx.moveTo(0, -5.2 * u);
  ctx.lineTo(0, 5.2 * u);
  ctx.moveTo(-6 * u, -5.3 * u);
  ctx.lineTo(-6 * u, 5.3 * u);
  ctx.stroke();
  ctx.fillStyle = "#fbbf24";
  poly(ctx, [
    [11.6 * u, 0],
    [8.4 * u, -2 * u],
    [8.4 * u, 2 * u],
  ]);
  ctx.fill();
  cockpit(ctx, 3 * u, 3 * u, 2.4 * u, "#fed7aa");
  engines(
    ctx,
    [
      [-12 * u, -2.2 * u],
      [-12 * u, 2.2 * u],
    ],
    3 * u,
    3 * u,
    "#fdba74",
  );
}

function drawExplorer(ctx: CanvasRenderingContext2D, r: number) {
  const u = r / 16;
  // Sensor ring wings
  glow(ctx, "#34d399", 9);
  ctx.strokeStyle = "#065f46";
  ctx.lineWidth = 2.6 * u;
  ctx.beginPath();
  ctx.arc(-3 * u, 0, 10.5 * u, Math.PI * 0.32, Math.PI * 1.68);
  ctx.stroke();
  noGlow(ctx);
  ctx.strokeStyle = "#6ee7b7";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(-3 * u, 0, 11.6 * u, Math.PI * 0.34, Math.PI * 1.66);
  ctx.stroke();
  // Sensor pods
  glow(ctx, "#a7f3d0", 7);
  ctx.fillStyle = "#a7f3d0";
  ctx.beginPath();
  ctx.arc(
    -3 * u + Math.cos(2.4) * 10.5 * u,
    Math.sin(2.4) * 10.5 * u,
    1.7 * u,
    0,
    Math.PI * 2,
  );
  ctx.arc(
    -3 * u + Math.cos(-2.4) * 10.5 * u,
    Math.sin(-2.4) * 10.5 * u,
    1.7 * u,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  noGlow(ctx);
  // Sleek hull
  glow(ctx, "#34d399", 12);
  poly(ctx, [
    [14 * u, 0],
    [7 * u, -3 * u],
    [-6 * u, -4 * u],
    [-11 * u, -1.8 * u],
    [-11 * u, 1.8 * u],
    [-6 * u, 4 * u],
    [7 * u, 3 * u],
  ]);
  ctx.fillStyle = hullGradient(ctx, r, "#065f46", "#d1fae5");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#6ee7b7";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(6,78,59,0.6)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(4 * u, -3 * u);
  ctx.lineTo(4 * u, 3 * u);
  ctx.moveTo(-3 * u, -3.8 * u);
  ctx.lineTo(-3 * u, 3.8 * u);
  ctx.stroke();
  ctx.fillStyle = "#fde68a";
  poly(ctx, [
    [12.6 * u, 0],
    [9.4 * u, -1.5 * u],
    [9.4 * u, 1.5 * u],
  ]);
  ctx.fill();
  cockpit(ctx, 4 * u, 3.6 * u, 2 * u, "#a7f3d0");
  engines(ctx, [[-10.8 * u, 0]], 2.8 * u, 3.2 * u, "#6ee7b7");
}

// ── Enemy ships ─────────────────────────────────────────────────

function drawScout(ctx: CanvasRenderingContext2D, r: number, flash: boolean) {
  const u = r / 12;
  const body = flash ? "#ffffff" : "#22c55e";
  glow(ctx, "#22c55e", 8);
  // Blade wings
  poly(ctx, [
    [1 * u, -1 * u],
    [-6 * u, -9 * u],
    [-9 * u, -7.5 * u],
    [-4.5 * u, -1 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : "#14532d";
  ctx.fill();
  poly(ctx, [
    [1 * u, 1 * u],
    [-6 * u, 9 * u],
    [-9 * u, 7.5 * u],
    [-4.5 * u, 1 * u],
  ]);
  ctx.fill();
  // Dart hull
  poly(ctx, [
    [10 * u, 0],
    [0, -2.6 * u],
    [-8 * u, -1.8 * u],
    [-6 * u, 0],
    [-8 * u, 1.8 * u],
    [0, 2.6 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : hullGradient(ctx, r, "#14532d", body);
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Eye
  glow(ctx, "#bbf7d0", 5);
  ctx.fillStyle = "#bbf7d0";
  ctx.beginPath();
  ctx.arc(4 * u, 0, 1.5 * u, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
}

function drawEnemyFighter(
  ctx: CanvasRenderingContext2D,
  r: number,
  flash: boolean,
) {
  const u = r / 15;
  glow(ctx, "#f97316", 8);
  // Talon wings
  poly(ctx, [
    [3 * u, -2 * u],
    [-3 * u, -12 * u],
    [-9 * u, -10 * u],
    [-6 * u, -2 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : "#7c2d12";
  ctx.fill();
  poly(ctx, [
    [3 * u, 2 * u],
    [-3 * u, 12 * u],
    [-9 * u, 10 * u],
    [-6 * u, 2 * u],
  ]);
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#fb923c";
  ctx.lineWidth = 0.8;
  poly(ctx, [
    [3 * u, -2 * u],
    [-3 * u, -12 * u],
    [-9 * u, -10 * u],
    [-6 * u, -2 * u],
  ]);
  ctx.stroke();
  poly(ctx, [
    [3 * u, 2 * u],
    [-3 * u, 12 * u],
    [-9 * u, 10 * u],
    [-6 * u, 2 * u],
  ]);
  ctx.stroke();
  // Gun barrels
  ctx.fillStyle = flash ? "#ffffff" : "#431407";
  ctx.fillRect(-1 * u, -8.6 * u, 7 * u, 1.6 * u);
  ctx.fillRect(-1 * u, 7 * u, 7 * u, 1.6 * u);
  // Hull
  glow(ctx, "#f97316", 9);
  poly(ctx, [
    [11 * u, 0],
    [4 * u, -3 * u],
    [-7 * u, -3.6 * u],
    [-9 * u, 0],
    [-7 * u, 3.6 * u],
    [4 * u, 3 * u],
  ]);
  ctx.fillStyle = flash
    ? "#ffffff"
    : hullGradient(ctx, r, "#7c2d12", "#fb923c");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#fdba74";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Visor
  glow(ctx, "#fecaca", 5);
  ctx.fillStyle = "#fecaca";
  poly(ctx, [
    [7 * u, 0],
    [3 * u, -1.4 * u],
    [3 * u, 1.4 * u],
  ]);
  ctx.fill();
  noGlow(ctx);
}

function drawTank(ctx: CanvasRenderingContext2D, r: number, flash: boolean) {
  const u = r / 20;
  glow(ctx, "#8b5cf6", 9);
  // Hex fortress
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const hr = 19 * u;
    if (i === 0) ctx.moveTo(Math.cos(a) * hr, Math.sin(a) * hr);
    else ctx.lineTo(Math.cos(a) * hr, Math.sin(a) * hr);
  }
  ctx.closePath();
  ctx.fillStyle = flash
    ? "#ffffff"
    : hullGradient(ctx, r, "#4c1d95", "#a78bfa");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#c4b5fd";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Inner plate
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const hr = 12.5 * u;
    if (i === 0) ctx.moveTo(Math.cos(a) * hr, Math.sin(a) * hr);
    else ctx.lineTo(Math.cos(a) * hr, Math.sin(a) * hr);
  }
  ctx.closePath();
  ctx.fillStyle = flash ? "#ffffff" : "#2e1065";
  ctx.fill();
  ctx.strokeStyle = "rgba(196,181,253,0.6)";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Armor bolts
  ctx.fillStyle = flash ? "#ffffff" : "#c4b5fd";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(
      Math.cos(a) * 15.6 * u,
      Math.sin(a) * 15.6 * u,
      1.5 * u,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // Ram prow
  poly(ctx, [
    [24 * u, 0],
    [14 * u, -6 * u],
    [14 * u, 6 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : "#6d28d9";
  ctx.fill();
  ctx.strokeStyle = "#c4b5fd";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Core
  glow(ctx, "#e9d5ff", 8);
  ctx.fillStyle = "#e9d5ff";
  ctx.beginPath();
  ctx.arc(0, 0, 3.6 * u, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
}

const ELITE_COLORS: Record<EliteVariant, [string, string, string]> = {
  spread: ["#713f12", "#facc15", "#fef08a"],
  shield: ["#155e75", "#22d3ee", "#a5f3fc"],
  warp: ["#831843", "#f472b6", "#fbcfe8"],
};

function drawElite(
  ctx: CanvasRenderingContext2D,
  r: number,
  flash: boolean,
  variant: EliteVariant,
) {
  const [dark, mid, light] = ELITE_COLORS[variant];
  const u = r / 18;
  glow(ctx, mid, 10);
  // Crescent wings
  poly(ctx, [
    [6 * u, -3 * u],
    [2 * u, -13 * u],
    [-9 * u, -16 * u],
    [-5 * u, -7 * u],
    [-8 * u, -3 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : dark;
  ctx.fill();
  poly(ctx, [
    [6 * u, 3 * u],
    [2 * u, 13 * u],
    [-9 * u, 16 * u],
    [-5 * u, 7 * u],
    [-8 * u, 3 * u],
  ]);
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = mid;
  ctx.lineWidth = 1;
  poly(ctx, [
    [6 * u, -3 * u],
    [2 * u, -13 * u],
    [-9 * u, -16 * u],
    [-5 * u, -7 * u],
    [-8 * u, -3 * u],
  ]);
  ctx.stroke();
  poly(ctx, [
    [6 * u, 3 * u],
    [2 * u, 13 * u],
    [-9 * u, 16 * u],
    [-5 * u, 7 * u],
    [-8 * u, 3 * u],
  ]);
  ctx.stroke();
  // Wing emitters
  glow(ctx, light, 6);
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(-6.5 * u, -14.5 * u, 1.8 * u, 0, Math.PI * 2);
  ctx.arc(-6.5 * u, 14.5 * u, 1.8 * u, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
  // Command hull
  glow(ctx, mid, 12);
  poly(ctx, [
    [15 * u, 0],
    [8 * u, -4 * u],
    [-4 * u, -5 * u],
    [-12 * u, -2.4 * u],
    [-12 * u, 2.4 * u],
    [-4 * u, 5 * u],
    [8 * u, 4 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : hullGradient(ctx, r, dark, mid);
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = light;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Crest
  ctx.fillStyle = flash ? "#ffffff" : light;
  poly(ctx, [
    [13 * u, 0],
    [8 * u, -1.8 * u],
    [8 * u, 1.8 * u],
  ]);
  ctx.fill();
  glow(ctx, light, 7);
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(1 * u, 0, 2.4 * u, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
}

function drawSniper(ctx: CanvasRenderingContext2D, r: number, flash: boolean) {
  const u = r / 14;
  glow(ctx, "#ef4444", 8);
  // Stabilizer fins
  poly(ctx, [
    [-4 * u, -1.5 * u],
    [-10 * u, -8 * u],
    [-13 * u, -6.5 * u],
    [-8 * u, -1 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : "#7f1d1d";
  ctx.fill();
  poly(ctx, [
    [-4 * u, 1.5 * u],
    [-10 * u, 8 * u],
    [-13 * u, 6.5 * u],
    [-8 * u, 1 * u],
  ]);
  ctx.fill();
  noGlow(ctx);
  // Long rail barrel
  ctx.fillStyle = flash ? "#ffffff" : "#450a0a";
  ctx.fillRect(2 * u, -1.2 * u, 14 * u, 2.4 * u);
  ctx.strokeStyle = "#f87171";
  ctx.lineWidth = 0.7;
  ctx.strokeRect(2 * u, -1.2 * u, 14 * u, 2.4 * u);
  glow(ctx, "#fca5a5", 6);
  ctx.fillStyle = "#fca5a5";
  ctx.fillRect(14.5 * u, -0.8 * u, 2 * u, 1.6 * u);
  noGlow(ctx);
  // Slim hull
  glow(ctx, "#ef4444", 9);
  poly(ctx, [
    [5 * u, 0],
    [1 * u, -3.4 * u],
    [-9 * u, -3 * u],
    [-12 * u, 0],
    [-9 * u, 3 * u],
    [1 * u, 3.4 * u],
  ]);
  ctx.fillStyle = flash
    ? "#ffffff"
    : hullGradient(ctx, r, "#7f1d1d", "#f87171");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#fca5a5";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Scope lens
  glow(ctx, "#fee2e2", 6);
  ctx.fillStyle = "#fee2e2";
  ctx.beginPath();
  ctx.arc(-1 * u, 0, 1.8 * u, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
}

function drawCarrier(ctx: CanvasRenderingContext2D, r: number, flash: boolean) {
  const u = r / 20;
  glow(ctx, "#fb7185", 9);
  // Wide barge hull
  poly(ctx, [
    [14 * u, -6 * u],
    [18 * u, 0],
    [14 * u, 6 * u],
    [-14 * u, 9 * u],
    [-18 * u, 4 * u],
    [-18 * u, -4 * u],
    [-14 * u, -9 * u],
  ]);
  ctx.fillStyle = flash
    ? "#ffffff"
    : hullGradient(ctx, r, "#881337", "#fb7185");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#fda4af";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Missile pods (left/right racks)
  for (const side of [-1, 1]) {
    ctx.fillStyle = flash ? "#ffffff" : "#4c0519";
    ctx.fillRect(-10 * u, side * 9 * u - (side > 0 ? 0 : 4 * u), 16 * u, 4 * u);
    ctx.strokeStyle = "#fda4af";
    ctx.lineWidth = 0.7;
    ctx.strokeRect(
      -10 * u,
      side * 9 * u - (side > 0 ? 0 : 4 * u),
      16 * u,
      4 * u,
    );
    // Missile tips
    ctx.fillStyle = "#fecdd3";
    for (let i = 0; i < 4; i++) {
      const mx = -8 * u + i * 4 * u;
      const my = side * 11 * u - (side > 0 ? 0 : 0);
      ctx.beginPath();
      ctx.arc(mx, my, 1.1 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Bridge tower
  ctx.fillStyle = flash ? "#ffffff" : "#9f1239";
  ctx.fillRect(-4 * u, -4 * u, 9 * u, 8 * u);
  ctx.strokeStyle = "#fda4af";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-4 * u, -4 * u, 9 * u, 8 * u);
  // Bridge lights
  glow(ctx, "#fecdd3", 5);
  ctx.fillStyle = "#fecdd3";
  ctx.fillRect(2 * u, -2.4 * u, 1.6 * u, 4.8 * u);
  noGlow(ctx);
}

function drawDrone(ctx: CanvasRenderingContext2D, r: number, flash: boolean) {
  const u = r / 8;
  glow(ctx, "#a3e635", 7);
  poly(ctx, [
    [7 * u, 0],
    [-4 * u, -5.5 * u],
    [-2 * u, 0],
    [-4 * u, 5.5 * u],
  ]);
  ctx.fillStyle = flash
    ? "#ffffff"
    : hullGradient(ctx, r, "#3f6212", "#a3e635");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#bef264";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  glow(ctx, "#ecfccb", 4);
  ctx.fillStyle = "#ecfccb";
  ctx.beginPath();
  ctx.arc(1.5 * u, 0, 1.2 * u, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
}

function drawBoss(ctx: CanvasRenderingContext2D, r: number, flash: boolean) {
  const u = r / 64;
  // Massive dreadnought, mostly symmetric
  glow(ctx, "#dc2626", 18);
  // Outer wing structure
  poly(ctx, [
    [10 * u, -14 * u],
    [-6 * u, -52 * u],
    [-34 * u, -56 * u],
    [-44 * u, -38 * u],
    [-30 * u, -12 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : "#450a0a";
  ctx.fill();
  poly(ctx, [
    [10 * u, 14 * u],
    [-6 * u, 52 * u],
    [-34 * u, 56 * u],
    [-44 * u, 38 * u],
    [-30 * u, 12 * u],
  ]);
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#f87171";
  ctx.lineWidth = 1.6;
  poly(ctx, [
    [10 * u, -14 * u],
    [-6 * u, -52 * u],
    [-34 * u, -56 * u],
    [-44 * u, -38 * u],
    [-30 * u, -12 * u],
  ]);
  ctx.stroke();
  poly(ctx, [
    [10 * u, 14 * u],
    [-6 * u, 52 * u],
    [-34 * u, 56 * u],
    [-44 * u, 38 * u],
    [-30 * u, 12 * u],
  ]);
  ctx.stroke();
  // Wing gun batteries
  ctx.fillStyle = flash ? "#ffffff" : "#27272a";
  for (const side of [-1, 1]) {
    ctx.fillRect(-8 * u, side * 40 * u - 3 * u, 22 * u, 6 * u);
    ctx.fillRect(-18 * u, side * 28 * u - 2.5 * u, 20 * u, 5 * u);
  }
  glow(ctx, "#fca5a5", 6);
  ctx.fillStyle = "#fca5a5";
  for (const side of [-1, 1]) {
    ctx.fillRect(12 * u, side * 40 * u - 1.6 * u, 3.6 * u, 3.2 * u);
    ctx.fillRect(0, side * 28 * u - 1.4 * u, 3.2 * u, 2.8 * u);
  }
  noGlow(ctx);
  // Main hull
  glow(ctx, "#dc2626", 20);
  poly(ctx, [
    [56 * u, 0],
    [34 * u, -12 * u],
    [6 * u, -18 * u],
    [-30 * u, -20 * u],
    [-50 * u, -10 * u],
    [-50 * u, 10 * u],
    [-30 * u, 20 * u],
    [6 * u, 18 * u],
    [34 * u, 12 * u],
  ]);
  ctx.fillStyle = flash
    ? "#ffffff"
    : hullGradient(ctx, r, "#450a0a", "#ef4444");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#fca5a5";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hull plating
  ctx.strokeStyle = "rgba(69,10,10,0.8)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(30 * u, -11 * u);
  ctx.lineTo(30 * u, 11 * u);
  ctx.moveTo(12 * u, -16 * u);
  ctx.lineTo(12 * u, 16 * u);
  ctx.moveTo(-10 * u, -19 * u);
  ctx.lineTo(-10 * u, 19 * u);
  ctx.moveTo(-32 * u, -19 * u);
  ctx.lineTo(-32 * u, 19 * u);
  ctx.stroke();
  // Prow blade
  poly(ctx, [
    [62 * u, 0],
    [40 * u, -7 * u],
    [40 * u, 7 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : "#7f1d1d";
  ctx.fill();
  ctx.strokeStyle = "#fca5a5";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Reactor core
  const core = ctx.createRadialGradient(-2 * u, 0, 0, -2 * u, 0, 10 * u);
  core.addColorStop(0, "#fff1f2");
  core.addColorStop(0.5, "#fb7185");
  core.addColorStop(1, "rgba(225,29,72,0)");
  glow(ctx, "#fb7185", 14);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(-2 * u, 0, 10 * u, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
  // Bridge
  ctx.fillStyle = flash ? "#ffffff" : "#27272a";
  ctx.fillRect(18 * u, -5 * u, 10 * u, 10 * u);
  glow(ctx, "#fecaca", 5);
  ctx.fillStyle = "#fecaca";
  ctx.fillRect(24 * u, -3 * u, 2.4 * u, 6 * u);
  noGlow(ctx);
  // Engine bank
  engines(
    ctx,
    [
      [-50 * u, -13 * u],
      [-50 * u, 0],
      [-50 * u, 13 * u],
    ],
    6 * u,
    8 * u,
    "#f87171",
  );
}

/** OBSIDIAN MAW — black-violet crab dreadnought with forward mandibles. */
function drawBossMaw(ctx: CanvasRenderingContext2D, r: number, flash: boolean) {
  const u = r / 64;
  glow(ctx, "#a855f7", 18);
  // Mandible claws forming an open maw
  for (const side of [-1, 1]) {
    poly(ctx, [
      [16 * u, side * 10 * u],
      [58 * u, side * 26 * u],
      [44 * u, side * 44 * u],
      [10 * u, side * 30 * u],
      [-2 * u, side * 16 * u],
    ]);
    ctx.fillStyle = flash ? "#ffffff" : "#1e1033";
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    glow(ctx, "#a855f7", 18);
    // Claw teeth
    ctx.fillStyle = flash ? "#ffffff" : "#3b0764";
    for (let i = 0; i < 3; i++) {
      const tx = 26 + i * 11;
      poly(ctx, [
        [tx * u, side * (16 + i * 6) * u],
        [(tx + 8) * u, side * (21 + i * 6) * u],
        [tx * u, side * (25 + i * 6) * u],
      ]);
      ctx.fill();
    }
  }
  noGlow(ctx);
  // Rear carapace wings
  glow(ctx, "#a855f7", 14);
  poly(ctx, [
    [-8 * u, -16 * u],
    [-30 * u, -48 * u],
    [-52 * u, -40 * u],
    [-46 * u, -14 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : "#2e1065";
  ctx.fill();
  poly(ctx, [
    [-8 * u, 16 * u],
    [-30 * u, 48 * u],
    [-52 * u, 40 * u],
    [-46 * u, 14 * u],
  ]);
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#c084fc";
  ctx.lineWidth = 1.4;
  poly(ctx, [
    [-8 * u, -16 * u],
    [-30 * u, -48 * u],
    [-52 * u, -40 * u],
    [-46 * u, -14 * u],
  ]);
  ctx.stroke();
  poly(ctx, [
    [-8 * u, 16 * u],
    [-30 * u, 48 * u],
    [-52 * u, 40 * u],
    [-46 * u, 14 * u],
  ]);
  ctx.stroke();
  // Central carapace
  glow(ctx, "#a855f7", 20);
  ctx.beginPath();
  ctx.ellipse(-6 * u, 0, 32 * u, 24 * u, 0, 0, Math.PI * 2);
  ctx.fillStyle = flash
    ? "#ffffff"
    : hullGradient(ctx, r, "#1e1033", "#7e22ce");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#d8b4fe";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Plating ridges
  ctx.strokeStyle = "rgba(30,16,51,0.85)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const px of [-24, -12, 2, 14]) {
    const hh = 22 * Math.sqrt(Math.max(0, 1 - ((px + 6) / 32) ** 2));
    ctx.moveTo(px * u, -hh * u);
    ctx.lineTo(px * u, hh * u);
  }
  ctx.stroke();
  // Maw core — glowing eye between the claws
  const core = ctx.createRadialGradient(20 * u, 0, 0, 20 * u, 0, 12 * u);
  core.addColorStop(0, "#faf5ff");
  core.addColorStop(0.45, "#c084fc");
  core.addColorStop(1, "rgba(126,34,206,0)");
  glow(ctx, "#c084fc", 16);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(20 * u, 0, 12 * u, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
  // Engines
  engines(
    ctx,
    [
      [-38 * u, -10 * u],
      [-38 * u, 10 * u],
    ],
    6 * u,
    8 * u,
    "#c084fc",
  );
}

/** STAR REAPER — emerald dreadnought with scythe-blade wings. */
function drawBossReaper(
  ctx: CanvasRenderingContext2D,
  r: number,
  flash: boolean,
) {
  const u = r / 64;
  // Scythe wings — curved crescents sweeping forward
  glow(ctx, "#10b981", 16);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-10 * u, side * 8 * u);
    ctx.quadraticCurveTo(8 * u, side * 44 * u, 52 * u, side * 52 * u);
    ctx.quadraticCurveTo(18 * u, side * 50 * u, -14 * u, side * 30 * u);
    ctx.quadraticCurveTo(-26 * u, side * 20 * u, -10 * u, side * 8 * u);
    ctx.closePath();
    ctx.fillStyle = flash ? "#ffffff" : "#022c22";
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    glow(ctx, "#10b981", 16);
    // Blade edge highlight
    ctx.strokeStyle = "#a7f3d0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8 * u, side * 10 * u);
    ctx.quadraticCurveTo(8 * u, side * 42 * u, 50 * u, side * 50 * u);
    ctx.stroke();
  }
  noGlow(ctx);
  // Tail fins
  glow(ctx, "#10b981", 12);
  poly(ctx, [
    [-34 * u, -8 * u],
    [-58 * u, -24 * u],
    [-60 * u, -10 * u],
    [-44 * u, -2 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : "#064e3b";
  ctx.fill();
  poly(ctx, [
    [-34 * u, 8 * u],
    [-58 * u, 24 * u],
    [-60 * u, 10 * u],
    [-44 * u, 2 * u],
  ]);
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#6ee7b7";
  ctx.lineWidth = 1.2;
  poly(ctx, [
    [-34 * u, -8 * u],
    [-58 * u, -24 * u],
    [-60 * u, -10 * u],
    [-44 * u, -2 * u],
  ]);
  ctx.stroke();
  poly(ctx, [
    [-34 * u, 8 * u],
    [-58 * u, 24 * u],
    [-60 * u, 10 * u],
    [-44 * u, 2 * u],
  ]);
  ctx.stroke();
  // Slim spine hull
  glow(ctx, "#10b981", 20);
  poly(ctx, [
    [58 * u, 0],
    [30 * u, -9 * u],
    [-10 * u, -13 * u],
    [-44 * u, -8 * u],
    [-52 * u, 0],
    [-44 * u, 8 * u],
    [-10 * u, 13 * u],
    [30 * u, 9 * u],
  ]);
  ctx.fillStyle = flash
    ? "#ffffff"
    : hullGradient(ctx, r, "#022c22", "#10b981");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#6ee7b7";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Vertebrae plating
  ctx.strokeStyle = "rgba(2,44,34,0.85)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const px of [-36, -22, -8, 8, 24]) {
    ctx.moveTo(px * u, -11 * u);
    ctx.lineTo(px * u, 11 * u);
  }
  ctx.stroke();
  // Prow spike
  poly(ctx, [
    [64 * u, 0],
    [42 * u, -5 * u],
    [42 * u, 5 * u],
  ]);
  ctx.fillStyle = flash ? "#ffffff" : "#065f46";
  ctx.fill();
  ctx.strokeStyle = "#a7f3d0";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Reactor core
  const core = ctx.createRadialGradient(-4 * u, 0, 0, -4 * u, 0, 9 * u);
  core.addColorStop(0, "#ecfdf5");
  core.addColorStop(0.5, "#34d399");
  core.addColorStop(1, "rgba(16,185,129,0)");
  glow(ctx, "#34d399", 14);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(-4 * u, 0, 9 * u, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
  engines(ctx, [[-52 * u, 0]], 7 * u, 10 * u, "#34d399");
}

/** VOID HARBINGER — violet tri-spike star fortress. */
function drawBossHarbinger(
  ctx: CanvasRenderingContext2D,
  r: number,
  flash: boolean,
) {
  const u = r / 64;
  // Six radiating void spikes
  glow(ctx, "#e879f9", 16);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const len = i % 2 === 0 ? 58 : 40;
    const wdt = i % 2 === 0 ? 12 : 8;
    ctx.save();
    ctx.rotate(a);
    poly(ctx, [
      [len * u, 0],
      [10 * u, -wdt * u],
      [16 * u, 0],
      [10 * u, wdt * u],
    ]);
    ctx.fillStyle = flash ? "#ffffff" : i % 2 === 0 ? "#4a044e" : "#2e1065";
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = "#f0abfc";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    glow(ctx, "#e879f9", 16);
    // Spike tip light
    ctx.fillStyle = "#fdf4ff";
    ctx.beginPath();
    ctx.arc((len - 4) * u, 0, 2 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  noGlow(ctx);
  // Rotating ring plate
  glow(ctx, "#e879f9", 14);
  ctx.beginPath();
  ctx.arc(0, 0, 26 * u, 0, Math.PI * 2);
  ctx.fillStyle = flash
    ? "#ffffff"
    : hullGradient(ctx, r, "#3b0764", "#a21caf");
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = "#f0abfc";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(74,4,78,0.9)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 20 * u, 0, Math.PI * 2);
  ctx.stroke();
  // Ring studs
  ctx.fillStyle = flash ? "#ffffff" : "#f0abfc";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    ctx.beginPath();
    ctx.arc(
      Math.cos(a) * 23 * u,
      Math.sin(a) * 23 * u,
      1.8 * u,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // Void core — dark center with bright rim (event-horizon look)
  const core = ctx.createRadialGradient(0, 0, 2 * u, 0, 0, 14 * u);
  core.addColorStop(0, "#0a0118");
  core.addColorStop(0.62, "#1e1033");
  core.addColorStop(0.82, "#e879f9");
  core.addColorStop(1, "rgba(232,121,249,0)");
  glow(ctx, "#e879f9", 18);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 14 * u, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
}

// ── Sprite registry ─────────────────────────────────────────────

const cache = new Map<string, Sprite>();

const PLAYER_DRAWERS: Record<
  ShipClassId,
  (ctx: CanvasRenderingContext2D, r: number) => void
> = {
  fighter: drawFighter,
  interceptor: drawInterceptor,
  gunship: drawGunship,
  explorer: drawExplorer,
};

export function getPlayerSprite(ship: ShipClassId): Sprite {
  const key = `player:${ship}`;
  let s = cache.get(key);
  if (!s) {
    s = makeSprite(76, (ctx, r) => PLAYER_DRAWERS[ship](ctx, r * 0.78));
    cache.set(key, s);
  }
  return s;
}

/** One drawer per boss in BOSS_NAMES order. */
const BOSS_DRAWERS = [drawBoss, drawBossMaw, drawBossReaper, drawBossHarbinger];

/**
 * Renders a player ship as a small upward-facing icon and returns a data URL.
 * Used for detailed ship icons in the research lab and hangar UI.
 */
const iconCache = new Map<string, string>();
export function getShipIconDataUrl(ship: ShipClassId, size = 72): string {
  const key = `icon:${ship}:${size}`;
  let url = iconCache.get(key);
  if (!url) {
    const canvas = document.createElement("canvas");
    canvas.width = size * SS;
    canvas.height = size * SS;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.setTransform(SS, 0, 0, SS, (size * SS) / 2, (size * SS) / 2);
    ctx.rotate(-Math.PI / 2); // art faces +X → rotate to face up
    PLAYER_DRAWERS[ship](ctx, (size / 2) * 0.74);
    url = canvas.toDataURL();
    iconCache.set(key, url);
  }
  return url;
}

export function getEnemySprite(
  kind: EnemyKind,
  flash: boolean,
  variant: EliteVariant = "spread",
  bossIndex = 0,
): Sprite {
  const key = `enemy:${kind}:${variant}:${bossIndex}:${flash ? 1 : 0}`;
  let s = cache.get(key);
  if (s) return s;
  const make = (
    size: number,
    fn: (ctx: CanvasRenderingContext2D, r: number, f: boolean) => void,
  ) => makeSprite(size, (ctx, r) => fn(ctx, r * 0.8, flash));
  switch (kind) {
    case "scout":
      s = make(56, drawScout);
      break;
    case "fighter":
      s = make(68, drawEnemyFighter);
      break;
    case "tank":
      s = make(96, drawTank);
      break;
    case "elite":
      s = makeSprite(92, (ctx, r) => drawElite(ctx, r * 0.8, flash, variant));
      break;
    case "sniper":
      s = make(78, drawSniper);
      break;
    case "carrier":
      s = make(110, drawCarrier);
      break;
    case "drone":
      s = make(36, drawDrone);
      break;
    case "boss":
      s = make(300, BOSS_DRAWERS[bossIndex % BOSS_DRAWERS.length]);
      break;
  }
  cache.set(key, s);
  return s;
}
