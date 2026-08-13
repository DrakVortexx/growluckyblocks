import { query, transaction } from '../database/connection.js';
import { STEAL_TIME_BY_RANK, SPAWN_CREATURE_CATALOG, rankWeightForSpawn } from '../shared/constants/index.js';
export class GameService {
    // Lucky Block Operations
    async addLuckyBlockToInventory(userId, rarity, mutation = 'normal', trait = 'none', amount = 1) {
        await transaction(async (client) => {
            const metadata = JSON.stringify({ mutation, trait });
            await client.query(`INSERT INTO inventory_items (user_id, item_type, item_definition_id, quantity, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, item_type, item_definition_id, metadata) 
         DO UPDATE SET quantity = inventory_items.quantity + $4, updated_at = NOW()`, [userId, 'lucky_block', rarity, amount, metadata]);
            // Log transaction
            await client.query(`INSERT INTO transactions (user_id, type, amount, currency, source, metadata)
         VALUES ($1, 'earn', $2, 'luckyblock', $3, $4)`, [userId, amount, rarity, metadata]);
        });
    }
    async removeLuckyBlockFromInventory(userId, rarity, mutation = 'normal', trait = 'none', amount = 1) {
        const metadata = JSON.stringify({ mutation, trait });
        const result = await query(`UPDATE inventory_items
       SET quantity = GREATEST(0, quantity - $1), updated_at = NOW()
       WHERE user_id = $2 AND item_type = $3 AND item_definition_id = $4 AND metadata = $5 AND quantity >= $1
       RETURNING *`, [amount, userId, 'lucky_block', rarity, metadata]);
        return (result.rowCount ?? 0) > 0;
    }
    async placeLuckyBlock(userId, serverId, baseId, pedestalId, rarity, mutation = 'normal', trait = 'none') {
        // Remove from inventory first
        const removed = await this.removeLuckyBlockFromInventory(userId, rarity, mutation, trait);
        if (!removed) {
            throw new Error('Insufficient lucky blocks in inventory');
        }
        // Create placed block
        const result = await query(`INSERT INTO lucky_blocks (owner_user_id, server_id, base_id, pedestal_id, block_type, rarity, mutation, trait, status, growth_started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'growing', NOW())
       RETURNING *`, [userId, serverId, baseId, pedestalId, rarity, rarity, mutation, trait]);
        return result.rows[0];
    }
    async openLuckyBlock(blockId, serverLuck = 1) {
        const blockResult = await query('SELECT * FROM lucky_blocks WHERE id = $1 AND status = $2', [blockId, 'ready']);
        if (!blockResult.rows[0]) {
            throw new Error('Block not found or not ready');
        }
        const block = blockResult.rows[0];
        // Server-side roll for reward
        const reward = this.rollLuckyBlockReward(block.rarity, serverLuck, block.mutation, block.trait);
        await transaction(async (client) => {
            // Update block status
            await client.query('UPDATE lucky_blocks SET status = $1, updated_at = NOW() WHERE id = $2', ['opened', blockId]);
            // Give reward to player
            if (reward.type === 'creature') {
                await this.addCreatureToInventory(block.ownerUserId, reward.creatureType, reward.rarity, reward.mutation, reward.trait);
            }
            else if (reward.type === 'money') {
                await this.addMoney(block.ownerUserId, reward.amount, 'lucky_block_open');
            }
            else if (reward.type === 'stardust') {
                await this.addStardust(block.ownerUserId, reward.amount, 'lucky_block_open');
            }
            // Log transaction
            await client.query(`INSERT INTO transactions (user_id, type, amount, currency, source, metadata)
         VALUES ($1, 'reward', $2, $3, $4, $5)`, [block.ownerUserId, reward.amount || 1, reward.currency || 'money', 'lucky_block', JSON.stringify(reward)]);
        });
        return reward;
    }
    // Creature Operations
    async addCreatureToInventory(userId, creatureType, rarity, mutation = 'normal', trait = 'none') {
        const catalog = SPAWN_CREATURE_CATALOG.find(c => c.name === creatureType);
        const incomePerSecond = catalog ? catalog.rate : 1;
        const result = await query(`INSERT INTO creatures (owner_user_id, creature_type, name, rarity, mutation, trait, income_per_second)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [userId, creatureType, creatureType, rarity, mutation, trait, incomePerSecond]);
        return result.rows[0];
    }
    async placeCreature(userId, serverId, baseId, pedestalId, creatureId) {
        await query(`UPDATE creatures
       SET server_id = $1, base_id = $2, pedestal_id = $3, updated_at = NOW()
       WHERE id = $4 AND owner_user_id = $5`, [serverId, baseId, pedestalId, creatureId, userId]);
    }
    // Economy Operations
    async addMoney(userId, amount, source) {
        await transaction(async (client) => {
            await client.query(`UPDATE player_profiles
         SET money = money + $1, total_earned = total_earned + $1, updated_at = NOW()
         WHERE user_id = $2`, [amount, userId]);
            await client.query(`INSERT INTO transactions (user_id, type, amount, currency, source, metadata)
         VALUES ($1, 'earn', $2, 'money', $3, '{}')`, [userId, amount, source]);
        });
    }
    async removeMoney(userId, amount, source) {
        const result = await query(`UPDATE player_profiles
       SET money = money - $1, updated_at = NOW()
       WHERE user_id = $2 AND money >= $1
       RETURNING money`, [amount, userId]);
        if ((result.rowCount ?? 0) > 0) {
            await query(`INSERT INTO transactions (user_id, type, amount, currency, source, metadata)
         VALUES ($1, 'spend', $2, 'money', $3, '{}')`, [userId, amount, source]);
            return true;
        }
        return false;
    }
    async addStardust(userId, amount, source) {
        await transaction(async (client) => {
            await client.query(`UPDATE player_profiles
         SET stardust = stardust + $1, updated_at = NOW()
         WHERE user_id = $2`, [amount, userId]);
            await client.query(`INSERT INTO transactions (user_id, type, amount, currency, source, metadata)
         VALUES ($1, 'earn', $2, 'stardust', $3, '{}')`, [userId, amount, source]);
        });
    }
    async removeStardust(userId, amount, source) {
        const result = await query(`UPDATE player_profiles
       SET stardust = stardust - $1, updated_at = NOW()
       WHERE user_id = $2 AND stardust >= $1
       RETURNING stardust`, [amount, userId]);
        if ((result.rowCount ?? 0) > 0) {
            await query(`INSERT INTO transactions (user_id, type, amount, currency, source, metadata)
         VALUES ($1, 'spend', $2, 'stardust', $3, '{}')`, [userId, amount, source]);
            return true;
        }
        return false;
    }
    // Stealing Operations
    async startSteal(thiefUserId, victimUserId, serverId, pedestalIndex, itemType, rarity, mutation, trait) {
        const durationSec = STEAL_TIME_BY_RANK[rarity] || 10;
        const endAt = new Date(Date.now() + durationSec * 1000);
        const result = await query(`INSERT INTO steals (thief_user_id, victim_user_id, server_id, pedestal_index, item_type, item_rank_key, item_mutation, item_trait, started_at, completed_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, 'in_progress')
       RETURNING id`, [thiefUserId, victimUserId, serverId, pedestalIndex, itemType, rarity, mutation, trait, endAt]);
        return result.rows[0].id;
    }
    async completeSteal(stealId) {
        const stealResult = await query('SELECT * FROM steals WHERE id = $1 AND status = $2', [stealId, 'in_progress']);
        if (!stealResult.rows[0]) {
            throw new Error('Steal not found or already completed');
        }
        const steal = stealResult.rows[0];
        await transaction(async (client) => {
            // Remove item from victim
            if (steal.item_type === 'creature') {
                await client.query('UPDATE creatures SET owner_user_id = $1, pedestal_id = NULL, updated_at = NOW() WHERE id = $2', [steal.thief_user_id, steal.creature_id]);
            }
            else {
                // Remove block from pedestal
                await client.query('UPDATE pedestals SET has_block = false, block_rank_key = NULL, updated_at = NOW() WHERE id = $2', [steal.pedestal_id]);
            }
            // Update steal status
            await client.query('UPDATE steals SET status = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2', ['completed', stealId]);
            // Log transaction
            await client.query(`INSERT INTO transactions (user_id, type, amount, currency, source, metadata)
         VALUES ($1, 'steal', 1, 'item', $2, $3)`, [steal.thief_user_id, 'steal', JSON.stringify({ victim: steal.victim_user_id, itemType: steal.item_type })]);
        });
    }
    // Server-side reward rolling (authoritative)
    rollLuckyBlockReward(rarity, serverLuck, mutation, trait) {
        const rand = Math.random() * 100;
        const effectiveLuck = serverLuck * (mutation === 'bluemoon' ? 2 : 1);
        // Roll for creature
        if (rand < 30 * (effectiveLuck / 100)) {
            const creature = this.rollCreature(rarity, effectiveLuck);
            return {
                type: 'creature',
                creatureType: creature.name,
                rarity: creature.rankKey,
                mutation,
                trait,
                incomePerSecond: creature.rate
            };
        }
        // Roll for stardust
        if (rand < 50) {
            const baseStardust = Math.floor(5 * Math.pow(2, RARITY_VALUES[rarity]));
            return {
                type: 'stardust',
                amount: baseStardust * effectiveLuck,
                currency: 'stardust'
            };
        }
        // Default to money
        const baseMoney = Math.floor(10 * Math.pow(2, RARITY_VALUES[rarity]));
        return {
            type: 'money',
            amount: baseMoney * effectiveLuck,
            currency: 'money'
        };
    }
    rollCreature(rarity, luck) {
        const eligibleCreatures = SPAWN_CREATURE_CATALOG.filter(c => {
            const rarityValue = RARITY_VALUES[c.rankKey];
            const targetValue = RARITY_VALUES[rarity];
            return rarityValue <= targetValue + Math.floor(luck / 100);
        });
        const weights = eligibleCreatures.map(c => rankWeightForSpawn(c.rankKey) * luck);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < eligibleCreatures.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return eligibleCreatures[i];
            }
        }
        return eligibleCreatures[0];
    }
}
const RARITY_VALUES = {
    basic: 0,
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    mythic: 5,
    godly: 6,
    secret: 7,
    transcendent: 8,
    omniversal: 9
};
export const gameService = new GameService();
