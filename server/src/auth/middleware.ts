import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthUser {
  uid: string;
  username: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function generateToken(userId: string): string {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { uid: string };
    return { uid: decoded.uid, username: '', email: '' };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
