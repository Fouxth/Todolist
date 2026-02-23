import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { createAndSendNotification, getIO } from '../lib/socket.js';

export const chatsRouter = Router();
chatsRouter.use(authenticate);

const MESSAGES_PER_PAGE = 50;

const memberSelect = {
    include: {
        user: {
            select: { id: true, name: true, avatar: true, status: true }
        }
    }
};

// GET /api/chats — list all chats for the current user
chatsRouter.get('/', async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;

        const memberships = await prisma.chatMember.findMany({
            where: { userId },
            include: {
                chat: {
                    include: {
                        members: memberSelect,
                        project: { select: { id: true, name: true, color: true } },
                        messages: {
                            take: 1,
                            orderBy: { createdAt: 'desc' },
                            include: {
                                user: { select: { id: true, name: true, avatar: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { chat: { updatedAt: 'desc' } }
        });

        // Count unread for each chat
        const chats = await Promise.all(memberships.map(async (m) => {
            const unreadCount = await prisma.chatMessage.count({
                where: {
                    chatId: m.chatId,
                    userId: { not: userId },
                    createdAt: { gt: m.lastRead ?? new Date(0) }
                }
            });
            return { ...m.chat, unreadCount, myLastRead: m.lastRead };
        }));

        res.json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// POST /api/chats — create or return existing chat
chatsRouter.post('/', async (req: AuthRequest, res) => {
    try {
        const { type, projectId, memberIds } = req.body;
        const createdBy = req.userId!;

        if (!type || !['direct', 'project'].includes(type)) {
            return res.status(400).json({ error: 'Invalid chat type' });
        }

        // ─── Direct chat ───────────────────────────────────────────────
        if (type === 'direct') {
            if (!memberIds || memberIds.length !== 1) {
                return res.status(400).json({ error: 'Direct chat requires exactly one other member' });
            }
            const otherId = memberIds[0] as string;

            // Return existing direct chat between these two users
            const existing = await prisma.chat.findFirst({
                where: {
                    type: 'direct',
                    AND: [
                        { members: { some: { userId: createdBy } } },
                        { members: { some: { userId: otherId } } }
                    ]
                },
                include: { members: memberSelect }
            });
            if (existing) return res.json(existing);

            const chat = await prisma.chat.create({
                data: {
                    type: 'direct',
                    createdBy,
                    members: {
                        create: [{ userId: createdBy }, { userId: otherId }]
                    }
                },
                include: { members: memberSelect }
            });

            await createAndSendNotification(
                otherId, 'chat', '💬 แชทใหม่',
                'มีคนเริ่มแชทกับคุณ', chat.id
            );

            return res.json(chat);
        }

        // ─── Project chat ───────────────────────────────────────────────
        if (!projectId) {
            return res.status(400).json({ error: 'projectId required for project chat' });
        }

        // Return existing project chat
        const existing = await prisma.chat.findFirst({
            where: { type: 'project', projectId },
            include: { members: memberSelect, project: { select: { id: true, name: true, color: true } } }
        });
        if (existing) return res.json(existing);

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { teams: { include: { members: true } } }
        });

        // Collect all unique project member userIds
        const memberUserIds = [
            ...new Set(project?.teams.flatMap(t => t.members.map(m => m.userId)) ?? [])
        ];
        if (!memberUserIds.includes(createdBy)) memberUserIds.push(createdBy);

        const chat = await prisma.chat.create({
            data: {
                type: 'project',
                name: `${project?.name ?? 'โปรเจกต์'}`,
                projectId,
                createdBy,
                members: {
                    create: memberUserIds.map(uid => ({ userId: uid }))
                }
            },
            include: {
                members: memberSelect,
                project: { select: { id: true, name: true, color: true } }
            }
        });

        return res.json(chat);
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

// GET /api/chats/:id/messages — paginated messages
chatsRouter.get('/:id/messages', async (req: AuthRequest, res) => {
    try {
        const chatId = req.params.id as string;
        const userId = req.userId!;
        const before = req.query.before as string | undefined;

        const member = await prisma.chatMember.findUnique({
            where: { chatId_userId: { chatId, userId } }
        });
        if (!member) return res.status(403).json({ error: 'Not a member' });

        const messages = await prisma.chatMessage.findMany({
            where: {
                chatId,
                ...(before ? { createdAt: { lt: new Date(before) } } : {})
            },
            take: MESSAGES_PER_PAGE,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                replyTo: {
                    include: {
                        user: { select: { id: true, name: true } }
                    }
                }
            }
        });

        res.json(messages.reverse()); // chronological order
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/chats/:id/messages — send a message
chatsRouter.post('/:id/messages', async (req: AuthRequest, res) => {
    try {
        const chatId = req.params.id as string;
        const userId = req.userId!;
        const { content, type = 'text', attachmentUrl, replyToId } = req.body;

        if (!content?.trim() && !attachmentUrl) {
            return res.status(400).json({ error: 'Content or attachment required' });
        }

        const member = await prisma.chatMember.findUnique({
            where: { chatId_userId: { chatId, userId } }
        });
        if (!member) return res.status(403).json({ error: 'Not a member' });

        const message = await prisma.chatMessage.create({
            data: {
                chatId, userId,
                content: content?.trim() ?? '',
                type, attachmentUrl,
                replyToId: replyToId || null
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                replyTo: {
                    include: { user: { select: { id: true, name: true } } }
                }
            }
        });

        // Bump chat.updatedAt so it sorts to top
        await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

        // Broadcast to everyone in the chat room
        getIO().to(`chat:${chatId}`).emit('chat:message', message);

        // Push in-app notification to offline members (not in room)
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: {
                members: true,
                project: { select: { name: true } }
            }
        });

        if (chat) {
            const otherIds = chat.members
                .filter((m: { userId: string }) => m.userId !== userId)
                .map((m: { userId: string }) => m.userId);

            const senderName = message.user.name;
            const chatName = chat.type === 'project'
                ? `#${chat.project?.name ?? 'กลุ่ม'}`
                : senderName;
            const preview = (content ?? '📎').substring(0, 60);

            for (const uid of otherIds) {
                await createAndSendNotification(
                    uid, 'chat',
                    `💬 ${chatName}`,
                    `${senderName}: ${preview}`,
                    chatId
                );
            }
        }

        res.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// PATCH /api/chats/:id/read — mark all messages as read
chatsRouter.patch('/:id/read', async (req: AuthRequest, res) => {
    try {
        const chatId = req.params.id as string;
        const userId = req.userId!;

        await prisma.chatMember.update({
            where: { chatId_userId: { chatId, userId } },
            data: { lastRead: new Date() }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking read:', error);
        res.status(500).json({ error: 'Failed to mark read' });
    }
});

// DELETE /api/chats/messages/:id — delete own message
chatsRouter.delete('/messages/:id', async (req: AuthRequest, res) => {
    try {
        const messageId = req.params.id as string;
        const userId = req.userId!;

        const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
        if (!msg) return res.status(404).json({ error: 'Message not found' });
        if (msg.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        await prisma.chatMessage.delete({ where: { id: messageId } });

        getIO().to(`chat:${msg.chatId}`).emit('chat:message:deleted', { id: messageId, chatId: msg.chatId });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// PATCH /api/chats/messages/:id — edit own message
chatsRouter.patch('/messages/:id', async (req: AuthRequest, res) => {
    try {
        const messageId = req.params.id as string;
        const userId = req.userId!;
        const { content } = req.body;

        if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

        const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
        if (!msg) return res.status(404).json({ error: 'Message not found' });
        if (msg.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        const updated = await prisma.chatMessage.update({
            where: { id: messageId },
            data: { content: content.trim(), editedAt: new Date() },
            include: {
                user: { select: { id: true, name: true, avatar: true } }
            }
        });

        getIO().to(`chat:${msg.chatId}`).emit('chat:message:edited', updated);

        res.json(updated);
    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({ error: 'Failed to edit message' });
    }
});
