import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const teamsRouter = Router();

// GET /api/teams - Get all teams with members
teamsRouter.get('/', async (_req, res) => {
    try {
        const teams = await prisma.team.findMany({
            include: {
                members: {
                    include: { user: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(teams);
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
});

// POST /api/teams
teamsRouter.post('/', async (req, res) => {
    try {
        const { members, ...teamData } = req.body;
        const team = await prisma.team.create({
            data: {
                ...teamData,
                members: members ? {
                    create: members.map((m: { userId: string; role: string }) => ({
                        userId: m.userId,
                        role: m.role || 'member'
                    }))
                } : undefined
            },
            include: { members: true }
        });
        res.status(201).json(team);
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ error: 'Failed to create team' });
    }
});

// PATCH /api/teams/:id - Update team
teamsRouter.patch('/:id', async (req, res) => {
    try {
        const { members, ...teamData } = req.body;
        const team = await prisma.team.update({
            where: { id: req.params.id },
            data: teamData
        });

        // Update members if provided
        if (members !== undefined) {
            await prisma.teamMember.deleteMany({ where: { teamId: req.params.id } });
            if (members.length > 0) {
                await prisma.teamMember.createMany({
                    data: members.map((m: { userId: string; role: string }) => ({
                        teamId: req.params.id,
                        userId: m.userId,
                        role: m.role || 'member'
                    }))
                });
            }
        }

        const updatedTeam = await prisma.team.findUnique({
            where: { id: req.params.id },
            include: { members: { include: { user: true } } }
        });
        res.json(updatedTeam);
    } catch (error) {
        console.error('Error updating team:', error);
        res.status(500).json({ error: 'Failed to update team' });
    }
});

// DELETE /api/teams/:id - Delete team
teamsRouter.delete('/:id', async (req, res) => {
    try {
        await prisma.team.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ error: 'Failed to delete team' });
    }
});
