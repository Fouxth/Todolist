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
        const { password, ...rest } = req.body;
        const hashedPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('password123', 10);
        const user = await prisma.user.create({
            data: { ...rest, password: hashedPassword }
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
        // Only admin can update other users
        if (req.userId !== req.params.id && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้คนอื่น' });
        }

        // Non-admin cannot change role
        if (req.userRole !== 'admin' && req.body.role) {
            delete req.body.role;
        }

        const user = await prisma.user.update({
            where: { id: req.params.id as string },
            data: req.body
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
