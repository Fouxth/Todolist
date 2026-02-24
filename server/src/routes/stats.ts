import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const statsRouter = Router();

// GET /api/stats - Dashboard stats computed from DB
statsRouter.get('/', async (req, res) => {
    try {
        // Support filtering by query params
        const { projectId, assigneeId, search } = req.query;
        
        // Build where clause for filtering
        const whereClause: any = {};
        if (projectId && projectId !== 'all') {
            whereClause.projectId = projectId as string;
        }
        if (assigneeId) {
            whereClause.assignees = { has: assigneeId as string };
        }
        if (search) {
            whereClause.OR = [
                { title: { contains: search as string, mode: 'insensitive' } },
                { description: { contains: search as string, mode: 'insensitive' } }
            ];
        }

        const [totalTasks, completedTasks, inProgressTasks, reviewTasks, cancelledTasks, overdueTasks, teamMembers, projects] = await Promise.all([
            prisma.task.count({ where: whereClause }),
            prisma.task.count({ where: { ...whereClause, status: 'done' } }),
            prisma.task.count({ where: { ...whereClause, status: 'in-progress' } }),
            prisma.task.count({ where: { ...whereClause, status: 'review' } }),
            prisma.task.count({ where: { ...whereClause, status: 'cancelled' } }),
            prisma.task.count({
                where: {
                    ...whereClause,
                    dueDate: { lt: new Date() },
                    status: { notIn: ['done', 'cancelled'] }
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
            cancelledTasks,
            teamMembers,
            projects,
            overdueTasks
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
