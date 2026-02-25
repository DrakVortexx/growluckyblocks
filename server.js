const http = require("http");
const express = require("express");
const { randomUUID } = require("crypto");
const { admin, db, hasFirebaseConfig, firebaseProjectId } = require("./firebase");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = Number(process.env.PORT || 3000);
const PLAYERS_COLLECTION_ID = process.env.FIREBASE_PLAYERS_COLLECTION_ID || "players";
const TRADES_COLLECTION_ID = process.env.FIREBASE_TRADES_COLLECTION_ID || "trades";
const CHAT_COLLECTION_ID = process.env.FIREBASE_CHAT_COLLECTION_ID || "chat";
const PLAYERS_BLOB_FIELD = process.env.FIREBASE_PLAYERS_BLOB_FIELD || "profile";
const Query = {
  equal: (field, value) => ({ op: "equal", field, value }),
  limit: (n) => ({ op: "limit", value: Number(n) || 0 })
};
const ID = { unique: () => randomUUID() };
const ADMIN_EMAIL = "naturebenji@gmail.com";
const ADMIN_USERNAME = "DrakVortexx";
const DEFAULT_SERVER_ID = "public-1";
const RANK_KEYS = new Set([
  "basic", "common", "rare", "epic", "legendary",
  "mythic", "godly", "secret", "divine", "transcendent", "omniversal"
]);
const SPECIAL_BLOCK_KEYS = new Set(["valentinesblock"]);
const DAILY_STARDUST_LOOP = [
  { day: 1, stardust: 5, luckyRankKey: "common" },
  { day: 2, stardust: 10, luckyRankKey: "rare" },
  { day: 3, stardust: 15, luckyRankKey: "" },
  { day: 4, stardust: 25, luckyRankKey: "" },
  { day: 5, stardust: 40, luckyRankKey: "" },
  { day: 6, stardust: 60, luckyRankKey: "mythic" },
  { day: 7, stardust: 100, luckyRankKey: "secret" }
];
const BASE_LOCK_BASE_SEC = 60;
const BASE_LOCK_PER_REBIRTH_SEC = 10;
const STEAL_TIME_BY_RANK = Object.freeze({
  basic: 4,
  common: 6,
  rare: 12,
  epic: 20,
  legendary: 35,
  mythic: 50,
  godly: 90,
  secret: 180,
  divine: 420,
  transcendent: 10800,
  omniversal: 43200
});
const BAT_DEFS = Object.freeze({
  sprout: { key: "sprout", label: "Sprout Bat", stunSec: 0.8, cooldownSec: 1.5 },
  iron: { key: "iron", label: "Iron Bat", stunSec: 1.3, cooldownSec: 1.25 },
  shock: { key: "shock", label: "Shock Bat", stunSec: 1.8, cooldownSec: 1.05 }
});
const SERVER_LUCK_STARDUST_COST_BY_TARGET = Object.freeze({
  "100": 25,
  "300": 90,
  "1000": 220,
  "3000": 700,
  "10000": 2200,
  "100000": 6000
});
const PEDESTALS_PER_FLOOR = 10;
const BASE_FLOOR_UNLOCK_REBIRTH = 10;
const REBIRTHS_PER_EXTRA_FLOOR = 10;
const MAX_BASE_FLOORS = 6;
const MAX_REBIRTHS = 10;
const PERSONAL_LUCK_MAX = 100000;
const MAX_SERVER_SLOTS = 120;
const SPAWN_DROP_CENTER = Object.freeze({ x: -10.5, z: 6.1 });
const SPAWN_CREATURE_CATALOG = Object.freeze([
  { name: "Fat Cat", rankKey: "basic", rate: 2.30 },
  { name: "Tiny Bunny", rankKey: "basic", rate: 3.20 },
  { name: "Lucky Slime", rankKey: "basic", rate: 4.60 },
  { name: "Mini Dragon", rankKey: "common", rate: 15 },
  { name: "Goblin Pup", rankKey: "common", rate: 19 },
  { name: "Ice Fox", rankKey: "rare", rate: 55 },
  { name: "Lava Toad", rankKey: "rare", rate: 66 },
  { name: "Spike Turtle", rankKey: "rare", rate: 78 },
  { name: "Hydra Dragon", rankKey: "epic", rate: 210 },
  { name: "Electric Owl", rankKey: "epic", rate: 255 },
  { name: "Shadow Panther", rankKey: "epic", rate: 295 },
  { name: "Golden Griffin", rankKey: "legendary", rate: 640 },
  { name: "Crystal Wolf", rankKey: "legendary", rate: 780 },
  { name: "Little ball of fury", rankKey: "legendary", rate: 700 },
  { name: "Celestial Cat", rankKey: "mythic", rate: 2100 },
  { name: "Moon Serpent", rankKey: "mythic", rate: 2550 },
  { name: "Starry Elk", rankKey: "mythic", rate: 2980 },
  { name: "Omnisphinx", rankKey: "godly", rate: 52000 },
  { name: "Thunder Behemoth", rankKey: "godly", rate: 84000 },
  { name: "Eternal Fox", rankKey: "godly", rate: 118000 },
  { name: "Void Kraken", rankKey: "secret", rate: 1200000 },
  { name: "Ghost Unicorn", rankKey: "secret", rate: 2100000 },
  { name: "Arcane Tiger", rankKey: "secret", rate: 2950000 },
  { name: "Angelic Lion", rankKey: "divine", rate: 22000000 },
  { name: "Solar Dragon", rankKey: "divine", rate: 34000000 },
  { name: "Mystic Owlbear", rankKey: "divine", rate: 48000000 },
  { name: "Infinity Serpent", rankKey: "transcendent", rate: 120000000 },
  { name: "Quantum Phoenix", rankKey: "transcendent", rate: 180000000 },
  { name: "Cosmic Whale", rankKey: "transcendent", rate: 245000000 },
  { name: "Mystery Cat", rankKey: "omniversal", rate: 700000000 },
  { name: "Universe Hydra", rankKey: "omniversal", rate: 620000000 },
  { name: "Multiverse Dragon", rankKey: "omniversal", rate: 880000000 }
]);
const SPAWN_CREATURE_CATALOG_BY_KEY = new Map(
  SPAWN_CREATURE_CATALOG.map((c) => [normalizeCreatureNameKey(c.name), c])
);
const VALID_CREATURE_NAME_KEYS_BY_RANK = (() => {
  const out = {};
  for (const key of RANK_KEYS) out[key] = new Set();
  for (const row of SPAWN_CREATURE_CATALOG) {
    const rankKey = normalizeRankKey(row.rankKey || "basic");
    if (!out[rankKey]) out[rankKey] = new Set();
    out[rankKey].add(normalizeCreatureNameKey(row.name));
  }
  return Object.freeze(out);
})();

function utcDayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function dayDiff(dayA, dayB) {
  const a = new Date(`${dayA}T00:00:00Z`);
  const b = new Date(`${dayB}T00:00:00Z`);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function parsePositiveInt(v, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function cleanUsername(v) {
  return String(v || "").trim().replace(/[^a-zA-Z0-9_ -]/g, "").slice(0, 24);
}

function usernameKey(v) {
  return cleanUsername(v).toLowerCase();
}

function luckPriceAt(luckValue) {
  const l = Math.max(1, Math.floor(Number(luckValue) || 1));
  if (l <= 1) return 0;
  return Math.floor(100 * Math.pow(l - 1, 3.543));
}

function luckUpgradeCost(currentLuck, targetLuck) {
  const current = Math.max(1, Math.floor(Number(currentLuck) || 1));
  const target = Math.max(current, Math.floor(Number(targetLuck) || current));
  return Math.max(0, luckPriceAt(target) - luckPriceAt(current));
}

function playerTag(playerId) {
  return `Player-${String(playerId).slice(0, 6)}`;
}

function baseFloorsForRebirth(_rebirths) {
  return 1;
}

function maxPedestalsForData(_playerData) {
  return PEDESTALS_PER_FLOOR;
}

function pedestalIndexFromId(pedestalId) {
  const raw = String(pedestalId || "").trim();
  let m = raw.match(/^ped-(\d+)-(\d+)$/);
  if (m) {
    const row = Number(m[1]);
    const col = Number(m[2]);
    if (!Number.isFinite(row) || !Number.isFinite(col)) return -1;
    return row * 5 + col;
  }
  m = raw.match(/^ped-(\d+)-(\d+)-(\d+)$/);
  if (!m) return -1;
  const floor = Number(m[1]);
  const row = Number(m[2]);
  const col = Number(m[3]);
  if (!Number.isFinite(floor) || !Number.isFinite(row) || !Number.isFinite(col)) return -1;
  return floor * PEDESTALS_PER_FLOOR + row * 5 + col;
}

function ensureCreatureIdsAndPedestalLinks(playerData) {
  if (!playerData || typeof playerData !== "object") return;
  let creatures = Array.isArray(playerData.creatures) ? playerData.creatures : [];
  const pedestals = Array.isArray(playerData.pedestals) ? playerData.pedestals : [];
  const maxPedestals = maxPedestalsForData(playerData);
  if (pedestals.length > maxPedestals) pedestals.length = maxPedestals;
  const seenIds = new Set();

  creatures = creatures.filter((c) => {
    if (!c || typeof c !== "object") return false;
    return isValidCreatureNameForRank(c.rankKey || "basic", c.name || "");
  });

  for (let i = 0; i < creatures.length; i += 1) {
    const c = creatures[i];
    if (!c || typeof c !== "object") continue;
    let id = String(c.id || "").trim();
    if (!id || seenIds.has(id)) {
      id = `c-${Date.now()}-${Math.random().toString(16).slice(2)}-${i}`;
    }
    c.id = id;
    c.pedestalId = String(c.pedestalId || "");
    if (c.pedestalId) {
      const pedIdx = pedestalIndexFromId(c.pedestalId);
      if (pedIdx < 0 || pedIdx >= maxPedestals) c.pedestalId = "";
    }
    seenIds.add(id);
  }

  const byPedestal = new Map();
  for (const c of creatures) {
    if (!c || typeof c !== "object") continue;
    const pedId = String(c.pedestalId || "");
    if (!pedId || byPedestal.has(pedId)) continue;
    byPedestal.set(pedId, String(c.id || ""));
  }

  for (let i = 0; i < pedestals.length; i += 1) {
    const ped = pedestals[i];
    if (!ped || typeof ped !== "object") continue;
    const pedId = pedestalIdFromIndex(i);
    const linkedId = String(byPedestal.get(pedId) || "");
    const currentId = String(ped.creatureId || "");
    if (linkedId) {
      if (currentId !== linkedId) ped.creatureId = linkedId;
      continue;
    }
    if (currentId && !seenIds.has(currentId)) ped.creatureId = "";
  }

  playerData.creatures = creatures;
  playerData.pedestals = pedestals;
}

function clampPedestalIndex(value, maxPedestals = PEDESTALS_PER_FLOOR) {
  const maxIdx = Math.max(0, Math.floor(Number(maxPedestals || PEDESTALS_PER_FLOOR)) - 1);
  const raw = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(maxIdx, raw));
}

function ensurePlayerDataShape(player, slot = 0) {
  const out = player && typeof player === "object" ? { ...player } : {};
  if (!out.profile || typeof out.profile !== "object" || Array.isArray(out.profile)) out.profile = {};
  if (out.profile.username && !out.profile.usernameLower) out.profile.usernameLower = usernameKey(out.profile.username);
  if (!Number.isInteger(Number(out.slot))) out.slot = slot;
  if (!out.data || typeof out.data !== "object") out.data = { state: {} };
  if (!out.data.state || typeof out.data.state !== "object") out.data.state = {};
  if (!out.data.state.luckyInventory || typeof out.data.state.luckyInventory !== "object") {
    const legacy = parsePositiveInt(out.data.state.luckyBlocks || 0, 0);
    out.data.state.luckyInventory = { basic: legacy };
  }
  if (!out.data.state.luckyMoonInventory || typeof out.data.state.luckyMoonInventory !== "object") {
    out.data.state.luckyMoonInventory = {};
  }
  if (!out.data.state.luckySoulboundInventory || typeof out.data.state.luckySoulboundInventory !== "object") {
    out.data.state.luckySoulboundInventory = {};
  }
  if (!out.data.state.specialLuckyInventory || typeof out.data.state.specialLuckyInventory !== "object") {
    out.data.state.specialLuckyInventory = {};
  }
  if (!out.data.state.specialLuckyInventory.valentinesblock || typeof out.data.state.specialLuckyInventory.valentinesblock !== "object") {
    out.data.state.specialLuckyInventory.valentinesblock = { normal: 0, bluemoon: 0, soulbound: 0 };
  }
  out.data.state.rebirths = Math.max(0, Math.min(MAX_REBIRTHS, Math.floor(Number(out.data.state.rebirths || 0))));
  out.data.state.personalLuck = Math.max(1, Math.min(PERSONAL_LUCK_MAX, Math.floor(Number(out.data.state.personalLuck || 1))));
  out.data.state.personalLuckUnlocked = Math.max(
    out.data.state.personalLuck,
    Math.min(PERSONAL_LUCK_MAX, Math.floor(Number(out.data.state.personalLuckUnlocked || out.data.state.personalLuck || 1)))
  );
  out.data.state.luckShopTarget = Math.max(
    1,
    Math.min(PERSONAL_LUCK_MAX, Math.floor(Number(out.data.state.luckShopTarget || out.data.state.personalLuckUnlocked || 1)))
  );
  ensureBatState(out.data.state);
  out.data.state.baseFloors = 1;
  if (!Number.isFinite(Number(out.data.state.stardust || 0))) out.data.state.stardust = 0;
  if (!Array.isArray(out.data.creatures)) out.data.creatures = [];
  if (!Array.isArray(out.data.pedestals)) out.data.pedestals = [];
  ensureCreatureIdsAndPedestalLinks(out.data);
  if (!out.daily || typeof out.daily !== "object") out.daily = { streak: 0, lastClaimDay: "", totalClaims: 0 };
  if (!Number.isFinite(Number(out.daily.totalClaims || 0))) out.daily.totalClaims = 0;
  if (parsePositiveInt(out.daily.totalClaims || 0, 0) < 1 && parsePositiveInt(out.daily.streak || 0, 0) > 0) {
    out.daily.totalClaims = parsePositiveInt(out.daily.streak || 0, 0);
  }
  return out;
}

function getBasicLucky(stateObj) {
  if (!stateObj || typeof stateObj !== "object") return 0;
  if (stateObj.luckyInventory && typeof stateObj.luckyInventory === "object") {
    return parsePositiveInt(stateObj.luckyInventory.basic || 0, 0);
  }
  return parsePositiveInt(stateObj.luckyBlocks || 0, 0);
}

function setBasicLucky(stateObj, value) {
  if (!stateObj || typeof stateObj !== "object") return;
  if (!stateObj.luckyInventory || typeof stateObj.luckyInventory !== "object") stateObj.luckyInventory = {};
  stateObj.luckyInventory.basic = parsePositiveInt(value, 0);
}

function getLuckyByRank(stateObj, rankKey) {
  if (!stateObj || typeof stateObj !== "object") return 0;
  const key = normalizeRankKey(rankKey);
  if (!key || !RANK_KEYS.has(key)) return 0;
  if (!stateObj.luckyInventory || typeof stateObj.luckyInventory !== "object") stateObj.luckyInventory = {};
  return parsePositiveInt(stateObj.luckyInventory[key] || 0, 0);
}

function addLuckyByRank(stateObj, rankKey, amount) {
  if (!stateObj || typeof stateObj !== "object") return;
  const key = normalizeRankKey(rankKey);
  if (!key || !RANK_KEYS.has(key)) return;
  if (!stateObj.luckyInventory || typeof stateObj.luckyInventory !== "object") stateObj.luckyInventory = {};
  const deltaRaw = Number(amount);
  const delta = Number.isFinite(deltaRaw) ? Math.trunc(deltaRaw) : 0;
  const next = getLuckyByRank(stateObj, key) + delta;
  stateObj.luckyInventory[key] = Math.max(0, next);
}

function countPlacedLuckyByRank(playerData, rankKey) {
  const key = normalizeRankKey(rankKey);
  const pedestals = Array.isArray(playerData?.pedestals) ? playerData.pedestals : [];
  let total = 0;
  for (const p of pedestals) {
    if (!p || typeof p !== "object") continue;
    if (p.hasBlock && normalizeRankKey(p.blockRankKey || "") === key) total += 1;
  }
  return total;
}

function countOfferableLucky(playerData, rankKey, source = "any") {
  const key = normalizeRankKey(rankKey);
  const stored = getLuckyByRank(playerData?.state || {}, key);
  const placed = countPlacedLuckyByRank(playerData, key);
  if (source === "inventory") return stored;
  if (source === "placed") return placed;
  return stored + placed;
}

function removeLuckyFromData(playerData, rankKey, amount, source = "any") {
  const key = normalizeRankKey(rankKey);
  let remaining = parsePositiveInt(amount, 0);
  if (remaining < 1) return false;
  if (!playerData || typeof playerData !== "object") return false;
  if (!playerData.state || typeof playerData.state !== "object") playerData.state = {};
  if (!playerData.state.luckyInventory || typeof playerData.state.luckyInventory !== "object") {
    playerData.state.luckyInventory = {};
  }

  const spendFromInventory = source === "inventory" || source === "any";
  const spendFromPlaced = source === "placed" || source === "any";

  if (spendFromInventory) {
    const have = getLuckyByRank(playerData.state, key);
    const take = Math.min(have, remaining);
    if (take > 0) addLuckyByRank(playerData.state, key, -take);
    remaining -= take;
  }
  if (spendFromPlaced && remaining > 0) {
    const pedestals = Array.isArray(playerData.pedestals) ? playerData.pedestals : [];
    for (const p of pedestals) {
      if (remaining < 1) break;
      if (!p || typeof p !== "object") continue;
      if (p.hasBlock && normalizeRankKey(p.blockRankKey || "") === key) {
        p.hasBlock = false;
        p.blockRankKey = null;
        remaining -= 1;
      }
    }
  }
  return remaining === 0;
}

function removeCreatureFromData(playerData, creatureId) {
  if (!playerData || typeof playerData !== "object") return null;
  const targetId = String(creatureId || "").trim();
  if (!targetId) return null;
  const list = Array.isArray(playerData.creatures) ? playerData.creatures : [];
  const idx = list.findIndex((c) => String(c?.id || "") === targetId);
  if (idx < 0) return null;
  const [picked] = list.splice(idx, 1);
  playerData.creatures = list;
  const pedestals = Array.isArray(playerData.pedestals) ? playerData.pedestals : [];
  for (const p of pedestals) {
    if (!p || typeof p !== "object") continue;
    if (String(p.creatureId || "") === targetId) p.creatureId = "";
  }
  playerData.pedestals = pedestals;
  return picked ? { ...picked } : null;
}

function removeCreatureFromPedestalId(playerData, pedestalId) {
  if (!playerData || typeof playerData !== "object") return null;
  const targetPedestalId = String(pedestalId || "").trim();
  if (!targetPedestalId) return null;
  const list = Array.isArray(playerData.creatures) ? playerData.creatures : [];
  const idx = list.findIndex((c) => String(c?.pedestalId || "") === targetPedestalId);
  if (idx < 0) return null;
  const [picked] = list.splice(idx, 1);
  playerData.creatures = list;
  const pedestals = Array.isArray(playerData.pedestals) ? playerData.pedestals : [];
  let pidx = -1;
  for (let i = 0; i < pedestals.length; i += 1) {
    if (pedestalIdFromIndex(i) === targetPedestalId) {
      pidx = i;
      break;
    }
  }
  if (pidx >= 0 && pidx < pedestals.length && pedestals[pidx] && typeof pedestals[pidx] === "object") {
    if (String(pedestals[pidx].creatureId || "") === String(picked?.id || "")) pedestals[pidx].creatureId = "";
  } else {
    for (const p of pedestals) {
      if (!p || typeof p !== "object") continue;
      if (String(p.creatureId || "") === String(picked?.id || "")) p.creatureId = "";
    }
  }
  playerData.pedestals = pedestals;
  return picked ? { ...picked } : null;
}

function addCreatureToData(playerData, creature) {
  if (!playerData || typeof playerData !== "object" || !creature || typeof creature !== "object") return null;
  const list = Array.isArray(playerData.creatures) ? playerData.creatures : [];
  const incoming = { ...creature };
  incoming.id = `c-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  incoming.pedestalId = null;
  list.push(incoming);
  playerData.creatures = list;
  return { ...incoming };
}

function isAdminProfile(profile) {
  if (!profile || typeof profile !== "object") return false;
  return String(profile.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase()
    && String(profile.username || "") === ADMIN_USERNAME;
}

function cleanServerId(v) {
  const raw = String(v || "").trim().toLowerCase();
  const safe = raw.replace(/[^a-z0-9-_]/g, "").slice(0, 40);
  return safe || DEFAULT_SERVER_ID;
}

function cleanServerName(v) {
  const raw = String(v || "").trim();
  const safe = raw.replace(/[^a-zA-Z0-9_ -]/g, "").slice(0, 28);
  return safe || "Garden Server";
}

function normalizeCreatureNameKey(v) {
  return String(v || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isValidCreatureNameForRank(rankKey, creatureName) {
  const key = normalizeRankKey(rankKey);
  const allowed = VALID_CREATURE_NAME_KEYS_BY_RANK[key];
  if (!allowed) return false;
  const nameKey = normalizeCreatureNameKey(creatureName);
  if (!nameKey) return false;
  return allowed.has(nameKey);
}

function normalizeRankKey(v) {
  const raw = String(v || "").trim().toLowerCase();
  if (raw === "eternal" || raw === "eturnal") return "transcendent";
  if (raw === "uncommon") return "common";
  if (raw === "elite") return "rare";
  if (raw === "prismatic" || raw === "apex" || raw === "ascended" || raw === "ancient" || raw === "celestial") return "divine";
  return raw;
}

function normalizeMutation(v) {
  const raw = String(v || "").trim().toLowerCase();
  if (raw === "blue moon" || raw === "blue_moon" || raw === "blue-moon" || raw === "bm" || raw === "bluemoon") {
    return "bluemoon";
  }
  if (raw === "valentine" || raw === "valentines" || raw === "valentinesday" || raw === "valentine's" || raw === "vday" || raw === "heart" || raw === "hearts") {
    return "soulbound";
  }
  if (raw === "soulbound" || raw === "soul" || raw === "sb") {
    return "soulbound";
  }
  return "normal";
}

function normalizeBatKey(v) {
  const raw = String(v || "").trim().toLowerCase();
  return BAT_DEFS[raw] ? raw : "sprout";
}

function getStealTimeForRank(rankKey) {
  void rankKey;
  return 2;
}

function pedestalPositionForSlot(slot, pedestalIndex) {
  const safeSlot = Number.isFinite(Number(slot)) ? Number(slot) : 0;
  const idx = Math.max(0, Math.floor(Number(pedestalIndex) || 0));
  const floor = Math.floor(idx / PEDESTALS_PER_FLOOR);
  const inFloor = idx % PEDESTALS_PER_FLOOR;
  const row = Math.floor(inFloor / 5);
  const col = inFloor % 5;
  const x = -5.8 + col * 2.9 + safeSlot * 26;
  const z = -12.8 + row * 2.9 - floor * 8.4;
  return { x, z };
}

function pedestalIdFromIndex(pedestalIndex) {
  const idx = Math.max(0, Math.floor(Number(pedestalIndex) || 0));
  const floor = Math.floor(idx / PEDESTALS_PER_FLOOR);
  const inFloor = idx % PEDESTALS_PER_FLOOR;
  const row = Math.floor(inFloor / 5);
  const col = inFloor % 5;
  if (floor === 0) return `ped-${row}-${col}`;
  return `ped-${floor}-${row}-${col}`;
}

function snapshotCreatureAtPedestal(snapshot, pedestalIndex) {
  const creatures = Array.isArray(snapshot?.creatures) ? snapshot.creatures : [];
  const pedId = pedestalIdFromIndex(pedestalIndex);
  let found = creatures.find((c) => String(c?.pedestalId || "") === pedId) || null;
  if (found) return found;
  const ped = Array.isArray(snapshot?.pedestals) ? snapshot.pedestals[pedestalIndex] : null;
  const creatureId = String(ped?.creatureId || "");
  if (!creatureId) return null;
  found = creatures.find((c) => String(c?.id || "") === creatureId) || null;
  return found;
}

function resolveStealTargetFromSnapshot(snapshot, pedestalIndex) {
  const ped = Array.isArray(snapshot?.pedestals) ? snapshot.pedestals[pedestalIndex] : null;
  if (!ped) return null;
  if (ped.hasBlock) {
    return {
      itemType: "block",
      rankKey: normalizeRankKey(ped.blockRankKey || "basic"),
      mutation: normalizeMutation(ped.blockMutation || (ped.blockBlueMoon ? "bluemoon" : "normal")),
      creatureId: "",
      creatureName: "",
      creatureRate: 0
    };
  }
  const creature = snapshotCreatureAtPedestal(snapshot, pedestalIndex);
  if (!creature) return null;
  return {
    itemType: "creature",
    rankKey: normalizeRankKey(creature.rankKey || "basic"),
    mutation: normalizeMutation(creature.mutation || (creature.blueMoon ? "bluemoon" : "normal")),
    creatureId: String(creature.id || ""),
    creatureName: String(creature.name || "Creature"),
    creatureRate: Number(creature.rate || 0)
  };
}

function lockRecentlyStolenPedestal(serverState, ownerId, pedestalIndex, meta = {}) {
  if (!serverState || !ownerId) return;
  const owner = String(ownerId || "");
  const idx = clampPedestalIndex(pedestalIndex, Number(meta.maxPedestals || PEDESTALS_PER_FLOOR));
  const mode = String(meta.mode || "stolen");
  const blockKey = normalizeRankKey(meta.blockKey || "basic");
  const mutation = normalizeMutation(meta.mutation || "normal");
  const creatureMeta = meta.creature && typeof meta.creature === "object"
    ? {
      id: String(meta.creature.id || ""),
      name: String(meta.creature.name || "Creature"),
      rankKey: normalizeRankKey(meta.creature.rankKey || blockKey || "basic"),
      rate: Math.max(1, Number(meta.creature.rate || 1)),
      mutation: normalizeMutation(meta.creature.mutation || mutation || "normal")
    }
    : null;
  let perPlayer = serverState.recentlyStolenByPlayer.get(owner);
  if (!perPlayer) {
    perPlayer = new Map();
    serverState.recentlyStolenByPlayer.set(owner, perPlayer);
  }
  perPlayer.set(idx, {
    until: Date.now() + Math.max(1000, Number(meta.ttlMs || 45000)),
    mode,
    itemType: String(meta.itemType || "block"),
    blockKey,
    mutation,
    creatureId: String(meta.creatureId || ""),
    creature: creatureMeta,
    pedestalId: pedestalIdFromIndex(idx),
    maxPedestals: Math.max(PEDESTALS_PER_FLOOR, Math.floor(Number(meta.maxPedestals || PEDESTALS_PER_FLOOR)))
  });
}

function unlockRecentlyStolenPedestal(serverState, ownerId, pedestalIndex) {
  if (!serverState || !ownerId) return;
  const owner = String(ownerId || "");
  const idx = Math.max(0, Math.floor(Number(pedestalIndex) || 0));
  const perPlayer = serverState.recentlyStolenByPlayer.get(owner);
  if (!perPlayer) return;
  perPlayer.delete(idx);
  if (perPlayer.size < 1) serverState.recentlyStolenByPlayer.delete(owner);
}

function ensurePedestalsArray(playerData) {
  const pedestals = Array.isArray(playerData?.pedestals) ? playerData.pedestals : [];
  const target = maxPedestalsForData(playerData);
  while (pedestals.length < target) {
    pedestals.push({
      hasBlock: false,
      blockRankKey: null,
      blockBlueMoon: false,
      blockMutation: "normal",
      creatureId: ""
    });
  }
  playerData.pedestals = pedestals;
  return pedestals;
}

function applyRecentStealSaveGuards(serverState, playerId, incomingData) {
  if (!serverState || !playerId || !incomingData || typeof incomingData !== "object") return incomingData;
  const owner = String(playerId || "");
  const perPlayer = serverState.recentlyStolenByPlayer.get(owner);
  if (!perPlayer || perPlayer.size < 1) return incomingData;

  const now = Date.now();
  const out = deepClone(incomingData) || {};
  const pedestals = Array.isArray(out.pedestals) ? out.pedestals : [];
  let creatures = Array.isArray(out.creatures) ? out.creatures : [];
  let changed = false;

  for (const [idx, lock] of perPlayer.entries()) {
    const until = Number(lock?.until || 0);
    if (until <= now) {
      perPlayer.delete(idx);
      continue;
    }
    const pidx = clampPedestalIndex(idx, Math.max(PEDESTALS_PER_FLOOR, pedestals.length || PEDESTALS_PER_FLOOR));
    const ped = pedestals[pidx];
    const stolenCreatureIds = new Set();
    if (String(lock?.creatureId || "")) stolenCreatureIds.add(String(lock.creatureId));
    const stolenPedId = String(lock?.pedestalId || pedestalIdFromIndex(pidx));
    const mode = String(lock?.mode || "stolen");

    if (mode === "restore") {
      const basePed = ped && typeof ped === "object" ? { ...ped } : {};
      if (String(lock?.itemType || "block") === "creature" && lock?.creature && typeof lock.creature === "object") {
        const c = {
          id: String(lock.creature.id || lock.creatureId || ""),
          name: String(lock.creature.name || "Creature"),
          rankKey: normalizeRankKey(lock.creature.rankKey || lock.blockKey || "basic"),
          rate: Math.max(1, Number(lock.creature.rate || 1)),
          mutation: normalizeMutation(lock.creature.mutation || lock.mutation || "normal"),
          blueMoon: normalizeMutation(lock.creature.mutation || lock.mutation || "normal") === "bluemoon",
          pedestalId: stolenPedId
        };
        const before = creatures.length;
        creatures = creatures.filter((it) => String(it?.id || "") !== c.id && String(it?.pedestalId || "") !== stolenPedId);
        if (creatures.length !== before) changed = true;
        if (c.id) {
          creatures.push(c);
          changed = true;
        }
        const hadBlock = !!basePed.hasBlock;
        const hadCreature = String(basePed.creatureId || "");
        pedestals[pidx] = {
          ...basePed,
          hasBlock: false,
          blockRankKey: null,
          blockBlueMoon: false,
          blockMutation: "normal",
          creatureId: c.id || hadCreature || ""
        };
        if (hadBlock || hadCreature !== (c.id || hadCreature || "")) changed = true;
      } else {
        const blockKey = normalizeRankKey(lock?.blockKey || "basic");
        const mutation = normalizeMutation(lock?.mutation || "normal");
        const before = creatures.length;
        creatures = creatures.filter((it) => String(it?.pedestalId || "") !== stolenPedId);
        if (creatures.length !== before) changed = true;
        const had = !!basePed.hasBlock
          && normalizeRankKey(basePed.blockRankKey || "basic") === blockKey
          && normalizeMutation(basePed.blockMutation || (basePed.blockBlueMoon ? "bluemoon" : "normal")) === mutation
          && !String(basePed.creatureId || "");
        pedestals[pidx] = {
          ...basePed,
          hasBlock: true,
          blockRankKey: blockKey,
          blockBlueMoon: mutation === "bluemoon",
          blockMutation: mutation,
          creatureId: ""
        };
        if (!had) changed = true;
      }
      continue;
    }

    if (ped && typeof ped === "object") {
      if (ped.hasBlock) {
        ped.hasBlock = false;
        ped.blockRankKey = null;
        ped.blockBlueMoon = false;
        ped.blockMutation = "normal";
        changed = true;
      }
      if (String(ped.creatureId || "")) {
        stolenCreatureIds.add(String(ped.creatureId));
        ped.creatureId = "";
        changed = true;
      }
    }

    const prevLen = creatures.length;
    creatures = creatures.filter((c) => {
      const cid = String(c?.id || "");
      const cPed = String(c?.pedestalId || "");
      if (stolenCreatureIds.has(cid)) return false;
      if (cPed && cPed === stolenPedId) return false;
      return true;
    });
    if (creatures.length !== prevLen) changed = true;
  }

  if (perPlayer.size < 1) serverState.recentlyStolenByPlayer.delete(owner);
  if (!changed) return incomingData;
  out.pedestals = pedestals;
  out.creatures = creatures;
  return out;
}

function distance2d(ax, az, bx, bz) {
  const dx = Number(ax || 0) - Number(bx || 0);
  const dz = Number(az || 0) - Number(bz || 0);
  return Math.hypot(dx, dz);
}

function ensureBatState(stateObj) {
  if (!stateObj || typeof stateObj !== "object") return;
  if (!stateObj.batsOwned || typeof stateObj.batsOwned !== "object") stateObj.batsOwned = {};
  if (!stateObj.batsOwned.sprout) stateObj.batsOwned.sprout = true;
  stateObj.equippedBat = normalizeBatKey(stateObj.equippedBat || "sprout");
  if (!stateObj.batsOwned[stateObj.equippedBat]) stateObj.equippedBat = "sprout";
}

function getEquippedBatFromPlayerDoc(playerDoc) {
  const stateObj = playerDoc?.data?.state;
  ensureBatState(stateObj);
  const key = normalizeBatKey(stateObj?.equippedBat || "sprout");
  return BAT_DEFS[key] || BAT_DEFS.sprout;
}

function serverTag(meta, viewerId = "") {
  const viewer = String(viewerId || "");
  const isOwner = viewer && String(meta.ownerId || "") === viewer;
  return {
    id: meta.id,
    name: meta.name,
    isPrivate: !!meta.isPrivate,
    ownerId: meta.ownerId || "",
    playerCount: meta.activeSlots.size,
    luck: Number(meta.serverLuck || 1),
    whitelistCount: meta.whitelistPlayerIds instanceof Set ? meta.whitelistPlayerIds.size : 0,
    canConfigure: !!(meta.isPrivate && isOwner)
  };
}

const serverStates = new Map();
const resetSaveLocks = new Map();
const playerCache = new Map();
const dailyClaimLocks = new Set();
let firestoreBackoffUntil = 0;
const FIRESTORE_TIMEOUT_MS = 12000;
const FIRESTORE_BACKOFF_MS = 10000;
let leaderboardCashCache = { rows: [], updatedAt: 0 };
let leaderboardCashInFlight = false;

function ensureServerState(serverId, opts = {}) {
  const id = cleanServerId(serverId);
  if (serverStates.has(id)) return serverStates.get(id);
  const state = {
    id,
    name: cleanServerName(opts.name || (id === DEFAULT_SERVER_ID ? "Public #1" : "Garden Server")),
    ownerId: String(opts.ownerId || ""),
    isPrivate: !!opts.isPrivate,
    createdAt: Date.now(),
    serverLuck: Math.max(1, Number(opts.serverLuck || 1)),
    forcedBlueMoonUntil: Number(opts.forcedBlueMoonUntil || 0),
    forcedBlueMoonEventId: String(opts.forcedBlueMoonEventId || ""),
    activeSlots: new Map(),
    socketsByPlayer: new Map(),
    activePositions: new Map(),
    activeProfiles: new Map(),
    activeSnapshots: new Map(),
    activeSteals: new Map(),
    carriedByThief: new Map(),
    spawnDrops: new Map(),
    stunUntilByPlayer: new Map(),
    batCooldownUntilByPlayer: new Map(),
    whitelistPlayerIds: new Set(),
    whitelistUsernames: new Set(),
    recentlyStolenByPlayer: new Map(),
    baseLockUntilByPlayer: new Map(),
    stealTickBusy: false
  };
  serverStates.set(id, state);
  return state;
}

ensureServerState(DEFAULT_SERVER_ID, { name: "Public #1", isPrivate: false });

function canAccessServer(state, playerId) {
  if (!state) return false;
  if (!state.isPrivate) return true;
  const pid = String(playerId || "");
  return String(state.ownerId || "") === pid || (state.whitelistPlayerIds instanceof Set && state.whitelistPlayerIds.has(pid));
}

function listServersForPlayer(playerId) {
  const out = [];
  for (const state of serverStates.values()) {
    if (!canAccessServer(state, playerId)) continue;
    out.push(serverTag(state, playerId));
  }
  out.sort((a, b) => {
    if (a.id === DEFAULT_SERVER_ID) return -1;
    if (b.id === DEFAULT_SERVER_ID) return 1;
    return Number(b.playerCount || 0) - Number(a.playerCount || 0);
  });
  return out;
}

function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isFirestoreBackoff() {
  return Date.now() < firestoreBackoffUntil;
}

function isFirestoreTransientError(err) {
  if (!err) return false;
  const code = Number(err.code);
  const msg = String(err.message || "").toLowerCase();
  return code === 8
    || code === 4
    || code === 429
    || code === 503
    || msg.includes("resource_exhausted")
    || msg.includes("quota exceeded")
    || msg.includes("deadline")
    || msg.includes("timeout")
    || msg.includes("rate limit");
}

function setPathValue(target, path, value) {
  const parts = String(path).split(".");
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const k = parts[i];
    if (!node[k] || typeof node[k] !== "object") node[k] = {};
    node = node[k];
  }
  node[parts[parts.length - 1]] = value;
}

function mergePatch(base, patch) {
  const out = deepClone(base || {}) || {};
  for (const [k, v] of Object.entries(patch || {})) setPathValue(out, k, v);
  return out;
}

function isDatastoreNotFound(err) {
  return Number(err?.code) === 404
    || Number(err?.code) === 5
    || String(err?.type || "").includes("not_found")
    || String(err?.message || "").toLowerCase().includes("no document to update");
}

function isDatastoreAuthError(err) {
  const code = Number(err?.code);
  const msg = String(err?.message || "").toLowerCase();
  return code === 401
    || code === 403
    || code === 7
    || msg.includes("unauthorized")
    || msg.includes("forbidden")
    || msg.includes("missing scope");
}

function sanitizeDocData(obj) {
  const out = deepClone(obj || {}) || {};
  delete out.$id;
  delete out.$collectionId;
  delete out.$databaseId;
  delete out.$permissions;
  delete out.$createdAt;
  delete out.$updatedAt;
  return out;
}

async function getDocumentById(collectionId, documentId, actor = null) {
  void actor;
  return datastoreCall(async () => {
    const snap = await db.collection(collectionId).doc(documentId).get();
    if (!snap.exists) {
      const e = new Error("not_found");
      e.code = 404;
      throw e;
    }
    return { $id: snap.id, ...sanitizeDocData(snap.data() || {}) };
  });
}

async function listDocuments(collectionId, queries = [], actor = null) {
  void actor;
  return datastoreCall(async () => {
    let q = db.collection(collectionId);
    let limitN = 100;
    for (const entry of Array.isArray(queries) ? queries : []) {
      if (!entry || typeof entry !== "object") continue;
      if (entry.op === "equal") {
        q = q.where(String(entry.field || ""), "==", entry.value);
      } else if (entry.op === "limit") {
        const n = Number(entry.value || 0);
        if (Number.isFinite(n) && n > 0) limitN = Math.floor(n);
      }
    }
    const snap = await q.limit(limitN).get();
    return {
      documents: snap.docs.map((d) => ({ $id: d.id, ...sanitizeDocData(d.data() || {}) }))
    };
  });
}

async function createDocument(collectionId, documentId, data, actor = null) {
  void actor;
  return datastoreCall(async () => {
    const payload = sanitizeDocData(data);
    await db.collection(collectionId).doc(documentId).set(payload, { merge: false });
    return { $id: documentId, ...payload };
  });
}

async function updateDocument(collectionId, documentId, data, actor = null) {
  void actor;
  return datastoreCall(async () => {
    const payload = sanitizeDocData(data);
    const ref = db.collection(collectionId).doc(documentId);
    const snap = await ref.get();
    if (!snap.exists) {
      const e = new Error("not_found");
      e.code = 404;
      throw e;
    }
    await ref.set(payload, { merge: true });
    return { $id: documentId, ...payload };
  });
}

async function deleteDocument(collectionId, documentId, actor = null) {
  void actor;
  return datastoreCall(async () => {
    await db.collection(collectionId).doc(documentId).delete();
    return { ok: true };
  });
}

async function datastoreCall(op) {
  try {
    return await Promise.race([
      op(),
      new Promise((_, reject) => {
        setTimeout(() => {
          const e = new Error("datastore-timeout");
          e.code = 4;
          reject(e);
        }, FIRESTORE_TIMEOUT_MS);
      })
    ]);
  } catch (err) {
    if (isFirestoreTransientError(err)) {
      firestoreBackoffUntil = Date.now() + FIRESTORE_BACKOFF_MS;
      err.firestoreTransient = true;
    }
    throw err;
  }
}

async function getPlayerDoc(playerId, actor = null) {
  try {
    const doc = await getDocumentById(PLAYERS_COLLECTION_ID, playerId, actor);
    if (!doc) {
      playerCache.delete(playerId);
      return null;
    }
    const data = sanitizeDocData(doc);
    if (typeof data[PLAYERS_BLOB_FIELD] === "string") {
      try {
        const parsed = JSON.parse(data[PLAYERS_BLOB_FIELD]);
        if (parsed && typeof parsed === "object") {
          playerCache.set(playerId, deepClone(parsed));
          return parsed;
        }
      } catch {
        // keep raw doc mode
      }
    }
    playerCache.set(playerId, deepClone(data));
    return data;
  } catch (err) {
    if (isDatastoreNotFound(err)) {
      playerCache.delete(playerId);
      return null;
    }
    if (isDatastoreAuthError(err)) {
      console.error("getPlayerDoc auth error (check APPWRITE key + collection permissions):", err?.message || err);
      return deepClone(playerCache.get(playerId) || null);
    }
    if (err.firestoreTransient) return deepClone(playerCache.get(playerId) || null);
    console.error("getPlayerDoc degraded read:", err?.message || err);
    return deepClone(playerCache.get(playerId) || null);
  }
}

async function setPlayerDocMerge(playerId, patch, actor = null, opts = null) {
  const strict = !!(opts && opts.strict);
  const merged = mergePatch(playerCache.get(playerId) || {}, patch);
  playerCache.set(playerId, merged);
  try {
    try {
      await updateDocument(PLAYERS_COLLECTION_ID, playerId, merged, actor);
    } catch (err) {
      if (isDatastoreNotFound(err)) {
        await createDocument(PLAYERS_COLLECTION_ID, playerId, merged, actor);
      } else {
        throw err;
      }
    }
  } catch (err) {
    // Fallback for strict Appwrite schemas: store full player object in one text column.
    try {
      const blobPayload = { [PLAYERS_BLOB_FIELD]: JSON.stringify(merged) };
      try {
        await updateDocument(PLAYERS_COLLECTION_ID, playerId, blobPayload, actor);
      } catch (err2) {
        if (isDatastoreNotFound(err2)) {
          await createDocument(PLAYERS_COLLECTION_ID, playerId, blobPayload, actor);
        } else {
          throw err2;
        }
      }
    } catch (blobErr) {
      if (strict) throw blobErr;
      console.error("setPlayerDocMerge degraded write", blobErr?.message || blobErr);
      // Keep gameplay alive even if Appwrite schema/permissions are not ready.
    }
  }
  return merged;
}

async function deletePlayerDoc(playerId, actor = null) {
  playerCache.delete(playerId);
  try {
    await deleteDocument(PLAYERS_COLLECTION_ID, playerId, actor);
  } catch (err) {
    if (isDatastoreNotFound(err)) return;
    console.error("deletePlayerDoc degraded delete", err?.message || err);
  }
}

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

async function verifyAuth(req, res, opts = {}) {
  const strict = opts.strict !== false;
  const authHeader = String(req.headers.authorization || "").trim();
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const tokenFromBearer = tokenMatch ? String(tokenMatch[1] || "").trim() : "";
  const tokenFromXHeader = String(req.headers["x-auth-token"] || "").trim();
  const tokenFromBody = String(req.body?.authToken || "").trim();
  const tokenFromQuery = String(req.query?.authToken || "").trim();
  const token = tokenFromBearer || tokenFromXHeader || tokenFromBody || tokenFromQuery;
  if (!token) {
    if (strict) res.status(401).json({ error: "missing token" });
    return null;
  }
  function decodeJwtPayload(jwt) {
    try {
      const parts = String(jwt).split(".");
      if (parts.length < 2) return null;
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
      const json = Buffer.from(padded, "base64").toString("utf8");
      const payload = JSON.parse(json);
      return payload && typeof payload === "object" ? payload : null;
    } catch {
      return null;
    }
  }
  try {
    if (admin?.auth && token) {
      const decoded = await admin.auth().verifyIdToken(token);
      return {
        uid: String(decoded.uid || decoded.user_id || ""),
        email: String(decoded.email || ""),
        name: String(decoded.name || ""),
        token
      };
    }
  } catch (err) {
    // fall through to permissive fallback below
    if (strict && String(err?.message || "").toLowerCase().includes("invalid")) {
      // continue to fallback
    }
  }
  try {
    const payload = decodeJwtPayload(token);
    const uid = String(
      payload?.uid
      || payload?.user_id
      || payload?.userId
      || payload?.sub
      || req.body?.playerId
      || req.query?.playerId
      || ""
    ).trim();
    if (uid) {
      return {
        uid,
        email: String(payload?.email || ""),
        name: String(payload?.name || ""),
        unverified: true,
        token
      };
    }
    if (strict) res.status(401).json({ error: "invalid token" });
    return null;
  } catch (err) {
    if (strict) res.status(401).json({ error: "invalid token" });
    console.error("verifyAuth failed", err?.message || err);
    return null;
  }
}

function firstFreeSlot(serverState) {
  pruneDisconnectedSlots(serverState);
  const used = new Set();
  for (const raw of serverState.activeSlots.values()) {
    const slot = normalizeServerSlot(raw);
    if (slot !== null) used.add(slot);
  }
  for (let slot = 0; slot < MAX_SERVER_SLOTS; slot += 1) {
    if (!used.has(slot)) return slot;
  }
  return MAX_SERVER_SLOTS - 1;
}

async function claimSlot(serverState, playerId, savedSlot) {
  pruneDisconnectedSlots(serverState);
  const existing = normalizeServerSlot(serverState.activeSlots.get(playerId));
  if (existing !== null) {
    serverState.activeSlots.set(playerId, existing);
    return existing;
  }
  const saved = normalizeServerSlot(savedSlot);
  if (saved !== null && ![...serverState.activeSlots.values()].includes(saved)) {
    serverState.activeSlots.set(playerId, saved);
    return saved;
  }
  const slot = firstFreeSlot(serverState);
  serverState.activeSlots.set(playerId, slot);
  return slot;
}

function normalizeServerSlot(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < 0 || i >= MAX_SERVER_SLOTS) return null;
  return i;
}

function pruneDisconnectedSlots(serverState) {
  if (!serverState || !(serverState.activeSlots instanceof Map)) return;
  for (const [pid] of serverState.activeSlots.entries()) {
    const ws = serverState.socketsByPlayer.get(pid);
    if (ws && ws.readyState === WebSocket.OPEN) continue;
    serverState.activeSlots.delete(pid);
    serverState.activePositions.delete(pid);
    serverState.activeProfiles.delete(pid);
    serverState.activeSnapshots.delete(pid);
    serverState.stunUntilByPlayer.delete(pid);
    serverState.batCooldownUntilByPlayer.delete(pid);
  }
}

function normalizeSpawnDrop(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: String(raw.id || ""),
    serverId: cleanServerId(raw.serverId || DEFAULT_SERVER_ID),
    name: String(raw.name || "Creature").slice(0, 48),
    rankKey: normalizeRankKey(raw.rankKey || "basic"),
    rate: Math.max(1, Number(raw.rate || 1)),
    mutation: normalizeMutation(raw.mutation || "normal"),
    x: Number(raw.x || SPAWN_DROP_CENTER.x),
    z: Number(raw.z || SPAWN_DROP_CENTER.z),
    spawnedAt: Number(raw.spawnedAt || Date.now())
  };
}

function listSpawnDrops(serverState) {
  const drops = [];
  for (const raw of (serverState?.spawnDrops instanceof Map ? serverState.spawnDrops.values() : [])) {
    const drop = normalizeSpawnDrop(raw);
    if (drop && drop.id) drops.push(drop);
  }
  drops.sort((a, b) => Number(a.spawnedAt || 0) - Number(b.spawnedAt || 0));
  return drops;
}

function nextSpawnDropPosition(serverState) {
  const idx = Math.max(0, Number(serverState?.spawnDrops?.size || 0));
  const angle = ((Date.now() / 70) + idx * 56) * (Math.PI / 180);
  const ring = 1.3 + (idx % 3) * 0.4;
  return {
    x: Number(SPAWN_DROP_CENTER.x + Math.cos(angle) * ring),
    z: Number(SPAWN_DROP_CENTER.z + Math.sin(angle) * ring)
  };
}

function addSpawnDrop(serverState, creatureSpec, mutation = "normal") {
  if (!serverState || !creatureSpec || typeof creatureSpec !== "object") return null;
  const pos = nextSpawnDropPosition(serverState);
  const drop = {
    id: `sp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    serverId: serverState.id,
    name: String(creatureSpec.name || "Creature"),
    rankKey: normalizeRankKey(creatureSpec.rankKey || "basic"),
    rate: Math.max(1, Number(creatureSpec.rate || 1)),
    mutation: normalizeMutation(mutation || "normal"),
    x: pos.x,
    z: pos.z,
    spawnedAt: Date.now()
  };
  serverState.spawnDrops.set(drop.id, drop);
  return normalizeSpawnDrop(drop);
}

function getBaseLockUntil(serverState, playerId, nowSec = Date.now() / 1000) {
  if (!serverState || !(serverState.baseLockUntilByPlayer instanceof Map)) return 0;
  const pid = String(playerId || "");
  if (!pid) return 0;
  const until = Number(serverState.baseLockUntilByPlayer.get(pid) || 0);
  if (until > nowSec) return until;
  if (until > 0) serverState.baseLockUntilByPlayer.delete(pid);
  return 0;
}

function pruneBaseLocks(serverState, nowSec = Date.now() / 1000) {
  if (!serverState || !(serverState.baseLockUntilByPlayer instanceof Map)) return false;
  let changed = false;
  for (const [pid, untilRaw] of serverState.baseLockUntilByPlayer.entries()) {
    const until = Number(untilRaw || 0);
    if (until > nowSec) continue;
    serverState.baseLockUntilByPlayer.delete(pid);
    changed = true;
  }
  return changed;
}

function listActiveBaseLocks(serverState, nowSec = Date.now() / 1000) {
  const out = [];
  if (!serverState || !(serverState.baseLockUntilByPlayer instanceof Map)) return out;
  for (const [pid, untilRaw] of serverState.baseLockUntilByPlayer.entries()) {
    const until = Number(untilRaw || 0);
    if (until <= nowSec) continue;
    if (serverState.activeSlots instanceof Map && !serverState.activeSlots.has(pid)) continue;
    out.push({ playerId: String(pid), until });
  }
  out.sort((a, b) => Number(a.until || 0) - Number(b.until || 0));
  return out;
}

function worldPayload(serverState) {
  return {
    type: "world",
    serverId: serverState.id,
    serverLuck: Number(serverState.serverLuck || 1),
    forcedBlueMoonUntil: Number(serverState.forcedBlueMoonUntil || 0),
    forcedBlueMoonEventId: String(serverState.forcedBlueMoonEventId || ""),
    spawnDrops: listSpawnDrops(serverState),
    lockedBases: listActiveBaseLocks(serverState),
    occupiedSlots: [...serverState.activeSlots.values()].sort((a, b) => a - b),
    players: [...serverState.activeSlots.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([playerId, slot]) => {
        const p = serverState.activePositions.get(playerId) || { x: slot * 26, z: 11, yaw: 0 };
        const profile = serverState.activeProfiles.get(playerId) || {};
        const tag = profile.username ? String(profile.username) : playerTag(playerId);
        return { playerId, slot, tag, x: p.x, z: p.z, yaw: p.yaw, username: profile.username || "" };
      })
  };
}

function buildWorldSnapshot(data) {
  const src = data && typeof data === "object" ? data : {};
  const plotsIn = Array.isArray(src.plots) ? src.plots : [];
  const pedIn = Array.isArray(src.pedestals) ? src.pedestals : [];
  const creaturesIn = Array.isArray(src.creatures) ? src.creatures : [];
  const maxPedestals = Math.max(PEDESTALS_PER_FLOOR, maxPedestalsForData(src));
  const plots = plotsIn.slice(0, 24).map((p) => {
    const stageRaw = Number(p?.stage || 0);
    const stage = stageRaw === 2 ? 2 : (stageRaw === 1 ? 1 : 0);
    return {
      stage,
      seedRankKey: normalizeRankKey(p?.seedRankKey || "basic"),
      plantedAt: Number(p?.plantedAt || 0),
      growDuration: Number(p?.growDuration || 0),
      blueMoon: !!p?.blueMoon
    };
  });
  const pedestals = pedIn.slice(0, maxPedestals).map((p) => ({
    hasBlock: !!p?.hasBlock,
    blockRankKey: normalizeRankKey(p?.blockRankKey || "basic"),
    blockMutation: normalizeMutation(p?.blockMutation || (p?.blockBlueMoon ? "bluemoon" : "normal")),
    blockBlueMoon: normalizeMutation(p?.blockMutation || (p?.blockBlueMoon ? "bluemoon" : "normal")) === "bluemoon",
    creatureId: String(p?.creatureId || "")
  }));
  const creatures = creaturesIn.slice(0, Math.max(48, maxPedestals * 3)).map((c) => ({
    id: String(c?.id || ""),
    name: String(c?.name || "Creature").slice(0, 40),
    rankKey: normalizeRankKey(c?.rankKey || "basic"),
    rate: Number(c?.rate || 0),
    mutation: normalizeMutation(c?.mutation || (c?.blueMoon ? "bluemoon" : "normal")),
    blueMoon: normalizeMutation(c?.mutation || (c?.blueMoon ? "bluemoon" : "normal")) === "bluemoon",
    pedestalId: String(c?.pedestalId || "")
  }));
  return {
    updatedAt: Date.now(),
    plots,
    pedestals,
    creatures
  };
}

function stateSyncPayload(serverState, singlePlayerId = "") {
  const entries = [];
  if (singlePlayerId) {
    const slot = serverState.activeSlots.get(singlePlayerId);
    if (Number.isInteger(slot)) {
      entries.push({
        playerId: singlePlayerId,
        slot,
        snapshot: deepClone(serverState.activeSnapshots.get(singlePlayerId) || null)
      });
    }
  } else {
    for (const [playerId, slot] of serverState.activeSlots.entries()) {
      entries.push({
        playerId,
        slot,
        snapshot: deepClone(serverState.activeSnapshots.get(playerId) || null)
      });
    }
    entries.sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0));
  }
  return { type: "state-sync", serverId: serverState.id, snapshots: entries };
}

function broadcastWorld(serverState) {
  const msg = JSON.stringify(worldPayload(serverState));
  for (const ws of serverState.socketsByPlayer.values()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function broadcastStateSync(serverState, singlePlayerId = "") {
  const payload = stateSyncPayload(serverState, singlePlayerId);
  const msg = JSON.stringify(payload);
  for (const ws of serverState.socketsByPlayer.values()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function notifyPlayer(serverState, playerId, payload) {
  const ws = serverState.socketsByPlayer.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function findActiveStealByThief(serverState, thiefId) {
  for (const steal of serverState.activeSteals.values()) {
    if (String(steal?.thiefId || "") === String(thiefId || "")) return steal;
  }
  return null;
}

function findActiveStealByTarget(serverState, ownerId, pedestalIndex) {
  const owner = String(ownerId || "");
  const idx = Number(pedestalIndex);
  for (const steal of serverState.activeSteals.values()) {
    if (String(steal?.ownerId || "") === owner && Number(steal?.pedestalIndex || -1) === idx) return steal;
  }
  return null;
}

function carriedPayloadForClient(carry) {
  if (!carry || typeof carry !== "object") return null;
  const maxPedestals = Math.max(PEDESTALS_PER_FLOOR, Number(carry.maxPedestals || PEDESTALS_PER_FLOOR));
  return {
    id: String(carry.id || ""),
    thiefId: String(carry.thiefId || ""),
    ownerId: String(carry.ownerId || ""),
    serverId: String(carry.serverId || ""),
    itemType: String(carry.itemType || "block"),
    blockKey: normalizeRankKey(carry.blockKey || "basic"),
    mutation: normalizeMutation(carry.mutation || "normal"),
    sourcePedestalIndex: clampPedestalIndex(carry.sourcePedestalIndex || 0, maxPedestals),
    sourcePedestalId: pedestalIdFromIndex(clampPedestalIndex(carry.sourcePedestalIndex || 0, maxPedestals)),
    creature: carry.creature && typeof carry.creature === "object"
      ? {
        id: String(carry.creature.id || ""),
        name: String(carry.creature.name || "Creature"),
        rankKey: normalizeRankKey(carry.creature.rankKey || "basic"),
        rate: Number(carry.creature.rate || 0),
        mutation: normalizeMutation(carry.creature.mutation || "normal")
      }
      : null,
    grabbedAt: Number(carry.grabbedAt || Date.now())
  };
}

function findCarriedBySource(serverState, ownerId, pedestalIndex) {
  const owner = String(ownerId || "");
  const idx = Math.max(0, Math.floor(Number(pedestalIndex) || 0));
  for (const carry of serverState.carriedByThief.values()) {
    if (String(carry?.ownerId || "") === owner && Number(carry?.sourcePedestalIndex || -1) === idx) return carry;
  }
  return null;
}

async function returnCarriedToOwner(serverState, thiefId, reason = "hit", byPlayerId = "") {
  const thief = String(thiefId || "");
  if (!thief) return null;
  const carry = serverState.carriedByThief.get(thief);
  if (!carry) return null;
  const ownerId = String(carry.ownerId || "");
  if (!ownerId) {
    serverState.carriedByThief.delete(thief);
    if (String(carry.itemType || "block") === "creature" && carry.creature && typeof carry.creature === "object") {
      addSpawnDrop(serverState, {
        name: String(carry.creature.name || "Creature"),
        rankKey: normalizeRankKey(carry.creature.rankKey || carry.blockKey || "basic"),
        rate: Math.max(1, Number(carry.creature.rate || 1))
      }, normalizeMutation(carry.creature.mutation || carry.mutation || "normal"));
    }
    const payload = {
      type: "steal-return",
      reason: String(reason || "hit"),
      byPlayerId: String(byPlayerId || ""),
      ownerId: "",
      thiefId: thief,
      carry: carriedPayloadForClient(carry),
      at: Date.now()
    };
    notifyPlayer(serverState, thief, payload);
    broadcastWorld(serverState);
    return payload;
  }
  try {
    const ownerRaw = await getPlayerDoc(ownerId, null);
    const owner = ensurePlayerDataShape(ownerRaw, serverState.activeSlots.get(ownerId) ?? 0);
    if (!owner?.data || typeof owner.data !== "object") return null;

    const pedestals = ensurePedestalsArray(owner.data);
    const maxPedestals = Math.max(PEDESTALS_PER_FLOOR, pedestals.length || PEDESTALS_PER_FLOOR);
    const sourceIdx = clampPedestalIndex(carry.sourcePedestalIndex || 0, maxPedestals);
    let restoredToPedestal = false;
    let restoredPedestalIndex = sourceIdx;
    let restoredCreature = null;

    if (String(carry.itemType || "block") === "creature" && carry.creature && typeof carry.creature === "object") {
      const creature = {
        id: String(carry.creature.id || `c-${Date.now()}-${Math.random().toString(16).slice(2)}`),
        name: String(carry.creature.name || "Creature"),
        rankKey: normalizeRankKey(carry.creature.rankKey || carry.blockKey || "basic"),
        rate: Math.max(1, Number(carry.creature.rate || 1)),
        mutation: normalizeMutation(carry.creature.mutation || carry.mutation || "normal"),
        blueMoon: normalizeMutation(carry.creature.mutation || carry.mutation || "normal") === "bluemoon",
        pedestalId: null
      };
      let targetIdx = sourceIdx;
      const sourcePed = pedestals[targetIdx];
      if (!sourcePed || sourcePed.hasBlock || String(sourcePed.creatureId || "")) {
        targetIdx = pedestals.findIndex((p) => p && !p.hasBlock && !String(p.creatureId || ""));
      }
      if (targetIdx >= 0) {
        creature.pedestalId = pedestalIdFromIndex(targetIdx);
        pedestals[targetIdx] = {
          ...(pedestals[targetIdx] || {}),
          creatureId: creature.id,
          hasBlock: false,
          blockRankKey: null,
          blockBlueMoon: false,
          blockMutation: "normal"
        };
        restoredToPedestal = true;
        restoredPedestalIndex = targetIdx;
      } else {
        creature.pedestalId = null;
      }
      const creatures = Array.isArray(owner.data.creatures) ? owner.data.creatures : [];
      owner.data.creatures = creatures.filter((c) => String(c?.id || "") !== creature.id);
      owner.data.creatures.push(creature);
      restoredCreature = {
        id: creature.id,
        name: creature.name,
        rankKey: creature.rankKey,
        rate: creature.rate,
        mutation: creature.mutation
      };
    } else {
      const sourcePed = pedestals[sourceIdx];
      if (sourcePed && !sourcePed.hasBlock && !String(sourcePed.creatureId || "")) {
        pedestals[sourceIdx] = {
          ...sourcePed,
          hasBlock: true,
          blockRankKey: normalizeRankKey(carry.blockKey || "basic"),
          blockBlueMoon: normalizeMutation(carry.mutation || "normal") === "bluemoon",
          blockMutation: normalizeMutation(carry.mutation || "normal")
        };
        restoredToPedestal = true;
        restoredPedestalIndex = sourceIdx;
      } else if (normalizeMutation(carry.mutation || "normal") === "bluemoon") {
        if (!owner.data.state.luckyMoonInventory || typeof owner.data.state.luckyMoonInventory !== "object") owner.data.state.luckyMoonInventory = {};
        const key = normalizeRankKey(carry.blockKey || "basic");
        owner.data.state.luckyMoonInventory[key] = parsePositiveInt(owner.data.state.luckyMoonInventory[key] || 0, 0) + 1;
      } else if (normalizeMutation(carry.mutation || "normal") === "soulbound") {
        if (!owner.data.state.luckySoulboundInventory || typeof owner.data.state.luckySoulboundInventory !== "object") owner.data.state.luckySoulboundInventory = {};
        const key = normalizeRankKey(carry.blockKey || "basic");
        owner.data.state.luckySoulboundInventory[key] = parsePositiveInt(owner.data.state.luckySoulboundInventory[key] || 0, 0) + 1;
      } else {
        addLuckyByRank(owner.data.state, carry.blockKey || "basic", 1);
      }
    }

    owner.data.pedestals = pedestals;
    await setPlayerDocMerge(ownerId, { data: owner.data, updatedAt: Date.now() }, null, { strict: true });
    serverState.activeSnapshots.set(ownerId, buildWorldSnapshot(owner.data || {}));
    if (restoredPedestalIndex !== sourceIdx) unlockRecentlyStolenPedestal(serverState, ownerId, sourceIdx);
    lockRecentlyStolenPedestal(serverState, ownerId, restoredPedestalIndex, {
      mode: restoredToPedestal ? "restore" : "stolen",
      ttlMs: restoredToPedestal ? 20000 : 12000,
      maxPedestals,
      itemType: carry.itemType || "block",
      blockKey: carry.blockKey || "basic",
      mutation: carry.mutation || "normal",
      creatureId: restoredCreature?.id || carry.creature?.id || "",
      creature: restoredCreature
    });
    serverState.carriedByThief.delete(thief);

    const payload = {
      type: "steal-return",
      reason: String(reason || "hit"),
      byPlayerId: String(byPlayerId || ""),
      ownerId,
      thiefId: thief,
      carry: carriedPayloadForClient(carry),
      at: Date.now()
    };
    notifyPlayer(serverState, ownerId, payload);
    notifyPlayer(serverState, thief, payload);
    broadcastStateSync(serverState);
    return payload;
  } catch (err) {
    console.error("returnCarriedToOwner failed", err?.message || err);
    return null;
  }
}

async function secureCarriedToThief(serverState, thiefId, pedestalIndex) {
  const thief = String(thiefId || "");
  if (!thief) return { ok: false, error: "invalid thief" };
  const carry = serverState.carriedByThief.get(thief);
  if (!carry) return { ok: false, error: "no carried item" };

  const thiefRaw = await getPlayerDoc(thief, null);
  const thiefDoc = ensurePlayerDataShape(thiefRaw, serverState.activeSlots.get(thief) ?? 0);
  if (!thiefDoc?.data || typeof thiefDoc.data !== "object") return { ok: false, error: "missing thief data" };

  const pedestals = ensurePedestalsArray(thiefDoc.data);
  const idx = clampPedestalIndex(pedestalIndex, pedestals.length);
  const targetPed = pedestals[idx];
  if (!targetPed || targetPed.hasBlock || String(targetPed.creatureId || "")) {
    return { ok: false, error: "pedestal occupied" };
  }

  if (String(carry.itemType || "block") === "creature" && carry.creature && typeof carry.creature === "object") {
    const creatures = Array.isArray(thiefDoc.data.creatures) ? thiefDoc.data.creatures : [];
    let creatureId = String(carry.creature.id || "");
    if (!creatureId || creatures.some((c) => String(c?.id || "") === creatureId)) {
      creatureId = `c-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    const creature = {
      id: creatureId,
      name: String(carry.creature.name || "Creature"),
      rankKey: normalizeRankKey(carry.creature.rankKey || carry.blockKey || "basic"),
      rate: Math.max(1, Number(carry.creature.rate || 1)),
      mutation: normalizeMutation(carry.creature.mutation || carry.mutation || "normal"),
      blueMoon: normalizeMutation(carry.creature.mutation || carry.mutation || "normal") === "bluemoon",
      pedestalId: pedestalIdFromIndex(idx)
    };
    thiefDoc.data.creatures = creatures.filter((c) => String(c?.id || "") !== creature.id);
    thiefDoc.data.creatures.push(creature);
    pedestals[idx] = {
      ...targetPed,
      creatureId: creature.id,
      hasBlock: false,
      blockRankKey: null,
      blockBlueMoon: false,
      blockMutation: "normal"
    };
  } else {
    pedestals[idx] = {
      ...targetPed,
      hasBlock: true,
      blockRankKey: normalizeRankKey(carry.blockKey || "basic"),
      blockBlueMoon: normalizeMutation(carry.mutation || "normal") === "bluemoon",
      blockMutation: normalizeMutation(carry.mutation || "normal"),
      creatureId: ""
    };
  }

  thiefDoc.data.pedestals = pedestals;
  await setPlayerDocMerge(thief, { data: thiefDoc.data, updatedAt: Date.now() }, null, { strict: true });
  serverState.activeSnapshots.set(thief, buildWorldSnapshot(thiefDoc.data || {}));
  serverState.carriedByThief.delete(thief);

  const payload = {
    type: "steal-secure",
    reason: "deposited",
    ownerId: String(carry.ownerId || ""),
    thiefId: thief,
    pedestalIndex: idx,
    carry: carriedPayloadForClient(carry),
    at: Date.now()
  };
  notifyPlayer(serverState, thief, payload);
  notifyPlayer(serverState, String(carry.ownerId || ""), payload);
  broadcastStateSync(serverState);
  return { ok: true, payload };
}

function cancelSteal(serverState, steal, reason = "canceled", byPlayerId = "") {
  if (!steal || !serverState.activeSteals.has(steal.id)) return;
  serverState.activeSteals.delete(steal.id);
  const payload = {
    type: "steal-cancel",
    stealId: steal.id,
    reason: String(reason || "canceled"),
    ownerId: steal.ownerId,
    thiefId: steal.thiefId,
    pedestalIndex: steal.pedestalIndex,
    byPlayerId: String(byPlayerId || ""),
    at: Date.now()
  };
  notifyPlayer(serverState, steal.thiefId, payload);
  notifyPlayer(serverState, steal.ownerId, payload);
}

async function completeSteal(serverState, steal) {
  if (!steal || !serverState.activeSteals.has(steal.id)) return;
  const ownerId = String(steal.ownerId || "");
  const thiefId = String(steal.thiefId || "");
  const pedIndexRaw = Number(steal.pedestalIndex || 0);

  const ownerSnap = serverState.activeSnapshots.get(ownerId) || { pedestals: [] };
  const pedIndex = clampPedestalIndex(pedIndexRaw, Math.max(PEDESTALS_PER_FLOOR, (ownerSnap.pedestals || []).length || PEDESTALS_PER_FLOOR));
  const itemType = String(steal.itemType || "block");
  const blockKey = normalizeRankKey(steal.blockRankKey || "basic");
  const mutation = normalizeMutation(steal.blockMutation || "normal");
  const wantedCreatureId = String(steal.creatureId || "");

  try {
    if (serverState.carriedByThief.has(thiefId)) {
      cancelSteal(serverState, steal, "already-carrying");
      return;
    }
    const ownerDocRaw = await getPlayerDoc(ownerId, null);
    const owner = ensurePlayerDataShape(ownerDocRaw, serverState.activeSlots.get(ownerId) ?? 0);
    if (!owner?.data) {
      cancelSteal(serverState, steal, "failed");
      return;
    }

    const ownerPedestals = ensurePedestalsArray(owner.data);
    const maxPedestals = Math.max(PEDESTALS_PER_FLOOR, ownerPedestals.length || PEDESTALS_PER_FLOOR);
    const carry = {
      id: `car-${steal.id}`,
      serverId: serverState.id,
      ownerId,
      thiefId,
      sourcePedestalIndex: pedIndex,
      sourcePedestalId: pedestalIdFromIndex(pedIndex),
      maxPedestals,
      itemType,
      blockKey,
      mutation,
      creature: null,
      grabbedAt: Date.now()
    };
    let sourceCreatureId = "";
    if (itemType === "creature") {
      const pedId = pedestalIdFromIndex(pedIndex);
      const liveByPedestal = Array.isArray(owner.data.creatures)
        ? owner.data.creatures.find((c) => String(c?.pedestalId || "") === pedId)
        : null;
      if (wantedCreatureId && (!liveByPedestal || String(liveByPedestal.id || "") !== wantedCreatureId)) {
        cancelSteal(serverState, steal, "changed");
        return;
      }
      let picked = wantedCreatureId ? removeCreatureFromData(owner.data, wantedCreatureId) : null;
      if (!picked) picked = removeCreatureFromPedestalId(owner.data, pedId);
      if (!picked && liveByPedestal && String(liveByPedestal.id || "").trim()) {
        picked = removeCreatureFromData(owner.data, String(liveByPedestal.id || ""));
      }
      if (!picked) {
        cancelSteal(serverState, steal, "missing");
        return;
      }
      if (!String(picked.id || "").trim()) {
        picked.id = `c-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }
      sourceCreatureId = String(picked.id || wantedCreatureId || "");
      const pickedMutation = normalizeMutation(picked.mutation || mutation || "normal");
      carry.creature = {
        id: String(picked.id || ""),
        name: String(picked.name || steal.creatureName || "Creature"),
        rankKey: normalizeRankKey(picked.rankKey || blockKey || "basic"),
        rate: Math.max(1, Number(picked.rate || steal.creatureRate || 1)),
        mutation: pickedMutation
      };
    } else {
      const livePed = ownerPedestals[pedIndex];
      const liveKey = normalizeRankKey(livePed?.blockRankKey || "basic");
      const liveMutation = normalizeMutation(livePed?.blockMutation || (livePed?.blockBlueMoon ? "bluemoon" : "normal"));
      if (!livePed || !livePed.hasBlock) {
        cancelSteal(serverState, steal, "missing");
        return;
      }
      if (liveKey !== blockKey || liveMutation !== mutation) {
        cancelSteal(serverState, steal, "changed");
        return;
      }
      if (!ownerPedestals[pedIndex] || !ownerPedestals[pedIndex].hasBlock) {
        cancelSteal(serverState, steal, "missing");
        return;
      }
      ownerPedestals[pedIndex] = {
        ...ownerPedestals[pedIndex],
        hasBlock: false,
        blockRankKey: null,
        blockBlueMoon: false,
        blockMutation: "normal"
      };
    }

    owner.data.pedestals = ownerPedestals;
    await setPlayerDocMerge(ownerId, { data: owner.data, updatedAt: Date.now() }, null, { strict: true });
    lockRecentlyStolenPedestal(serverState, ownerId, pedIndex, {
      mode: "stolen",
      maxPedestals,
      itemType,
      blockKey,
      mutation,
      creatureId: sourceCreatureId
    });
    serverState.activeSnapshots.set(ownerId, buildWorldSnapshot(owner.data || {}));
    serverState.carriedByThief.set(thiefId, carry);
    serverState.activeSteals.delete(steal.id);

    const payload = {
      type: "steal-grab",
      stealId: steal.id,
      ownerId,
      thiefId,
      pedestalIndex: pedIndex,
      sourceCreatureId,
      carry: carriedPayloadForClient(carry),
      at: Date.now()
    };
    notifyPlayer(serverState, thiefId, payload);
    notifyPlayer(serverState, ownerId, payload);
    broadcastStateSync(serverState);
  } catch (err) {
    console.error("completeSteal failed", err?.message || err);
    cancelSteal(serverState, steal, "failed");
  }
}

async function processServerSteals(serverState) {
  if (!serverState || serverState.stealTickBusy) return;
  const nowMs = Date.now();
  const nowSec = nowMs / 1000;
  const lockPruned = pruneBaseLocks(serverState, nowSec);
  if (!serverState.activeSteals || serverState.activeSteals.size < 1) {
    if (lockPruned) broadcastWorld(serverState);
    return;
  }
  serverState.stealTickBusy = true;
  try {
    const steals = [...serverState.activeSteals.values()];
    for (const steal of steals) {
      if (!serverState.activeSteals.has(steal.id)) continue;
      const thiefId = String(steal.thiefId || "");
      const ownerId = String(steal.ownerId || "");
      const pedIndex = Number(steal.pedestalIndex || 0);
      const lastProgressAt = Number(steal.lastProgressAt || steal.startAt || nowMs);
      const elapsedMs = Math.max(0, nowMs - lastProgressAt);
      steal.lastProgressAt = nowMs;
      const stunnedUntil = Number(serverState.stunUntilByPlayer.get(thiefId) || 0);
      if (stunnedUntil > nowSec) {
        cancelSteal(serverState, steal, "stunned");
        continue;
      }
      if (!serverState.activeSlots.has(thiefId) || !serverState.activeSlots.has(ownerId)) {
        cancelSteal(serverState, steal, "offline");
        continue;
      }

      const ownerSnap = serverState.activeSnapshots.get(ownerId);
      const target = resolveStealTargetFromSnapshot(ownerSnap, pedIndex);
      if (!target) {
        cancelSteal(serverState, steal, "missing");
        continue;
      }
      const currentType = String(target.itemType || "block");
      const currentKey = normalizeRankKey(target.rankKey || "basic");
      const currentMutation = normalizeMutation(target.mutation || "normal");
      if (currentType !== String(steal.itemType || "block")
        || currentKey !== normalizeRankKey(steal.blockRankKey || "basic")
        || currentMutation !== normalizeMutation(steal.blockMutation || "normal")) {
        cancelSteal(serverState, steal, "changed");
        continue;
      }
      if (currentType === "creature"
        && String(steal.creatureId || "")
        && String(target.creatureId || "") !== String(steal.creatureId || "")) {
        cancelSteal(serverState, steal, "changed");
        continue;
      }

      let pauseReason = "";
      const ownerLockUntil = getBaseLockUntil(serverState, ownerId, nowSec);
      if (ownerLockUntil > nowSec) pauseReason = "locked";
      const thiefPos = serverState.activePositions.get(thiefId) || null;
      const ownerSlot = serverState.activeSlots.get(ownerId) ?? 0;
      const pedPos = pedestalPositionForSlot(ownerSlot, pedIndex);
      if (!thiefPos || distance2d(thiefPos.x, thiefPos.z, pedPos.x, pedPos.z) > 2.55) {
        pauseReason = "distance";
      }

      const baseRemainingMs = Number.isFinite(Number(steal.remainingMs))
        ? Number(steal.remainingMs)
        : Number(steal.durationSec || 2) * 1000;
      let remainingMs = Math.max(0, baseRemainingMs);
      if (!pauseReason) {
        remainingMs = Math.max(0, remainingMs - elapsedMs);
      }
      steal.remainingMs = remainingMs;
      steal.endAt = nowMs + remainingMs;
      steal.paused = !!pauseReason;
      steal.pauseReason = pauseReason;

      const remainingSec = Math.ceil(remainingMs / 1000);
      const pauseTag = pauseReason || "";
      const changedProgress = Number(steal.lastNotifyRemainingSec) !== remainingSec
        || String(steal.lastNotifyPauseReason || "") !== pauseTag;
      if (changedProgress) {
        steal.lastNotifyRemainingSec = remainingSec;
        steal.lastNotifyPauseReason = pauseTag;
        const progressPayload = {
          type: "steal-progress",
          stealId: steal.id,
          ownerId,
          thiefId,
          remainingMs,
          paused: !!pauseReason,
          pauseReason,
          lockRemainingSec: pauseReason === "locked" ? Math.max(0, Math.ceil(ownerLockUntil - nowSec)) : 0,
          at: nowMs
        };
        notifyPlayer(serverState, thiefId, progressPayload);
        notifyPlayer(serverState, ownerId, progressPayload);
      }

      if (!pauseReason && remainingMs <= 0) {
        await completeSteal(serverState, steal);
      }
    }
  } finally {
    serverState.stealTickBusy = false;
  }
}

function broadcastAllServers(payload) {
  const msg = JSON.stringify(payload);
  for (const state of serverStates.values()) {
    for (const ws of state.socketsByPlayer.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  }
}

function isResetLocked(playerId) {
  const until = Number(resetSaveLocks.get(playerId) || 0);
  if (until <= 0) return false;
  if (Date.now() > until) {
    resetSaveLocks.delete(playerId);
    return false;
  }
  return true;
}

function parsePlayerDocAny(raw) {
  const data = sanitizeDocData(raw || {});
  if (typeof data[PLAYERS_BLOB_FIELD] === "string") {
    try {
      const parsed = JSON.parse(data[PLAYERS_BLOB_FIELD]);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // noop
    }
  }
  return data;
}

function getMoneyFromPlayerDoc(playerDoc) {
  const v = Number(playerDoc?.data?.state?.money || 0);
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}

function getUsernameFromPlayerDoc(playerDoc, playerId) {
  const raw = String(playerDoc?.profile?.username || "").trim();
  if (raw) return raw.slice(0, 24);
  return playerTag(playerId);
}

async function findPlayerIdByUsername(usernameRaw) {
  const wantedKey = usernameKey(usernameRaw);
  if (!wantedKey || wantedKey.length < 3) return "";

  for (const [pid, cached] of playerCache.entries()) {
    const key = usernameKey(cached?.profile?.username || "");
    if (key === wantedKey) return String(pid);
  }

  try {
    const snap = await db.collection(PLAYERS_COLLECTION_ID)
      .where("profile.usernameLower", "==", wantedKey)
      .limit(1)
      .get();
    const doc = snap.docs?.[0];
    if (doc?.id) return String(doc.id);
  } catch {
    // fallback scan below
  }

  try {
    const snap = await db.collection(PLAYERS_COLLECTION_ID).limit(3000).get();
    for (const d of snap.docs || []) {
      const pid = String(d.id || "");
      if (!pid) continue;
      const parsed = ensurePlayerDataShape(parsePlayerDocAny(d.data() || {}), 0);
      if (usernameKey(parsed?.profile?.username || "") === wantedKey) return pid;
    }
  } catch {
    // noop
  }
  return "";
}

function listWhitelistUsernames(serverState) {
  const items = [...(serverState?.whitelistUsernames instanceof Set ? serverState.whitelistUsernames : new Set())];
  return items
    .map((x) => cleanUsername(x))
    .filter((x) => x.length >= 3)
    .sort((a, b) => a.localeCompare(b));
}

function addWhitelistUsername(serverState, username) {
  if (!serverState || !(serverState.whitelistUsernames instanceof Set)) return;
  const clean = cleanUsername(username);
  if (clean.length < 3) return;
  for (const item of [...serverState.whitelistUsernames]) {
    if (usernameKey(item) === usernameKey(clean)) serverState.whitelistUsernames.delete(item);
  }
  serverState.whitelistUsernames.add(clean);
}

function removeWhitelistUsername(serverState, username) {
  if (!serverState || !(serverState.whitelistUsernames instanceof Set)) return;
  const key = usernameKey(username);
  if (!key) return;
  for (const item of [...serverState.whitelistUsernames]) {
    if (usernameKey(item) === key) serverState.whitelistUsernames.delete(item);
  }
}

async function computeCashLeaderboard(limit = 10) {
  const snap = await db.collection(PLAYERS_COLLECTION_ID).limit(1500).get();
  const rows = [];
  for (const d of snap.docs || []) {
    const playerId = String(d.id || "");
    if (!playerId) continue;
    const playerDoc = ensurePlayerDataShape(parsePlayerDocAny(d.data() || {}), 0);
    rows.push({
      playerId,
      username: getUsernameFromPlayerDoc(playerDoc, playerId),
      money: getMoneyFromPlayerDoc(playerDoc)
    });
  }
  rows.sort((a, b) => Number(b.money || 0) - Number(a.money || 0));
  return rows.slice(0, Math.max(1, Math.min(50, Number(limit) || 10)));
}

async function getCashLeaderboardCached(limit = 10) {
  const now = Date.now();
  const cacheFresh = Array.isArray(leaderboardCashCache.rows)
    && (now - Number(leaderboardCashCache.updatedAt || 0) < 20000);
  if (cacheFresh) return leaderboardCashCache.rows.slice(0, limit);
  if (leaderboardCashInFlight) return (leaderboardCashCache.rows || []).slice(0, limit);
  leaderboardCashInFlight = true;
  try {
    const rows = await computeCashLeaderboard(limit);
    leaderboardCashCache = { rows, updatedAt: Date.now() };
    return rows.slice(0, limit);
  } catch (err) {
    console.error("cash leaderboard degraded read", err?.message || err);
    return (leaderboardCashCache.rows || []).slice(0, limit);
  } finally {
    leaderboardCashInFlight = false;
  }
}

app.get("/api/auth/username/check", async (req, res) => {
  try {
    const username = cleanUsername(req.query?.username || req.body?.username || "");
    if (username.length < 3) {
      res.status(400).json({ error: "username must be at least 3 characters" });
      return;
    }
    const hitId = await findPlayerIdByUsername(username);
    res.json({ ok: true, username, available: !hitId, reason: hitId ? "taken" : "" });
  } catch (err) {
    console.error("/api/auth/username/check failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/auth/profile", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = String(decoded.uid || "").trim();
    if (!uid) {
      res.status(400).json({ error: "playerId required" });
      return;
    }
    const existing = ensurePlayerDataShape(await getPlayerDoc(uid, decoded || null), 0);
    const email = decoded?.email || String(existing?.profile?.email || "");
    const requestedUsername = cleanUsername(req.body?.username || "");
    const accountName = cleanUsername(decoded?.name || "");
    const currentUsername = cleanUsername(existing?.profile?.username || "");
    let desiredUsername = "";
    if (requestedUsername.length >= 3) {
      desiredUsername = requestedUsername;
    } else if (!currentUsername && accountName.length >= 3) {
      desiredUsername = accountName;
    }

    const desiredKey = usernameKey(desiredUsername);
    const currentKey = usernameKey(currentUsername);
    if (desiredUsername && desiredKey !== currentKey) {
      const ownerId = await findPlayerIdByUsername(desiredUsername);
      if (ownerId && String(ownerId) !== uid) {
        res.status(409).json({ error: "username already taken" });
        return;
      }
    }

    const profilePatch = { ...(existing.profile || {}), email, updatedAt: Date.now() };
    if (desiredUsername) {
      profilePatch.username = desiredUsername;
      profilePatch.usernameLower = usernameKey(desiredUsername);
    } else if (currentUsername) {
      profilePatch.username = currentUsername;
      profilePatch.usernameLower = usernameKey(currentUsername);
    }

    const merged = await setPlayerDocMerge(uid, { profile: profilePatch, updatedAt: Date.now() }, decoded || null);
    const profile = merged.profile || profilePatch;

    for (const state of serverStates.values()) {
      if (state.activeSlots.has(uid)) {
        state.activeProfiles.set(uid, profile);
        broadcastWorld(state);
      }
    }

    res.json({ ok: true, profile, isAdmin: isAdminProfile(profile) });
  } catch (err) {
    console.error("/api/auth/profile failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.get("/api/servers", async (req, res) => {
  const decoded = await verifyAuth(req, res);
  if (!decoded) return;
  const playerId = String(req.query?.playerId || decoded.uid || "").trim();
  if (!playerId || playerId !== decoded.uid) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  res.json({ servers: listServersForPlayer(playerId) });
});

app.post("/api/servers/create", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const playerId = String(req.body?.playerId || decoded?.uid || "").trim();
    if (!playerId) {
      res.status(400).json({ error: "playerId required" });
      return;
    }
    if (decoded && playerId !== decoded.uid) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const name = cleanServerName(req.body?.name || "Garden Server");
    const isPrivate = !!req.body?.isPrivate;
    const id = `srv-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
    const state = ensureServerState(id, { name, ownerId: playerId, isPrivate });
    res.json({ ok: true, server: serverTag(state, playerId), servers: listServersForPlayer(playerId) });
  } catch (err) {
    console.error("/api/servers/create failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.get("/api/servers/config", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = String(decoded.uid || "").trim();
    const serverId = cleanServerId(req.query?.serverId || DEFAULT_SERVER_ID);
    const state = ensureServerState(serverId, {});
    if (!state.isPrivate) {
      res.status(400).json({ error: "server is not private" });
      return;
    }
    if (String(state.ownerId || "") !== uid) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    res.json({
      ok: true,
      server: serverTag(state, uid),
      whitelist: listWhitelistUsernames(state)
    });
  } catch (err) {
    console.error("/api/servers/config failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/servers/config/add", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = String(decoded.uid || "").trim();
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const username = cleanUsername(req.body?.username || "");
    if (username.length < 3) {
      res.status(400).json({ error: "username must be at least 3 characters" });
      return;
    }
    const state = ensureServerState(serverId, {});
    if (!state.isPrivate) {
      res.status(400).json({ error: "server is not private" });
      return;
    }
    if (String(state.ownerId || "") !== uid) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const targetPlayerId = await findPlayerIdByUsername(username);
    if (!targetPlayerId) {
      res.status(404).json({ error: "username not found" });
      return;
    }
    if (String(targetPlayerId) === uid) {
      res.status(400).json({ error: "cannot invite yourself" });
      return;
    }
    state.whitelistPlayerIds.add(String(targetPlayerId));
    const targetDoc = ensurePlayerDataShape(await getPlayerDoc(targetPlayerId, decoded), 0);
    const canonical = cleanUsername(targetDoc?.profile?.username || username);
    addWhitelistUsername(state, canonical);
    res.json({
      ok: true,
      server: serverTag(state, uid),
      whitelist: listWhitelistUsernames(state),
      servers: listServersForPlayer(uid)
    });
  } catch (err) {
    console.error("/api/servers/config/add failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/servers/config/remove", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = String(decoded.uid || "").trim();
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const username = cleanUsername(req.body?.username || "");
    if (username.length < 3) {
      res.status(400).json({ error: "username must be at least 3 characters" });
      return;
    }
    const state = ensureServerState(serverId, {});
    if (!state.isPrivate) {
      res.status(400).json({ error: "server is not private" });
      return;
    }
    if (String(state.ownerId || "") !== uid) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const targetPlayerId = await findPlayerIdByUsername(username);
    if (targetPlayerId) state.whitelistPlayerIds.delete(String(targetPlayerId));
    removeWhitelistUsername(state, username);
    res.json({
      ok: true,
      server: serverTag(state, uid),
      whitelist: listWhitelistUsernames(state),
      servers: listServersForPlayer(uid)
    });
  } catch (err) {
    console.error("/api/servers/config/remove failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/join", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const playerId = String(req.body?.playerId || "").trim();
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const incomingProfile = req.body?.profile && typeof req.body.profile === "object" ? req.body.profile : null;
    if (!playerId) {
      res.status(400).json({ error: "playerId required" });
      return;
    }
    if (playerId !== decoded.uid) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const serverState = ensureServerState(serverId, {});
    if (!canAccessServer(serverState, playerId)) {
      res.status(403).json({ error: "private server" });
      return;
    }

    let existingRaw = null;
    try {
      existingRaw = await getPlayerDoc(playerId, decoded || null);
    } catch (readErr) {
      console.error("/api/join read degraded", readErr?.message || readErr);
      existingRaw = null;
    }
    const existing = ensurePlayerDataShape(existingRaw, 0);
    let profilePatch = null;
    if (incomingProfile) {
      const incomingUsername = String(incomingProfile.username || "").replace(/[^a-zA-Z0-9_ -]/g, "").slice(0, 24);
      const incomingEmail = String(incomingProfile.email || "");
      if (!existing.profile || !existing.profile.username || incomingUsername) {
        existing.profile = {
          ...(existing.profile || {}),
          username: incomingUsername || String(existing.profile?.username || "").slice(0, 24),
          email: incomingEmail || String(existing.profile?.email || "")
        };
        profilePatch = existing.profile;
      }
    }
    const savedSlot = Number(existing?.slots?.[serverId]);
    const slot = await claimSlot(serverState, playerId, savedSlot);
    serverState.activeProfiles.set(playerId, existing.profile || {});
    serverState.activeSnapshots.set(playerId, buildWorldSnapshot(existing.data || {}));

    if (!serverState.activePositions.has(playerId)) {
      const p = (existing.lastPosByServer && existing.lastPosByServer[serverId]) || existing.lastPos || { x: slot * 26, z: 11, yaw: 0 };
      serverState.activePositions.set(playerId, {
        x: Number.isFinite(Number(p.x)) ? Number(p.x) : slot * 26,
        z: Number.isFinite(Number(p.z)) ? Number(p.z) : 11,
        yaw: Number.isFinite(Number(p.yaw)) ? Number(p.yaw) : 0
      });
    }

    await setPlayerDocMerge(playerId, {
      slot,
      [`slots.${serverId}`]: slot,
      lastServerId: serverId,
      ...(profilePatch ? { profile: profilePatch } : {}),
      updatedAt: Date.now()
    }, decoded || null);

    const adminFromAuth = decoded
      && String(decoded.uid || "") === playerId
      && isAdminProfile({
        email: decoded.email || "",
        username: String(decoded.name || existing.profile?.username || "")
      });

    res.json({
      playerId,
      serverId,
      slot,
      data: existing.data || null,
      profile: existing.profile || {},
      isAdmin: adminFromAuth || isAdminProfile(existing.profile || {}),
      serverLuck: Number(serverState.serverLuck || 1),
      forcedBlueMoonUntil: Number(serverState.forcedBlueMoonUntil || 0),
      forcedBlueMoonEventId: String(serverState.forcedBlueMoonEventId || ""),
      baseLockUntil: Number(getBaseLockUntil(serverState, playerId) || 0),
      stunUntil: Number(serverState.stunUntilByPlayer.get(playerId) || 0),
      activeSteal: deepClone(findActiveStealByThief(serverState, playerId) || null),
      carried: carriedPayloadForClient(serverState.carriedByThief.get(playerId) || null),
      spawnDrops: worldPayload(serverState).spawnDrops,
      occupiedSlots: worldPayload(serverState).occupiedSlots,
      players: worldPayload(serverState).players,
      server: serverTag(serverState, playerId)
    });

    broadcastWorld(serverState);
    broadcastStateSync(serverState, playerId);
  } catch (err) {
    console.error("/api/join failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/save", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res, { strict: false });
    const playerId = String(req.body?.playerId || "").trim();
    const data = req.body?.data;
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const bodySlot = Number(req.body?.slot);
    if (!playerId || !data || typeof data !== "object") {
      res.status(400).json({ error: "playerId and data are required" });
      return;
    }
    if (decoded && playerId !== decoded.uid) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    if (isResetLocked(playerId)) {
      res.json({ ok: true, skipped: "reset-lock" });
      return;
    }

    const serverState = ensureServerState(serverId, {});
    const slot = Number.isInteger(bodySlot) ? bodySlot : (serverState.activeSlots.get(playerId) ?? 0);
    const pos = serverState.activePositions.get(playerId) || { x: slot * 26, z: 11, yaw: 0 };

    const guardedData = applyRecentStealSaveGuards(serverState, playerId, data);
    const safeData = ensurePlayerDataShape({ data: guardedData }, slot).data;
    await setPlayerDocMerge(playerId, {
      slot,
      data: safeData,
      [`slots.${serverId}`]: slot,
      [`lastPosByServer.${serverId}`]: pos,
      lastPos: pos,
      updatedAt: Date.now()
    }, decoded || null);
    serverState.activeSnapshots.set(playerId, buildWorldSnapshot(safeData));
    broadcastStateSync(serverState, playerId);

    res.json({ ok: true });
  } catch (err) {
    console.error("/api/save failed", err);
    if (err && err.firestoreTransient) {
      res.json({ ok: true, degraded: true });
      return;
    }
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/daily/claim", async (req, res) => {
  let lockKey = "";
  try {
    const decoded = await verifyAuth(req, res, { strict: false });
    const playerId = String(req.body?.playerId || "").trim();
    if (!playerId) {
      res.status(400).json({ error: "playerId required" });
      return;
    }
    if (decoded && playerId !== decoded.uid) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    lockKey = playerId;
    if (dailyClaimLocks.has(lockKey)) {
      res.json({ granted: false, claimedToday: true, locked: true });
      return;
    }
    dailyClaimLocks.add(lockKey);

    const player = ensurePlayerDataShape(await getPlayerDoc(playerId, decoded || null), 0);
    const nowDay = utcDayKey();
    const daily = player.daily || { streak: 0, lastClaimDay: "", totalClaims: 0 };
    const totalClaimsNow = parsePositiveInt(daily.totalClaims || 0, 0);
    const nextClaimNumber = totalClaimsNow + 1;
    const day = ((nextClaimNumber - 1) % 7) + 1;
    const week = Math.floor((nextClaimNumber - 1) / 7);
    const weekMultiplier = 1 + week * 0.1;
    const loop = DAILY_STARDUST_LOOP[day - 1] || DAILY_STARDUST_LOOP[0];
    const stardustReward = Math.max(1, Math.round(Number(loop.stardust || 0) * weekMultiplier));
    const luckyRankKey = String(loop.luckyRankKey || "");
    const luckyAmount = luckyRankKey ? 1 : 0;
    if (daily.lastClaimDay === nowDay) {
      res.json({
        granted: false,
        claimedToday: true,
        day,
        week,
        weekMultiplier,
        stardustReward,
        luckyRankKey,
        luckyAmount,
        totalClaims: totalClaimsNow,
        lastClaimDay: daily.lastClaimDay,
        stardustBalance: Number(player.data.state.stardust || 0)
      });
      return;
    }

    player.daily = { streak: day, lastClaimDay: nowDay, totalClaims: nextClaimNumber };
    player.data.state.stardust = Number(player.data.state.stardust || 0) + stardustReward;
    if (luckyRankKey && RANK_KEYS.has(normalizeRankKey(luckyRankKey))) {
      addLuckyByRank(player.data.state, luckyRankKey, luckyAmount);
    }

    await setPlayerDocMerge(playerId, {
      data: player.data,
      daily: player.daily,
      updatedAt: Date.now()
    }, decoded || null);

    const result = {
      granted: true,
      claimedToday: false,
      day,
      week,
      weekMultiplier,
      stardustReward,
      luckyRankKey,
      luckyAmount,
      totalClaims: nextClaimNumber,
      streak: day,
      lastClaimDay: nowDay,
      stardustBalance: Number(player.data.state.stardust || 0)
    };

    res.json(result);
  } catch (err) {
    console.error("/api/daily/claim failed", err);
    if (err && err.firestoreTransient) {
      res.json({ granted: false, degraded: true });
      return;
    }
    res.status(500).json({ error: "internal error" });
  } finally {
    if (lockKey) dailyClaimLocks.delete(lockKey);
  }
});

app.get("/api/players", async (req, res) => {
  const decoded = await verifyAuth(req, res);
  if (!decoded) return;
  const playerId = String(req.query?.playerId || "").trim();
  if (playerId && playerId !== decoded.uid) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const serverId = cleanServerId(req.query?.serverId || DEFAULT_SERVER_ID);
  const serverState = ensureServerState(serverId, {});
  const players = worldPayload(serverState).players;
  res.json({
    players: players.map((p) => ({
      playerId: p.playerId,
      slot: p.slot,
      tag: p.tag,
      x: p.x,
      z: p.z,
      yaw: p.yaw,
      nearby: playerId ? Math.abs((p.slot || 0) - (serverState.activeSlots.get(playerId) || 0)) <= 1 : false
    }))
  });
});

app.post("/api/steal/start", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const playerId = String(req.body?.playerId || "").trim();
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const ownerId = String(req.body?.ownerId || "").trim();
    const requestedPedestalIndex = Math.max(0, Math.floor(Number(req.body?.pedestalIndex || 0)));
    if (!playerId || !ownerId || playerId === ownerId) {
      res.status(400).json({ error: "invalid steal target" });
      return;
    }
    if (playerId !== decoded.uid) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const serverState = ensureServerState(serverId, {});
    if (!serverState.activeSlots.has(playerId) || !serverState.activeSlots.has(ownerId)) {
      res.status(400).json({ error: "players must be online in this server" });
      return;
    }
    const nowSec = Date.now() / 1000;
    if (Number(serverState.stunUntilByPlayer.get(playerId) || 0) > nowSec) {
      res.status(400).json({ error: "you are stunned" });
      return;
    }
    const existingOwn = findActiveStealByThief(serverState, playerId);
    if (existingOwn) {
      res.status(400).json({ error: "already stealing", stealId: existingOwn.id });
      return;
    }
    if (serverState.carriedByThief.has(playerId)) {
      res.status(400).json({ error: "deposit carried item first" });
      return;
    }
    const ownerSnap = serverState.activeSnapshots.get(ownerId) || {};
    const maxOwnerPedestals = Math.max(PEDESTALS_PER_FLOOR, Array.isArray(ownerSnap.pedestals) ? ownerSnap.pedestals.length : PEDESTALS_PER_FLOOR);
    const pedestalIndex = clampPedestalIndex(requestedPedestalIndex, maxOwnerPedestals);
    const existingTarget = findActiveStealByTarget(serverState, ownerId, pedestalIndex);
    if (existingTarget) {
      res.status(400).json({ error: "target already being stolen" });
      return;
    }
    const existingCarry = findCarriedBySource(serverState, ownerId, pedestalIndex);
    if (existingCarry) {
      res.status(400).json({ error: "target already stolen and being carried" });
      return;
    }

    const thiefPos = serverState.activePositions.get(playerId) || null;
    const ownerSlot = serverState.activeSlots.get(ownerId) ?? 0;
    const pedPos = pedestalPositionForSlot(ownerSlot, pedestalIndex);
    if (!thiefPos || distance2d(thiefPos.x, thiefPos.z, pedPos.x, pedPos.z) > 2.55) {
      res.status(400).json({ error: "too far from target" });
      return;
    }
    const ownerLockUntil = getBaseLockUntil(serverState, ownerId, nowSec);
    if (ownerLockUntil > nowSec) {
      res.status(400).json({
        error: "target base is locked",
        lockRemainingSec: Math.max(0, Math.ceil(ownerLockUntil - nowSec))
      });
      return;
    }

    const target = resolveStealTargetFromSnapshot(ownerSnap, pedestalIndex);
    if (!target) {
      res.status(400).json({ error: "target not available" });
      return;
    }
    const rankKey = normalizeRankKey(target.rankKey || "basic");
    const mutation = normalizeMutation(target.mutation || "normal");
    const durationSec = getStealTimeForRank(rankKey);
    const startAt = Date.now();
    const steal = {
      id: `st-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      serverId,
      thiefId: playerId,
      ownerId,
      pedestalIndex,
      itemType: String(target.itemType || "block"),
      blockRankKey: rankKey,
      blockMutation: mutation,
      creatureId: String(target.creatureId || ""),
      creatureName: String(target.creatureName || ""),
      creatureRate: Number(target.creatureRate || 0),
      durationSec,
      startAt,
      endAt: startAt + durationSec * 1000,
      remainingMs: durationSec * 1000,
      paused: false,
      pauseReason: "",
      lastProgressAt: startAt,
      lastNotifyRemainingSec: Math.ceil(durationSec),
      lastNotifyPauseReason: ""
    };
    serverState.activeSteals.set(steal.id, steal);
    notifyPlayer(serverState, playerId, { type: "steal-start", steal });
    notifyPlayer(serverState, ownerId, { type: "steal-alert", steal });
    res.json({ ok: true, steal });
  } catch (err) {
    console.error("/api/steal/start failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/spawn/grab", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const playerId = String(req.body?.playerId || "").trim();
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const spawnId = String(req.body?.spawnId || "").trim();
    if (!playerId || !spawnId || playerId !== decoded.uid) {
      res.status(400).json({ error: "invalid spawn grab payload" });
      return;
    }
    const serverState = ensureServerState(serverId, {});
    if (!serverState.activeSlots.has(playerId)) {
      res.status(400).json({ error: "player not online in this server" });
      return;
    }
    if (serverState.carriedByThief.has(playerId)) {
      res.status(400).json({ error: "deposit carried item first" });
      return;
    }
    if (findActiveStealByThief(serverState, playerId)) {
      res.status(400).json({ error: "already stealing" });
      return;
    }
    const drop = normalizeSpawnDrop(serverState.spawnDrops.get(spawnId) || null);
    if (!drop) {
      res.status(404).json({ error: "spawn not found" });
      return;
    }
    const playerPos = serverState.activePositions.get(playerId) || null;
    if (!playerPos || distance2d(playerPos.x, playerPos.z, drop.x, drop.z) > 2.65) {
      res.status(400).json({ error: "too far from spawn creature" });
      return;
    }

    serverState.spawnDrops.delete(spawnId);
    const carry = {
      id: `car-${spawnId}`,
      serverId,
      ownerId: "",
      thiefId: playerId,
      sourcePedestalIndex: -1,
      sourcePedestalId: "spawn",
      maxPedestals: PEDESTALS_PER_FLOOR,
      itemType: "creature",
      blockKey: normalizeRankKey(drop.rankKey || "basic"),
      mutation: normalizeMutation(drop.mutation || "normal"),
      creature: {
        id: `spawn-${spawnId}`,
        name: String(drop.name || "Creature"),
        rankKey: normalizeRankKey(drop.rankKey || "basic"),
        rate: Math.max(1, Number(drop.rate || 1)),
        mutation: normalizeMutation(drop.mutation || "normal")
      },
      grabbedAt: Date.now()
    };
    serverState.carriedByThief.set(playerId, carry);

    const payload = {
      type: "steal-grab",
      stealId: "",
      ownerId: "",
      thiefId: playerId,
      pedestalIndex: -1,
      sourceCreatureId: String(carry.creature.id || ""),
      carry: carriedPayloadForClient(carry),
      at: Date.now()
    };
    notifyPlayer(serverState, playerId, payload);
    broadcastWorld(serverState);

    res.json({ ok: true, ...payload });
  } catch (err) {
    console.error("/api/spawn/grab failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

async function handleStealDeposit(req, res) {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const playerId = String(req.body?.playerId || "").trim();
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const requestedPedestalIndex = Math.max(0, Math.floor(Number(req.body?.pedestalIndex || 0)));
    if (!playerId || playerId !== decoded.uid) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const serverState = ensureServerState(serverId, {});
    if (!serverState.activeSlots.has(playerId)) {
      res.status(400).json({ error: "player not online in this server" });
      return;
    }
    if (!serverState.carriedByThief.has(playerId)) {
      res.status(400).json({ error: "no carried item" });
      return;
    }
    const playerDoc = ensurePlayerDataShape(await getPlayerDoc(playerId, null), serverState.activeSlots.get(playerId) ?? 0);
    const pedestals = ensurePedestalsArray(playerDoc.data || {});
    const pedestalIndex = clampPedestalIndex(requestedPedestalIndex, pedestals.length);
    const playerPos = serverState.activePositions.get(playerId) || null;
    const bodyX = Number(req.body?.x);
    const bodyZ = Number(req.body?.z);
    const bodyPos = (Number.isFinite(bodyX) && Number.isFinite(bodyZ)) ? { x: bodyX, z: bodyZ } : null;
    const ownSlot = serverState.activeSlots.get(playerId) ?? 0;
    const pedPos = pedestalPositionForSlot(ownSlot, pedestalIndex);
    const dServer = playerPos ? distance2d(playerPos.x, playerPos.z, pedPos.x, pedPos.z) : Infinity;
    const dBody = bodyPos ? distance2d(bodyPos.x, bodyPos.z, pedPos.x, pedPos.z) : Infinity;
    const near = Math.min(dServer, dBody);
    if (!Number.isFinite(near) || near > 12) {
      res.status(400).json({
        error: "too far from your pedestal",
        distance: Number.isFinite(near) ? near : -1,
        serverDistance: Number.isFinite(dServer) ? dServer : -1,
        clientDistance: Number.isFinite(dBody) ? dBody : -1
      });
      return;
    }

    const result = await secureCarriedToThief(serverState, playerId, pedestalIndex);
    if (!result?.ok) {
      res.status(400).json({ error: String(result?.error || "could not deposit") });
      return;
    }
    res.json({ ok: true, ...result.payload });
  } catch (err) {
    console.error("/api/steal/deposit failed", err);
    res.status(500).json({ error: "internal error" });
  }
}

app.get("/api/steal/deposit", (_req, res) => {
  res.json({ ok: true, method: "POST", route: "/api/steal/deposit" });
});
app.post("/api/steal/deposit", handleStealDeposit);
app.post("/api/steal/deposit/", handleStealDeposit);
app.post("/api/steal/secure", handleStealDeposit);

app.post("/api/steal/cancel", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const playerId = String(req.body?.playerId || "").trim();
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const stealId = String(req.body?.stealId || "").trim();
    if (!playerId || playerId !== decoded.uid) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const serverState = ensureServerState(serverId, {});
    let steal = null;
    if (stealId) {
      steal = serverState.activeSteals.get(stealId) || null;
      if (steal && String(steal.thiefId || "") !== playerId) steal = null;
    }
    if (!steal) steal = findActiveStealByThief(serverState, playerId);
    if (!steal) {
      res.json({ ok: true, canceled: false });
      return;
    }
    cancelSteal(serverState, steal, "canceled", playerId);
    res.json({ ok: true, canceled: true, stealId: steal.id });
  } catch (err) {
    console.error("/api/steal/cancel failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/base/lock", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const playerId = String(req.body?.playerId || "").trim();
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    if (!playerId || playerId !== String(decoded.uid || "")) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const serverState = ensureServerState(serverId, {});
    if (!serverState.activeSlots.has(playerId)) {
      res.status(400).json({ error: "player not online in this server" });
      return;
    }

    const nowSec = Date.now() / 1000;
    const currentUntil = getBaseLockUntil(serverState, playerId, nowSec);
    if (currentUntil > nowSec) {
      res.status(400).json({
        error: "base already locked",
        lockRemainingSec: Math.max(0, Math.ceil(currentUntil - nowSec)),
        baseLockUntil: currentUntil
      });
      return;
    }

    const playerDoc = ensurePlayerDataShape(await getPlayerDoc(playerId, decoded), serverState.activeSlots.get(playerId) ?? 0);
    const rebirths = Math.max(0, Math.min(MAX_REBIRTHS, Math.floor(Number(playerDoc?.data?.state?.rebirths || 0))));
    const durationSec = BASE_LOCK_BASE_SEC + rebirths * BASE_LOCK_PER_REBIRTH_SEC;
    const baseLockUntil = nowSec + durationSec;
    serverState.baseLockUntilByPlayer.set(playerId, baseLockUntil);

    if (playerDoc?.data?.state && typeof playerDoc.data.state === "object") {
      playerDoc.data.state.baseLockUntil = baseLockUntil;
      await setPlayerDocMerge(playerId, { data: playerDoc.data, updatedAt: Date.now() }, decoded);
    }

    broadcastWorld(serverState);
    res.json({
      ok: true,
      playerId,
      serverId,
      rebirths,
      durationSec,
      baseLockUntil
    });
  } catch (err) {
    console.error("/api/base/lock failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/pvp/hit", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const playerId = String(req.body?.playerId || "").trim();
    const targetPlayerId = String(req.body?.targetPlayerId || "").trim();
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    if (!playerId || !targetPlayerId || playerId === targetPlayerId || playerId !== decoded.uid) {
      res.status(400).json({ error: "invalid hit payload" });
      return;
    }

    const serverState = ensureServerState(serverId, {});
    if (!serverState.activeSlots.has(playerId) || !serverState.activeSlots.has(targetPlayerId)) {
      res.status(400).json({ error: "target not online in this server" });
      return;
    }

    const hitterPos = serverState.activePositions.get(playerId) || null;
    const targetPos = serverState.activePositions.get(targetPlayerId) || null;
    if (!hitterPos || !targetPos || distance2d(hitterPos.x, hitterPos.z, targetPos.x, targetPos.z) > 3.1) {
      res.status(400).json({ error: "target out of range" });
      return;
    }

    const nowSec = Date.now() / 1000;
    if (Number(serverState.stunUntilByPlayer.get(playerId) || 0) > nowSec) {
      res.status(400).json({ error: "you are stunned" });
      return;
    }
    const cooldownUntil = Number(serverState.batCooldownUntilByPlayer.get(playerId) || 0);
    if (cooldownUntil > nowSec) {
      res.status(400).json({ error: "bat on cooldown", cooldownLeft: Math.max(0, cooldownUntil - nowSec) });
      return;
    }
    const hitterCarry = serverState.carriedByThief.get(playerId) || null;
    if (hitterCarry && String(hitterCarry.itemType || "block") === "creature") {
      res.status(400).json({ error: "cannot swing bat while carrying a stolen creature" });
      return;
    }

    const hitterDoc = ensurePlayerDataShape(await getPlayerDoc(playerId, decoded), serverState.activeSlots.get(playerId) ?? 0);
    const bat = getEquippedBatFromPlayerDoc(hitterDoc);
    const stunUntil = nowSec + Number(bat.stunSec || 0.8);
    const nextCooldown = nowSec + Number(bat.cooldownSec || 1.5);
    serverState.stunUntilByPlayer.set(targetPlayerId, stunUntil);
    serverState.batCooldownUntilByPlayer.set(playerId, nextCooldown);

    let canceledSteal = false;
    let returnedCarry = false;
    const activeTargetSteal = findActiveStealByThief(serverState, targetPlayerId);
    if (activeTargetSteal) {
      cancelSteal(serverState, activeTargetSteal, "hit", playerId);
      canceledSteal = true;
    }
    const returned = await returnCarriedToOwner(serverState, targetPlayerId, "hit", playerId);
    if (returned) returnedCarry = true;

    const payload = {
      type: "pvp-hit",
      byPlayerId: playerId,
      targetPlayerId,
      batKey: bat.key,
      batLabel: bat.label,
      stunSec: Number(bat.stunSec || 0),
      cooldownSec: Number(bat.cooldownSec || 0),
      canceledSteal,
      returnedCarry,
      at: Date.now()
    };
    notifyPlayer(serverState, playerId, payload);
    notifyPlayer(serverState, targetPlayerId, payload);
    notifyPlayer(serverState, targetPlayerId, {
      type: "pvp-stun",
      byPlayerId: playerId,
      stunUntil
    });

    res.json({
      ok: true,
      ...payload,
      stunUntil,
      cooldownUntil: nextCooldown
    });
  } catch (err) {
    console.error("/api/pvp/hit failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.get("/api/leaderboard/cash", async (req, res) => {
  try {
    const limitRaw = Number(req.query?.limit || 10);
    const limit = Math.max(1, Math.min(25, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 10));
    const rows = await getCashLeaderboardCached(limit);
    res.json({
      rows: rows.map((r, idx) => ({
        rank: idx + 1,
        playerId: String(r.playerId || ""),
        username: String(r.username || ""),
        money: Number(r.money || 0)
      })),
      updatedAt: Number(leaderboardCashCache.updatedAt || Date.now())
    });
  } catch (err) {
    console.error("/api/leaderboard/cash failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/trade/request", async (req, res) => {
  const decoded = await verifyAuth(req, res);
  if (!decoded) return;
  res.status(410).json({ error: "trading has been removed" });
});

app.get("/api/trade/pending", async (req, res) => {
  const decoded = await verifyAuth(req, res);
  if (!decoded) return;
  res.json({ trades: [], removed: true });
});

app.post("/api/trade/respond", async (req, res) => {
  const decoded = await verifyAuth(req, res);
  if (!decoded) return;
  res.status(410).json({ error: "trading has been removed" });
});

app.get("/api/world", (req, res) => {
  const serverId = cleanServerId(req.query?.serverId || DEFAULT_SERVER_ID);
  const serverState = ensureServerState(serverId, {});
  res.json(worldPayload(serverState));
});

app.get("/api/chat/recent", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const serverId = cleanServerId(req.query?.serverId || DEFAULT_SERVER_ID);
    const snap = await listDocuments(CHAT_COLLECTION_ID, [Query.limit(240)], decoded);
    const messages = (snap.documents || [])
      .map((d) => sanitizeDocData(d))
      .filter((m) => String(m.serverId || DEFAULT_SERVER_ID) === serverId)
      .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))
      .slice(-60);
    res.json({ messages });
  } catch (err) {
    console.error("/api/chat/recent failed", err);
    res.json({ messages: [], degraded: true });
  }
});

app.post("/api/admin/luck", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = decoded.uid;
    const amount = Number(req.body?.amount);
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const scope = String(req.body?.scope || "server").trim().toLowerCase();
    if (!Number.isFinite(amount) || amount < 1) {
      res.status(400).json({ error: "invalid amount" });
      return;
    }
    if (!["server", "global"].includes(scope)) {
      res.status(400).json({ error: "invalid scope" });
      return;
    }
    const player = ensurePlayerDataShape(await getPlayerDoc(uid, decoded), 0);
    if (!isAdminProfile(player.profile || {})) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const nextLuck = Math.max(1, Math.floor(amount));
    if (scope === "global") {
      let changed = 0;
      for (const state of serverStates.values()) {
        state.serverLuck = nextLuck;
        broadcastWorld(state);
        changed += 1;
      }
      res.json({ ok: true, scope: "global", serverLuck: nextLuck, affectedServers: changed });
      return;
    }
    const serverState = ensureServerState(serverId, {});
    serverState.serverLuck = nextLuck;
    broadcastWorld(serverState);
    res.json({ ok: true, scope: "server", serverId, serverLuck: serverState.serverLuck, affectedServers: 1 });
  } catch (err) {
    console.error("/api/admin/luck failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/server/luck/buy", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = decoded.uid;
    const playerId = String(req.body?.playerId || "").trim();
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const targetLuck = Math.max(2, Math.floor(Number(req.body?.targetLuck || 2)));
    if (!playerId || playerId !== uid) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const serverState = ensureServerState(serverId, {});
    const currentLuck = Math.max(1, Math.floor(Number(serverState.serverLuck || 1)));
    if (targetLuck <= currentLuck) {
      res.status(400).json({ error: "target must be higher than current server luck" });
      return;
    }
    const cost = Number(SERVER_LUCK_STARDUST_COST_BY_TARGET[String(targetLuck)] || 0);
    if (!Number.isFinite(cost) || cost < 1) {
      res.status(400).json({ error: "invalid server luck pack target" });
      return;
    }

    const player = ensurePlayerDataShape(await getPlayerDoc(uid, decoded), serverState.activeSlots.get(uid) ?? 0);
    const stardustNow = Number(player?.data?.state?.stardust || 0);
    if (!Number.isFinite(stardustNow) || stardustNow < cost) {
      res.status(400).json({ error: "not enough stardust", required: cost, stardust: Math.max(0, stardustNow || 0) });
      return;
    }

    player.data.state.stardust = stardustNow - cost;
    serverState.serverLuck = targetLuck;

    await setPlayerDocMerge(uid, { data: player.data, updatedAt: Date.now() }, decoded);
    broadcastWorld(serverState);

    res.json({
      ok: true,
      serverId,
      serverLuck: serverState.serverLuck,
      cost,
      stardust: player.data.state.stardust
    });
  } catch (err) {
    console.error("/api/server/luck/buy failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/admin/give", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = decoded.uid;
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const username = String(req.body?.username || "").trim();
    const blockKey = normalizeRankKey(req.body?.rankKey || req.body?.blockKey || "");
    const amountRaw = Number(req.body?.amount);
    const amount = Number.isFinite(amountRaw) && amountRaw >= 1 ? Math.floor(amountRaw) : 1;
    const mutation = normalizeMutation(req.body?.mutation || "normal");
    const blueMoon = mutation === "bluemoon";
    const soulbound = mutation === "soulbound";
    const isSpecial = SPECIAL_BLOCK_KEYS.has(blockKey);
    if (!username || (!RANK_KEYS.has(blockKey) && !isSpecial)) {
      res.status(400).json({ error: "invalid give payload" });
      return;
    }

    const caller = ensurePlayerDataShape(await getPlayerDoc(uid, decoded), 0);
    if (!isAdminProfile(caller.profile || {})) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const serverState = ensureServerState(serverId, {});
    let targetPlayerId = "";
    const usernameNeedle = username.toLowerCase();
    for (const [pid, profile] of serverState.activeProfiles.entries()) {
      const un = String(profile?.username || "").toLowerCase();
      if (un === usernameNeedle || String(pid) === username) {
        targetPlayerId = pid;
        break;
      }
    }
    if (!targetPlayerId) {
      res.status(404).json({ error: "target player not found in this server" });
      return;
    }

    const target = ensurePlayerDataShape(await getPlayerDoc(targetPlayerId, decoded), serverState.activeSlots.get(targetPlayerId) ?? 0);
    if (!target.data.state.luckyInventory || typeof target.data.state.luckyInventory !== "object") {
      target.data.state.luckyInventory = {};
    }
    if (!target.data.state.luckyMoonInventory || typeof target.data.state.luckyMoonInventory !== "object") {
      target.data.state.luckyMoonInventory = {};
    }
    if (!target.data.state.luckySoulboundInventory || typeof target.data.state.luckySoulboundInventory !== "object") {
      target.data.state.luckySoulboundInventory = {};
    }
    if (!target.data.state.specialLuckyInventory || typeof target.data.state.specialLuckyInventory !== "object") {
      target.data.state.specialLuckyInventory = {};
    }
    const add = Math.floor(amount);
    if (isSpecial) {
      const safeBlock = blockKey;
      if (!target.data.state.specialLuckyInventory[safeBlock] || typeof target.data.state.specialLuckyInventory[safeBlock] !== "object") {
        target.data.state.specialLuckyInventory[safeBlock] = { normal: 0, bluemoon: 0, soulbound: 0 };
      }
      target.data.state.specialLuckyInventory[safeBlock][mutation] = parsePositiveInt(target.data.state.specialLuckyInventory[safeBlock][mutation] || 0, 0) + add;
    } else {
      const bucket = soulbound ? "luckySoulboundInventory" : (blueMoon ? "luckyMoonInventory" : "luckyInventory");
      target.data.state[bucket][blockKey] = parsePositiveInt(target.data.state[bucket][blockKey] || 0, 0) + add;
    }
    const giveId = `g-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    await setPlayerDocMerge(targetPlayerId, { data: target.data, updatedAt: Date.now() }, decoded);
    notifyPlayer(serverState, targetPlayerId, {
      type: "admin-give",
      giveId,
      rankKey: blockKey,
      blockKey,
      mutation,
      amount: add,
      blueMoon,
      soulbound,
      from: caller.profile?.username || playerTag(uid)
    });

    res.json({
      ok: true,
      targetPlayerId,
      username,
      rankKey: blockKey,
      blockKey,
      amount: add,
      mutation,
      blueMoon,
      soulbound,
      giveId
    });
  } catch (err) {
    console.error("/api/admin/give failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/admin/spawn", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = decoded.uid;
    const caller = ensurePlayerDataShape(await getPlayerDoc(uid, decoded), 0);
    if (!isAdminProfile(caller.profile || {})) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const scopeRaw = String(req.body?.scope || "server").trim().toLowerCase();
    const scope = scopeRaw === "global" ? "global" : "server";
    const amountRaw = Number(req.body?.amount);
    const amount = Number.isFinite(amountRaw) ? Math.max(1, Math.min(100, Math.floor(amountRaw))) : 1;
    const creatureInput = String(req.body?.creatureName || req.body?.name || "").trim();
    const catalog = SPAWN_CREATURE_CATALOG_BY_KEY.get(normalizeCreatureNameKey(creatureInput)) || null;
    if (!catalog) {
      res.status(400).json({ error: "unknown creature name" });
      return;
    }

    const targets = scope === "global"
      ? [...serverStates.values()]
      : [ensureServerState(serverId, {})];
    let spawned = 0;
    for (const state of targets) {
      for (let i = 0; i < amount; i += 1) {
        const created = addSpawnDrop(state, catalog, "normal");
        if (created) spawned += 1;
      }
      broadcastWorld(state);
    }

    res.json({
      ok: true,
      scope,
      serverId,
      creature: {
        name: catalog.name,
        rankKey: catalog.rankKey,
        rate: Math.max(1, Number(catalog.rate || 1))
      },
      amount,
      spawned,
      affectedServers: targets.length
    });
  } catch (err) {
    console.error("/api/admin/spawn failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

async function handleAdminReset(req, res) {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = decoded.uid;
    const username = String(req.body?.username || "").trim();
    if (!username) {
      res.status(400).json({ error: "username required" });
      return;
    }

    const caller = ensurePlayerDataShape(await getPlayerDoc(uid, decoded), 0);
    if (!isAdminProfile(caller.profile || {})) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    let targetPlayerId = "";
    const usernameNeedle = username.toLowerCase();

    for (const state of serverStates.values()) {
      for (const [pid, profile] of state.activeProfiles.entries()) {
        const un = String(profile?.username || "").toLowerCase();
        if (un === usernameNeedle || String(pid) === username) {
          targetPlayerId = pid;
          break;
        }
      }
      if (targetPlayerId) break;
    }

    if (!targetPlayerId) {
      const snap = await listDocuments(PLAYERS_COLLECTION_ID, [Query.limit(500)]);
      const doc = (snap.documents || []).find((d) => String(d.profile?.username || "") === username);
      if (doc) targetPlayerId = String(doc.$id || "");
    }
    if (!targetPlayerId) {
      res.status(404).json({ error: "target player not found" });
      return;
    }

    // Hard wipe player doc so all money/crops/creatures/placements are erased.
    await deletePlayerDoc(targetPlayerId);

    // Block immediate stale autosaves from old client memory for a short window.
    resetSaveLocks.set(targetPlayerId, Date.now() + 15000);

    for (const state of serverStates.values()) {
      notifyPlayer(state, targetPlayerId, {
        type: "admin-reset",
        playerId: targetPlayerId,
        by: caller.profile?.username || playerTag(uid)
      });
      const ws = state.socketsByPlayer.get(targetPlayerId);
      if (ws) {
        try {
          ws.close();
        } catch {
          // noop
        }
      }
      state.activeSlots.delete(targetPlayerId);
      state.activePositions.delete(targetPlayerId);
      state.activeProfiles.delete(targetPlayerId);
      broadcastWorld(state);
    }

    res.json({ ok: true, targetPlayerId, username });
  } catch (err) {
    console.error("/api/admin/reset failed", err);
    res.status(500).json({ error: "internal error" });
  }
}

app.post("/api/admin/reset", handleAdminReset);
app.post("/api/admin/reset/", handleAdminReset);

async function resolveTargetPlayerId(nameOrIdRaw) {
  const needle = String(nameOrIdRaw || "").trim();
  if (!needle) return "";
  const wanted = usernameKey(needle);

  for (const state of serverStates.values()) {
    for (const [pid, profile] of state.activeProfiles.entries()) {
      const un = usernameKey(profile?.username || "");
      if (String(pid) === needle || (wanted && un === wanted)) {
        return String(pid);
      }
    }
  }

  if (wanted) {
    const found = await findPlayerIdByUsername(needle);
    if (found) return String(found);
  }

  const byId = await getPlayerDoc(needle, null);
  if (byId) return needle;
  return "";
}

async function handleAdminTutorialReset(req, res) {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = decoded.uid;
    const username = String(req.body?.username || "").trim();
    if (!username) {
      res.status(400).json({ error: "username required" });
      return;
    }

    const caller = ensurePlayerDataShape(await getPlayerDoc(uid, decoded), 0);
    if (!isAdminProfile(caller.profile || {})) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const targetPlayerId = await resolveTargetPlayerId(username);
    if (!targetPlayerId) {
      res.status(404).json({ error: "target player not found" });
      return;
    }

    const target = ensurePlayerDataShape(await getPlayerDoc(targetPlayerId, decoded), 0);
    target.data.state.tutorialCompleted = false;
    target.data.state.tutorialStep = 0;
    await setPlayerDocMerge(targetPlayerId, { data: target.data, updatedAt: Date.now() }, decoded);

    for (const state of serverStates.values()) {
      notifyPlayer(state, targetPlayerId, {
        type: "admin-tutorial-reset",
        playerId: targetPlayerId,
        by: caller.profile?.username || playerTag(uid),
        tutorialStep: 0
      });
    }

    res.json({ ok: true, targetPlayerId, username, tutorialStep: 0 });
  } catch (err) {
    console.error("/api/admin/tutorial/reset failed", err);
    res.status(500).json({ error: "internal error" });
  }
}

app.post("/api/admin/tutorial/reset", handleAdminTutorialReset);
app.post("/api/admin/tutorial/reset/", handleAdminTutorialReset);

app.post("/api/admin/broadcast", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = decoded.uid;
    const caller = ensurePlayerDataShape(await getPlayerDoc(uid, decoded), 0);
    if (!isAdminProfile(caller.profile || {})) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const text = String(req.body?.text || "").trim().replace(/\s+/g, " ").slice(0, 180);
    if (!text) {
      res.status(400).json({ error: "text required" });
      return;
    }
    const secondsRaw = Number(req.body?.seconds);
    const seconds = Number.isFinite(secondsRaw) ? Math.max(2, Math.min(30, Math.floor(secondsRaw))) : 12;
    const prefix = String(caller.profile?.username || "Admin");
    const finalText = `[${prefix}] ${text}`;
    broadcastAllServers({
      type: "admin-broadcast",
      text: finalText,
      seconds,
      createdAt: Date.now()
    });
    res.json({ ok: true, text: finalText, seconds });
  } catch (err) {
    console.error("/api/admin/broadcast failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/admin/event", async (req, res) => {
  try {
    const decoded = await verifyAuth(req, res);
    if (!decoded) return;
    const uid = decoded.uid;
    const caller = ensurePlayerDataShape(await getPlayerDoc(uid, decoded), 0);
    if (!isAdminProfile(caller.profile || {})) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const eventName = String(req.body?.event || "").trim().toLowerCase();
    if (eventName !== "bluemoon" && eventName !== "blue_moon" && eventName !== "blue-moon") {
      res.status(400).json({ error: "unsupported event" });
      return;
    }
    const scopeRaw = String(req.body?.scope || "server").trim().toLowerCase();
    const scope = scopeRaw === "global" ? "global" : "server";
    const serverId = cleanServerId(req.body?.serverId || DEFAULT_SERVER_ID);
    const durationRaw = Number(req.body?.durationSec);
    const durationSec = Number.isFinite(durationRaw) ? Math.max(10, Math.min(3600, Math.floor(durationRaw))) : 600;
    const nowSec = Math.floor(Date.now() / 1000);
    const untilSec = nowSec + durationSec;
    const eventId = `manual-bm-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;

    let affected = 0;
    if (scope === "global") {
      for (const state of serverStates.values()) {
        state.forcedBlueMoonUntil = untilSec;
        state.forcedBlueMoonEventId = eventId;
        broadcastWorld(state);
        affected += 1;
      }
    } else {
      const state = ensureServerState(serverId, {});
      state.forcedBlueMoonUntil = untilSec;
      state.forcedBlueMoonEventId = eventId;
      broadcastWorld(state);
      affected = 1;
    }

    res.json({
      ok: true,
      event: "bluemoon",
      scope,
      serverId,
      durationSec,
      forcedBlueMoonUntil: untilSec,
      forcedBlueMoonEventId: eventId,
      affectedServers: affected
    });
  } catch (err) {
    console.error("/api/admin/event failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const playerId = String(url.searchParams.get("playerId") || "").trim();
  const serverId = cleanServerId(url.searchParams.get("serverId") || DEFAULT_SERVER_ID);
  if (!playerId) {
    ws.close();
    return;
  }

  const serverState = ensureServerState(serverId, {});
  if (!canAccessServer(serverState, playerId) || !serverState.activeSlots.has(playerId)) {
    ws.close();
    return;
  }

  const prev = serverState.socketsByPlayer.get(playerId);
  if (prev && prev !== ws) {
    try {
      prev.close();
    } catch {
      // noop
    }
  }

  serverState.socketsByPlayer.set(playerId, ws);
  ws.send(JSON.stringify(worldPayload(serverState)));
  ws.send(JSON.stringify(stateSyncPayload(serverState)));

  ws.on("message", (raw) => {
    let msg = null;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!msg) return;

    if (msg.type === "pos") {
      const x = Number(msg.x);
      const z = Number(msg.z);
      const yaw = Number(msg.yaw);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;

      const slot = serverState.activeSlots.get(playerId) ?? 0;
      const pos = {
        x: Math.max(-500, Math.min(500, x)),
        z: Math.max(-500, Math.min(500, z)),
        yaw: Number.isFinite(yaw) ? yaw : 0
      };
      serverState.activePositions.set(playerId, pos);

      broadcastWorld(serverState);
      return;
    }

    if (msg.type === "state-preview") {
      const preview = msg.data && typeof msg.data === "object" ? msg.data : null;
      if (!preview) return;
      serverState.activeSnapshots.set(playerId, buildWorldSnapshot(preview));
      broadcastStateSync(serverState, playerId);
      return;
    }

    if (msg.type === "chat-send") {
      const text = String(msg.text || "").trim().slice(0, 220);
      if (!text) return;
      const profile = serverState.activeProfiles.get(playerId) || {};
      const username = String(profile.username || playerTag(playerId));
      const payload = {
        type: "chat-message",
        serverId,
        playerId,
        username,
        text,
        createdAt: Date.now()
      };
      createDocument(CHAT_COLLECTION_ID, ID.unique(), payload).catch(() => {});
      const out = JSON.stringify(payload);
      for (const client of serverState.socketsByPlayer.values()) {
        if (client.readyState === WebSocket.OPEN) client.send(out);
      }
    }
  });

  ws.on("close", () => {
    // Ignore stale socket closes (e.g., when a newer socket replaced this one).
    if (serverState.socketsByPlayer.get(playerId) !== ws) return;
    for (const steal of [...serverState.activeSteals.values()]) {
      if (String(steal.thiefId || "") === playerId || String(steal.ownerId || "") === playerId) {
        cancelSteal(serverState, steal, "offline", playerId);
      }
    }
    void returnCarriedToOwner(serverState, playerId, "offline", playerId);
    if (serverState.socketsByPlayer.get(playerId) === ws) serverState.socketsByPlayer.delete(playerId);
    serverState.activeSlots.delete(playerId);
    serverState.activePositions.delete(playerId);
    serverState.activeProfiles.delete(playerId);
    serverState.activeSnapshots.delete(playerId);
    serverState.stunUntilByPlayer.delete(playerId);
    serverState.batCooldownUntilByPlayer.delete(playerId);
    broadcastWorld(serverState);
  });
});

setInterval(() => {
  for (const state of serverStates.values()) {
    processServerSteals(state).catch((err) => {
      console.error("processServerSteals failed", err?.message || err);
    });
  }
}, 200);

server.listen(PORT, () => {
  console.log(`Lucky Garden server listening on http://localhost:${PORT}`);
  console.log(`[Firebase] project=${firebaseProjectId || "unset"} configured=${hasFirebaseConfig ? "yes" : "no"}`);
  console.log(`[Firebase] collections(players=${PLAYERS_COLLECTION_ID}, trades=${TRADES_COLLECTION_ID}, chat=${CHAT_COLLECTION_ID})`);
});
