import { v4 as uuidv4 } from 'uuid';
import { query } from '../connection.js';

export interface User {
  id: string;
  username: string;
  email: string;
  authProvider: string;
  authProviderId: string;
  createdAt: Date;
}

export interface PlayerProfile {
  userId: string;
  money: number;
  stardust: number;
  seeds: number;
  level: number;
  xp: number;
}

export interface PlayerSettings {
  userId: string;
  graphicsQuality: string;
  soundEnabled: boolean;
  musicEnabled: boolean;
}

class UserRepository {
  async create(data: { username: string; email: string; authProvider: string; authProviderId: string }): Promise<User> {
    const id = uuidv4();
    const result = await query(
      'INSERT INTO users (id, username, email, auth_provider, auth_provider_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [id, data.username, data.email, data.authProvider, data.authProviderId]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async createProfile(userId: string): Promise<PlayerProfile> {
    const result = await query(
      'INSERT INTO player_profiles (user_id, money, stardust, seeds, level, xp) VALUES ($1, 1000, 0, 10, 1, 0) RETURNING *',
      [userId]
    );
    return result.rows[0];
  }

  async createSettings(userId: string): Promise<PlayerSettings> {
    const result = await query(
      'INSERT INTO player_settings (user_id, graphics_quality, sound_enabled, music_enabled) VALUES ($1, \'medium\', true, true) RETURNING *',
      [userId]
    );
    return result.rows[0];
  }

  async getProfile(userId: string): Promise<PlayerProfile | null> {
    const result = await query('SELECT * FROM player_profiles WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  async getSettings(userId: string): Promise<PlayerSettings | null> {
    const result = await query('SELECT * FROM player_settings WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }
}

export const userRepository = new UserRepository();
