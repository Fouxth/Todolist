import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

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
        const sprint = await prisma.sprint.findUnique({
            where: { id: req.params.id },
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

// POST /api/sprints - create sprint
sprintsRouter.post('/', async (req, res) => {
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
        res.status(201).json(sprint);
    } catch (error) {
        console.error('Error creating sprint:', error);
        res.status(500).json({ error: 'Failed to create sprint' });
    }
});

// PATCH /api/sprints/:id - update sprint
sprintsRouter.patch('/:id', async (req, res) => {
    try {
        const { name, description, goal, startDate, endDate, status } = req.body;
        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (goal !== undefined) data.goal = goal;
        if (startDate !== undefined) data.startDate = new Date(startDate);
        if (endDate !== undefined) data.endDate = new Date(endDate);
        if (status !== undefined) data.status = status;

        const sprint = await prisma.sprint.update({
            where: { id: req.params.id },
            data
        });
        res.json(sprint);
    } catch (error) {
        console.error('Error updating sprint:', error);
        res.status(500).json({ error: 'Failed to update sprint' });
    }
});

// DELETE /api/sprints/:id
sprintsRouter.delete('/:id', async (req, res) => {
    try {
        // Unset sprintId on tasks first
        await prisma.task.updateMany({
            where: { sprintId: req.params.id },
            data: { sprintId: null }
        });
        await prisma.sprint.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting sprint:', error);
        res.status(500).json({ error: 'Failed to delete sprint' });
    }
});

// POST /api/sprints/:id/tasks - add tasks to sprint
sprintsRouter.post('/:id/tasks', async (req, res) => {
    try {
        const { taskIds } = req.body;
        await prisma.task.updateMany({
            where: { id: { in: taskIds } },
            data: { sprintId: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding tasks to sprint:', error);
        res.status(500).json({ error: 'Failed to add tasks to sprint' });
    }
});

// DELETE /api/sprints/:id/tasks - remove tasks from sprint
sprintsRouter.delete('/:id/tasks', async (req, res) => {
    try {
        const { taskIds } = req.body;
        await prisma.task.updateMany({
            where: { id: { in: taskIds }, sprintId: req.params.id },
            data: { sprintId: null }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing tasks from sprint:', error);
        res.status(500).json({ error: 'Failed to remove tasks from sprint' });
    }
});
