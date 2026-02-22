import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const statsRouter = Router();

// GET /api/stats - Dashboard stats computed from DB
statsRouter.get('/', async (_req, res) => {
    try {
        const [totalTasks, completedTasks, inProgressTasks, reviewTasks, overdueTasks, teamMembers, projects] = await Promise.all([
            prisma.task.count(),
            prisma.task.count({ where: { status: 'done' } }),
            prisma.task.count({ where: { status: 'in-progress' } }),
            prisma.task.count({ where: { status: 'review' } }),
            prisma.task.count({
                where: {
                    dueDate: { lt: new Date() },
                    status: { not: 'done' }
                }
            }),
            prisma.user.count(),
            prisma.project.count({ where: { status: 'active' } })
        ]);

        res.json({
            totalTasks,
            completedTasks,
            inProgressTasks,
            reviewTasks,
            teamMembers,
            projects,
            overdueTasks
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
