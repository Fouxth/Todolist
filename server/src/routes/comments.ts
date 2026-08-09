import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { emitToUser, emitToUsers } from '../lib/socket.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { canAccessTask } from '../lib/permissions.js';

export const commentsRouter = Router();

// All comment routes require auth
commentsRouter.use(authenticate);

// GET /api/comments/:taskId — get all comments for a task
commentsRouter.get('/:taskId', async (req: AuthRequest, res) => {
    try {
        const taskId = req.params.taskId as string;
        const hasAccess = await canAccessTask(req.userId!, req.userRole || 'developer', taskId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ดูความคิดเห็นในงานนี้' });
        }

        const comments = await prisma.comment.findMany({
            where: { taskId },
            include: {
                user: { select: { id: true, name: true, avatar: true, role: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// POST /api/comments/:taskId — add comment
commentsRouter.post('/:taskId', async (req: AuthRequest, res) => {
    try {
        const taskId = req.params.taskId as string;
        const { content } = req.body;
        if (!content?.trim()) {
            return res.status(400).json({ error: 'กรุณากรอกข้อความ' });
        }

        const hasAccess = await canAccessTask(req.userId!, req.userRole || 'developer', taskId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์เพิ่มความคิดเห็นในงานนี้' });
        }

        const comment = await prisma.comment.create({
            data: {
                taskId,
                userId: req.userId!,
                content: content.trim()
            },
            include: {
                user: { select: { id: true, name: true, avatar: true, role: true } }
            }
        });

        // Get task info for notification
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { assignees: true }
        });

        if (task) {
            // Activity log
            await prisma.activity.create({
                data: {
                    userId: req.userId!,
                    action: 'commented',
                    targetType: 'task',
                    targetId: task.id,
                    targetName: task.title
                }
            });

            // Notify task creator + assignees (except commenter)
            const allTaskUserIds = [...new Set([task.createdBy, ...task.assignees.map((a: any) => a.userId)])];
            const notifyUserIds = allTaskUserIds.filter(id => id !== req.userId);

            for (const uid of notifyUserIds) {
                const notif = await prisma.notification.create({
                    data: {
                        userId: uid,
                        type: 'comment',
                        title: 'มีความคิดเห็นใหม่',
                        message: `${comment.user.name} แสดงความคิดเห็นใน "${task.title}"`,
                        link: task.id
                    }
                });
                emitToUser(uid, 'new_notification', notif);
            }

            // Emit comment event only to users related to this task
            emitToUsers(allTaskUserIds, `task:${task.id}:comment`, comment);
        }

        res.status(201).json(comment);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

// DELETE /api/comments/:id — delete own comment
commentsRouter.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const comment = await prisma.comment.findUnique({ where: { id: req.params.id as string } });
        if (!comment) return res.status(404).json({ error: 'ไม่พบความคิดเห็น' });
        if (comment.userId !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบความคิดเห็นนี้' });
        }

        await prisma.comment.delete({ where: { id: req.params.id as string } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});
