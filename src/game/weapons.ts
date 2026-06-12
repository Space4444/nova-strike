import type { WeaponId } from "./types";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  icon: string;
  description: string;
  /** Multiplier on the player's fire rate stat. */
  rateMult: number;
  /** Multiplier on the player's damage stat. */
  damageMult: number;
  /** Multiplier on the player's projectile speed stat. */
  speedMult: number;
  /** Splash radius on hit (0 = none). */
  splash: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  laser: {
    id: "laser",
    name: "Pulse Laser",
    icon: "⚡",
    description: "Fast, reliable energy bolts",
    rateMult: 1,
    damageMult: 1,
    speedMult: 1,
    splash: 0,
  },
  plasma: {
    id: "plasma",
    name: "Plasma Projector",
    icon: "🟣",
    description: "Slow heavy orbs with splash damage",
    rateMult: 0.55,
    damageMult: 2.1,
    speedMult: 0.65,
    splash: 55,
  },
  missile: {
    id: "missile",
    name: "Missile Pods",
    icon: "🚀",
    description: "Homing missiles, explode on impact",
    rateMult: 0.42,
    damageMult: 2.6,
    speedMult: 0.6,
    splash: 80,
  },
};

export const WEAPON_ORDER: WeaponId[] = ["laser", "plasma", "missile"];
