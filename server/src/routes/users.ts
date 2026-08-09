import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.js';

export const usersRouter = Router();

// GET /api/users - Get all users (any authenticated user)
usersRouter.get('/', async (_req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { name: 'asc' }
        });
        // Strip password from all users
        res.json(users.map(({ password: _pw, ...u }) => u));
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET /api/users/:id - Get user by ID
usersRouter.get('/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const { password: _pw, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// POST /api/users - Create user (admin only)
usersRouter.post('/', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { password, name, email, role, department, avatar } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'กรุณากำหนดรหัสผ่านอย่างน้อย 6 ตัวอักษร' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, role, department, avatar, password: hashedPassword }
        });
        const { password: _pw, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PATCH /api/users/:id - Update user (admin only, or self)
usersRouter.patch('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        // Only admin or manager can update other users
        if (req.userId !== req.params.id && req.userRole !== 'admin' && req.userRole !== 'manager') {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้คนอื่น' });
        }

        const isAdminOrManager = req.userRole === 'admin' || req.userRole === 'manager';

        // Whitelist editable fields; password must go through /api/profile/password
        const { name, avatar, department, currentTask, status, role } = req.body;
        const data: Record<string, unknown> = { name, avatar, department, currentTask, status };
        
        // Strictly restrict role changes to admin only (managers cannot alter roles or elevate users)
        if (req.userRole === 'admin' && role) {
            const allowedRoles = ['admin', 'manager', 'developer', 'designer', 'tester'];
            if (allowedRoles.includes(role)) {
                data.role = role;
            }
        }
        Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);

        const user = await prisma.user.update({
            where: { id: req.params.id as string },
            data
        });
        const { password: _pw, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE /api/users/:id - Delete user (admin only)
usersRouter.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
    try {
        // Prevent self-deletion
        if (req.userId === req.params.id) {
            return res.status(400).json({ error: 'ไม่สามารถลบบัญชีตัวเองได้' });
        }
        await prisma.user.delete({ where: { id: req.params.id as string } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
