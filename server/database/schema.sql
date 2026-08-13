-- Grow Lucky Blocks - Simplified Neon PostgreSQL Schema
-- Server-authoritative multiplayer database schema
-- Reduced from 23 tables to 13 tables for better performance and maintainability

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(24) NOT NULL UNIQUE,
    username_lower VARCHAR(24) NOT NULL UNIQUE,
    email VARCHAR(255),
    password_hash VARCHAR(255), -- For JWT-based auth
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'local', -- 'local', 'crazygames', 'guest'
    auth_provider_id VARCHAR(255),
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE player_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    money BIGINT NOT NULL DEFAULT 0,
    stardust BIGINT NOT NULL DEFAULT 0,
    seeds BIGINT NOT NULL DEFAULT 0,
    rebirths INTEGER NOT NULL DEFAULT 0 CHECK (rebirths >= 0),
    personal_luck INTEGER NOT NULL DEFAULT 1 CHECK (personal_luck >= 1 AND personal_luck <= 1000),
    personal_luck_unlocked INTEGER NOT NULL DEFAULT 1 CHECK (personal_luck_unlocked >= 1 AND personal_luck_unlocked <= 1000),
    total_earned BIGINT NOT NULL DEFAULT 0,
    total_stolen BIGINT NOT NULL DEFAULT 0,
    total_stolen_from BIGINT NOT NULL DEFAULT 0,
    current_server_id VARCHAR(100),
    base_floors INTEGER NOT NULL DEFAULT 1 CHECK (base_floors >= 1 AND base_floors <= 6),
    tutorial_completed BOOLEAN DEFAULT FALSE,
    tutorial_step INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE player_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    graphics_quality VARCHAR(20) DEFAULT 'medium',
    audio_enabled BOOLEAN DEFAULT TRUE,
    music_volume DECIMAL(3,2) DEFAULT 0.70 CHECK (music_volume >= 0 AND music_volume <= 1),
    sfx_volume DECIMAL(3,2) DEFAULT 0.80 CHECK (sfx_volume >= 0 AND sfx_volume <= 1),
    controls_config JSONB DEFAULT '{}',
    ui_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MULTIPLAYER SERVERS
-- ============================================================================

CREATE TABLE servers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(28) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_private BOOLEAN DEFAULT FALSE,
    max_players INTEGER DEFAULT 8 CHECK (max_players > 0),
    server_luck INTEGER DEFAULT 1 CHECK (server_luck >= 1),
    server_luck_until TIMESTAMP WITH TIME ZONE,
    allow_others_server_luck BOOLEAN DEFAULT TRUE,
    forced_blue_moon_until TIMESTAMP WITH TIME ZONE,
    forced_blue_moon_event_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE server_whitelist (
    server_id VARCHAR(100) REFERENCES servers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (server_id, user_id)
);

CREATE TABLE server_players (
    server_id VARCHAR(100) REFERENCES servers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    slot INTEGER NOT NULL CHECK (slot >= 0 AND slot < 8),
    position_x DECIMAL(10,2) DEFAULT 0,
    position_z DECIMAL(10,2) DEFAULT 0,
    position_yaw DECIMAL(5,2) DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (server_id, user_id)
);

-- ============================================================================
-- BASES & PLACEMENT
-- ============================================================================

CREATE TABLE bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id VARCHAR(100) REFERENCES servers(id) ON DELETE CASCADE,
    owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    slot INTEGER NOT NULL CHECK (slot >= 0 AND slot < 8),
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(server_id, owner_user_id, slot)
);

CREATE TABLE pedestals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_id UUID REFERENCES bases(id) ON DELETE CASCADE,
    pedestal_index INTEGER NOT NULL CHECK (pedestal_index >= 0 AND pedestal_index < 60),
    floor INTEGER DEFAULT 0 CHECK (floor >= 0 AND floor < 6),
    has_block BOOLEAN DEFAULT FALSE,
    block_rank_key VARCHAR(20),
    block_mutation VARCHAR(20) DEFAULT 'normal',
    block_trait VARCHAR(20) DEFAULT 'none',
    creature_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(base_id, pedestal_index, floor)
);

-- ============================================================================
-- GAME OBJECTS
-- ============================================================================

CREATE TABLE lucky_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    server_id VARCHAR(100) REFERENCES servers(id) ON DELETE CASCADE,
    base_id UUID REFERENCES bases(id) ON DELETE SET NULL,
    pedestal_id UUID REFERENCES pedestals(id) ON DELETE SET NULL,
    rarity VARCHAR(20) NOT NULL, -- 'basic', 'common', 'rare', 'epic', 'legendary', 'mythic', 'godly', 'secret', 'transcendent', 'omniversal'
    mutation VARCHAR(20) DEFAULT 'normal', -- 'normal', 'bluemoon', 'soulbound'
    trait VARCHAR(20) DEFAULT 'none', -- 'none', 'leprechaun'
    growth_started_at TIMESTAMP WITH TIME ZONE,
    growth_finished_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'inventory', -- 'inventory', 'growing', 'ready', 'opened'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE creatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    server_id VARCHAR(100) REFERENCES servers(id) ON DELETE CASCADE,
    base_id UUID REFERENCES bases(id) ON DELETE SET NULL,
    pedestal_id UUID REFERENCES pedestals(id) ON DELETE SET NULL,
    creature_type VARCHAR(50) NOT NULL,
    rarity VARCHAR(20) NOT NULL,
    mutation VARCHAR(20) DEFAULT 'normal',
    trait VARCHAR(20) DEFAULT 'none',
    income_per_second DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INVENTORY & ECONOMY
-- ============================================================================

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- 'lucky_block', 'seed', 'special_block'
    item_definition_id VARCHAR(100) NOT NULL, -- e.g., 'basic', 'rare', 'valentinesblock'
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    metadata JSONB DEFAULT '{}', -- Stores mutation, trait, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_definition_id, metadata)
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'earn', 'spend', 'steal', 'purchase', 'reward'
    amount BIGINT NOT NULL,
    currency VARCHAR(20) NOT NULL, -- 'money', 'stardust', 'seeds'
    source VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- GAMEPLAY SYSTEMS
-- ============================================================================

CREATE TABLE steals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thief_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    victim_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    server_id VARCHAR(100) REFERENCES servers(id) ON DELETE SET NULL,
    item_type VARCHAR(20) NOT NULL, -- 'block', 'creature'
    item_rank_key VARCHAR(20),
    item_mutation VARCHAR(20),
    item_trait VARCHAR(20),
    creature_id UUID,
    pedestal_index INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed', 'canceled'
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE daily_rewards (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_claimed_at DATE,
    streak INTEGER DEFAULT 0 CHECK (streak >= 0),
    total_claims INTEGER DEFAULT 0 CHECK (total_claims >= 0),
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_users_username_lower ON users(username_lower);
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
CREATE INDEX idx_player_profiles_current_server ON player_profiles(current_server_id);
CREATE INDEX idx_servers_owner ON servers(owner_id);
CREATE INDEX idx_servers_private ON servers(is_private);
CREATE INDEX idx_server_whitelist_user ON server_whitelist(user_id);
CREATE INDEX idx_server_players_user ON server_players(user_id);
CREATE INDEX idx_server_players_server ON server_players(server_id);
CREATE INDEX idx_bases_owner ON bases(owner_user_id);
CREATE INDEX idx_bases_server ON bases(server_id);
CREATE INDEX idx_pedestals_base ON pedestals(base_id);
CREATE INDEX idx_lucky_blocks_owner ON lucky_blocks(owner_user_id);
CREATE INDEX idx_lucky_blocks_server ON lucky_blocks(server_id);
CREATE INDEX idx_lucky_blocks_status ON lucky_blocks(status);
CREATE INDEX idx_creatures_owner ON creatures(owner_user_id);
CREATE INDEX idx_creatures_server ON creatures(server_id);
CREATE INDEX idx_inventory_items_user ON inventory_items(user_id);
CREATE INDEX idx_inventory_items_type ON inventory_items(item_type);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_steals_thief ON steals(thief_user_id);
CREATE INDEX idx_steals_victim ON steals(victim_user_id);
CREATE INDEX idx_steals_server ON steals(server_id);
CREATE INDEX idx_steals_status ON steals(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_profiles_updated_at BEFORE UPDATE ON player_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_settings_updated_at BEFORE UPDATE ON player_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bases_updated_at BEFORE UPDATE ON bases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedestals_updated_at BEFORE UPDATE ON pedestals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lucky_blocks_updated_at BEFORE UPDATE ON lucky_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creatures_updated_at BEFORE UPDATE ON creatures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_rewards_updated_at BEFORE UPDATE ON daily_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
