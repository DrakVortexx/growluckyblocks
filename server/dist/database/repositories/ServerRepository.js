import { query } from '../connection.js';
class ServerRepository {
    async create(data) {
        const result = await query('INSERT INTO servers (id, name, description, owner_id, is_private, max_players, player_count, created_at) VALUES ($1, $2, $3, $4, $5, $6, 0, NOW()) RETURNING *', [data.id, data.name, data.description || null, data.ownerId, data.isPrivate, data.maxPlayers]);
        return result.rows[0];
    }
    async findAll() {
        const result = await query('SELECT * FROM servers ORDER BY created_at DESC');
        return result.rows;
    }
    async findById(id) {
        const result = await query('SELECT * FROM servers WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    async updatePlayerCount(id, count) {
        await query('UPDATE servers SET player_count = $1 WHERE id = $2', [count, id]);
    }
}
export const serverRepository = new ServerRepository();
