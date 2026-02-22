import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const activitiesRouter = Router();

// GET /api/activities
activitiesRouter.get('/', async (_req, res) => {
    try {
        const activities = await prisma.activity.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});
