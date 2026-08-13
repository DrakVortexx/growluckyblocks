// User repository for database operations
import { query } from '../connection.js';
export class UserRepository {
    async findById(id) {
        const result = await query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    async findByUsername(username) {
        const result = await query('SELECT * FROM users WHERE username_lower = $1', [username.toLowerCase()]);
        return result.rows[0] || null;
    }
    async findByAuthProvider(provider, providerId) {
        const result = await query('SELECT * FROM users WHERE auth_provider = $1 AND auth_provider_id = $2', [provider, providerId]);
        return result.rows[0] || null;
    }
    async create(data) {
        const usernameLower = data.username.toLowerCase();
        const result = await query(`INSERT INTO users (username, username_lower, email, auth_provider, auth_provider_id, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [data.username, usernameLower, data.email, data.authProvider, data.authProviderId, data.avatarUrl]);
        return result.rows[0];
    }
    async update(id, data) {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (data.username !== undefined) {
            updates.push(`username = $${paramIndex++}, username_lower = $${paramIndex++}`);
            values.push(data.username, data.username.toLowerCase());
        }
        if (data.email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            values.push(data.email);
        }
        if (data.avatarUrl !== undefined) {
            updates.push(`avatar_url = $${paramIndex++}`);
            values.push(data.avatarUrl);
        }
        if (data.lastSeenAt !== undefined) {
            updates.push(`last_seen_at = $${paramIndex++}`);
            values.push(data.lastSeenAt);
        }
        if (updates.length === 0)
            return this.findById(id);
        values.push(id);
        const result = await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        return result.rows[0] || null;
    }
    async getProfile(userId) {
        const result = await query('SELECT * FROM player_profiles WHERE user_id = $1', [userId]);
        return result.rows[0] || null;
    }
    async createProfile(userId) {
        const result = await query(`INSERT INTO player_profiles (user_id, money, stardust, seeds, rebirths, personal_luck, personal_luck_unlocked, base_floors)
       VALUES ($1, 0, 0, 0, 0, 1, 1, 1)
       RETURNING *`, [userId]);
        return result.rows[0];
    }
    async updateProfile(userId, data) {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (data.money !== undefined) {
            updates.push(`money = $${paramIndex++}`);
            values.push(data.money);
        }
        if (data.stardust !== undefined) {
            updates.push(`stardust = $${paramIndex++}`);
            values.push(data.stardust);
        }
        if (data.seeds !== undefined) {
            updates.push(`seeds = $${paramIndex++}`);
            values.push(data.seeds);
        }
        if (data.rebirths !== undefined) {
            updates.push(`rebirths = $${paramIndex++}`);
            values.push(data.rebirths);
        }
        if (data.personalLuck !== undefined) {
            updates.push(`personal_luck = $${paramIndex++}`);
            values.push(data.personalLuck);
        }
        if (data.personalLuckUnlocked !== undefined) {
            updates.push(`personal_luck_unlocked = $${paramIndex++}`);
            values.push(data.personalLuckUnlocked);
        }
        if (data.totalEarned !== undefined) {
            updates.push(`total_earned = $${paramIndex++}`);
            values.push(data.totalEarned);
        }
        if (data.totalStolen !== undefined) {
            updates.push(`total_stolen = $${paramIndex++}`);
            values.push(data.totalStolen);
        }
        if (data.totalStolenFrom !== undefined) {
            updates.push(`total_stolen_from = $${paramIndex++}`);
            values.push(data.totalStolenFrom);
        }
        if (data.currentServerId !== undefined) {
            updates.push(`current_server_id = $${paramIndex++}`);
            values.push(data.currentServerId);
        }
        if (data.baseFloors !== undefined) {
            updates.push(`base_floors = $${paramIndex++}`);
            values.push(data.baseFloors);
        }
        if (data.tutorialCompleted !== undefined) {
            updates.push(`tutorial_completed = $${paramIndex++}`);
            values.push(data.tutorialCompleted);
        }
        if (data.tutorialStep !== undefined) {
            updates.push(`tutorial_step = $${paramIndex++}`);
            values.push(data.tutorialStep);
        }
        if (updates.length === 0)
            return this.getProfile(userId);
        values.push(userId);
        const result = await query(`UPDATE player_profiles SET ${updates.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`, values);
        return result.rows[0] || null;
    }
    async getSettings(userId) {
        const result = await query('SELECT * FROM player_settings WHERE user_id = $1', [userId]);
        return result.rows[0] || null;
    }
    async createSettings(userId) {
        const result = await query(`INSERT INTO player_settings (user_id, graphics_quality, audio_enabled, music_volume, sfx_volume)
       VALUES ($1, 'medium', true, 0.70, 0.80)
       RETURNING *`, [userId]);
        return result.rows[0];
    }
    async updateSettings(userId, data) {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (data.graphicsQuality !== undefined) {
            updates.push(`graphics_quality = $${paramIndex++}`);
            values.push(data.graphicsQuality);
        }
        if (data.audioEnabled !== undefined) {
            updates.push(`audio_enabled = $${paramIndex++}`);
            values.push(data.audioEnabled);
        }
        if (data.musicVolume !== undefined) {
            updates.push(`music_volume = $${paramIndex++}`);
            values.push(data.musicVolume);
        }
        if (data.sfxVolume !== undefined) {
            updates.push(`sfx_volume = $${paramIndex++}`);
            values.push(data.sfxVolume);
        }
        if (data.controlsConfig !== undefined) {
            updates.push(`controls_config = $${paramIndex++}`);
            values.push(JSON.stringify(data.controlsConfig));
        }
        if (data.uiPreferences !== undefined) {
            updates.push(`ui_preferences = $${paramIndex++}`);
            values.push(JSON.stringify(data.uiPreferences));
        }
        if (updates.length === 0)
            return this.getSettings(userId);
        values.push(userId);
        const result = await query(`UPDATE player_settings SET ${updates.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`, values);
        return result.rows[0] || null;
    }
}
export const userRepository = new UserRepository();
