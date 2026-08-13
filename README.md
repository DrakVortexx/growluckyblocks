# Grow Lucky Blocks - Cinematic Multiplayer 3D Game

A polished, cinematic multiplayer 3D game with server-authoritative architecture and Neon PostgreSQL database backend.

## Project Structure

```
growluckyblocks-main/
├── client/          # React + Three.js client application
├── server/          # Node.js + TypeScript server
├── shared/          # Shared TypeScript types and constants
├── database/        # PostgreSQL schema and migrations
└── assets/          # Game assets (blocks, creatures)
```

## Features

- **Server-Authoritative Architecture**: All game logic validated server-side
- **Multiplayer**: Real-time multiplayer with WebSocket support
- **Database**: PostgreSQL (Neon) for persistent data
- **Gameplay**: Lucky blocks, creatures, stealing, base locking, economy
- **Cinematic Graphics**: Three.js 3D rendering with visual effects
- **Authentication**: JWT-based auth with CrazyGames and guest support

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

# Admin Configuration
ADMIN_EMAIL=naturebenji@gmail.com
ADMIN_USERNAME=DrakVortexx
```

### 4. Set Up Neon PostgreSQL

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy your connection string to `DATABASE_URL`

### 5. Run Database Migrations

```bash
# From project root
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
# Build server
cd server
npm run build

# Build client
cd client
npm run build
```

## Database Schema

The database uses a simplified relational schema with 13 tables:

### Core Tables
- **users**: User accounts and authentication (JWT-based)
- **player_profiles**: Game progression data (money, stardust, seeds, rebirths)
- **player_settings**: User preferences (graphics, audio, controls)

### Multiplayer Tables
- **servers**: Multiplayer server instances
- **server_whitelist**: Private server access control
- **server_players**: Active player sessions

### Gameplay Tables
- **bases**: Player bases per server
- **pedestals**: Block/creature placement (60 pedestals per base, 6 floors)
- **lucky_blocks**: Lucky block inventory and placement
- **creatures**: Income-generating creatures

### Economy Tables
- **inventory_items**: Unified inventory system (replaces 5 separate inventory tables)
- **transactions**: Economy audit log
- **steals**: Stealing event tracking
- **daily_rewards**: Daily reward tracking

**Schema Reduction**: Reduced from 23 tables to 13 tables by:
- Merging 5 duplicate inventory tables into one `inventory_items` table
- Removing obsolete combat equipment table
- Removing unused farm plots table
- Removing rebirths history (stored in profile)
- Removing unused cosmetics and achievements tables
- Removing chat messages (handled via WebSocket)

See `database/schema.sql` for the complete schema.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user (returns JWT token)

### Servers
- `GET /api/servers` - List all servers
- `POST /api/servers/create` - Create new server
- `GET /api/servers/:id` - Get server details

### Players
- `GET /api/player/me` - Get current player data
- `POST /api/player/profile` - Update player profile

### WebSocket
- `WS /ws?playerId=<id>&serverId=<id>` - Real-time game connection

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
- Server-authoritative transactions
- All changes logged for audit
- Unified inventory system

## Migration from Old Save Data

A migration layer is provided to convert existing save data to the new schema.

```bash
cd server
npx tsx src/migrations/migrate-local-save.ts
```

The migration:
- Reads legacy player data
- Validates and converts to new format
- Creates user/profile records
- Imports currencies, inventory, creatures
- Is idempotent (safe to run multiple times)

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
- Simplified schema: Reduced from 23 to 13 tables for better performance
