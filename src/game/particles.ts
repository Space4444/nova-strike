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

const MAX_PARTICLES = 600;

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
    spread?: number; // radians; default full circle
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
    const drag = (p: Particle) => p.drag ** (dt * 60);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }
      const d = drag(p);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      ctx.globalAlpha = t * 0.9;
      ctx.fillStyle = p.color;
      const size = p.size * (0.4 + 0.6 * t);
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}
