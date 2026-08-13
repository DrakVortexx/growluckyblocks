# Grow Lucky Blocks - Cinematic Multiplayer 3D Game

A polished, cinematic multiplayer 3D game with server-authoritative architecture and Neon PostgreSQL database backend.

## Live Deployments

- **API Server**: https://growluckyblocks-tfpd.onrender.com
- **Game Client**: https://playgrowlb.onrender.com

## Project Structure

```
growluckyblocks-main/
├── client/          # React + Three.js client application (static site)
├── server/          # Node.js server (web service)
├── assets/          # Game assets (blocks, creatures)
└── README.md        # This file
```

## Features

- **Server-Authoritative Architecture**: All game logic validated server-side
- **Multiplayer**: Real-time multiplayer with WebSocket support
- **Database**: PostgreSQL (Neon) for persistent data
- **Gameplay**: Lucky blocks, creatures, stealing, base locking, economy
- **Cinematic Graphics**: Three.js 3D rendering with visual effects
- **Authentication**: Username + password accounts with JWT tokens (no email required)

## Prerequisites

- Node.js 18+
- npm or yarn
- Neon PostgreSQL account

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/DrakVortexx/growluckyblocks.git
cd growluckyblocks-main
```

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cd server
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-cool-region-123456.aws.neon.tech/neondb?sslmode=require

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. Set Up Neon PostgreSQL

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy your connection string to `DATABASE_URL`

### 5. Run Database Migrations

```bash
# From server directory
cd server
psql $DATABASE_URL -f database/schema.sql
psql $DATABASE_URL -f database/seed.sql
```

## Development

### Starting the Server

```bash
cd server
npm run dev
```

The server will start on `http://localhost:3000`

### Starting the Client

```bash
cd client
npm run dev
```

The client will start on `http://localhost:5173`

### Building for Production

```bash
# Build client
cd client
npm run build
```

## Database Schema

The database uses a simple three-table schema:

- **players**: Account (username + password hash), admin flag, and all game progression stored as JSONB
- **servers**: Private servers with owner and whitelist access
- **chat_messages**: Per-server chat history

Public servers (`public-1`..`public-3`) live in server memory and are not stored in the database. Trading has been removed for now.

See `server/database/schema.sql` for the complete schema.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register with username + password (returns JWT token)
- `POST /api/auth/login` - Login with username + password (returns JWT token)
- `GET /api/auth/me` - Get current account (JWT required)

### Servers
- `POST /api/play` - Join a randomized public server (JWT required)
- `GET /api/servers` - List private servers you own or are whitelisted on (JWT required)
- `POST /api/servers/create` - Create a private server (JWT required)

### WebSocket
- `WS /ws?token=<jwt>&serverId=<id>` - Real-time game connection

## Game Mechanics

### Lucky Blocks
- Place on pedestals to grow
- Growth stages: Seed → Tiny → Growing → Large → Ready
- Rarity affects rewards and growth time
- Mutations: normal, bluemoon, soulbound
- Traits: leprechaun
- Unified inventory system tracks all variants

### Creatures
- Provide passive income ($/sec)
- Can be stolen by other players
- Rarity affects income rate
- Place on pedestals in your base

### Stealing
- Target other players' creatures/blocks
- Stealing time depends on rarity
- Victim gets notified
- Thief must escape to their base to secure

### Base Locking
- Temporary protection from stealing
- Duration increases with rebirths
- Server-controlled timer

### Economy
- Currencies: Money, Stardust, Seeds
- Server-authoritative game logic

## Admin Operations

Admin users can:
- Spawn lucky blocks and creatures
- Give items to players
- Reset player data
- Activate server luck events
- Manage servers

## Performance Optimization

- Database connection pooling
- Batched player data saves
- Efficient WebSocket broadcasting
- Indexed database queries
- Client-side interpolation
- Simplified schema reduces query complexity

## Security

- All game logic server-authoritative
- Client never trusted for critical actions
- JWT-based authentication
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- Rate limiting (to be implemented)

## Troubleshooting

### Database Connection Issues

Ensure your `DATABASE_URL` includes `?sslmode=require` for Neon.

### TypeScript Errors

Run `npm install` in the server and client directories to install dependencies.

### WebSocket Connection Fails

Check that the server is running and the WebSocket path is correct (`/ws`).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.

## Credits

- Original game: DrakVortexx
- Rebuild architecture: Server-authoritative multiplayer with Neon PostgreSQL
