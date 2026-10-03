-- Grow Lucky Blocks Database Schema
-- PostgreSQL Schema for Neon Database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player profiles table
CREATE TABLE IF NOT EXISTS player_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    money INTEGER DEFAULT 1000,
    stardust INTEGER DEFAULT 0,
    seeds INTEGER DEFAULT 10,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    rebirth_count INTEGER DEFAULT 0,
    total_play_time INTEGER DEFAULT 0
);

-- Player settings table
CREATE TABLE IF NOT EXISTS player_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    graphics_quality VARCHAR(20) DEFAULT 'medium',
    sound_enabled BOOLEAN DEFAULT true,
    music_enabled BOOLEAN DEFAULT true
);

-- Servers table
CREATE TABLE IF NOT EXISTS servers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_private BOOLEAN DEFAULT false,
    max_players INTEGER DEFAULT 8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creatures table (player-owned creatures)
CREATE TABLE IF NOT EXISTS creatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    creature_type VARCHAR(100) NOT NULL,
    creature_rarity VARCHAR(50) NOT NULL, -- basic, rare, epic, legendary, mythic, godly, omniversal, secret, transcendent
    name VARCHAR(255),
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT false
);

-- Creature inventory/stats per creature
CREATE TABLE IF NOT EXISTS creature_stats (
    creature_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
    stat_name VARCHAR(50) NOT NULL,
    stat_value INTEGER DEFAULT 0,
    PRIMARY KEY (creature_id, stat_name)
);

-- Lucky blocks inventory
CREATE TABLE IF NOT EXISTS lucky_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    block_type VARCHAR(100) NOT NULL,
    block_rarity VARCHAR(50) NOT NULL,
    quantity INTEGER DEFAULT 1,
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rebirth history
CREATE TABLE IF NOT EXISTS rebirth_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rebirth_number INTEGER NOT NULL,
    rebirth_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bonus_multiplier INTEGER DEFAULT 1,
    rewards_earned JSONB
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_name VARCHAR(255) NOT NULL,
    achievement_description TEXT,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_name)
);

-- Chat messages (for in-game chat)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(255),
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'chat', -- chat, system, announcement
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trades between players
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, cancelled
    items_offered JSONB,
    items_requested JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_servers_created ON servers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creatures_user ON creatures(user_id);
CREATE INDEX IF NOT EXISTS idx_creatures_rarity ON creatures(creature_rarity);
CREATE INDEX IF NOT EXISTS idx_lucky_blocks_user ON lucky_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_rebirth_history_user ON rebirth_history(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_server ON chat_messages(server_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_initiator ON trades(initiator_id);
CREATE INDEX IF NOT EXISTS idx_trades_recipient ON trades(recipient_id);
