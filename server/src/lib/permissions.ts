import { prisma } from './prisma.js';

/** Check if user can access a task (view, upload attachments, add comments, etc.) */
export async function canAccessTask(userId: string, userRole: string, taskId: string): Promise<boolean> {
    if (!userId) return false;
    if (userRole === 'admin' || userRole === 'manager') return true;

    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
            assignees: { select: { userId: true } },
            team: { include: { members: { select: { userId: true } } } },
            project: { include: { teams: { include: { members: { select: { userId: true } } } } } }
        }
    });

    if (!task) return false;
    if (task.createdBy === userId) return true;
    if (task.assignees.some(a => a.userId === userId)) return true;
    if (task.team?.members.some(m => m.userId === userId)) return true;
    if (task.project?.teams.some(t => t.members.some(m => m.userId === userId))) return true;

    return false;
}

/** Check if user can edit/modify a task */
export async function canEditTask(userId: string, userRole: string, taskId: string): Promise<boolean> {
    return canAccessTask(userId, userRole, taskId);
}

/** Check if user is a member of a socket chat room */
export async function isChatMember(userId: string, chatId: string): Promise<boolean> {
    if (!userId || !chatId) return false;
    const member = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId } }
    });
    return !!member;
}
