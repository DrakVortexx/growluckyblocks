-- Grow Lucky Blocks - Database Schema
-- Three tables: players, servers, chat_messages.
-- Trading has been removed.

-- Players: account (username + password) and all gameplay data (JSONB blob).
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

-- Servers: private servers created by players (public servers are built in).
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

-- Chat: persisted chat history per server.
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
