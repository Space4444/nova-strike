export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerStats {
  damage: number;
  fireRate: number; // shots per second
  projectileSpeed: number;
  maxHealth: number;
  moveSpeed: number;
  critChance: number; // 0..1
  critMultiplier: number;
  projectileCount: number;
  healthRegen: number; // hp per second
}

export type EnemyKind = "scout" | "fighter" | "tank" | "elite";

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  weight: number;
  apply: (stats: PlayerStats) => void;
}

export interface HudState {
  health: number;
  maxHealth: number;
  xp: number;
  xpToNext: number;
  level: number;
  credits: number;
  kills: number;
  time: number;
  upgrades: Map<string, number>;
}

export type GamePhase = "menu" | "playing" | "levelup" | "paused" | "gameover";

export interface GameCallbacks {
  onPhaseChange: (phase: GamePhase) => void;
  onLevelUp: (choices: UpgradeDef[]) => void;
  onGameOver: (stats: {
    level: number;
    credits: number;
    kills: number;
    time: number;
  }) => void;
}

export function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
