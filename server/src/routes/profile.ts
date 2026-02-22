import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

export const profileRouter = Router();
profileRouter.use(authenticate);

// GET /api/profile — get current user profile
profileRouter.get('/', async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId! },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                department: true,
                status: true,
                createdAt: true
            }
        });
        if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
        res.json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PATCH /api/profile — update name, avatar, department
profileRouter.patch('/', async (req: AuthRequest, res) => {
    try {
        const { name, email, avatar, department, status } = req.body;
        const data: Record<string, string> = {};
        if (name?.trim()) data.name = name.trim();
        if (email?.trim()) data.email = email.trim();
        if (avatar?.trim()) data.avatar = avatar.trim();
        if (department !== undefined) data.department = department;
        if (status?.trim()) data.status = status.trim();

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'ไม่มีข้อมูลที่จะอัปเดต' });
        }

        const user = await prisma.user.update({
            where: { id: req.userId! },
            data
        });
        const { password: _pw, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PATCH /api/profile/password — change password
profileRouter.patch('/password', async (req: AuthRequest, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.userId! } });
        if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.userId! },
            data: { password: hashed }
        });

        res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});
