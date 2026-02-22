import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const notificationsRouter = Router();

// Auth is handled globally by the authenticate middleware in index.ts
// req.userId is set by the global authenticate middleware

// GET /api/notifications — get current user's notifications
notificationsRouter.get('/', async (req: any, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        const unreadCount = await prisma.notification.count({
            where: { userId: req.userId, read: false }
        });
        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// PATCH /api/notifications/read-all — mark all as read (must be before :id routes!)
notificationsRouter.patch('/read-all', async (req: any, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.userId, read: false },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

// PATCH /api/notifications/:id/read — mark as read
notificationsRouter.patch('/:id/read', async (req: any, res) => {
    try {
        const notification = await prisma.notification.update({
            where: { id: req.params.id, userId: req.userId },
            data: { read: true }
        });
        res.json(notification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// DELETE /api/notifications/:id
notificationsRouter.delete('/:id', async (req: any, res) => {
    try {
        await prisma.notification.delete({
            where: { id: req.params.id, userId: req.userId }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});
