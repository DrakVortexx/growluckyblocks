# Grow Lucky Blocks

A multiplayer 3D game built with React, Three.js, Express, and PostgreSQL.

## Project Structure

```
growluckyblocks-main/
├── client/          # React + Three.js game client
│   ├── src/
│   │   ├── components/    # React components (Auth, GameWorld, UI)
│   │   ├── lib/          # API client
│   │   ├── store/        # Zustand state management
│   │   └── main.tsx      # App entry point
│   └── package.json
├── server.js        # Express + WebSocket server
├── package.json     # Root dependencies
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
npm run install:all
```

### 3. Start the application

Terminal 1 (server):
```bash
npm run dev:server
```

Terminal 2 (client):
```bash
npm run dev:client
```

The game will be available at `http://localhost:5173`

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

- Multiplayer 3D world with React Three Fiber
- Lucky block collection
- Player authentication with JWT (username + password)
- Player profiles and inventory
- Server creation and management
- Real-time WebSocket communication

## Tech Stack

- **Client**: React + Vite + TypeScript + Three.js (@react-three/fiber)
- **Server**: Express + WebSocket + Node.js
- **Database**: Neon PostgreSQL
- **Auth**: JWT tokens + bcrypt
- **State**: Zustand
