// PostgreSQL (Neon) connection + schema bootstrap
require("dotenv").config();
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || "";

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

async function query(text, params) {
  return pool.query(text, params);
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(24) NOT NULL,
  username_lower VARCHAR(24) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servers (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(28) NOT NULL,
  description VARCHAR(180) NOT NULL DEFAULT '',
  owner_id UUID REFERENCES players(id) ON DELETE CASCADE,
  owner_username VARCHAR(24) NOT NULL DEFAULT '',
  is_private BOOLEAN NOT NULL DEFAULT TRUE,
  allow_others_server_luck BOOLEAN NOT NULL DEFAULT TRUE,
  whitelist_player_ids JSONB NOT NULL DEFAULT '[]',
  whitelist_usernames JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  server_id VARCHAR(40) NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  username VARCHAR(24) NOT NULL DEFAULT '',
  text VARCHAR(220) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_servers_private ON servers(is_private);
CREATE INDEX IF NOT EXISTS idx_chat_server_created ON chat_messages(server_id, created_at DESC);
`;

async function initDb() {
  if (!connectionString) {
    console.warn("[DB] DATABASE_URL not set - running without persistence");
    return false;
  }
  await query(SCHEMA_SQL);
  console.log("[DB] schema ready");
  return true;
}

module.exports = { pool, query, initDb, hasDb: !!connectionString };
