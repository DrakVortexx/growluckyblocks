const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database initialization
async function initDatabase() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Player profiles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        money INTEGER DEFAULT 1000,
        stardust INTEGER DEFAULT 0,
        seeds INTEGER DEFAULT 10,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0
      )
    `);

    // Player settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_settings (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        graphics_quality VARCHAR(20) DEFAULT 'medium',
        sound_enabled BOOLEAN DEFAULT true,
        music_enabled BOOLEAN DEFAULT true
      )
    `);

    // Servers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS servers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        is_private BOOLEAN DEFAULT false,
        max_players INTEGER DEFAULT 8,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Generate token
function generateToken(userId) {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await pool.query(
      'INSERT INTO users (id, username, password) VALUES ($1, $2, $3)',
      [userId, username, hashedPassword]
    );

    // Create profile and settings
    await pool.query(
      'INSERT INTO player_profiles (user_id, money, stardust, seeds, level, xp) VALUES ($1, 1000, 0, 10, 1, 0)',
      [userId]
    );

    await pool.query(
      'INSERT INTO player_settings (user_id, graphics_quality, sound_enabled, music_enabled) VALUES ($1, \'medium\', true, true)',
      [userId]
    );

    const token = generateToken(userId);
    const user = { id: userId, username };

    res.json({ ok: true, user, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // For demo purposes, skip password verification if no password set
    const validPassword = user.password ? await bcrypt.compare(password, user.password) : true;

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    const userData = { id: user.id, username: user.username };

    res.json({ ok: true, user: userData, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Server endpoints
app.get('/api/servers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM servers ORDER BY created_at DESC');
    res.json({ servers: result.rows });
  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/servers/create', authenticateToken, async (req, res) => {
  try {
    const { name, description, isPrivate, maxPlayers } = req.body;

    if (!name || name.length < 1) {
      return res.status(400).json({ error: 'Server name required' });
    }

    const serverId = `server-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    await pool.query(
      'INSERT INTO servers (id, name, description, owner_id, is_private, max_players) VALUES ($1, $2, $3, $4, $5, $6)',
      [serverId, name, description || '', req.user.uid, isPrivate || false, maxPlayers || 8]
    );

    const result = await pool.query('SELECT * FROM servers WHERE id = $1', [serverId]);
    res.json({ ok: true, server: result.rows[0] });
  } catch (error) {
    console.error('Create server error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Player endpoints
app.get('/api/player/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [req.user.uid]);
    const profileResult = await pool.query('SELECT * FROM player_profiles WHERE user_id = $1', [req.user.uid]);
    const settingsResult = await pool.query('SELECT * FROM player_settings WHERE user_id = $1', [req.user.uid]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: userResult.rows[0],
      profile: profileResult.rows[0],
      settings: settingsResult.rows[0]
    });
  } catch (error) {
    console.error('Get player error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// WebSocket connection
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const playerId = url.searchParams.get('playerId');
  const serverId = url.searchParams.get('serverId') || 'public-1';

  console.log(`WebSocket connection: playerId=${playerId}, serverId=${serverId}`);

  if (!playerId) {
    ws.close();
    return;
  }

  ws.send(JSON.stringify({
    type: 'connected',
    playerId,
    serverId,
    timestamp: Date.now()
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('WebSocket message:', message);

      // Handle different message types
      switch (message.type) {
        case 'pos':
          // Handle position updates
          break;
        case 'chat':
          // Handle chat messages
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket disconnected: playerId=${playerId}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  await initDatabase();
  server.listen(PORT, () => {
    console.log(`Grow Lucky Blocks server listening on http://localhost:${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();
