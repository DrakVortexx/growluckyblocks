// Shared TypeScript types for Grow Lucky Blocks
// These types are used by both client and server

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

export interface User {
  id: string;
  username: string;
  usernameLower: string;
  email?: string;
  passwordHash?: string;
  authProvider: 'local' | 'crazygames' | 'guest';
  authProviderId?: string;
  avatarUrl?: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}

export interface AuthResponse {
  uid: string;
  email: string;
  name: string;
  avatar?: string;
  isSupabaseAuth?: boolean;
  isCrazyGames?: boolean;
  isGuest?: boolean;
  token: string;
}

// ============================================================================
// PLAYER PROFILES
// ============================================================================

export interface PlayerProfile {
  userId: string;
  money: number;
  stardust: number;
  seeds: number;
  rebirths: number;
  personalLuck: number;
  personalLuckUnlocked: number;
  totalEarned: number;
  totalStolen: number;
  totalStolenFrom: number;
  currentServerId?: string;
  baseFloors: number;
  tutorialCompleted: boolean;
  tutorialStep: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerSettings {
  userId: string;
  graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
  audioEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  controlsConfig: Record<string, any>;
  uiPreferences: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// RARITY SYSTEM
// ============================================================================

export type RarityKey = 
  | 'basic' 
  | 'common' 
  | 'rare' 
  | 'epic' 
  | 'legendary' 
  | 'mythic' 
  | 'godly' 
  | 'secret' 
  | 'transcendent' 
  | 'omniversal';

export type MutationType = 'normal' | 'bluemoon' | 'soulbound';
export type TraitType = 'none' | 'leprechaun';

export const RARITY_KEYS: readonly RarityKey[] = [
  'basic', 'common', 'rare', 'epic', 'legendary', 
  'mythic', 'godly', 'secret', 'transcendent', 'omniversal'
] as const;

export const SPECIAL_BLOCK_KEYS = [
  'valentinesblock', 'leprechaunblock', 'adminblock', 'godlyblock'
] as const;

// ============================================================================
// SERVERS
// ============================================================================

export interface Server {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  ownerUsername?: string;
  isPrivate: boolean;
  maxPlayers: number;
  serverLuck: number;
  serverLuckUntil?: number;
  allowOthersServerLuck: boolean;
  forcedBlueMoonUntil?: number;
  forcedBlueMoonEventId?: string;
  playerCount: number;
  whitelistCount: number;
  canConfigure?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServerPlayer {
  serverId: string;
  userId: string;
  slot: number;
  positionX: number;
  positionZ: number;
  positionYaw: number;
  joinedAt: Date;
  lastSeenAt: Date;
}

// ============================================================================
// BASES & PLOTS
// ============================================================================

export interface Base {
  id: string;
  serverId: string;
  ownerUserId: string;
  slot: number;
  lockedUntil?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FarmPlot {
  id: string;
  baseId: string;
  plotIndex: number;
  seedRankKey: RarityKey;
  stage: number; // 0 = empty, 1 = growing, 2 = ready
  plantedAt?: Date;
  growDurationSeconds: number;
  blueMoon: boolean;
  leprechaunTrait: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pedestal {
  id: string;
  baseId: string;
  pedestalIndex: number;
  floor: number;
  hasBlock: boolean;
  blockRankKey?: RarityKey;
  blockMutation: MutationType;
  blockTrait: TraitType;
  creatureId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// LUCKY BLOCKS
// ============================================================================

export interface LuckyBlock {
  id: string;
  ownerUserId: string;
  serverId?: string;
  baseId?: string;
  pedestalId?: string;
  blockType: string;
  rarity: RarityKey;
  mutation: MutationType;
  trait: TraitType;
  growthStartedAt?: Date;
  growthFinishedAt?: Date;
  status: 'inventory' | 'growing' | 'ready' | 'opened';
  createdAt: Date;
  updatedAt: Date;
}

export interface LuckyBlockInventory {
  userId: string;
  basic: number;
  common: number;
  rare: number;
  epic: number;
  legendary: number;
  mythic: number;
  godly: number;
  secret: number;
  transcendent: number;
  omniversal: number;
  updatedAt: Date;
}

export interface SpecialLuckyInventory {
  userId: string;
  valentinesblock: { normal: number; bluemoon: number; soulbound: number };
  leprechaunblock: { normal: number; bluemoon: number; soulbound: number };
  adminblock: { normal: number; bluemoon: number; soulbound: number };
  godlyblock: { normal: number; bluemoon: number; soulbound: number };
  updatedAt: Date;
}

// ============================================================================
// CREATURES
// ============================================================================

export interface Creature {
  id: string;
  ownerUserId: string;
  serverId?: string;
  baseId?: string;
  pedestalId?: string;
  creatureType: string;
  name: string;
  rarity: RarityKey;
  mutation: MutationType;
  trait: TraitType;
  incomePerSecond: number;
  positionX?: number;
  positionZ?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatureDefinition {
  name: string;
  rankKey: RarityKey;
  rate: number;
}

// ============================================================================
// INVENTORY & ITEMS
// ============================================================================

export interface InventoryItem {
  id: string;
  userId: string;
  itemType: string;
  itemDefinitionId: string;
  quantity: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CombatEquipment {
  userId: string;
  batsOwned: {
    sprout: boolean;
    iron: boolean;
    shock: boolean;
  };
  equippedBat: 'sprout' | 'iron' | 'shock';
  freezeRayOwned: boolean;
  equippedCombatTool: 'bat' | 'freezeray';
  updatedAt: Date;
}

// ============================================================================
// ECONOMY
// ============================================================================

export interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  currency: 'money' | 'stardust' | 'seeds';
  source?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// ============================================================================
// STEALING
// ============================================================================

export interface Steal {
  id: string;
  thiefUserId: string;
  victimUserId: string;
  serverId?: string;
  itemType: 'block' | 'creature';
  itemRankKey?: RarityKey;
  itemMutation: MutationType;
  itemTrait: TraitType;
  creatureId?: string;
  pedestalIndex?: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'failed' | 'canceled';
  metadata: Record<string, any>;
}

export interface CarriedItem {
  id: string;
  thiefUserId: string;
  ownerId: string;
  serverId: string;
  itemType: 'block' | 'creature';
  blockKey: RarityKey;
  mutation: MutationType;
  trait: TraitType;
  sourcePedestalIndex: number;
  sourcePedestalId: string;
  creature?: Creature;
  grabbedAt: number;
}

// ============================================================================
// REWARDS & PROGRESSION
// ============================================================================

export interface DailyReward {
  userId: string;
  lastClaimedAt?: Date;
  streak: number;
  totalClaims: number;
  metadata: Record<string, any>;
  updatedAt: Date;
}

export interface Rebirth {
  id: string;
  userId: string;
  rebirthNumber: number;
  moneyAtRebirth: number;
  stardustAtRebirth: number;
  totalCreatures: number;
  totalEarned: number;
  rebirthAt: Date;
  metadata: Record<string, any>;
}

export interface Cosmetic {
  id: string;
  userId: string;
  cosmeticId: string;
  equipped: boolean;
  metadata: Record<string, any>;
  obtainedAt: Date;
}

export interface Achievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  completedAt?: Date;
  metadata: Record<string, any>;
}

// ============================================================================
// CHAT
// ============================================================================

export interface ChatMessage {
  id: string;
  serverId: string;
  userId?: string;
  username?: string;
  message: string;
  createdAt: Date;
}

// ============================================================================
// GAME STATE SNAPSHOTS
// ============================================================================

export interface WorldSnapshot {
  updatedAt: number;
  plots: FarmPlot[];
  pedestals: Pedestal[];
  creatures: Creature[];
}

export interface WorldState {
  type: 'world';
  serverId: string;
  serverLuck: number;
  serverLuckUntil: number;
  forcedBlueMoonUntil: number;
  forcedBlueMoonEventId: string;
  treadmillEventUntil: number;
  spawnDrops: SpawnDrop[];
  lockedBases: LockedBase[];
  occupiedSlots: number[];
  players: PlayerPosition[];
}

export interface PlayerPosition {
  playerId: string;
  slot: number;
  tag: string;
  x: number;
  z: number;
  yaw: number;
  username: string;
}

export interface SpawnDrop {
  id: string;
  serverId: string;
  itemType: 'block' | 'creature';
  name: string;
  rankKey: RarityKey;
  blockKey: RarityKey;
  rate: number;
  mutation: MutationType;
  trait: TraitType;
  x: number;
  z: number;
  spawnedAt: number;
  source: 'spawn' | 'treadmill';
  motionVx: number;
  motionVz: number;
  despawnAt: number;
}

export interface LockedBase {
  playerId: string;
  until: number;
}

// ============================================================================
// WEBSOCKET MESSAGES
// ============================================================================

export type WebSocketMessage =
  | { type: 'pos'; x: number; z: number; yaw: number }
  | { type: 'state-preview'; data: any }
  | { type: 'chat-send'; text: string }
  | { type: 'world' } & WorldState
  | { type: 'state-sync'; serverId: string; snapshots: Array<{ playerId: string; slot: number; snapshot: WorldSnapshot }> }
  | { type: 'steal-start'; steal: Steal }
  | { type: 'steal-alert'; steal: Steal }
  | { type: 'steal-progress'; stealId: string; ownerId: string; thiefId: string; remainingMs: number; paused: boolean; pauseReason: string; lockRemainingSec: number }
  | { type: 'steal-grab'; stealId: string; ownerId: string; thiefId: string; pedestalIndex: number; sourceCreatureId: string; carry: CarriedItem }
  | { type: 'steal-cancel'; stealId: string; reason: string; ownerId: string; thiefId: string; pedestalIndex: number }
  | { type: 'steal-return'; reason: string; byPlayerId: string; ownerId: string; thiefId: string; carry: CarriedItem }
  | { type: 'steal-secure'; reason: string; ownerId: string; thiefId: string; pedestalIndex: number; carry: CarriedItem }
  | { type: 'chat-message'; serverId: string; playerId: string; username: string; text: string; createdAt: number }
  | { type: 'pvp-hit'; byPlayerId: string; targetPlayerId: string; batKey:string; batLabel: string; abilityKey: string; abilityLabel: string; stunSec: number; cooldownSec: number; canceledSteal: boolean; returnedCarry: boolean }
  | { type: 'pvp-stun'; byPlayerId: string; stunUntil: number }
  | { type: 'admin-give'; giveId: string; resource: string; rankKey: string; blockKey: string; mutation: string; trait: string; amount: number; stardust: number; blueMoon: boolean; soulbound: boolean; from: string }
  | { type: 'admin-reset'; playerId: string; by: string }
  | { type: 'admin-tutorial-reset'; playerId: string; by: string; tutorialStep: number }
  | { type: 'admin-broadcast'; text: string; seconds: number; createdAt: number };

// ============================================================================
// API REQUESTS/RESPONSES
// ============================================================================

export interface JoinRequest {
  playerId: string;
  serverId: string;
  profile?: Partial<User>;
}

export interface JoinResponse {
  playerId: string;
  serverId: string;
  slot: number;
  data: any;
  profile: User;
  isAdmin: boolean;
  serverLuck: number;
  serverLuckUntil: number;
  forcedBlueMoonUntil: number;
  forcedBlueMoonEventId: string;
  baseLockUntil: number;
  stunUntil: number;
  activeSteal?: Steal;
  carried?: CarriedItem;
  spawnDrops: SpawnDrop[];
  occupiedSlots: number[];
  players: PlayerPosition[];
  server: Server;
}

export interface SaveRequest {
  playerId: string;
  serverId: string;
  slot: number;
  data: any;
}

export interface StealStartRequest {
  playerId: string;
  serverId: string;
  ownerId: string;
  pedestalIndex: number;
}

export interface SpawnGrabRequest {
  playerId: string;
  serverId: string;
  spawnId: string;
}

export interface StealDepositRequest {
  playerId: string;
  serverId: string;
  pedestalIndex: number;
  x: number;
  z: number;
}
