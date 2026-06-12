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
  pickupRadius: number;
  pierce: number; // extra enemies a projectile can pass through
  lifesteal: number; // fraction of damage returned as hp
  shieldMax: number;
  enemySlow: number; // 0..1 fraction enemies are slowed by
  creditBonus: number; // multiplier
  materialBonus: number; // multiplier
  novaDamage: number; // 0 = off; multiplier of damage emitted when hull is hit
  critExplodeRadius: number; // 0 = off
}

export type WeaponId = "laser" | "plasma" | "missile";
export type ShipClassId = "fighter" | "interceptor" | "gunship" | "explorer";

export type EnemyKind =
  | "scout"
  | "fighter"
  | "tank"
  | "elite"
  | "sniper"
  | "carrier"
  | "drone"
  | "boss";

export type EliteVariant = "spread" | "shield" | "warp";

export type Rarity = "common" | "rare" | "legendary";

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  weight: number;
  rarity: Rarity;
  apply: (stats: PlayerStats) => void;
}

export type PickupKind = "credit" | "material" | "health";

export interface BossHud {
  name: string;
  health: number;
  maxHealth: number;
  phase: number;
}

export interface HudState {
  health: number;
  maxHealth: number;
  shield: number;
  shieldMax: number;
  xp: number;
  xpToNext: number;
  level: number;
  credits: number;
  materials: number;
  kills: number;
  time: number;
  upgrades: Map<string, number>;
  weapon: WeaponId;
  unlockedWeapons: WeaponId[];
  abilityName: string;
  abilityIcon: string;
  abilityCooldown: number;
  abilityCooldownMax: number;
  boss: BossHud | null;
  banner: { text: string; sub: string; t: number } | null;
}

export type GamePhase = "menu" | "playing" | "paused" | "gameover";

export interface RunStats {
  level: number;
  credits: number;
  materials: number;
  kills: number;
  bossKills: number;
  time: number;
}

export interface GameCallbacks {
  onPhaseChange: (phase: GamePhase) => void;
  /**
   * Fired whenever the set of offered upgrade choices changes. The game keeps
   * running while choices are shown. `queued` is how many additional
   * level-ups are waiting behind the current three choices.
   */
  onLevelUp: (choices: UpgradeDef[], queued: number) => void;
  onGameOver: (stats: RunStats) => void;
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

/** Deterministic hash → [0,1). Used for procedural generation. */
export function hash01(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = (h * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
