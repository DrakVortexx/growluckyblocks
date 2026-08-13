// Authentication middleware for Express - JWT-based with Neon PostgreSQL
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { userRepository } from '../database/repositories/UserRepository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    username: string;
    isLocal?: boolean;
    isCrazyGames?: boolean;
    isGuest?: boolean;
  };
}

export async function verifyAuth(req: AuthRequest, res: Response, opts: { strict?: boolean } = {}): Promise<AuthRequest['user'] | null> {
  const strict = opts.strict !== false;

  // Try JWT token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await userRepository.findById(decoded.userId);
      if (user) {
        return {
          uid: user.id,
          email: user.email || '',
          username: user.username,
          isLocal: user.authProvider === 'local'
        };
      }
    } catch (err) {
      console.error('Failed to verify JWT token:', err);
    }
  }

  // Try CrazyGames headers
  const cgUserId = req.headers['x-crazygames-userid'] as string;
  const cgUsername = req.headers['x-crazygames-username'] as string;

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
  const guestId = req.headers['x-guest-id'] as string;
  const guestUsername = req.headers['x-guest-username'] as string;

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

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const user = await verifyAuth(req, res, { strict: true });
  if (!user) return;
  req.user = user;
  next();
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const user = await verifyAuth(req, res, { strict: true });
  if (!user) return;

  const dbUser = await userRepository.findById(user.uid);
  if (!dbUser || !dbUser.isAdmin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  req.user = user;
  next();
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
