import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { emitToAll } from '../lib/socket.js';
import { requireRole, type AuthRequest } from '../middleware/auth.js';

export const projectsRouter = Router();

// GET /api/projects - Get all projects with computed task counts
projectsRouter.get('/', async (_req, res) => {
    try {
        const projects = await prisma.project.findMany({
            include: {
                teams: true,
                tasks: {
                    select: { status: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const result = projects.map(project => {
            const taskCount = {
                total: project.tasks.length,
                completed: project.tasks.filter(t => t.status === 'done').length,
                inProgress: project.tasks.filter(t => t.status === 'in-progress').length,
                todo: project.tasks.filter(t => t.status === 'todo').length,
                cancelled: project.tasks.filter(t => t.status === 'cancelled').length
            };
            const { tasks, ...proj } = project;
            return { ...proj, taskCount };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET /api/projects/:id
projectsRouter.get('/:id', async (req, res) => {
    try {
        const id = req.params.id as string;
        const project = await prisma.project.findUnique({
            where: { id },
            include: { teams: true }
        });
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// POST /api/projects (admin, manager)
projectsRouter.post('/', requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
        const { name, description, status, color, progress, startDate, endDate } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            res.status(400).json({ error: 'Project name is required' });
            return;
        }
        const allowedStatuses = ['active', 'completed', 'on-hold', 'cancelled'];
        const project = await prisma.project.create({
            data: {
                name: name.trim(),
                description: description || '',
                status: allowedStatuses.includes(status) ? status : 'active',
                color: color || '#ff6b35',
                progress: typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : 0,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : undefined,
            }
        });
        emitToAll('project:created', { ...project, taskCount: { total: 0, completed: 0, inProgress: 0, todo: 0, cancelled: 0 } });
        res.status(201).json(project);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// PATCH /api/projects/:id (admin, manager)
projectsRouter.patch('/:id', requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
        const id = req.params.id as string;
        const { name, description, status, color, progress, startDate, endDate } = req.body;
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = typeof name === 'string' ? name.trim() : name;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (color !== undefined) updateData.color = color;
        if (progress !== undefined) updateData.progress = typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : 0;
        if (startDate !== undefined) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

        const project = await prisma.project.update({
            where: { id },
            data: updateData
        });
        emitToAll('project:updated', project);
        res.json(project);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// DELETE /api/projects/:id (admin, manager)
projectsRouter.delete('/:id', requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
        const id = req.params.id as string;
        await prisma.project.delete({
            where: { id }
        });
        emitToAll('project:deleted', { id });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});
