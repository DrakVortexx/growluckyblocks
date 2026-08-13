-- Grow Lucky Blocks - Seed Data
-- Initial data for the database

-- Insert default public server
INSERT INTO servers (id, name, description, owner_id, is_private, max_players, server_luck, allow_others_server_luck)
VALUES 
    ('public-1', 'Public #1', 'The main public server for all players', NULL, FALSE, 8, 1, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Insert rarity definitions (these are constants, not stored in DB but referenced in code)
-- These are documented here for reference:
-- basic, common, rare, epic, legendary, mythic, godly, secret, transcendent, omniversal

-- Insert mutation types (documented for reference):
-- normal, bluemoon, soulbound

-- Insert trait types (documented for reference):
-- none, leprechaun

-- Insert special block types (documented for reference):
-- valentinesblock, leprechaunblock, adminblock, godlyblock

-- Insert combat equipment definitions (documented for reference):
-- sprout, iron, shock, freezeray

-- Note: Creature catalog and spawn rates are defined in shared game definitions,
-- not in the database, to allow for easy updates without migrations.
