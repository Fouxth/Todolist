import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { createAndSendNotification, createAndSendNotifications, emitToUser, emitToUsers, emitToAll } from '../lib/socket.js';
import { sendEmail, taskAssignedEmail } from '../lib/email.js';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.js';
import { canAccessTask, canEditTask } from '../lib/permissions.js';

export const tasksRouter = Router();

// GET /api/tasks - Get all tasks with relations
tasksRouter.get('/', async (req, res) => {
    try {
        const { status, priority, projectId, search, sprintId } = req.query;

        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (projectId) where.projectId = projectId;
        if (sprintId) where.sprintId = sprintId;
        if (search) {
            where.OR = [
                { title: { contains: search as string, mode: 'insensitive' } },
                { description: { contains: search as string, mode: 'insensitive' } }
            ];
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                assignees: { select: { userId: true } },
                tags: { select: { tag: true } },
                subtasks: true,
                comments: {
                    include: { user: { select: { id: true, name: true, avatar: true } } }
                },
                attachments: true,
                timeTracking: {
                    include: { entries: true }
                },
                dependencies: {
                    include: { dependsOn: { select: { id: true, title: true, status: true } } }
                },
                dependedOnBy: {
                    include: { task: { select: { id: true, title: true, status: true } } }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Transform to match frontend shape
        const result = tasks.map(task => ({
            ...task,
            assignees: task.assignees.map(a => a.userId),
            tags: task.tags.map(t => t.tag),
            timeTracking: task.timeTracking ? {
                estimated: task.timeTracking.estimated,
                spent: task.timeTracking.spent,
                entries: task.timeTracking.entries
            } : undefined,
            dependencies: task.dependencies,
            dependedOnBy: task.dependedOnBy,
            recurring: task.recurring as any
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// GET /api/tasks/:id
tasksRouter.get('/:id', async (req, res) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: req.params.id },
            include: {
                assignees: { select: { userId: true } },
                tags: { select: { tag: true } },
                subtasks: true,
                comments: {
                    include: { user: { select: { id: true, name: true, avatar: true } } }
                },
                attachments: true,
                timeTracking: { include: { entries: { include: { user: true } } } }
            }
        });

        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        res.json({
            ...task,
            assignees: task.assignees.map(a => a.userId),
            tags: task.tags.map(t => t.tag),
            timeTracking: task.timeTracking ? {
                estimated: task.timeTracking.estimated,
                spent: task.timeTracking.spent,
                entries: task.timeTracking.entries
            } : undefined
        });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
});

// POST /api/tasks - Create task
tasksRouter.post('/', async (req, res) => {
    try {
        const authReq = req as AuthRequest;
        const creatorId = authReq.userId!;
        const { assignees, tags, subtasks, timeTracking, dependencies, ...taskData } = req.body;

        // Force createdBy to current authenticated user ID
        taskData.createdBy = creatorId;

        // Validate assignees exist in DB
        let validAssigneeIds: string[] = [];
        if (Array.isArray(assignees) && assignees.length > 0) {
            const existingUsers = await prisma.user.findMany({
                where: { id: { in: assignees.filter((id: unknown) => typeof id === 'string') } },
                select: { id: true }
            });
            validAssigneeIds = existingUsers.map(u => u.id);
        }

        const task = await prisma.task.create({
            data: {
                ...taskData,
                createdBy: creatorId,
                recurring: taskData.recurring || undefined,
                assignees: validAssigneeIds.length ? {
                    create: validAssigneeIds.map((userId: string) => ({ userId }))
                } : undefined,
                tags: tags?.length ? {
                    create: tags.map((tag: string) => ({ tag }))
                } : undefined,
                subtasks: subtasks?.length ? {
                    create: subtasks.map((st: { title: string; completed?: boolean }) => ({
                        title: st.title,
                        completed: st.completed || false
                    }))
                } : undefined,
                timeTracking: timeTracking ? {
                    create: {
                        estimated: timeTracking.estimated || 0,
                        spent: timeTracking.spent || 0
                    }
                } : undefined,
                dependencies: dependencies?.length ? {
                    create: dependencies.map((dep: { dependsOnId: string; type?: string }) => ({
                        dependsOnId: dep.dependsOnId,
                        type: dep.type || 'blocks'
                    }))
                } : undefined
            },
            include: {
                assignees: { select: { userId: true } },
                tags: { select: { tag: true } },
                subtasks: true,
                comments: true,
                attachments: true,
                timeTracking: { include: { entries: { include: { user: true } } } },
                dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } },
                dependedOnBy: { include: { task: { select: { id: true, title: true, status: true } } } }
            }
        });

        // Create activity
        await prisma.activity.create({
            data: {
                userId: creatorId,
                action: 'created',
                targetType: 'task',
                targetId: task.id,
                targetName: task.title
            }
        });

        // Notify assignees
        const assigneeIds = task.assignees.map(a => a.userId).filter(id => id !== creatorId);
        const creator = await prisma.user.findUnique({ where: { id: creatorId }, select: { name: true } });
        for (const uid of assigneeIds) {
            const notif = await prisma.notification.create({
                data: {
                    userId: uid,
                    type: 'task_assigned',
                    title: 'มีงานใหม่มอบหมายให้คุณ',
                    message: `${creator?.name || 'ใครบางคน'} มอบหมายงาน "${task.title}" ให้คุณ`,
                    link: task.id
                }
            });
            emitToUser(uid, 'new_notification', notif);

            // Send email notification
            const assigneeUser = await prisma.user.findUnique({ where: { id: uid }, select: { name: true, email: true } });
            if (assigneeUser?.email) {
                const email = taskAssignedEmail(
                    assigneeUser.name,
                    creator?.name || 'Someone',
                    task.title,
                    task.id
                );
                email.to = assigneeUser.email;
                sendEmail(email).catch(err => console.error('Email send error:', err));
            }
        }

        const responseTask = {
            ...task,
            assignees: task.assignees.map(a => a.userId),
            tags: task.tags.map(t => t.tag),
            timeTracking: task.timeTracking ? {
                estimated: task.timeTracking.estimated,
                spent: task.timeTracking.spent,
                entries: task.timeTracking.entries
            } : undefined,
            dependencies: task.dependencies,
            dependedOnBy: task.dependedOnBy,
            recurring: task.recurring as any
        };

        emitToAll('task:created', responseTask);
        res.status(201).json(responseTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// PATCH /api/tasks/:id - Update task
tasksRouter.patch('/:id', async (req, res) => {
    try {
        const authReq = req as AuthRequest;
        const taskId = req.params.id;
        const userId = authReq.userId!;
        const userRole = authReq.userRole || 'developer';

        // Check if user is authorized to edit task
        const hasPermission = await canEditTask(userId, userRole, taskId);
        if (!hasPermission) {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขงานนี้' });
        }

        const { assignees, tags, subtasks, timeTracking, dependencies, ...rawData } = req.body;

        // Whitelist only fields that exist in the Task Prisma model
        const allowedFields = ['title', 'description', 'status', 'priority', 'projectId',
            'teamId', 'dueDate', 'sprintId', 'recurring'];
        const taskData: Record<string, unknown> = {};
        for (const key of allowedFields) {
            if (key in rawData) taskData[key] = rawData[key];
        }

        // Get old task data before update
        const oldTask = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                assignees: { select: { userId: true } }
            }
        });

        if (!oldTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const isManagerOrCreator = userRole === 'admin' || userRole === 'manager' || oldTask.createdBy === userId;

        // Non-manager task assignees cannot move task to another project or team
        if (!isManagerOrCreator) {
            delete taskData.projectId;
            delete taskData.teamId;
        }

        // Update base task data only if there are fields to update
        // (avoids Prisma error when only subtasks/assignees/tags are being updated)
        const task = Object.keys(taskData).length > 0
            ? await prisma.task.update({ where: { id: taskId }, data: taskData })
            : oldTask;

        // Track changes for notifications
        const changes: string[] = [];
        const notifyUsers = new Set<string>();

        // Update assignees if provided
        if (assignees !== undefined) {
            const oldAssignees = oldTask?.assignees.map(a => a.userId) || [];
            const newAssignees = assignees;
            const addedAssignees = newAssignees.filter((id: string) => !oldAssignees.includes(id));
            const removedAssignees = oldAssignees.filter(id => !newAssignees.includes(id));

            await prisma.taskAssignee.deleteMany({ where: { taskId } });
            if (assignees.length > 0) {
                await prisma.taskAssignee.createMany({
                    data: assignees.map((userId: string) => ({ taskId, userId }))
                });
            }

            // Notify newly assigned users
            if (addedAssignees.length > 0) {
                const updater = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
                await createAndSendNotifications(
                    addedAssignees,
                    'task_assigned',
                    'มีงานใหม่มอบหมายให้คุณ',
                    `${updater?.name || 'ใครบางคน'} มอบหมายงาน "${task.title}" ให้คุณ`,
                    taskId
                );
            }

            // Add all current assignees to notify list for other changes
            newAssignees.forEach((id: string) => notifyUsers.add(id));
        } else if (oldTask) {
            // Add existing assignees to notify list
            oldTask.assignees.forEach(a => notifyUsers.add(a.userId));
        }

        // Check for status change
        if (taskData.status && oldTask && taskData.status !== oldTask.status) {
            const statusLabels: Record<string, string> = {
                'todo': 'รอดำเนินการ',
                'in-progress': 'กำลังทำ',
                'review': 'รอตรวจสอบ',
                'done': 'เสร็จสิ้น',
                'cancelled': 'ยกเลิก'
            };
            changes.push(`สถานะ: ${statusLabels[taskData.status as string] || taskData.status as string}`);

            // If completed, send success notification
            if (taskData.status === 'done') {
                const updater = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
                await createAndSendNotifications(
                    Array.from(notifyUsers).filter(id => id !== userId),
                    'task_completed',
                    '✅ งานเสร็จสิ้น',
                    `${updater?.name || 'ใครบางคน'} ทำงาน "${task.title}" เสร็จแล้ว`,
                    taskId
                );
            }

            // If cancelled, send cancellation notification
            if (taskData.status === 'cancelled') {
                const updater = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
                await createAndSendNotifications(
                    Array.from(notifyUsers).filter(id => id !== userId),
                    'info',
                    '❌ งานถูกยกเลิก',
                    `${updater?.name || 'ใครบางคน'} ยกเลิกงาน "${task.title}"`,
                    taskId
                );
            }
        }

        // Check for priority change
        if (taskData.priority && oldTask && taskData.priority !== oldTask.priority) {
            const priorityLabels: Record<string, string> = {
                'low': 'ต่ำ',
                'medium': 'ปานกลาง',
                'high': 'สูง',
                'urgent': 'เร่งด่วน'
            };
            changes.push(`ความสำคัญ: ${priorityLabels[taskData.priority as string] || taskData.priority as string}`);
        }

        // Check for due date change
        if (taskData.dueDate && oldTask && taskData.dueDate !== oldTask.dueDate) {
            changes.push(`วันครบกำหนด: ${new Date(taskData.dueDate as string).toLocaleDateString('th-TH')}`);
        }

        // Update tags if provided
        if (tags !== undefined) {
            await prisma.taskTag.deleteMany({ where: { taskId } });
            if (tags.length > 0) {
                await prisma.taskTag.createMany({
                    data: tags.map((tag: string) => ({ taskId, tag }))
                });
            }
        }

        // Update dependencies if provided
        if (dependencies !== undefined) {
            await prisma.taskDependency.deleteMany({ where: { taskId } });
            if (dependencies.length > 0) {
                await prisma.taskDependency.createMany({
                    data: dependencies.map((dep: { dependsOnId: string; type?: string }) => ({
                        taskId,
                        dependsOnId: dep.dependsOnId,
                        type: dep.type || 'blocks'
                    }))
                });
            }
        }

        // Update subtasks if provided
        if (subtasks !== undefined) {
            await prisma.subtask.deleteMany({ where: { taskId } });
            if (subtasks.length > 0) {
                await prisma.subtask.createMany({
                    data: subtasks.map((st: { title: string; completed?: boolean }) => ({
                        taskId,
                        title: st.title,
                        completed: st.completed || false
                    }))
                });
            }
        }

        // Update time tracking if provided
        if (timeTracking !== undefined) {
            const existing = await prisma.timeTracking.findUnique({ where: { taskId } });
            if (existing) {
                await prisma.timeTracking.update({
                    where: { taskId },
                    data: {
                        estimated: timeTracking.estimated ?? existing.estimated,
                        spent: timeTracking.spent ?? existing.spent
                    }
                });
            } else {
                await prisma.timeTracking.create({
                    data: {
                        taskId,
                        estimated: timeTracking.estimated || 0,
                        spent: timeTracking.spent || 0
                    }
                });
            }
        }

        // Create activity
        await prisma.activity.create({
            data: {
                userId: userId || task.createdBy,
                action: 'updated',
                targetType: 'task',
                targetId: task.id,
                targetName: task.title
            }
        });

        // Send general update notification if there are changes
        if (changes.length > 0 && notifyUsers.size > 0) {
            const updater = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
            const notifyUsersList = Array.from(notifyUsers).filter(id => id !== userId);
            
            if (notifyUsersList.length > 0) {
                await createAndSendNotifications(
                    notifyUsersList,
                    'task_assigned', // Using existing type
                    '🔔 งานมีการอัปเดต',
                    `${updater?.name || 'ใครบางคน'} อัปเดตงาน "${task.title}": ${changes.join(', ')}`,
                    taskId
                );
            }
        }

        // Return full task
        const fullTask = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                assignees: { select: { userId: true } },
                tags: { select: { tag: true } },
                subtasks: true,
                comments: true,
                attachments: true,
                timeTracking: { include: { entries: { include: { user: true } } } },
                dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } },
                dependedOnBy: { include: { task: { select: { id: true, title: true, status: true } } } }
            }
        });

        const responseTask = fullTask ? {
            ...fullTask,
            assignees: fullTask.assignees.map(a => a.userId),
            tags: fullTask.tags.map(t => t.tag),
            timeTracking: fullTask.timeTracking ? {
                estimated: fullTask.timeTracking.estimated,
                spent: fullTask.timeTracking.spent,
                entries: fullTask.timeTracking.entries
            } : undefined,
            dependencies: fullTask.dependencies,
            dependedOnBy: fullTask.dependedOnBy,
            recurring: fullTask.recurring as any
        } : task;

        emitToAll('task:updated', responseTask);
        res.json(responseTask);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});
// PATCH /api/tasks/:id/status - Move task (change status)
tasksRouter.patch('/:id/status', async (req, res) => {
    try {
        const authReq = req as AuthRequest;
        const taskId = req.params.id;
        const userId = authReq.userId!;
        const userRole = authReq.userRole || 'developer';

        const hasPermission = await canEditTask(userId, userRole, taskId);
        if (!hasPermission) {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์เปลี่ยนสถานะงานนี้' });
        }

        const { status } = req.body;
        const task = await prisma.task.update({
            where: { id: taskId },
            data: {
                status,
                completedAt: status === 'done' ? new Date() : null
            }
        });

        // Create activity
        await prisma.activity.create({
            data: {
                userId: task.createdBy,
                action: status === 'done' ? 'completed' : status === 'cancelled' ? 'updated' : 'updated',
                targetType: 'task',
                targetId: task.id,
                targetName: task.title
            }
        });

        // Notify on completion
        if (status === 'done') {
            const assignees = await prisma.taskAssignee.findMany({ where: { taskId: task.id }, select: { userId: true } });
            const allUserIds = [task.createdBy, ...assignees.map(a => a.userId)];
            const uniqueUserIds = [...new Set(allUserIds)];
            for (const uid of uniqueUserIds) {
                const notif = await prisma.notification.create({
                    data: {
                        userId: uid,
                        type: 'task_completed',
                        title: 'งานเสร็จสมบูรณ์แล้ว',
                        message: `งาน "${task.title}" ถูกเปลี่ยนสถานะเป็นเสร็จสมบูรณ์`,
                        link: task.id
                    }
                });
                emitToUser(uid, 'new_notification', notif);
            }
        }

        // Notify on cancellation
        if (status === 'cancelled') {
            const assignees = await prisma.taskAssignee.findMany({ where: { taskId: task.id }, select: { userId: true } });
            const allUserIds = [task.createdBy, ...assignees.map(a => a.userId)];
            const uniqueUserIds = [...new Set(allUserIds)];
            for (const uid of uniqueUserIds) {
                const notif = await prisma.notification.create({
                    data: {
                        userId: uid,
                        type: 'info',
                        title: '❌ งานถูกยกเลิก',
                        message: `งาน "${task.title}" ถูกเปลี่ยนสถานะเป็นยกเลิก`,
                        link: task.id
                    }
                });
                emitToUser(uid, 'new_notification', notif);
            }

            // Handle recurring tasks — auto-create next occurrence
            const recurring = task.recurring as any;
            if (recurring?.enabled) {
                const now = new Date();
                let nextDue: Date | null = null;
                if (task.dueDate) {
                    const due = new Date(task.dueDate);
                    switch (recurring.interval) {
                        case 'daily': nextDue = new Date(due.setDate(due.getDate() + 1)); break;
                        case 'weekly': nextDue = new Date(due.setDate(due.getDate() + 7)); break;
                        case 'monthly': nextDue = new Date(due.setMonth(due.getMonth() + 1)); break;
                        case 'custom': nextDue = new Date(due.setDate(due.getDate() + (recurring.customDays || 7))); break;
                    }
                }

                // Get full task data for cloning
                const fullRecurringTask = await prisma.task.findUnique({
                    where: { id: task.id },
                    include: {
                        assignees: { select: { userId: true } },
                        tags: { select: { tag: true } },
                        subtasks: true,
                    }
                });

                if (fullRecurringTask) {
                    await prisma.task.create({
                        data: {
                            title: fullRecurringTask.title,
                            description: fullRecurringTask.description,
                            status: 'todo',
                            priority: fullRecurringTask.priority,
                            projectId: fullRecurringTask.projectId,
                            teamId: fullRecurringTask.teamId,
                            sprintId: fullRecurringTask.sprintId,
                            createdBy: fullRecurringTask.createdBy,
                            dueDate: nextDue,
                            recurring: recurring,
                            assignees: fullRecurringTask.assignees.length > 0 ? {
                                create: fullRecurringTask.assignees.map(a => ({ userId: a.userId }))
                            } : undefined,
                            tags: fullRecurringTask.tags.length > 0 ? {
                                create: fullRecurringTask.tags.map(t => ({ tag: t.tag }))
                            } : undefined,
                            subtasks: fullRecurringTask.subtasks.length > 0 ? {
                                create: fullRecurringTask.subtasks.map(st => ({
                                    title: st.title,
                                    completed: false
                                }))
                            } : undefined,
                        }
                    });
                }
            }
        }

        // Auto-update project status based on task statuses
        if (task.projectId) {
            const allProjectTasks = await prisma.task.findMany({
                where: { projectId: task.projectId },
                select: { status: true }
            });

            const currentProject = await prisma.project.findUnique({
                where: { id: task.projectId },
                select: { status: true }
            });

            const allCancelled = allProjectTasks.length > 0 &&
                allProjectTasks.every(t => t.status === 'cancelled');

            // Case 1: all tasks cancelled → project becomes cancelled
            if (allCancelled && currentProject?.status !== 'cancelled') {
                const updatedProject = await prisma.project.update({
                    where: { id: task.projectId },
                    data: { status: 'cancelled' }
                });

                const projectMembers = await prisma.taskAssignee.findMany({
                    where: { task: { projectId: task.projectId } },
                    select: { userId: true },
                    distinct: ['userId']
                });
                const memberIds = [...new Set(projectMembers.map(m => m.userId))];

                emitToUsers(memberIds, 'project:updated', { ...updatedProject, taskCount: {
                    total: allProjectTasks.length,
                    completed: 0,
                    inProgress: 0,
                    todo: 0,
                    cancelled: allProjectTasks.length
                }});

                for (const uid of memberIds) {
                    const notif = await prisma.notification.create({
                        data: {
                            userId: uid,
                            type: 'info',
                            title: '🚫 โปรเจคถูกยกเลิก',
                            message: `งานทุกชิ้นในโปรเจคถูกยกเลิกแล้ว สถานะโปรเจคถูกเปลี่ยนเป็นยกเลิกอัตโนมัติ`,
                            link: task.projectId
                        }
                    });
                    emitToUser(uid, 'new_notification', notif);
                }
            }

            // Case 2: project was cancelled but now has non-cancelled task → revert to active
            if (!allCancelled && currentProject?.status === 'cancelled') {
                const updatedProject = await prisma.project.update({
                    where: { id: task.projectId },
                    data: { status: 'active' }
                });

                const projectMembers = await prisma.taskAssignee.findMany({
                    where: { task: { projectId: task.projectId } },
                    select: { userId: true },
                    distinct: ['userId']
                });
                const memberIds = [...new Set(projectMembers.map(m => m.userId))];

                const cancelledCount = allProjectTasks.filter(t => t.status === 'cancelled').length;
                emitToUsers(memberIds, 'project:updated', { ...updatedProject, taskCount: {
                    total: allProjectTasks.length,
                    completed: allProjectTasks.filter(t => t.status === 'done').length,
                    inProgress: allProjectTasks.filter(t => t.status === 'in-progress').length,
                    todo: allProjectTasks.filter(t => t.status === 'todo').length,
                    cancelled: cancelledCount
                }});
            }
        }

        emitToAll('task:status_changed', { id: task.id, status: task.status, completedAt: task.completedAt });
        res.json(task); // end if (task.projectId)
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Failed to update task status' });
    }
});

// DELETE /api/tasks/:id (admin, manager, or task creator)
tasksRouter.delete('/:id', async (req, res) => {
    try {
        const authReq = req as AuthRequest;
        const taskId = req.params.id as string;
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        // Allow admin, manager, or the task creator to delete
        if (authReq.userRole !== 'admin' && authReq.userRole !== 'manager' && task.createdBy !== authReq.userId) {
            res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบงานนี้' });
            return;
        }

        if (task) {
            await prisma.activity.create({
                data: {
                    userId: task.createdBy,
                    action: 'deleted',
                    targetType: 'task',
                    targetId: task.id,
                    targetName: task.title
                }
            });
        }

        await prisma.task.delete({
            where: { id: taskId }
        });

        emitToAll('task:deleted', { id: taskId });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// ============ Dependencies ============

// POST /api/tasks/:id/dependencies - add dependency
tasksRouter.post('/:id/dependencies', async (req, res) => {
    try {
        const { dependsOnId, type } = req.body;
        const dep = await prisma.taskDependency.create({
            data: {
                taskId: req.params.id,
                dependsOnId,
                type: type || 'blocks'
            },
            include: {
                dependsOn: { select: { id: true, title: true, status: true } }
            }
        });
        res.status(201).json(dep);
    } catch (error) {
        console.error('Error adding dependency:', error);
        res.status(500).json({ error: 'Failed to add dependency' });
    }
});

// DELETE /api/tasks/:id/dependencies/:depId
tasksRouter.delete('/:id/dependencies/:depId', async (req, res) => {
    try {
        await prisma.taskDependency.delete({
            where: { id: req.params.depId }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing dependency:', error);
        res.status(500).json({ error: 'Failed to remove dependency' });
    }
});

// GET /api/tasks/:id/dependencies
tasksRouter.get('/:id/dependencies', async (req, res) => {
    try {
        const [dependencies, dependedOnBy] = await Promise.all([
            prisma.taskDependency.findMany({
                where: { taskId: req.params.id },
                include: { dependsOn: { select: { id: true, title: true, status: true } } }
            }),
            prisma.taskDependency.findMany({
                where: { dependsOnId: req.params.id },
                include: { task: { select: { id: true, title: true, status: true } } }
            })
        ]);
        res.json({ dependencies, dependedOnBy });
    } catch (error) {
        console.error('Error fetching dependencies:', error);
        res.status(500).json({ error: 'Failed to fetch dependencies' });
    }
});

// ============ AI Suggestions ============

// POST /api/tasks/ai/suggest - get AI task suggestions
tasksRouter.post('/ai/suggest', async (req, res) => {
    try {
        const { title, description, projectId } = req.body;
        const text = `${title} ${description}`.toLowerCase();

        // Heuristic priority suggestion
        let suggestedPriority = 'medium';
        const urgentWords = ['urgent', 'critical', 'asap', 'immediately', 'ด่วน', 'เร่ง', 'hotfix', 'security', 'crash', 'bug'];
        const highWords = ['important', 'high', 'สำคัญ', 'blocker', 'deadline', 'production'];
        const lowWords = ['nice to have', 'improvement', 'refactor', 'cleanup', 'ปรับปรุง', 'minor'];

        if (urgentWords.some(w => text.includes(w))) suggestedPriority = 'urgent';
        else if (highWords.some(w => text.includes(w))) suggestedPriority = 'high';
        else if (lowWords.some(w => text.includes(w))) suggestedPriority = 'low';

        // Suggest tags based on keywords
        const tagMap: Record<string, string[]> = {
            'bug': ['bug', 'fix'], 'fix': ['bug', 'fix'], 'แก้': ['bug', 'fix'],
            'feature': ['feature'], 'ฟีเจอร์': ['feature'],
            'ui': ['ui', 'frontend'], 'design': ['ui', 'design'], 'ออกแบบ': ['ui', 'design'],
            'api': ['api', 'backend'], 'backend': ['backend'],
            'test': ['testing'], 'ทดสอบ': ['testing'],
            'docs': ['documentation'], 'เอกสาร': ['documentation'],
            'performance': ['performance'], 'ประสิทธิภาพ': ['performance'],
            'security': ['security'], 'ความปลอดภัย': ['security'],
            'deploy': ['devops'], 'ci': ['devops'], 'cd': ['devops']
        };

        const suggestedTags = new Set<string>();
        for (const [keyword, tags] of Object.entries(tagMap)) {
            if (text.includes(keyword)) {
                tags.forEach(t => suggestedTags.add(t));
            }
        }

        // Suggest assignees based on past task assignments in the project
        const suggestedAssignees: string[] = [];
        if (projectId) {
            const recentTasks = await prisma.task.findMany({
                where: { projectId },
                include: { assignees: { select: { userId: true } }, tags: { select: { tag: true } } },
                orderBy: { createdAt: 'desc' },
                take: 50
            });

            // Count assignee frequency for similar tags
            const assigneeScore: Record<string, number> = {};
            for (const t of recentTasks) {
                const hasOverlap = t.tags.some(tg => suggestedTags.has(tg.tag));
                for (const a of t.assignees) {
                    assigneeScore[a.userId] = (assigneeScore[a.userId] || 0) + (hasOverlap ? 3 : 1);
                }
            }

            const sorted = Object.entries(assigneeScore).sort((a, b) => b[1] - a[1]).slice(0, 3);
            suggestedAssignees.push(...sorted.map(([userId]) => userId));
        }

        // Estimate time based on task type
        let estimatedMinutes = 120; // default 2 hours
        if (text.includes('bug') || text.includes('fix') || text.includes('แก้')) estimatedMinutes = 60;
        if (text.includes('feature') || text.includes('ฟีเจอร์')) estimatedMinutes = 480;
        if (text.includes('refactor')) estimatedMinutes = 240;
        if (text.includes('test') || text.includes('ทดสอบ')) estimatedMinutes = 120;

        res.json({
            priority: suggestedPriority,
            tags: Array.from(suggestedTags),
            assignees: suggestedAssignees,
            estimatedMinutes,
            confidence: suggestedTags.size > 0 ? 0.8 : 0.4
        });
    } catch (error) {
        console.error('Error generating suggestions:', error);
        res.status(500).json({ error: 'Failed to generate suggestions' });
    }
});

// POST /api/tasks/:id/time-tracking/start - Start time tracking
tasksRouter.post('/:id/time-tracking/start', async (req, res) => {
    try {
        const authReq = req as AuthRequest;
        const taskId = req.params.id;
        const userId = authReq.userId!;
        const userRole = authReq.userRole || 'developer';

        // Check task authorization
        const hasAccess = await canAccessTask(userId, userRole, taskId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์จับเวลาในงานนี้' });
        }

        // Create time tracking if doesn't exist
        let timeTracking = await prisma.timeTracking.findUnique({
            where: { taskId },
            include: { entries: true }
        });

        if (!timeTracking) {
            timeTracking = await prisma.timeTracking.create({
                data: {
                    taskId,
                    estimated: 0,
                    spent: 0
                },
                include: { entries: true }
            });
        }

        // Check if user already has an active entry for this task
        const activeEntry = timeTracking.entries.find(
            e => e.userId === userId && !e.endTime
        );

        if (activeEntry) {
            return res.status(400).json({ error: 'Already tracking time for this task' });
        }

        // Create new time entry
        const entry = await prisma.timeEntry.create({
            data: {
                timeTrackingId: timeTracking.id,
                userId,
                startTime: new Date(),
                duration: 0
            },
            include: {
                user: true
            }
        });

        res.json(entry);
    } catch (error) {
        console.error('Error starting time tracking:', error);
        res.status(500).json({ error: 'Failed to start time tracking' });
    }
});

// POST /api/tasks/:id/time-tracking/stop - Stop time tracking
tasksRouter.post('/:id/time-tracking/stop', async (req, res) => {
    try {
        const authReq = req as AuthRequest;
        const taskId = req.params.id;
        const userId = authReq.userId!;
        const userRole = authReq.userRole;
        const { entryId, description } = req.body;

        if (!entryId) {
            return res.status(400).json({ error: 'Entry ID required' });
        }

        // Find the entry
        const entry = await prisma.timeEntry.findUnique({
            where: { id: entryId },
            include: { timeTracking: true }
        });

        if (!entry || entry.timeTracking.taskId !== taskId) {
            return res.status(404).json({ error: 'Time entry not found' });
        }

        // Check entry ownership or admin/manager role
        if (entry.userId !== userId && userRole !== 'admin' && userRole !== 'manager') {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์หยุดการจับเวลาของผู้ใช้อื่น' });
        }

        if (entry.endTime) {
            return res.status(400).json({ error: 'Time entry already stopped' });
        }

        // Calculate duration in minutes
        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - entry.startTime.getTime()) / 60000);

        // Update the entry
        const updatedEntry = await prisma.timeEntry.update({
            where: { id: entryId },
            data: {
                endTime,
                duration,
                description
            },
            include: {
                user: true
            }
        });

        // Update total spent time
        const allEntries = await prisma.timeEntry.findMany({
            where: { timeTrackingId: entry.timeTrackingId }
        });
        const totalSpent = allEntries.reduce((sum, e) => sum + e.duration, 0);

        await prisma.timeTracking.update({
            where: { id: entry.timeTrackingId },
            data: { spent: totalSpent }
        });

        res.json(updatedEntry);
    } catch (error) {
        console.error('Error stopping time tracking:', error);
        res.status(500).json({ error: 'Failed to stop time tracking' });
    }
});
