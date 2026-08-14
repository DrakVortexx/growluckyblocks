// Server repository for database operations
import { query, transaction } from '../connection.js';
import type { Server, ServerPlayer } from '../../shared/types/index.js';

export class ServerRepository {
  async findById(id: string): Promise<Server | null> {
    const result = await query<Server>(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM server_players WHERE server_id = s.id) as player_count,
        (SELECT COUNT(*) FROM server_whitelist WHERE server_id = s.id) as whitelist_count
       FROM servers s WHERE s.id = $1`,
      [id]
    );
    const rows = result.rows;
    if (!rows[0]) return null;
    
    const server = rows[0] as any;
    return {
      ...server,
      playerCount: Number(server.player_count),
      whitelistCount: Number(server.whitelist_count)
    };
  }

  async findAll(): Promise<Server[]> {
    const result = await query<Server>(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM server_players WHERE server_id = s.id) as player_count,
        (SELECT COUNT(*) FROM server_whitelist WHERE server_id = s.id) as whitelist_count
       FROM servers s ORDER BY s.created_at DESC`
    );
    const rows = result.rows;
    
    return rows.map((row: any) => ({
      ...row,
      playerCount: Number(row.player_count),
      whitelistCount: Number(row.whitelist_count)
    }));
  }

  async findPrivate(): Promise<Server[]> {
    const result = await query<Server>(
      `SELECT s.*,
        (SELECT COUNT(*) FROM server_players WHERE server_id = s.id) as player_count,
        (SELECT COUNT(*) FROM server_whitelist WHERE server_id = s.id) as whitelist_count
       FROM servers s
       WHERE s.is_private = TRUE
       ORDER BY s.created_at DESC`
    );

    return result.rows.map((row: any) => ({
      ...row,
      playerCount: Number(row.player_count),
      whitelistCount: Number(row.whitelist_count)
    }));
  }

  async findPublicWithSpace(): Promise<Server[]> {
    const result = await query<Server>(
      `SELECT s.*,
        (SELECT COUNT(*) FROM server_players WHERE server_id = s.id) as player_count,
        (SELECT COUNT(*) FROM server_whitelist WHERE server_id = s.id) as whitelist_count
       FROM servers s
       WHERE s.is_private = FALSE
       ORDER BY s.created_at ASC`
    );

    return result.rows
      .map((row: any) => ({
        ...row,
        playerCount: Number(row.player_count),
        whitelistCount: Number(row.whitelist_count)
      }))
      .filter((server: any) => server.playerCount < Number(server.max_players || server.maxPlayers || 8));
  }

  async ensurePublicServers(count = 3): Promise<void> {
    for (let index = 1; index <= count; index += 1) {
      await query(
        `INSERT INTO servers (id, name, description, owner_id, is_private, max_players)
         VALUES ($1, $2, $3, NULL, FALSE, 8)
         ON CONFLICT (id) DO NOTHING`,
        [`public-${index}`, `Public ${index}`, 'Open world for quick play']
      );
    }
  }

  async create(data: {
    id: string;
    name: string;
    description?: string;
    ownerId?: string;
    isPrivate: boolean;
    maxPlayers: number;
  }): Promise<Server> {
    const result = await query<Server>(
      `INSERT INTO servers (id, name, description, owner_id, is_private, max_players)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.id, data.name, data.description, data.ownerId, data.isPrivate, data.maxPlayers]
    );
    return result.rows[0] as Server;
  }

  async update(id: string, data: Partial<Server>): Promise<Server | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.isPrivate !== undefined) {
      updates.push(`is_private = $${paramIndex++}`);
      values.push(data.isPrivate);
    }
    if (data.maxPlayers !== undefined) {
      updates.push(`max_players = $${paramIndex++}`);
      values.push(data.maxPlayers);
    }
    if (data.serverLuck !== undefined) {
      updates.push(`server_luck = $${paramIndex++}`);
      values.push(data.serverLuck);
    }
    if (data.serverLuckUntil !== undefined) {
      updates.push(`server_luck_until = $${paramIndex++}`);
      values.push(data.serverLuckUntil);
    }
    if (data.allowOthersServerLuck !== undefined) {
      updates.push(`allow_others_server_luck = $${paramIndex++}`);
      values.push(data.allowOthersServerLuck);
    }
    if (data.forcedBlueMoonUntil !== undefined) {
      updates.push(`forced_blue_moon_until = $${paramIndex++}`);
      values.push(data.forcedBlueMoonUntil);
    }
    if (data.forcedBlueMoonEventId !== undefined) {
      updates.push(`forced_blue_moon_event_id = $${paramIndex++}`);
      values.push(data.forcedBlueMoonEventId);
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<Server>(
      `UPDATE servers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM servers WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  async addPlayer(serverId: string, userId: string, slot: number): Promise<ServerPlayer> {
    const result = await query<ServerPlayer>(
      `INSERT INTO server_players (server_id, user_id, slot, position_x, position_z, position_yaw)
       VALUES ($1, $2, $3, 0, 0, 0)
       RETURNING *`,
      [serverId, userId, slot]
    );
    return result.rows[0] as ServerPlayer;
  }

  async removePlayer(serverId: string, userId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM server_players WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
    return (result.rowCount || 0) > 0;
  }

  async updatePlayerPosition(serverId: string, userId: string, x: number, z: number, yaw: number): Promise<boolean> {
    const result = await query(
      `UPDATE server_players 
       SET position_x = $1, position_z = $2, position_yaw = $3, last_seen_at = NOW()
       WHERE server_id = $4 AND user_id = $5`,
      [x, z, yaw, serverId, userId]
    );
    return (result.rowCount || 0) > 0;
  }

  async getPlayers(serverId: string): Promise<ServerPlayer[]> {
    const result = await query<ServerPlayer>(
      'SELECT * FROM server_players WHERE server_id = $1 ORDER BY slot',
      [serverId]
    );
    return result.rows;
  }

  async addToWhitelist(serverId: string, userId: string): Promise<boolean> {
    try {
      await query(
        'INSERT INTO server_whitelist (server_id, user_id) VALUES ($1, $2)',
        [serverId, userId]
      );
      return true;
    } catch (error: any) {
      if (error.code === '23505') return false; // Unique violation
      throw error;
    }
  }

  async removeFromWhitelist(serverId: string, userId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM server_whitelist WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
    return (result.rowCount || 0) > 0;
  }

  async getWhitelist(serverId: string): Promise<string[]> {
    const result = await query<{ user_id: string }>(
      'SELECT user_id FROM server_whitelist WHERE server_id = $1',
      [serverId]
    );
    return result.rows.map((row: { user_id: string }) => row.user_id);
  }

  async isWhlisted(serverId: string, userId: string): Promise<boolean> {
    const result = await query<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM server_whitelist WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
    return Number(result.rows[0]?.count || 0) > 0;
  }
}

export const serverRepository = new ServerRepository();
