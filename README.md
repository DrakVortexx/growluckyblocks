# Grow Lucky Blocks

A simple multiplayer 3D game built with vanilla JavaScript, Three.js, Express, and PostgreSQL.

## Project Structure

```
growluckyblocks-main/
├── index.html       # Main game client
├── game.js          # Client-side game logic
├── server.js        # Express + WebSocket server
├── package.json     # Dependencies
├── .env.example     # Environment variables template
├── render.yaml      # Render deployment configuration
└── assets/          # 3D models and game assets
```

## Quick Start

### 1. Set up the database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy the connection string (Connection String > Node.js)
4. Create `.env` file and add:
   ```env
   DATABASE_URL=your_connection_string_here
   JWT_SECRET=your-secret-key
   PORT=3000
   NODE_ENV=development
   ```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the server

```bash
npm start
```

The game will be available at `http://localhost:3000`

## Deployment

### Deploy to Render

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Create a new "Web Service"
4. Connect your GitHub repository
5. Render will auto-detect the `render.yaml` file
6. Add `DATABASE_URL` environment variable (from Neon)
7. Deploy!

The deployed app will serve both the client and server from a single URL.

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required)
- `JWT_SECRET`: Secret key for JWT tokens (required)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## Game Features

- Multiplayer 3D world with Three.js
- Lucky block collection
- Player authentication with JWT
- Player profiles and inventory
- Server creation and management
- Real-time WebSocket communication
- Simple vanilla JavaScript client

## Tech Stack

- **Client**: Vanilla JavaScript + Three.js
- **Server**: Express + WebSocket + Node.js
- **Database**: Neon PostgreSQL
- **Auth**: JWT tokens + bcrypt
