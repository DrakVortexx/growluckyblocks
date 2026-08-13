// Shared game constants for Grow Lucky Blocks
// These constants are used by both client and server

import type { RarityKey, CreatureDefinition } from '../types';

// ============================================================================
// GAME CONFIGURATION
// ============================================================================

export const MAX_SERVER_SLOTS = 8;
export const MAX_REBIRTHS = 10;
export const MAX_BASE_FLOORS = 6;
export const PEDESTALS_PER_FLOOR = 10;
export const BASE_FLOOR_UNLOCK_REBIRTH = 10;
export const REBIRTHS_PER_EXTRA_FLOOR = 10;
export const PERSONAL_LUCK_MAX = 1000;

export const BASE_LOCK_BASE_SEC = 60;
export const BASE_LOCK_PER_REBIRTH_SEC = 10;

export const SERVER_LUCK_DURATION_SEC = 10 * 60; // 10 minutes

export const PRIVATE_SERVER_CREATE_STARDUST_COST = 25;

export const DEFAULT_SERVER_ID = 'public-1';

// ============================================================================
// SPAWN LOCATIONS
// ============================================================================

export const SPAWN_DROP_CENTER = { x: -10.5, z: 6.1 };
export const TREADMILL_SPAWN_START = { x: 15.8, z: -6.4 };
export const TREADMILL_SPAWN_END = { x: 15.8, z: 6.4 };
export const TREADMILL_DROP_SPEED = 1.8;
export const TREADMILL_MIN_INTERVAL_MS = 900;
export const TREADMILL_MAX_INTERVAL_MS = 1600;

// ============================================================================
// STEALING TIMES BY RARITY (seconds)
// ============================================================================

export const STEAL_TIME_BY_RANK: Record<RarityKey, number> = {
  basic: 4,
  common: 6,
  rare: 12,
  epic: 20,
  legendary: 35,
  mythic: 50,
  godly: 90,
  secret: 180,
  transcendent: 10800, // 3 hours
  omniversal: 43200 // 12 hours
};

// ============================================================================
// COMBAT EQUIPMENT DEFINITIONS
// ============================================================================

export const BAT_DEFS = {
  sprout: { key: 'sprout', label: 'Sprout Bat', stunSec: 0.8, cooldownSec: 1.5 },
  iron: { key: 'iron', label: 'Iron Bat', stunSec: 1.3, cooldownSec: 1.25 },
  shock: { key: 'shock', label: 'Shock Bat', stunSec: 1.8, cooldownSec: 1.05 }
} as const;

export const FREEZE_RAY_DEF = {
  key: 'freezeray',
  label: 'Freeze Ray',
  stunSec: 10,
  cooldownSec: 20
} as const;

// ============================================================================
// SERVER LUCK COSTS
// ============================================================================

export const SERVER_LUCK_STARDUST_COST_BY_TARGET: Record<string, number> = {
  '10': 100,
  '25': 250,
  '50': 500,
  '100': 1000,
  '300': 3000,
  '1000': 10000,
  '3000': 30000
};

// ============================================================================
// DAILY REWARD LOOP
// ============================================================================

export const DAILY_STARDUST_LOOP = [
  { day: 1, stardust: 5, luckyRankKey: 'common' as RarityKey },
  { day: 2, stardust: 10, luckyRankKey: 'rare' as RarityKey },
  { day: 3, stardust: 15, luckyRankKey: '' as RarityKey },
  { day: 4, stardust: 25, luckyRankKey: '' as RarityKey },
  { day: 5, stardust: 40, luckyRankKey: '' as RarityKey },
  { day: 6, stardust: 60, luckyRankKey: 'mythic' as RarityKey },
  { day: 7, stardust: 100, luckyRankKey: 'secret' as RarityKey }
];

// ============================================================================
// CREATURE SPAWN CATALOG
// ============================================================================

export const SPAWN_CREATURE_CATALOG: CreatureDefinition[] = [
  // Basic
  { name: 'Fat Cat', rankKey: 'basic', rate: 2.30 },
  { name: 'Tiny Bunny', rankKey: 'basic', rate: 3.20 },
  { name: 'Lucky Slime', rankKey: 'basic', rate: 4.60 },
  { name: 'Spring Chick', rankKey: 'basic', rate: 5 },
  
  // Common
  { name: 'Mini Dragon', rankKey: 'common', rate: 15 },
  { name: 'Goblin Pup', rankKey: 'common', rate: 19 },
  { name: 'Basket Mouse', rankKey: 'common', rate: 18 },
  
  // Rare
  { name: 'Ice Fox', rankKey: 'rare', rate: 55 },
  { name: 'Lava Toad', rankKey: 'rare', rate: 66 },
  { name: 'Spike Turtle', rankKey: 'rare', rate: 78 },
  { name: 'Egg Hopper', rankKey: 'rare', rate: 72 },
  
  // Epic
  { name: 'Hydra Dragon', rankKey: 'epic', rate: 210 },
  { name: 'Electric Owl', rankKey: 'epic', rate: 255 },
  { name: 'Shadow Panther', rankKey: 'epic', rate: 295 },
  { name: 'Carrot Fox', rankKey: 'epic', rate: 280 },
  
  // Legendary
  { name: 'Golden Griffin', rankKey: 'legendary', rate: 640 },
  { name: 'Crystal Wolf', rankKey: 'legendary', rate: 780 },
  { name: 'Little ball of fury', rankKey: 'legendary', rate: 700 },
  { name: 'Pastel Pegasus', rankKey: 'legendary', rate: 760 },
  
  // Mythic
  { name: 'Celestial Cat', rankKey: 'mythic', rate: 2100 },
  { name: 'Moon Serpent', rankKey: 'mythic', rate: 2550 },
  { name: 'Starry Elk', rankKey: 'mythic', rate: 2980 },
  { name: 'Bloom Hare', rankKey: 'mythic', rate: 2600 },
  
  // Godly
  { name: 'Omnisphinx', rankKey: 'godly', rate: 52000 },
  { name: 'Thunder Behemoth', rankKey: 'godly', rate: 84000 },
  { name: 'Eternal Fox', rankKey: 'godly', rate: 118000 },
  { name: 'Jellybean Golem', rankKey: 'godly', rate: 96000 },
  
  // Secret
  { name: 'Void Kraken', rankKey: 'secret', rate: 1200000 },
  { name: 'Ghost Unicorn', rankKey: 'secret', rate: 2100000 },
  { name: 'Arcane Tiger', rankKey: 'secret', rate: 2950000 },
  { name: 'The Tuff Turtle', rankKey: 'secret', rate: 5000000 },
  { name: 'los tuff turtles', rankKey: 'secret', rate: 15000000 },
  { name: 'Egg Emperor', rankKey: 'secret', rate: 8500000 },
  
  // Transcendent
  { name: 'Infinity Serpent', rankKey: 'transcendent', rate: 120000000 },
  { name: 'Quantum Phoenix', rankKey: 'transcendent', rate: 180000000 },
  { name: 'Cosmic Whale', rankKey: 'transcendent', rate: 245000000 },
  { name: 'Celestial Bunny', rankKey: 'transcendent', rate: 220000000 },
  
  // Omniversal
  { name: 'Easter Bunny', rankKey: 'omniversal', rate: 400000000 },
  { name: 'Mystery Cat', rankKey: 'omniversal', rate: 700000000 },
  { name: 'Universe Hydra', rankKey: 'omniversal', rate: 620000000 },
  { name: 'Multiverse Dragon', rankKey: 'omniversal', rate: 880000000 }
];

// ============================================================================
// RARITY SPAWN WEIGHTS
// ============================================================================

export function rankWeightForSpawn(rankKey: RarityKey): number {
  const weights: Record<RarityKey, number> = {
    basic: 45,
    common: 25,
    rare: 12,
    epic: 7,
    legendary: 3,
    mythic: 1,
    godly: 0.1,
    secret: 0.01,
    transcendent: 0.0001,
    omniversal: 0.00001
  };
  return weights[rankKey] || 0.00001;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function normalizeRankKey(v: string): RarityKey {
  const raw = String(v || '').trim().toLowerCase();
  const mapping: Record<string, RarityKey> = {
    'admin': 'godly',
    'godlyblock': 'godly',
    'divine': 'transcendent',
    'eternal': 'transcendent',
    'eturnal': 'transcendent',
    'uncommon': 'common',
    'elite': 'rare',
    'prismatic': 'transcendent',
    'apex': 'transcendent',
    'ascended': 'transcendent',
    'ancient': 'transcendent',
    'celestial': 'transcendent'
  };
  
  if (mapping[raw]) return mapping[raw];
  if (['basic', 'common', 'rare', 'epic', 'legendary', 'mythic', 'godly', 'secret', 'transcendent', 'omniversal'].includes(raw)) {
    return raw as RarityKey;
  }
  return 'basic';
}

export function normalizeSpecialBlockKey(v: string): string {
  const raw = String(v || '').trim().toLowerCase();
  const mapping: Record<string, string> = {
    'lepblock': 'leprechaunblock',
    'leprechaun': 'leprechaunblock',
    'lepricahaun': 'leprechaunblock',
    'leprichan': 'leprechaunblock',
    'valentine': 'valentinesblock',
    'valentines': 'valentinesblock',
    'valentinesday': 'valentinesblock',
    "valentine's": 'valentinesblock',
    'vday': 'valentinesblock',
    'heart': 'valentinesblock',
    'hearts': 'valentinesblock'
  };
  
  if (mapping[raw]) return mapping[raw];
  if (['valentinesblock', 'leprechaunblock', 'adminblock', 'godlyblock'].includes(raw)) return raw;
  return '';
}

export function normalizeMutation(v: string): 'normal' | 'bluemoon' | 'soulbound' {
  const raw = String(v || '').trim().toLowerCase();
  if (['blue moon', 'blue_moon', 'blue-moon', 'bm', 'bluemoon'].includes(raw)) return 'bluemoon';
  if (['valentine', 'valentines', 'valentinesday', "valentine's", 'vday', 'heart', 'hearts', 'soulbound', 'soul', 'sb'].includes(raw)) return 'soulbound';
  return 'normal';
}

export function normalizeTrait(v: string): 'none' | 'leprechaun' {
  const raw = String(v || '').trim().toLowerCase();
  if (['leprechaun', 'lep', 'lepricahaun', 'leprichan', 'leprechauntrait'].includes(raw)) return 'leprechaun';
  return 'none';
}

export function normalizeBatKey(v: string): 'sprout' | 'iron' | 'shock' {
  const raw = String(v || '').trim().toLowerCase();
  if (raw === 'iron' || raw === 'shock') return raw;
  return 'sprout';
}

export function normalizeCreatureNameKey(v: string): string {
  return String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function cleanUsername(v: string): string {
  return String(v || '').trim().replace(/[^a-zA-Z0-9_ -]/g, '').slice(0, 24);
}

export function usernameKey(v: string): string {
  return cleanUsername(v).toLowerCase();
}

export function cleanServerId(v: string): string {
  const raw = String(v || '').trim().toLowerCase();
  const safe = raw.replace(/[^a-z0-9-_]/g, '').slice(0, 40);
  return safe || DEFAULT_SERVER_ID;
}

export function cleanServerName(v: string): string {
  const raw = String(v || '').trim();
  const safe = raw.replace(/[^a-zA-Z0-9_ -]/g, '').slice(0, 28);
  return safe || 'Garden Server';
}

export function parsePositiveInt(v: any, fallback = 0): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function utcDayKey(ts = Date.now()): string {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function dayDiff(dayA: string, dayB: string): number {
  const a = new Date(`${dayA}T00:00:00Z`);
  const b = new Date(`${dayB}T00:00:00Z`);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function distance2d(ax: number, az: number, bx: number, bz: number): number {
  const dx = Number(ax || 0) - Number(bx || 0);
  const dz = Number(az || 0) - Number(bz || 0);
  return Math.hypot(dx, dz);
}

export function luckPriceAt(luckValue: number): number {
  const l = Math.max(1, Math.floor(Number(luckValue) || 1));
  if (l <= 1) return 0;
  return Math.floor(100 * Math.pow(l - 1, 3.543));
}

export function luckUpgradeCost(currentLuck: number, targetLuck: number): number {
  const current = Math.max(1, Math.floor(Number(currentLuck) || 1));
  const target = Math.max(current, Math.floor(Number(targetLuck) || current));
  return Math.max(0, luckPriceAt(target) - luckPriceAt(current));
}
