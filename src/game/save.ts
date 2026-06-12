import type { ShipClassId, WeaponId } from "./types";

export interface SaveData {
  version: number;
  credits: number;
  materials: number;
  /** techNodeId → rank purchased */
  research: Record<string, number>;
  ships: ShipClassId[];
  weapons: WeaponId[];
  selectedShip: ShipClassId;
  best: { time: number; level: number; kills: number };
  totalRuns: number;
  totalKills: number;
  bossKills: number;
}

const KEY = "nova_strike_save";

export function defaultSave(): SaveData {
  return {
    version: 2,
    credits: 0,
    materials: 0,
    research: {},
    ships: ["fighter"],
    weapons: ["laser"],
    selectedShip: "fighter",
    best: { time: 0, level: 0, kills: 0 },
    totalRuns: 0,
    totalKills: 0,
    bossKills: 0,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const def = defaultSave();
    const merged: SaveData = {
      ...def,
      ...parsed,
      research: parsed.research ?? {},
      ships:
        Array.isArray(parsed.ships) && parsed.ships.length > 0
          ? parsed.ships
          : def.ships,
      weapons:
        Array.isArray(parsed.weapons) && parsed.weapons.length > 0
          ? parsed.weapons
          : def.weapons,
      best: { ...def.best, ...(parsed.best ?? {}) },
    };
    if (!merged.ships.includes(merged.selectedShip))
      merged.selectedShip = merged.ships[0];
    return merged;
  } catch {
    return defaultSave();
  }
}

export function persistSave(save: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Storage unavailable (private mode etc) — progression simply won't persist.
  }
}
