import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export function generateToken(userId) {
    return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '7d' });
}
export function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { uid: decoded.uid, username: '', email: '' };
    }
    catch {
        return null;
    }
}
export async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
