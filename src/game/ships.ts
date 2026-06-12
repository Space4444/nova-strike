import type { PlayerStats, ShipClassId } from "./types";

export interface ShipAbility {
  name: string;
  icon: string;
  cooldown: number;
  description: string;
}

export interface ShipClass {
  id: ShipClassId;
  name: string;
  role: string;
  description: string;
  color: string;
  statHints: string[];
  applyMods: (stats: PlayerStats) => void;
  ability: ShipAbility;
}

export const SHIP_CLASSES: Record<ShipClassId, ShipClass> = {
  fighter: {
    id: "fighter",
    name: "Fighter",
    role: "Balanced",
    description: "The dependable all-rounder. No weaknesses, no gimmicks.",
    color: "#38bdf8",
    statHints: ["Balanced hull & speed", "Ability: Overdrive"],
    applyMods: () => {},
    ability: {
      name: "Overdrive",
      icon: "🔥",
      cooldown: 14,
      description: "+100% fire rate for 4s",
    },
  },
  interceptor: {
    id: "interceptor",
    name: "Interceptor",
    role: "Glass cannon",
    description: "Blinding speed and savage crits — but the hull is paper.",
    color: "#a78bfa",
    statHints: ["+25% speed, +10% crit", "-30% hull", "Ability: Blink Dash"],
    applyMods: s => {
      s.moveSpeed *= 1.25;
      s.critChance += 0.1;
      s.maxHealth *= 0.7;
      s.fireRate *= 1.1;
    },
    ability: {
      name: "Blink Dash",
      icon: "💨",
      cooldown: 6,
      description: "Teleport forward, brief invulnerability",
    },
  },
  gunship: {
    id: "gunship",
    name: "Heavy Gunship",
    role: "Juggernaut",
    description: "A flying fortress. Slow to move, devastating to cross.",
    color: "#fb923c",
    statHints: [
      "+30% damage, +40% hull",
      "-20% speed, -10% fire rate",
      "Ability: Barrage",
    ],
    applyMods: s => {
      s.damage *= 1.3;
      s.maxHealth *= 1.4;
      s.moveSpeed *= 0.8;
      s.fireRate *= 0.9;
    },
    ability: {
      name: "Barrage",
      icon: "💥",
      cooldown: 12,
      description: "Fire a ring of 16 plasma shells",
    },
  },
  explorer: {
    id: "explorer",
    name: "Explorer",
    role: "Prospector",
    description:
      "Built to find what others miss. Hoovers up loot and materials.",
    color: "#34d399",
    statHints: [
      "+50% pickup radius",
      "+25% materials, +15% credits",
      "Ability: Recon Pulse",
    ],
    applyMods: s => {
      s.pickupRadius *= 1.5;
      s.materialBonus *= 1.25;
      s.creditBonus *= 1.15;
      s.maxHealth *= 0.9;
    },
    ability: {
      name: "Recon Pulse",
      icon: "📡",
      cooldown: 15,
      description: "Pull in all nearby loot, +40% speed for 3s",
    },
  },
};
