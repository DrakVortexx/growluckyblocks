# Database Setup - Neon PostgreSQL

This directory contains the database schema and seed data for Grow Lucky Blocks.

## Prerequisites

- Neon PostgreSQL account
- Node.js and npm installed

## Setup Instructions

### 1. Create Neon Project

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy your connection string

### 2. Set Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@ep-cool-region-123456.aws.neon.tech/neondb?sslmode=require
```

### 3. Run Schema

```bash
# Using psql
psql $DATABASE_URL -f database/schema.sql

# Or using Node.js
node database/run-migration.js
```

### 4. Run Seed Data

```bash
psql $DATABASE_URL -f database/seed.sql
```

## Schema Overview

### Core Tables

- **users**: User accounts and authentication
- **player_profiles**: Game progression data
- **player_settings**: User preferences

### Multiplayer Tables

- **servers**: Server instances
- **server_whitelist**: Private server access
- **server_players**: Active player sessions

### Game Objects

- **bases**: Player bases per server
- **farm_plots**: Seed growing plots
- **pedestals**: Block/creature placement
- **lucky_blocks**: Lucky block inventory and placement
- **creatures**: Income-generating creatures

### Economy & Inventory

- **inventory_items**: General inventory
- **lucky_block_inventory**: Lucky block counts by rarity
- **special_lucky_inventory**: Special blocks (valentines, leprechaun, etc.)
- **lucky_trait_inventory**: Trait-modified blocks
- **blue_moon_inventory**: Blue moon variants
- **soulbound_inventory**: Soulbound items
- **combat_equipment**: Bats and combat tools
- **transactions**: Economy audit log

### Social & Events

- **steals**: Stealing event tracking
- **daily_rewards**: Daily reward tracking
- **rebirths**: Rebirth history
- **cosmetics**: Cosmetic items
- **achievements**: Achievement progress
- **chat_messages**: Server chat history

## Migration Notes

The schema includes:
- UUID primary keys for most tables
- Automatic `updated_at` timestamps via triggers
- Foreign key constraints with appropriate CASCADE behavior
- Performance indexes for common queries
- Check constraints for data validation

## Backups

Neon automatically handles backups, but you can manually export:

```bash
pg_dump $DATABASE_URL > backup.sql
```

## Troubleshooting

### Connection Issues

Ensure your DATABASE_URL includes `?sslmode=require` for Neon.

### Permission Errors

Make sure you're using the correct role with appropriate permissions.

### Schema Conflicts

If you need to reset the database, drop all tables first:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Then re-run the schema and seed files.
