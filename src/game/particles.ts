export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  drag: number;
}

const MAX_PARTICLES = 500;

/**
 * Cached glow textures: drawing a pre-rendered radial-gradient sprite is far
 * cheaper than per-particle arc() + gradient with `lighter` compositing.
 */
const glowCache = new Map<string, HTMLCanvasElement>();

function getGlowTexture(color: string): HTMLCanvasElement {
  let tex = glowCache.get(color);
  if (tex) return tex;
  tex = document.createElement("canvas");
  tex.width = 32;
  tex.height = 32;
  const ctx = tex.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.25, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  glowCache.set(color, tex);
  return tex;
}

export class ParticleSystem {
  particles: Particle[] = [];

  emit(opts: {
    x: number;
    y: number;
    count: number;
    speed: number;
    speedVar?: number;
    life: number;
    size: number;
    colors: string[];
    spread?: number;
    baseAngle?: number;
    drag?: number;
  }) {
    const spread = opts.spread ?? Math.PI * 2;
    const baseAngle = opts.baseAngle ?? 0;
    for (let i = 0; i < opts.count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed =
        opts.speed * (1 + (Math.random() - 0.5) * (opts.speedVar ?? 0.8));
      const life = opts.life * (0.6 + Math.random() * 0.8);
      this.particles.push({
        x: opts.x,
        y: opts.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: opts.size * (0.5 + Math.random()),
        color: opts.colors[Math.floor(Math.random() * opts.colors.length)],
        drag: opts.drag ?? 0.92,
      });
    }
  }

  explosion(x: number, y: number, color: string, scale = 1) {
    this.emit({
      x,
      y,
      count: Math.round(18 * scale),
      speed: 220 * scale,
      life: 0.55,
      size: 2.6 * scale,
      colors: [color, "#ffffff", "#ffb86b"],
    });
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }
      const d = p.drag ** (dt * 60);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    w: number,
    h: number,
  ) {
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      const sx = p.x - camX;
      const sy = p.y - camY;
      if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue;
      const t = p.life / p.maxLife;
      const size = p.size * (0.4 + 0.6 * t) * 4;
      ctx.globalAlpha = t * 0.85;
      ctx.drawImage(
        getGlowTexture(p.color),
        sx - size / 2,
        sy - size / 2,
        size,
        size,
      );
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}
