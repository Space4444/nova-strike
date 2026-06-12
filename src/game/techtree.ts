import type { SaveData } from "./save";
import type { PlayerStats, ShipClassId, WeaponId } from "./types";

export type TechCategory = "offense" | "defense" | "utility" | "unlock";

export interface TechCost {
  credits?: number;
  materials?: number;
}

export interface TechNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** When set, the UI renders a detailed ship sprite icon instead of `icon`. */
  iconShip?: ShipClassId;
  category: TechCategory;
  maxRank: number;
  cost: (rank: number) => TechCost; // cost of buying rank `rank` (1-based)
  apply?: (stats: PlayerStats, rank: number) => void;
  unlocksWeapon?: WeaponId;
  unlocksShip?: ShipClassId;
}

const lin = (base: number, growth: number) => (rank: number) =>
  Math.round(base * growth ** (rank - 1));

export const TECH_NODES: TechNode[] = [
  // ── Offense ──────────────────────────────────────────────────
  {
    id: "weapon_cal",
    name: "Weapon Calibration",
    description: "+4% weapon damage per rank",
    icon: "⚡",
    category: "offense",
    maxRank: 8,
    cost: r => ({ credits: lin(120, 1.7)(r) }),
    apply: (s, r) => {
      s.damage *= 1 + 0.04 * r;
    },
  },
  {
    id: "cooling",
    name: "Cooling Systems",
    description: "+4% fire rate per rank",
    icon: "❄️",
    category: "offense",
    maxRank: 8,
    cost: r => ({ credits: lin(140, 1.7)(r) }),
    apply: (s, r) => {
      s.fireRate *= 1 + 0.04 * r;
    },
  },
  {
    id: "crit_optics",
    name: "Crit Optics",
    description: "+2% critical chance per rank",
    icon: "🎯",
    category: "offense",
    maxRank: 5,
    cost: r => ({ credits: lin(200, 1.9)(r), materials: lin(6, 1.8)(r) }),
    apply: (s, r) => {
      s.critChance += 0.02 * r;
    },
  },
  // ── Defense ──────────────────────────────────────────────────
  {
    id: "hull",
    name: "Hull Plating",
    description: "+6% max hull per rank",
    icon: "🛡️",
    category: "defense",
    maxRank: 8,
    cost: r => ({ credits: lin(130, 1.7)(r) }),
    apply: (s, r) => {
      s.maxHealth *= 1 + 0.06 * r;
    },
  },
  {
    id: "nano",
    name: "Nano Repair",
    description: "+0.3 hull regen/s per rank",
    icon: "💚",
    category: "defense",
    maxRank: 5,
    cost: r => ({ credits: lin(180, 1.8)(r) }),
    apply: (s, r) => {
      s.healthRegen += 0.3 * r;
    },
  },
  {
    id: "shield_gen",
    name: "Shield Generator",
    description: "+30-point starting energy shield per rank",
    icon: "🔵",
    category: "defense",
    maxRank: 3,
    cost: r => ({ credits: lin(350, 1.9)(r), materials: lin(18, 1.9)(r) }),
    apply: (s, r) => {
      s.shieldMax += 30 * r;
    },
  },
  // ── Utility ──────────────────────────────────────────────────
  {
    id: "engines",
    name: "Engine Tuning",
    description: "+4% move speed per rank",
    icon: "🚀",
    category: "utility",
    maxRank: 5,
    cost: r => ({ credits: lin(150, 1.8)(r) }),
    apply: (s, r) => {
      s.moveSpeed *= 1 + 0.04 * r;
    },
  },
  {
    id: "salvage",
    name: "Salvage Scanner",
    description: "+10% credits from kills per rank",
    icon: "◈",
    category: "utility",
    maxRank: 5,
    cost: r => ({ credits: lin(160, 1.9)(r) }),
    apply: (s, r) => {
      s.creditBonus *= 1 + 0.1 * r;
    },
  },
  {
    id: "refinery",
    name: "Material Refinery",
    description: "+15% upgrade materials per rank",
    icon: "🔷",
    category: "utility",
    maxRank: 5,
    cost: r => ({ credits: lin(200, 1.9)(r), materials: lin(5, 2)(r) }),
    apply: (s, r) => {
      s.materialBonus *= 1 + 0.15 * r;
    },
  },
  {
    id: "magnet",
    name: "Tractor Magnet",
    description: "+20% pickup attraction radius per rank",
    icon: "🧲",
    category: "utility",
    maxRank: 5,
    cost: r => ({ credits: lin(120, 1.8)(r) }),
    apply: (s, r) => {
      s.pickupRadius *= 1 + 0.2 * r;
    },
  },
  // ── Unlocks ──────────────────────────────────────────────────
  {
    id: "unlock_plasma",
    name: "Plasma Projector",
    description:
      "Unlock the plasma weapon — slow, heavy orbs with splash damage",
    icon: "🟣",
    category: "unlock",
    maxRank: 1,
    cost: () => ({ materials: 30 }),
    unlocksWeapon: "plasma",
  },
  {
    id: "unlock_missile",
    name: "Missile Pods",
    description: "Unlock homing missiles — seek targets and explode on impact",
    icon: "🚀",
    category: "unlock",
    maxRank: 1,
    cost: () => ({ materials: 60 }),
    unlocksWeapon: "missile",
  },
  {
    id: "unlock_interceptor",
    name: "Interceptor Frame",
    description:
      "Unlock the Interceptor — fast, fragile, deadly crits + Blink Dash",
    icon: "🟪",
    iconShip: "interceptor",
    category: "unlock",
    maxRank: 1,
    cost: () => ({ credits: 600 }),
    unlocksShip: "interceptor",
  },
  {
    id: "unlock_gunship",
    name: "Gunship Frame",
    description:
      "Unlock the Heavy Gunship — slow, armored, massive firepower + Barrage",
    icon: "🟧",
    iconShip: "gunship",
    category: "unlock",
    maxRank: 1,
    cost: () => ({ credits: 900 }),
    unlocksShip: "gunship",
  },
  {
    id: "unlock_explorer",
    name: "Explorer Frame",
    description:
      "Unlock the Explorer — loot magnet, bonus materials + Recon Pulse",
    icon: "🟩",
    iconShip: "explorer",
    category: "unlock",
    maxRank: 1,
    cost: () => ({ credits: 750 }),
    unlocksShip: "explorer",
  },
];

export function getNode(id: string): TechNode | undefined {
  return TECH_NODES.find(n => n.id === id);
}

export function applyResearch(
  stats: PlayerStats,
  research: Record<string, number>,
) {
  for (const node of TECH_NODES) {
    const rank = research[node.id] ?? 0;
    if (rank > 0 && node.apply) node.apply(stats, Math.min(rank, node.maxRank));
  }
}

export function nodeRank(save: SaveData, id: string): number {
  return save.research[id] ?? 0;
}

export function canAfford(save: SaveData, cost: TechCost): boolean {
  return (
    save.credits >= (cost.credits ?? 0) &&
    save.materials >= (cost.materials ?? 0)
  );
}

/** Attempts to buy the next rank of a node. Mutates `save`. Returns success. */
export function buyNode(save: SaveData, id: string): boolean {
  const node = getNode(id);
  if (!node) return false;
  const rank = nodeRank(save, id);
  if (rank >= node.maxRank) return false;
  const cost = node.cost(rank + 1);
  if (!canAfford(save, cost)) return false;
  save.credits -= cost.credits ?? 0;
  save.materials -= cost.materials ?? 0;
  save.research[id] = rank + 1;
  if (node.unlocksWeapon && !save.weapons.includes(node.unlocksWeapon)) {
    save.weapons.push(node.unlocksWeapon);
  }
  if (node.unlocksShip && !save.ships.includes(node.unlocksShip)) {
    save.ships.push(node.unlocksShip);
  }
  return true;
}
