# Neon PostgreSQL & Render Deployment Guide

## Environment Variables for Render

You need to configure these environment variables in your Render dashboard:

### Required Variables:

1. **DATABASE_URL** (Required)
   - Get this from your Neon dashboard at https://console.neon.tech
   - Format: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`
   - This is your Neon PostgreSQL connection string

### Optional Variables:

2. **PORT** (Optional)
   - Default: `10000` (configured in render.yaml)
   - Render sets this automatically, but you can override if needed

3. **NODE_ENV** (Optional)
   - Default: `production`
   - Set to `development` for local testing

4. **PLAYERS_TABLE** (Optional)
   - Default: `players`
   - Override if you want a different table name

5. **SERVERS_TABLE** (Optional)
   - Default: `servers`
   - Override if you want a different table name

6. **CHAT_TABLE** (Optional)
   - Default: `chat`
   - Override if you want a different table name

7. **TRADES_TABLE** (Optional)
   - Default: `trades`
   - Override if you want a different table name

## Setup Steps:

### 1. Create Neon Database
1. Go to https://console.neon.tech
2. Create a new project
3. Copy the connection string (Connection String > Node.js)
4. Set it as `DATABASE_URL` in Render environment variables

### 2. Run Database Schema
Connect to your Neon database and run the schema.sql file:

```bash
# Using psql
psql $DATABASE_URL -f schema.sql

# Or run each SQL statement in the Neon console SQL editor
```

### 3. Deploy to Render
1. Push your code to GitHub
2. Create a new Web Service in Render
3. Connect your GitHub repository
4. Render will automatically detect the render.yaml file
5. Add the `DATABASE_URL` environment variable
6. Deploy!

### 4. Access Your Game
After deployment, your game will be accessible at:
- `https://your-app-name.onrender.com` - The game client
- `https://your-app-name.onrender.com/api/*` - API endpoints
- WebSocket connections work at the same URL

## How It Works:

The server now serves both:
- **Static files** (index.html, assets, client folder) - The game client
- **API endpoints** (/api/*) - Backend for game logic
- **WebSocket server** - Real-time multiplayer

When you deploy to Render, the single web service handles everything at the same URL.

## Migration Notes:

- Firebase has been replaced with Neon PostgreSQL
- The `pg` package is now used instead of `firebase-admin`
- All data is stored as JSONB in PostgreSQL for flexibility
- The database schema includes: players, servers, chat, and trades tables
- Connection pooling is handled by the `pg` package
- The game client is served directly from the server at the root URL
- No separate client deployment needed - everything runs on one web service
