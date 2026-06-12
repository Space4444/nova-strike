/**
 * Endless parallax starfield. Stars are generated deterministically per grid
 * tile from a hash, so the world is infinite without storing anything.
 */

const TILE = 256;

const STAR_COLORS = [
  "#9bd8ff",
  "#ffffff",
  "#ffd9a3",
  "#c4b5fd",
  "#a7f3d0",
  "#fda4af",
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
  { parallax: 0.2, density: 5, maxSize: 1.2 },
  { parallax: 0.45, density: 4, maxSize: 1.8 },
  { parallax: 0.75, density: 3, maxSize: 2.6 },
];

export class Starfield {
  draw(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    w: number,
    h: number,
    time: number,
  ) {
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
            if (sx < -4 || sy < -4 || sx > w + 4 || sy > h + 4) continue;
            const size = 0.4 + r3 * layer.maxSize;
            const twinkle =
              0.55 + 0.45 * Math.sin(time * (1 + r4 * 2.5) + r4 * 40);
            const color = STAR_COLORS[Math.floor(r4 * STAR_COLORS.length)];
            ctx.globalAlpha =
              (0.25 + 0.6 * r3) * twinkle * (0.45 + 0.55 * layer.parallax);
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
