import { v4 as uuidv4 } from 'uuid';
import { query } from '../connection.js';
class UserRepository {
    async create(data) {
        const id = uuidv4();
        const result = await query('INSERT INTO users (id, username, email, auth_provider, auth_provider_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *', [id, data.username, data.email, data.authProvider, data.authProviderId]);
        return result.rows[0];
    }
    async findById(id) {
        const result = await query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    async findByUsername(username) {
        const result = await query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0] || null;
    }
    async findByEmail(email) {
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0] || null;
    }
    async createProfile(userId) {
        const result = await query('INSERT INTO player_profiles (user_id, money, stardust, seeds, level, xp) VALUES ($1, 1000, 0, 10, 1, 0) RETURNING *', [userId]);
        return result.rows[0];
    }
    async createSettings(userId) {
        const result = await query('INSERT INTO player_settings (user_id, graphics_quality, sound_enabled, music_enabled) VALUES ($1, \'medium\', true, true) RETURNING *', [userId]);
        return result.rows[0];
    }
    async getProfile(userId) {
        const result = await query('SELECT * FROM player_profiles WHERE user_id = $1', [userId]);
        return result.rows[0] || null;
    }
    async getSettings(userId) {
        const result = await query('SELECT * FROM player_settings WHERE user_id = $1', [userId]);
        return result.rows[0] || null;
    }
}
export const userRepository = new UserRepository();
