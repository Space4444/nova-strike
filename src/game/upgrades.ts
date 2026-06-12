import type { PlayerStats, UpgradeDef } from "./types";

export function baseStats(): PlayerStats {
  return {
    damage: 12,
    fireRate: 3.5,
    projectileSpeed: 560,
    maxHealth: 100,
    moveSpeed: 320,
    critChance: 0.05,
    critMultiplier: 2,
    projectileCount: 1,
    healthRegen: 0.5,
  };
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "damage",
    name: "Plasma Amplifier",
    description: "+10% weapon damage",
    icon: "⚡",
    weight: 10,
    apply: s => {
      s.damage *= 1.1;
    },
  },
  {
    id: "fire_rate",
    name: "Rapid Cycler",
    description: "+10% fire rate",
    icon: "🔥",
    weight: 10,
    apply: s => {
      s.fireRate *= 1.1;
    },
  },
  {
    id: "proj_speed",
    name: "Velocity Coils",
    description: "+10% projectile speed",
    icon: "💨",
    weight: 9,
    apply: s => {
      s.projectileSpeed *= 1.1;
    },
  },
  {
    id: "max_health",
    name: "Reinforced Hull",
    description: "+15% maximum health",
    icon: "🛡️",
    weight: 9,
    apply: s => {
      s.maxHealth *= 1.15;
    },
  },
  {
    id: "move_speed",
    name: "Ion Thrusters",
    description: "+10% movement speed",
    icon: "🚀",
    weight: 9,
    apply: s => {
      s.moveSpeed *= 1.1;
    },
  },
  {
    id: "crit",
    name: "Target Computer",
    description: "+5% critical hit chance",
    icon: "🎯",
    weight: 8,
    apply: s => {
      s.critChance += 0.05;
    },
  },
  {
    id: "projectile",
    name: "Split Cannon",
    description: "+1 projectile",
    icon: "🔱",
    weight: 4,
    apply: s => {
      s.projectileCount += 1;
    },
  },
  {
    id: "regen",
    name: "Nano Repair Swarm",
    description: "+1 HP/s health regeneration",
    icon: "💚",
    weight: 8,
    apply: s => {
      s.healthRegen += 1;
    },
  },
];

/** Pick `count` distinct random upgrades, weighted. */
export function rollUpgradeChoices(count = 3): UpgradeDef[] {
  const pool = [...UPGRADES];
  const choices: UpgradeDef[] = [];
  while (choices.length < count && pool.length > 0) {
    const total = pool.reduce((sum, u) => sum + u.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    choices.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return choices;
}
