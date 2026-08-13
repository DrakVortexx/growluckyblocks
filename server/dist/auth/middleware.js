import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { userRepository } from '../database/repositories/UserRepository.js';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
export async function verifyAuth(req, res, opts = {}) {
    const strict = opts.strict !== false;
    // Try JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await userRepository.findById(decoded.userId);
            if (user) {
                return {
                    uid: user.id,
                    email: user.email || '',
                    username: user.username,
                    isLocal: user.authProvider === 'local'
                };
            }
        }
        catch (err) {
            console.error('Failed to verify JWT token:', err);
        }
    }
    // Try CrazyGames headers
    const cgUserId = req.headers['x-crazygames-userid'];
    const cgUsername = req.headers['x-crazygames-username'];
    if (cgUserId && cgUsername) {
        let user = await userRepository.findByAuthProvider('crazygames', cgUserId);
        if (!user) {
            user = await userRepository.create({
                username: cgUsername,
                authProvider: 'crazygames',
                authProviderId: cgUserId
            });
        }
        return {
            uid: user.id,
            email: user.email || '',
            username: user.username,
            isCrazyGames: true
        };
    }
    // Try guest authentication
    const guestId = req.headers['x-guest-id'];
    const guestUsername = req.headers['x-guest-username'];
    if (guestId && guestUsername) {
        let user = await userRepository.findByAuthProvider('guest', guestId);
        if (!user) {
            user = await userRepository.create({
                username: guestUsername,
                authProvider: 'guest',
                authProviderId: guestId
            });
        }
        return {
            uid: user.id,
            email: user.email || '',
            username: user.username,
            isGuest: true
        };
    }
    if (strict) {
        res.status(401).json({ error: 'Unauthorized' });
        return null;
    }
    return null;
}
export async function requireAuth(req, res, next) {
    const user = await verifyAuth(req, res, { strict: true });
    if (!user)
        return;
    req.user = user;
    next();
}
export async function requireAdmin(req, res, next) {
    const user = await verifyAuth(req, res, { strict: true });
    if (!user)
        return;
    const dbUser = await userRepository.findById(user.uid);
    if (!dbUser || !dbUser.isAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    req.user = user;
    next();
}
export function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
export async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
