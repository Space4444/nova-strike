/**
 * Endless parallax starfield, tuned to look like real deep space:
 *
 * - A pre-rendered far-field tile with hundreds of faint stars and a subtle
 *   milky-way style dust band — blitted as a repeating pattern (very cheap).
 * - Procedural mid/near layers generated deterministically per grid tile.
 *   Sizes follow a power distribution (lots of tiny dim stars, few bright),
 *   colors follow a realistic stellar palette (mostly white/blue-white with
 *   occasional warm giants), twinkle is subtle and only on smaller stars.
 * - The brightest stars get a soft halo and diffraction cross spikes.
 */

const TILE = 256;

/** Realistic stellar palette, weighted towards white / blue-white. */
const STAR_COLORS = [
  "#ffffff",
  "#ffffff",
  "#f8f7ff",
  "#eef2ff",
  "#dbe9ff", // blue-white
  "#a6c8ff", // hot blue
  "#fff4e8", // warm white
  "#ffe9c4", // yellow
  "#ffd9a3", // orange giant
];

function hash(ix: number, iy: number, layer: number): number {
  let h = (ix * 374761393 + iy * 668265263 + layer * 1442695041) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = (h * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

interface Layer {
  parallax: number;
  density: number;
  maxSize: number;
}

const LAYERS: Layer[] = [
  { parallax: 0.22, density: 6, maxSize: 1.3 },
  { parallax: 0.45, density: 4, maxSize: 1.9 },
  { parallax: 0.75, density: 3, maxSize: 2.7 },
];

const FAR_PARALLAX = 0.08;

/**
 * Pre-render the distant star dust tile. The tile is always generated at
 * least as large as the screen, so the repeating pattern never shows the
 * same feature twice on screen. Star/dust counts scale with tile area.
 */
function makeFarTile(size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const scale = size / 512;

  // Everything on the tile is drawn at 3x3 wrapped offsets so the
  // repeating pattern has no visible seams.
  const wrapped = (
    draw: (x: number, y: number) => void,
    x: number,
    y: number,
  ) => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        draw(x + dx * size, y + dy * size);
      }
    }
  };

  // Faint dust clouds along the main diagonal (galactic plane suggestion);
  // the diagonal wraps seamlessly across tile borders. Kept very subtle.
  // Dust: count grows linearly, radius with sqrt(scale), so total dust
  // coverage per screen area stays constant (no grey wash-out on big tiles).
  const dustScale = Math.sqrt(scale);
  const dustCount = Math.round(24 * scale);
  for (let i = 0; i < dustCount; i++) {
    const r = hash(i, 7, 3);
    const t = hash(i, 1, 1) * size;
    const bx = (t + (hash(i, 4, 4) - 0.5) * 120 * dustScale + size) % size;
    const by = (t + (hash(i, 2, 2) - 0.5) * 120 * dustScale + size) % size;
    const rad = (50 + r * 90) * dustScale;
    wrapped(
      (x, y) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `rgba(190,205,235,${0.014 + r * 0.018})`);
        g.addColorStop(1, "rgba(190,205,235,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      },
      bx,
      by,
    );
  }

  // Faint static stars, density kept constant per screen area
  const starCount = Math.round(520 * scale * scale);
  for (let i = 0; i < starCount; i++) {
    const x = hash(i, 11, 5) * size;
    const y = hash(i, 13, 6) * size;
    const b = hash(i, 17, 7);
    // Power distribution: most stars tiny and dim
    const starSize = 0.3 + b * b * 0.9;
    const alpha = 0.1 + b * b * 0.5;
    const color = STAR_COLORS[Math.floor(hash(i, 19, 8) * STAR_COLORS.length)];
    wrapped(
      (sx, sy) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
        ctx.fill();
      },
      x,
      y,
    );
  }
  ctx.globalAlpha = 1;
  return canvas;
}

function drawSpikes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  color: string,
  alpha: number,
) {
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - len, y);
  ctx.lineTo(x + len, y);
  ctx.moveTo(x, y - len);
  ctx.lineTo(x, y + len);
  ctx.stroke();
}

export class Starfield {
  private farTile: HTMLCanvasElement | null = null;
  private farPattern: CanvasPattern | null = null;

  draw(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    w: number,
    h: number,
    time: number,
  ) {
    // ── Far field: repeating pre-rendered dust tile ──────────────
    // Tile is regenerated whenever the screen outgrows it, so it is
    // always at least screen-sized: no visible repetition.
    const neededTile = Math.ceil(Math.max(w, h) / 512) * 512;
    if (!this.farTile || this.farTile.width < neededTile) {
      this.farTile = makeFarTile(neededTile);
      this.farPattern = null;
    }
    const farTileSize = this.farTile.width;
    if (!this.farPattern) {
      this.farPattern = ctx.createPattern(this.farTile, "repeat");
    }
    if (this.farPattern) {
      const ox = -((camX * FAR_PARALLAX) % farTileSize);
      const oy = -((camY * FAR_PARALLAX) % farTileSize);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = this.farPattern;
      ctx.fillRect(
        -ox - farTileSize,
        -oy - farTileSize,
        w + farTileSize * 2,
        h + farTileSize * 2,
      );
      ctx.restore();
    }

    // ── Mid/near procedural layers ───────────────────────────────
    for (let li = 0; li < LAYERS.length; li++) {
      const layer = LAYERS[li];
      const ox = camX * layer.parallax;
      const oy = camY * layer.parallax;
      const x0 = Math.floor(ox / TILE) - 1;
      const y0 = Math.floor(oy / TILE) - 1;
      const x1 = Math.floor((ox + w) / TILE) + 1;
      const y1 = Math.floor((oy + h) / TILE) + 1;

      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          for (let s = 0; s < layer.density; s++) {
            const r1 = hash(tx, ty, li * 31 + s * 7 + 1);
            const r2 = hash(tx, ty, li * 31 + s * 7 + 2);
            const r3 = hash(tx, ty, li * 31 + s * 7 + 3);
            const r4 = hash(tx, ty, li * 31 + s * 7 + 4);
            const sx = tx * TILE + r1 * TILE - ox;
            const sy = ty * TILE + r2 * TILE - oy;
            if (sx < -8 || sy < -8 || sx > w + 8 || sy > h + 8) continue;

            // Power-law sizing: most stars stay small
            const size = 0.35 + r3 * r3 * layer.maxSize;
            const color = STAR_COLORS[Math.floor(r4 * STAR_COLORS.length)];
            // Subtle twinkle, only on smaller stars (big ones stay steady)
            const twinkle =
              r3 > 0.7
                ? 1
                : 0.78 + 0.22 * Math.sin(time * (0.6 + r4 * 1.6) + r4 * 40);
            const alpha =
              (0.22 + 0.65 * r3 * r3) * twinkle * (0.5 + 0.5 * layer.parallax);

            // Brightest few: halo + diffraction spikes
            if (r3 > 0.965 && li > 0) {
              const halo = ctx.createRadialGradient(
                sx,
                sy,
                0,
                sx,
                sy,
                size * 6,
              );
              halo.addColorStop(0, color);
              halo.addColorStop(1, "rgba(255,255,255,0)");
              ctx.globalAlpha = alpha * 0.28;
              ctx.fillStyle = halo;
              ctx.beginPath();
              ctx.arc(sx, sy, size * 6, 0, Math.PI * 2);
              ctx.fill();
              drawSpikes(ctx, sx, sy, size * 5.5, color, alpha);
            }

            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
