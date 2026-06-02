import { QuerySpec } from "./search";

// Stat IDs are real PoE2 trade IDs (extracted from live client data).
const LIFE = "explicit.stat_3299347043"; // # to maximum Life
const ES = "explicit.stat_3489782002"; // # to maximum Energy Shield
const FIRE_RES = "explicit.stat_3372524247"; // #% to Fire Resistance
const ALL_ELE_RES = "explicit.stat_2901986750"; // #% to all Elemental Resistances
const SPELL_DMG = "explicit.stat_2974417149"; // #% increased Spell Damage
const ATK_SPEED = "explicit.stat_210067635"; // #% increased Attack Speed

export interface Preset {
  id: string;
  label: string;
  description: string;
  build: (league: string) => QuerySpec;
}

export const PRESETS: Preset[] = [
  {
    id: "unique-by-name",
    label: "Unique by name",
    description: "Find a specific item by exact name, cheapest online listings first.",
    build: (league) => ({
      league,
      name: "Headhunter",
      status: "online",
      sort: "asc",
      stats: [],
    }),
  },
  {
    id: "cheap-base-by-type",
    label: "Cheap base under budget",
    description: "A base type under a max price — e.g. leveling/crafting bases.",
    build: (league) => ({
      league,
      type: "Expert Dualstring Bow",
      status: "online",
      sort: "asc",
      price: { max: 5, currency: "exalted" },
      stats: [],
    }),
  },
  {
    id: "life-res-chest",
    label: "Body armour: life + resists",
    description: "Chest with minimum life and all-elemental-resistance rolls.",
    build: (league) => ({
      league,
      category: "armour.chest",
      status: "online",
      sort: "asc",
      stats: [
        { id: LIFE, min: 80 },
        { id: ALL_ELE_RES, min: 20 },
      ],
    }),
  },
  {
    id: "es-helmet",
    label: "ES helmet + life",
    description: "Energy-shield helmet with some life.",
    build: (league) => ({
      league,
      category: "armour.helmet",
      status: "online",
      sort: "asc",
      stats: [
        { id: ES, min: 100 },
        { id: LIFE, min: 60 },
      ],
    }),
  },
  {
    id: "phys-dps-weapon",
    label: "Weapon: min physical DPS",
    description: "Any weapon above a physical-DPS threshold, cheapest first.",
    build: (league) => ({
      league,
      category: "weapon",
      status: "online",
      sort: "asc",
      equipment: { pdps: 200 },
      stats: [],
    }),
  },
  {
    id: "caster-sceptre",
    label: "Caster: spell damage + attack/cast",
    description: "Sceptre/wand with increased spell damage rolls.",
    build: (league) => ({
      league,
      category: "weapon.sceptre",
      status: "online",
      sort: "asc",
      stats: [{ id: SPELL_DMG, min: 30 }],
    }),
  },
  {
    id: "ring-life-res",
    label: "Ring: life + fire resist",
    description: "Rings with life and fire resistance.",
    build: (league) => ({
      league,
      category: "accessory.ring",
      status: "online",
      sort: "asc",
      stats: [
        { id: LIFE, min: 40 },
        { id: FIRE_RES, min: 20 },
      ],
    }),
  },
  {
    id: "leveling-gem",
    label: "Skill gem by level/quality",
    description: "Active skill gem filtered by gem level and quality.",
    build: (league) => ({
      league,
      type: "Lightning Bolt",
      category: "gem.activegem",
      status: "online",
      sort: "asc",
      gemLevel: { min: 1 },
      quality: { min: 10 },
      stats: [],
    }),
  },
  {
    id: "waystone-tier",
    label: "Waystone by tier (ilvl)",
    description: "Endgame maps (waystones) filtered by item level (tier).",
    build: (league) => ({
      league,
      category: "map.waystone",
      status: "online",
      sort: "asc",
      ilvl: { min: 79 },
      stats: [],
    }),
  },
  {
    id: "fast-attack-bow",
    label: "Bow: attack speed",
    description: "Bows with increased attack speed, cheapest first.",
    build: (league) => ({
      league,
      category: "weapon.bow",
      status: "online",
      sort: "asc",
      stats: [{ id: ATK_SPEED, min: 10 }],
    }),
  },
];

export const PRESET_BY_ID = new Map(PRESETS.map((p) => [p.id, p]));
