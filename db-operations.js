const { pool, hasDatabaseConfig } = require('./database');

const PLAYERS_TABLE = 'players';
const SERVERS_TABLE = 'servers';
const CHAT_TABLE = 'chat';
const TRADES_TABLE = 'trades';

const FIRESTORE_TIMEOUT_MS = 12000;

function sanitizeDocData(data) {
  if (!data || typeof data !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('$')) continue;
    out[key] = value;
  }
  return out;
}

function deepClone(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

function mergePatch(base, patch) {
  const out = deepClone(base) || {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = mergePatch(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function isDatastoreNotFound(err) {
  return err?.code === '404' || err?.code === 'PGRST116' || err?.message?.includes('not found');
}

function isDatastoreAuthError(err) {
  return err?.code === 'PGRST301' || err?.message?.includes('auth') || err?.message?.includes('permission');
}

async function datastoreCall(op) {
  if (!hasDatabaseConfig) {
    const e = new Error('database-not-configured');
    e.code = 500;
    throw e;
  }
  try {
    return await Promise.race([
      op(),
      new Promise((_, reject) => {
        setTimeout(() => {
          const e = new Error('datastore-timeout');
          e.code = 4;
          reject(e);
        }, FIRESTORE_TIMEOUT_MS);
      })
    ]);
  } catch (err) {
    throw err;
  }
}

async function getDocumentById(table, documentId, actor = null) {
  void actor;
  return datastoreCall(async () => {
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE id = $1`,
      [documentId]
    );
    if (result.rows.length === 0) {
      const e = new Error('not_found');
      e.code = 404;
      throw e;
    }
    const row = result.rows[0];
    return { 
      $id: row.id, 
      ...sanitizeDocData(row) 
    };
  });
}

async function listDocuments(table, queries = [], actor = null) {
  void actor;
  return datastoreCall(async () => {
    let sql = `SELECT * FROM ${table}`;
    const params = [];
    let paramIndex = 1;
    let limitN = 100;

    const whereClauses = [];
    for (const entry of Array.isArray(queries) ? queries : []) {
      if (!entry || typeof entry !== 'object') continue;
      if (entry.op === 'equal') {
        // Handle JSONB field access (e.g., profile->>'usernameLower')
        const field = String(entry.field || '');
        if (field.includes('->>')) {
          whereClauses.push(`${field} = $${paramIndex}`);
        } else {
          whereClauses.push(`${field} = $${paramIndex}`);
        }
        params.push(entry.value);
        paramIndex++;
      } else if (entry.op === 'limit') {
        const n = Number(entry.value || 0);
        if (Number.isFinite(n) && n > 0) limitN = Math.floor(n);
      }
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }
    sql += ` LIMIT $${paramIndex}`;
    params.push(limitN);

    const result = await pool.query(sql, params);
    return {
      documents: result.rows.map(row => ({ $id: row.id, ...sanitizeDocData(row) }))
    };
  });
}

async function createDocument(table, documentId, data, actor = null) {
  void actor;
  return datastoreCall(async () => {
    const payload = sanitizeDocData(data);
    const columns = ['id', ...Object.keys(payload)];
    const values = [documentId, ...Object.values(payload)];
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    await pool.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return { $id: documentId, ...payload };
  });
}

async function updateDocument(table, documentId, data, actor = null) {
  void actor;
  return datastoreCall(async () => {
    const payload = sanitizeDocData(data);
    const setClauses = Object.keys(payload).map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [documentId, ...Object.values(payload)];

    const result = await pool.query(
      `UPDATE ${table} SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      const e = new Error('not_found');
      e.code = 404;
      throw e;
    }
    return { $id: documentId, ...sanitizeDocData(result.rows[0]) };
  });
}

async function deleteDocument(table, documentId, actor = null) {
  void actor;
  return datastoreCall(async () => {
    const result = await pool.query(
      `DELETE FROM ${table} WHERE id = $1`,
      [documentId]
    );
    if (result.rowCount === 0) {
      const e = new Error('not_found');
      e.code = 404;
      throw e;
    }
    return { ok: true };
  });
}

module.exports = {
  getDocumentById,
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  isDatastoreNotFound,
  isDatastoreAuthError,
  sanitizeDocData,
  deepClone,
  mergePatch,
  hasDatabaseConfig
};
