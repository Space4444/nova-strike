import type { PlayerStats, Rarity, UpgradeDef } from "./types";

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
    pickupRadius: 130,
    pierce: 0,
    lifesteal: 0,
    shieldMax: 0,
    enemySlow: 0,
    creditBonus: 1,
    materialBonus: 1,
    novaDamage: 0,
    critExplodeRadius: 0,
  };
}

export const UPGRADES: UpgradeDef[] = [
  // ── Common ───────────────────────────────────────────────────
  {
    id: "damage",
    name: "Plasma Amplifier",
    description: "+10% weapon damage",
    icon: "⚡",
    weight: 10,
    rarity: "common",
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
    rarity: "common",
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
    rarity: "common",
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
    rarity: "common",
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
    rarity: "common",
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
    rarity: "common",
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
    rarity: "common",
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
    rarity: "common",
    apply: s => {
      s.healthRegen += 1;
    },
  },
  // ── Rare ─────────────────────────────────────────────────────
  {
    id: "pierce",
    name: "Phasing Rounds",
    description: "Shots pierce +1 enemy",
    icon: "🔮",
    weight: 5,
    rarity: "rare",
    apply: s => {
      s.pierce += 1;
    },
  },
  {
    id: "magnet",
    name: "Tractor Array",
    description: "+60% pickup attraction radius",
    icon: "🧲",
    weight: 6,
    rarity: "rare",
    apply: s => {
      s.pickupRadius *= 1.6;
    },
  },
  {
    id: "adrenaline",
    name: "Combat Stims",
    description: "+12% damage and +12% fire rate",
    icon: "💉",
    weight: 5,
    rarity: "rare",
    apply: s => {
      s.damage *= 1.12;
      s.fireRate *= 1.12;
    },
  },
  {
    id: "shield_cap",
    name: "Shield Capacitor",
    description: "+30 energy shield (regenerates out of combat)",
    icon: "🔵",
    weight: 5,
    rarity: "rare",
    apply: s => {
      s.shieldMax += 30;
    },
  },
  {
    id: "vampiric",
    name: "Siphon Coils",
    description: "Heal 1.5% of damage dealt",
    icon: "🩸",
    weight: 5,
    rarity: "rare",
    apply: s => {
      s.lifesteal += 0.015;
    },
  },
  // ── Legendary ────────────────────────────────────────────────
  {
    id: "twin_cannons",
    name: "Twin Cannon Array",
    description: "+2 projectiles",
    icon: "⚔️",
    weight: 2,
    rarity: "legendary",
    apply: s => {
      s.projectileCount += 2;
    },
  },
  {
    id: "berserker",
    name: "Berserker Core",
    description: "+60% damage, but -25% maximum health",
    icon: "😈",
    weight: 2,
    rarity: "legendary",
    apply: s => {
      s.damage *= 1.6;
      s.maxHealth *= 0.75;
    },
  },
  {
    id: "chrono",
    name: "Chrono Field",
    description: "All enemies move and attack 15% slower",
    icon: "⏳",
    weight: 2,
    rarity: "legendary",
    apply: s => {
      s.enemySlow = 1 - (1 - s.enemySlow) * 0.85;
    },
  },
  {
    id: "nova",
    name: "Nova Reactor",
    description: "Hull hits trigger a damaging nova blast around you",
    icon: "🌟",
    weight: 2,
    rarity: "legendary",
    apply: s => {
      s.novaDamage += 4; // multiplier of current damage stat
    },
  },
  {
    id: "volatile",
    name: "Volatile Munitions",
    description: "Critical hits explode, damaging nearby enemies",
    icon: "🧨",
    weight: 2,
    rarity: "legendary",
    apply: s => {
      s.critExplodeRadius = Math.max(s.critExplodeRadius, 75);
      s.critChance += 0.03;
    },
  },
];

const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 1,
  rare: 1,
  legendary: 1,
};

/** Pick `count` distinct random upgrades, weighted (rarity baked into weights). */
export function rollUpgradeChoices(
  count = 3,
  minRarity: Rarity = "common",
): UpgradeDef[] {
  const allowed =
    minRarity === "common"
      ? UPGRADES
      : UPGRADES.filter(u => u.rarity !== "common");
  const pool = [...allowed];
  const choices: UpgradeDef[] = [];
  while (choices.length < count && pool.length > 0) {
    const total = pool.reduce(
      (sum, u) => sum + u.weight * RARITY_WEIGHT[u.rarity],
      0,
    );
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight * RARITY_WEIGHT[pool[i].rarity];
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
