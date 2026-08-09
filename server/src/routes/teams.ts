import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole, type AuthRequest } from '../middleware/auth.js';

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

// POST /api/teams (admin, manager)
teamsRouter.post('/', requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
        const { members, ...teamData } = req.body;
        // Basic validation
        if (!teamData.name) {
            return res.status(400).json({ error: 'Missing required field: name' });
        }
        // If no projectId provided, use the first available project
        if (!teamData.projectId) {
            const firstProject = await prisma.project.findFirst({ orderBy: { createdAt: 'asc' } });
            if (!firstProject) {
                return res.status(400).json({ error: 'No project found. Please create a project first.' });
            }
            teamData.projectId = firstProject.id;
        }
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
        // If it's a Prisma validation/constraint error, return a 400 with details when possible
        const code = (error as any)?.code;
        if (code) {
            return res.status(400).json({ error: 'Database error', code, message: (error as any).message });
        }
        res.status(500).json({ error: 'Failed to create team' });
    }
});

// PATCH /api/teams/:id - Update team (admin, manager, or team lead)
teamsRouter.patch('/:id', async (req: AuthRequest, res) => {
    try {
        const teamId = req.params.id as string;
        const userId = req.userId!;
        const userRole = req.userRole;

        const isAdminOrManager = userRole === 'admin' || userRole === 'manager';

        // Check if user is admin, manager, or lead of this team
        if (!isAdminOrManager) {
            const isLead = await prisma.teamMember.findFirst({
                where: { teamId, userId, role: 'lead' }
            });
            if (!isLead) {
                return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขทีมนี้' });
            }
        }

        const { members, name, description, projectId, color } = req.body;
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (color !== undefined) updateData.color = color;
        // Only admin or manager can move a team across projects
        if (isAdminOrManager && projectId !== undefined) {
            updateData.projectId = projectId;
        }

        await prisma.team.update({
            where: { id: teamId },
            data: updateData
        });

        // Only admin or manager can modify team members and member roles
        if (isAdminOrManager && members !== undefined) {
            await prisma.teamMember.deleteMany({ where: { teamId } });
            if (members.length > 0) {
                await prisma.teamMember.createMany({
                    data: members.map((m: { userId: string; role: string }) => ({
                        teamId,
                        userId: m.userId,
                        role: m.role || 'member'
                    }))
                });
            }
        }

        const updatedTeam = await prisma.team.findUnique({
            where: { id: teamId },
            include: { members: { include: { user: true } } }
        });
        res.json(updatedTeam);
    } catch (error) {
        console.error('Error updating team:', error);
        res.status(500).json({ error: 'Failed to update team' });
    }
});

// DELETE /api/teams/:id - Delete team (admin, manager)
teamsRouter.delete('/:id', requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
        const teamId = req.params.id as string;
        await prisma.team.delete({
            where: { id: teamId }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ error: 'Failed to delete team' });
    }
});
