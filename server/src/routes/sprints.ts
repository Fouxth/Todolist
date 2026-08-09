import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { emitToAll } from '../lib/socket.js';
import { requireRole, type AuthRequest } from '../middleware/auth.js';

export const sprintsRouter = Router();

// GET /api/sprints - list all sprints (optionally filter by projectId)
sprintsRouter.get('/', async (req, res) => {
    try {
        const { projectId } = req.query;
        const where: Record<string, unknown> = {};
        if (projectId) where.projectId = projectId;

        const sprints = await prisma.sprint.findMany({
            where,
            include: {
                tasks: {
                    select: { id: true, status: true, title: true, priority: true, dueDate: true, assignees: { select: { userId: true } } }
                }
            },
            orderBy: { startDate: 'desc' }
        });

        const result = sprints.map(s => ({
            ...s,
            tasks: s.tasks.map(t => t.id),
            taskDetails: s.tasks.map(t => ({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate,
                assignees: t.assignees.map(a => a.userId)
            }))
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching sprints:', error);
        res.status(500).json({ error: 'Failed to fetch sprints' });
    }
});

// GET /api/sprints/:id
sprintsRouter.get('/:id', async (req, res) => {
    try {
        const sprintId = req.params.id as string;
        const sprint = await prisma.sprint.findUnique({
            where: { id: sprintId },
            include: {
                tasks: {
                    include: {
                        assignees: { select: { userId: true } },
                        tags: { select: { tag: true } },
                        subtasks: true
                    }
                }
            }
        });
        if (!sprint) { res.status(404).json({ error: 'Sprint not found' }); return; }
        res.json({
            ...sprint,
            tasks: sprint.tasks.map(t => ({
                ...t,
                assignees: t.assignees.map(a => a.userId),
                tags: t.tags.map(tg => tg.tag)
            }))
        });
    } catch (error) {
        console.error('Error fetching sprint:', error);
        res.status(500).json({ error: 'Failed to fetch sprint' });
    }
});

// POST /api/sprints - create sprint (admin, manager)
sprintsRouter.post('/', requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
        const { name, description, projectId, goal, startDate, endDate, status } = req.body;
        const sprint = await prisma.sprint.create({
            data: {
                name,
                description: description || '',
                projectId,
                goal: goal || '',
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: status || 'planning'
            }
        });
        emitToAll('sprint:created', { ...sprint, tasks: [], taskDetails: [] });
        res.status(201).json(sprint);
    } catch (error) {
        console.error('Error creating sprint:', error);
        res.status(500).json({ error: 'Failed to create sprint' });
    }
});

// PATCH /api/sprints/:id - update sprint (admin, manager)
sprintsRouter.patch('/:id', requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
        const sprintId = req.params.id as string;
        const { name, description, goal, startDate, endDate, status } = req.body;
        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (goal !== undefined) data.goal = goal;
        if (startDate !== undefined) data.startDate = new Date(startDate);
        if (endDate !== undefined) data.endDate = new Date(endDate);
        if (status !== undefined) data.status = status;

        const sprint = await prisma.sprint.update({
            where: { id: sprintId },
            data,
            include: {
                tasks: {
                    select: { id: true, status: true, title: true, priority: true, dueDate: true, assignees: { select: { userId: true } } }
                }
            }
        });
        emitToAll('sprint:updated', {
            ...sprint,
            tasks: sprint.tasks.map(t => t.id),
            taskDetails: sprint.tasks.map(t => ({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate,
                assignees: t.assignees.map(a => a.userId)
            }))
        });
        res.json(sprint);
    } catch (error) {
        console.error('Error updating sprint:', error);
        res.status(500).json({ error: 'Failed to update sprint' });
    }
});

// DELETE /api/sprints/:id (admin, manager)
sprintsRouter.delete('/:id', requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
        const sprintId = req.params.id as string;
        // Unset sprintId on tasks first
        await prisma.task.updateMany({
            where: { sprintId },
            data: { sprintId: null }
        });
        await prisma.sprint.delete({ where: { id: sprintId } });
        emitToAll('sprint:deleted', { id: sprintId });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting sprint:', error);
        res.status(500).json({ error: 'Failed to delete sprint' });
    }
});

// POST /api/sprints/:id/tasks - add tasks to sprint (admin, manager)
sprintsRouter.post('/:id/tasks', requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
        const sprintId = req.params.id as string;
        const { taskIds } = req.body;
        await prisma.task.updateMany({
            where: { id: { in: taskIds } },
            data: { sprintId }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding tasks to sprint:', error);
        res.status(500).json({ error: 'Failed to add tasks to sprint' });
    }
});

// DELETE /api/sprints/:id/tasks - remove tasks from sprint (admin, manager)
sprintsRouter.delete('/:id/tasks', requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
        const sprintId = req.params.id as string;
        const { taskIds } = req.body;
        await prisma.task.updateMany({
            where: { id: { in: taskIds }, sprintId },
            data: { sprintId: null }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing tasks from sprint:', error);
        res.status(500).json({ error: 'Failed to remove tasks from sprint' });
    }
});
