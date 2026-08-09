import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { emitToAll } from '../lib/socket.js';
import type { AuthRequest } from '../middleware/auth.js';

export const eventsRouter = Router();

// GET /api/events
eventsRouter.get('/', async (_req, res) => {
    try {
        const events = await prisma.calendarEvent.findMany({
            orderBy: { startTime: 'asc' }
        });
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// POST /api/events
eventsRouter.post('/', async (req: AuthRequest, res) => {
    try {
        const { title, description, startTime, endTime, type, attendees, projectId, taskId, color } = req.body;
        const userId = req.userId!;

        if (!title || typeof title !== 'string') {
            res.status(400).json({ error: 'Event title is required' });
            return;
        }
        if (!startTime || !endTime) {
            res.status(400).json({ error: 'Start and end time are required' });
            return;
        }

        const allowedTypes = ['task', 'meeting', 'deadline', 'reminder'];
        const event = await prisma.calendarEvent.create({
            data: {
                title: title.trim(),
                description: description || undefined,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                type: allowedTypes.includes(type) ? type : 'task',
                userId,
                attendees: attendees && Array.isArray(attendees) ? attendees : [userId],
                projectId: projectId || undefined,
                taskId: taskId || undefined,
                color: color || undefined,
            }
        });

        // Send notifications to all attendees
        const attendeeIds = attendees && Array.isArray(attendees) ? attendees : [userId];
        const creator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        
        // Create notifications for all attendees
        const notificationPromises = attendeeIds.map(attendeeId => 
            prisma.notification.create({
                data: {
                    userId: attendeeId,
                    type: 'event_created',
                    title: `📅 ${type === 'meeting' ? 'ประชุม' : type === 'deadline' ? 'กำหนดส่ง' : type === 'reminder' ? 'เตือนความจำ' : 'งาน'}ใหม่`,
                    message: `${creator?.name || 'มีคน'}เพิ่มคุณในกิจกรรม "${title}"`,
                    link: `/calendar`,
                    metadata: { eventId: event.id, type }
                }
            })
        );
        
        await Promise.all(notificationPromises);

        emitToAll('event:created', event);
        res.status(201).json(event);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// PATCH /api/events/:id - Update event (owner or admin/manager)
eventsRouter.patch('/:id', async (req: AuthRequest, res) => {
    try {
        const eventId = req.params.id as string;
        const { title, description, startTime, endTime, type, color, attendees } = req.body;
        
        // Get current event to check permission & compare attendees
        const currentEvent = await prisma.calendarEvent.findUnique({
            where: { id: eventId },
            include: { user: { select: { name: true } } }
        });

        if (!currentEvent) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (currentEvent.userId !== req.userId && req.userRole !== 'admin' && req.userRole !== 'manager') {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขกิจกรรมนี้' });
        }

        const event = await prisma.calendarEvent.update({
            where: { id: eventId },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(startTime !== undefined && { startTime: new Date(startTime) }),
                ...(endTime !== undefined && { endTime: new Date(endTime) }),
                ...(type !== undefined && { type }),
                ...(color !== undefined && { color }),
                ...(attendees !== undefined && { attendees }),
            }
        });

        // If attendees changed, send notifications to new attendees
        if (attendees && currentEvent) {
            const newAttendees = attendees.filter((id: string) => !currentEvent.attendees.includes(id));
            if (newAttendees.length > 0) {
                const notificationPromises = newAttendees.map((attendeeId: string) => 
                    prisma.notification.create({
                        data: {
                            userId: attendeeId,
                            type: 'event_updated',
                            title: `📅 ถูกเพิ่มในกิจกรรม`,
                            message: `${currentEvent.user.name}เพิ่มคุณในกิจกรรม "${event.title}"`,
                            link: `/calendar`,
                            metadata: { eventId: event.id }
                        }
                    })
                );
                await Promise.all(notificationPromises);
            }
        }

        emitToAll('event:updated', event);
        res.json(event);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

// DELETE /api/events/:id (owner or admin/manager)
eventsRouter.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const eventId = req.params.id as string;
        const currentEvent = await prisma.calendarEvent.findUnique({
            where: { id: eventId }
        });

        if (!currentEvent) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (currentEvent.userId !== req.userId && req.userRole !== 'admin' && req.userRole !== 'manager') {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบกิจกรรมนี้' });
        }

        await prisma.calendarEvent.delete({
            where: { id: eventId }
        });
        emitToAll('event:deleted', { id: eventId });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});
