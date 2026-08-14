// Main server entry point
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import cors from 'cors';
import { verifyAuth, generateToken } from './auth/middleware.js';
import { userRepository } from './database/repositories/UserRepository.js';
import { serverRepository } from './database/repositories/ServerRepository.js';
dotenv.config();
const PORT = Number(process.env.PORT) || 3000;
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
// CORS configuration
const allowedOrigins = [
    'https://playgrowlb.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000'
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
// Middleware
app.use(express.json());
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Authentication endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        if (!username || username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }
        // Check if username is already taken
        const existingUser = await userRepository.findByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already taken' });
        }
        // For now, we'll create a user without actual Supabase auth
        // In production, this would call Supabase auth first
        const user = await userRepository.create({
            username,
            email,
            authProvider: 'local',
            authProviderId: email
        });
        // Create profile and settings
        await userRepository.createProfile(user.id);
        await userRepository.createSettings(user.id);
        // Generate token
        const token = generateToken(user.id);
        res.json({ ok: true, user, token });
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        // Find user by email
        const user = await userRepository.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // For now, we'll accept any password since we don't have password hashing implemented
        // In production, verify the password hash
        // const isValid = await verifyPassword(password, user.passwordHash);
        // if (!isValid) {
        //   return res.status(401).json({ error: 'Invalid credentials' });
        // }
        // Generate token
        const token = generateToken(user.id);
        res.json({ ok: true, user, token });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});
// Server endpoints
app.get('/api/servers', async (req, res) => {
    try {
        const servers = await serverRepository.findAll();
        res.json({ servers });
    }
    catch (error) {
        console.error('Get servers error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});
app.post('/api/servers/create', async (req, res) => {
    try {
        const user = await verifyAuth(req, res);
        if (!user)
            return;
        const { name, description, isPrivate, maxPlayers } = req.body;
        if (!name || name.length < 1) {
            return res.status(400).json({ error: 'Server name required' });
        }
        const serverId = `server-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        const server = await serverRepository.create({
            id: serverId,
            name,
            description,
            ownerId: user.uid,
            isPrivate: isPrivate || false,
            maxPlayers: maxPlayers || 8
        });
        res.json({ ok: true, server });
    }
    catch (error) {
        console.error('Create server error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});
// Player endpoints
app.get('/api/player/me', async (req, res) => {
    try {
        const user = await verifyAuth(req, res);
        if (!user)
            return;
        const dbUser = await userRepository.findById(user.uid);
        const profile = await userRepository.getProfile(user.uid);
        const settings = await userRepository.getSettings(user.uid);
        if (!dbUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            user: dbUser,
            profile,
            settings
        });
    }
    catch (error) {
        console.error('Get player error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});
// WebSocket connection
wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const playerId = url.searchParams.get('playerId');
    const serverId = url.searchParams.get('serverId') || 'public-1';
    console.log(`WebSocket connection: playerId=${playerId}, serverId=${serverId}`);
    if (!playerId) {
        ws.close();
        return;
    }
    // Send initial state
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
                    // Update player position
                    break;
                case 'chat':
                    // Handle chat message
                    break;
                default:
                    console.log('Unknown message type:', message.type);
            }
        }
        catch (error) {
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
server.listen(PORT, () => {
    console.log(`Grow Lucky Blocks server listening on http://localhost:${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
