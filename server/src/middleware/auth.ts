import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { JWT_SECRET } from '../lib/config.js';
import type { Request, Response, NextFunction } from 'express';

// Extend Express Request
export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
}

/** Extract userId + role from Bearer token */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'ไม่ได้รับอนุญาต' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        req.userId = decoded.userId;

        // Fetch role from DB (cached per-request)
        prisma.user.findUnique({ where: { id: decoded.userId }, select: { role: true } })
            .then(user => {
                if (!user) return res.status(401).json({ error: 'ไม่พบผู้ใช้' });
                req.userRole = user.role;
                next();
            })
            .catch(() => res.status(500).json({ error: 'เกิดข้อผิดพลาด' }));
    } catch {
        res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
}

/** Require specific roles — use AFTER authenticate */
export function requireRole(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.userRole || !roles.includes(req.userRole)) {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้' });
        }
        next();
    };
}
