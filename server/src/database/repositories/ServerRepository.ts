import { v4 as uuidv4 } from 'uuid';
import { query } from '../connection.js';

export interface Server {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isPrivate: boolean;
  maxPlayers: number;
  playerCount: number;
  createdAt: Date;
}

class ServerRepository {
  async create(data: {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    isPrivate: boolean;
    maxPlayers: number;
  }): Promise<Server> {
    const result = await query(
      'INSERT INTO servers (id, name, description, owner_id, is_private, max_players, player_count, created_at) VALUES ($1, $2, $3, $4, $5, $6, 0, NOW()) RETURNING *',
      [data.id, data.name, data.description || null, data.ownerId, data.isPrivate, data.maxPlayers]
    );
    return result.rows[0];
  }

  async findAll(): Promise<Server[]> {
    const result = await query('SELECT * FROM servers ORDER BY created_at DESC');
    return result.rows;
  }

  async findById(id: string): Promise<Server | null> {
    const result = await query('SELECT * FROM servers WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async updatePlayerCount(id: string, count: number): Promise<void> {
    await query('UPDATE servers SET player_count = $1 WHERE id = $2', [count, id]);
  }
}

export const serverRepository = new ServerRepository();
