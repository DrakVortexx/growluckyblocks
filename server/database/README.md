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

Three tables:

- **players**: Account (username + password hash), admin flag, and all game progression stored as JSONB in `data`
- **servers**: Private servers with owner and whitelist access
- **chat_messages**: Per-server chat history

Public servers (`public-1`..`public-3`) live in server memory and are not stored in the database.

## Migration Notes

The schema includes:
- UUID primary key for players (`gen_random_uuid()`, built into PostgreSQL 13+ / Neon)
- Foreign key constraints with appropriate CASCADE behavior
- Performance indexes for common queries

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
