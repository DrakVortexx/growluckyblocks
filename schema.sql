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
    xp INTEGER DEFAULT 0
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_servers_created ON servers(created_at DESC);
