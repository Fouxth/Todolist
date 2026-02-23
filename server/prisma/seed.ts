import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Hash default password
    const defaultPassword = await bcrypt.hash('password123', 10);

    // Clean existing data
    await prisma.activity.deleteMany();
    await prisma.calendarEvent.deleteMany();
    await prisma.timeEntry.deleteMany();
    await prisma.timeTracking.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.subtask.deleteMany();
    await prisma.taskTag.deleteMany();
    await prisma.taskAssignee.deleteMany();
    await prisma.taskDependency.deleteMany();
    await prisma.task.deleteMany();
    await prisma.sprint.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    console.log('  Cleaned existing data');

    // ============ Projects ============
    const projects = await Promise.all([
        prisma.project.create({
            data: {
                id: 'proj1',
                name: 'ระบบจัดการงาน DevTeam',
                description: 'พัฒนาระบบจัดการงานสำหรับทีมพัฒนา รวมถึง Kanban Board, ปฏิทิน และรายงาน',
                status: 'active',
                progress: 65,
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-06-30'),
                color: '#ff6b35'
            }
        }),
        prisma.project.create({
            data: {
                id: 'proj2',
                name: 'แอป Mobile Banking',
                description: 'พัฒนาแอปพลิเคชันธนาคารบนมือถือ สำหรับ iOS และ Android',
                status: 'active',
                progress: 40,
                startDate: new Date('2025-02-01'),
                endDate: new Date('2025-09-30'),
                color: '#2196f3'
            }
        }),
        prisma.project.create({
            data: {
                id: 'proj3',
                name: 'เว็บไซต์ E-Commerce',
                description: 'สร้างเว็บไซต์ร้านค้าออนไลน์พร้อมระบบชำระเงิน',
                status: 'active',
                progress: 80,
                startDate: new Date('2024-11-01'),
                endDate: new Date('2025-04-30'),
                color: '#4caf50'
            }
        }),
        prisma.project.create({
            data: {
                id: 'proj4',
                name: 'ระบบ CRM',
                description: 'ระบบจัดการลูกค้าสัมพันธ์สำหรับทีมขาย',
                status: 'on-hold',
                progress: 20,
                startDate: new Date('2025-03-01'),
                color: '#9c27b0'
            }
        })
    ]);

    console.log(`  Created ${projects.length} projects`);

    // ============ Teams ============
    const teamsData = [
        {
            id: 'team1',
            name: 'ทีม Frontend',
            description: 'ทีมพัฒนา UI/UX และ Frontend',
            projectId: 'proj1',
            color: '#ff6b35',
            memberIds: [{ userId: 'user1', role: 'lead' }, { userId: 'user2', role: 'member' }, { userId: 'user6', role: 'member' }]
        },
        {
            id: 'team2',
            name: 'ทีม Backend',
            description: 'ทีมพัฒนา API และ Database',
            projectId: 'proj1',
            color: '#2196f3',
            memberIds: [{ userId: 'user3', role: 'lead' }, { userId: 'user1', role: 'member' }]
        },
        {
            id: 'team3',
            name: 'ทีม QA',
            description: 'ทีมทดสอบและประกันคุณภาพ',
            projectId: 'proj1',
            color: '#4caf50',
            memberIds: [{ userId: 'user4', role: 'lead' }]
        },
        {
            id: 'team4',
            name: 'ทีม Mobile',
            description: 'ทีมพัฒนาแอปมือถือ',
            projectId: 'proj2',
            color: '#e91e63',
            memberIds: [{ userId: 'user3', role: 'lead' }, { userId: 'user6', role: 'member' }]
        }
    ];

    for (const team of teamsData) {
        const { memberIds, ...teamInfo } = team;
        await prisma.team.create({
            data: {
                ...teamInfo,
                members: {
                    create: memberIds.map(m => ({
                        userId: m.userId,
                        role: m.role
                    }))
                }
            }
        });
    }

    console.log(`  Created ${teamsData.length} teams`);

    // ============ Sprints ============
    const sprintsData = [
        {
            id: 'sprint1',
            name: 'Sprint 1 - Auth & Dashboard',
            description: 'สปรินท์แรก: ระบบ Login และ Dashboard',
            projectId: 'proj1',
            status: 'completed',
            goal: 'ทำระบบ Login และ Dashboard ให้เสร็จ',
            startDate: new Date('2025-01-15'),
            endDate: new Date('2025-01-29'),
        },
        {
            id: 'sprint2',
            name: 'Sprint 2 - Kanban & Tasks',
            description: 'สปรินท์ที่ 2: ระบบ Kanban Board',
            projectId: 'proj1',
            status: 'active',
            goal: 'ทำระบบ Kanban Board และจัดการงานให้เสร็จ',
            startDate: new Date('2025-02-01'),
            endDate: new Date('2025-02-14'),
        },
        {
            id: 'sprint3',
            name: 'Sprint 3 - Reports & QA',
            description: 'สปรินท์ที่ 3: รายงานและทดสอบ',
            projectId: 'proj1',
            status: 'planning',
            goal: 'ทำระบบรายงานและทดสอบทั้งหมด',
            startDate: new Date('2025-02-15'),
            endDate: new Date('2025-02-28'),
        },
    ];

    for (const sprint of sprintsData) {
        await prisma.sprint.create({ data: sprint });
    }

    console.log(`  Created ${sprintsData.length} sprints`);

    // ============ Tasks ============
    const tasksData = [
        {
            id: 'task1',
            title: 'ออกแบบหน้า Login',
            description: 'ออกแบบและพัฒนาหน้า Login พร้อมระบบ Authentication',
            status: 'done',
            priority: 'high',
            projectId: 'proj1',
            teamId: 'team1',
            sprintId: 'sprint1',
            createdBy: 'user1',
            dueDate: new Date('2025-02-15'),
            completedAt: new Date('2025-02-14'),
            assignees: ['user1', 'user2'],
            tags: ['design', 'auth', 'frontend'],
            subtasks: [
                { title: 'ออกแบบ Wireframe', completed: true },
                { title: 'สร้าง Component', completed: true },
                { title: 'เชื่อมต่อ API', completed: true }
            ],
            timeEstimated: 480,
            timeSpent: 420
        },
        {
            id: 'task2',
            title: 'พัฒนา REST API สำหรับผู้ใช้',
            description: 'สร้าง CRUD endpoints สำหรับจัดการข้อมูลผู้ใช้',
            status: 'in-progress',
            priority: 'urgent',
            projectId: 'proj1',
            teamId: 'team2',
            createdBy: 'user3',
            dueDate: new Date('2025-03-01'),
            assignees: ['user3'],
            tags: ['backend', 'api', 'nodejs'],
            subtasks: [
                { title: 'สร้าง User Schema', completed: true },
                { title: 'Implement CRUD Routes', completed: true },
                { title: 'เขียน Unit Tests', completed: false },
                { title: 'เอกสาร API', completed: false }
            ],
            timeEstimated: 600,
            timeSpent: 350
        },
        {
            id: 'task3',
            title: 'สร้าง Kanban Board Component',
            description: 'พัฒนา Drag & Drop Kanban Board สำหรับจัดการงาน',
            status: 'review',
            priority: 'high',
            projectId: 'proj1',
            teamId: 'team1',
            sprintId: 'sprint2',
            createdBy: 'user1',
            dueDate: new Date('2025-03-10'),
            assignees: ['user1', 'user6'],
            tags: ['frontend', 'component', 'react'],
            subtasks: [
                { title: 'ออกแบบ Layout', completed: true },
                { title: 'Implement Drag & Drop', completed: true },
                { title: 'สร้าง Task Card', completed: true },
                { title: 'ทดสอบ Responsive', completed: false }
            ],
            timeEstimated: 720,
            timeSpent: 600
        },
        {
            id: 'task4',
            title: 'ออกแบบ UI Dashboard',
            description: 'ออกแบบและพัฒนา Dashboard แสดงข้อมูลสรุปโปรเจค',
            status: 'in-progress',
            priority: 'medium',
            projectId: 'proj1',
            teamId: 'team1',
            sprintId: 'sprint2',
            createdBy: 'user2',
            dueDate: new Date('2025-03-15'),
            assignees: ['user2'],
            tags: ['design', 'dashboard', 'charts'],
            subtasks: [
                { title: 'ออกแบบ Mockup', completed: true },
                { title: 'สร้าง Stats Cards', completed: true },
                { title: 'สร้าง Charts', completed: false }
            ],
            timeEstimated: 480,
            timeSpent: 240
        },
        {
            id: 'task5',
            title: 'ทดสอบระบบจัดการงาน',
            description: 'ทดสอบฟังก์ชันทั้งหมดของระบบจัดการงาน',
            status: 'todo',
            priority: 'medium',
            projectId: 'proj1',
            teamId: 'team3',
            sprintId: 'sprint3',
            createdBy: 'user4',
            dueDate: new Date('2025-03-20'),
            assignees: ['user4'],
            tags: ['testing', 'qa'],
            subtasks: [
                { title: 'เขียน Test Cases', completed: false },
                { title: 'ทดสอบ Unit Test', completed: false },
                { title: 'ทดสอบ Integration', completed: false }
            ],
            timeEstimated: 360,
            timeSpent: 0
        },
        {
            id: 'task6',
            title: 'ออกแบบ Database Schema',
            description: 'ออกแบบโครงสร้างฐานข้อมูลสำหรับแอป Mobile Banking',
            status: 'in-progress',
            priority: 'high',
            projectId: 'proj2',
            teamId: 'team4',
            createdBy: 'user3',
            dueDate: new Date('2025-03-05'),
            assignees: ['user3', 'user6'],
            tags: ['database', 'design', 'postgresql'],
            subtasks: [
                { title: 'ออกแบบ ERD', completed: true },
                { title: 'Review Schema', completed: false }
            ],
            timeEstimated: 240,
            timeSpent: 150
        },
        {
            id: 'task7',
            title: 'สร้างหน้า Product Listing',
            description: 'พัฒนาหน้ารายการสินค้าพร้อมระบบกรองและค้นหา',
            status: 'done',
            priority: 'medium',
            projectId: 'proj3',
            createdBy: 'user6',
            dueDate: new Date('2025-02-28'),
            completedAt: new Date('2025-02-27'),
            assignees: ['user6', 'user2'],
            tags: ['frontend', 'ecommerce'],
            subtasks: [
                { title: 'สร้าง Product Card', completed: true },
                { title: 'ระบบ Filter', completed: true },
                { title: 'ระบบ Search', completed: true }
            ],
            timeEstimated: 480,
            timeSpent: 450
        },
        {
            id: 'task8',
            title: 'ระบบชำระเงิน',
            description: 'เชื่อมต่อระบบชำระเงินกับ Payment Gateway',
            status: 'todo',
            priority: 'urgent',
            projectId: 'proj3',
            createdBy: 'user3',
            dueDate: new Date('2025-03-25'),
            assignees: ['user3'],
            tags: ['backend', 'payment', 'api'],
            subtasks: [
                { title: 'เลือก Payment Provider', completed: false },
                { title: 'Implement Integration', completed: false },
                { title: 'ทดสอบ Sandbox', completed: false }
            ],
            timeEstimated: 720,
            timeSpent: 0
        }
    ];

    for (const taskData of tasksData) {
        const { assignees, tags, subtasks, timeEstimated, timeSpent, ...task } = taskData;
        await prisma.task.create({
            data: {
                ...task,
                assignees: {
                    create: assignees.map(userId => ({ userId }))
                },
                tags: {
                    create: tags.map(tag => ({ tag }))
                },
                subtasks: {
                    create: subtasks
                },
                timeTracking: {
                    create: {
                        estimated: timeEstimated,
                        spent: timeSpent
                    }
                }
            }
        });
    }

    console.log(`  Created ${tasksData.length} tasks`);

    // ============ Calendar Events ============
    const now = new Date();
    const eventsData = [
        {
            title: 'Sprint Planning',
            description: 'ประชุมวางแผน Sprint ใหม่',
            startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0),
            endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30),
            type: 'meeting',
            userId: 'user5',
            projectId: 'proj1'
        },
        {
            title: 'Code Review: Kanban Board',
            description: 'Review โค้ด Kanban Board Component',
            startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
            endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0),
            type: 'task',
            userId: 'user1',
            projectId: 'proj1',
            taskId: 'task3'
        },
        {
            title: 'ส่งงาน UI Dashboard',
            startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 17, 0),
            endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 17, 30),
            type: 'deadline',
            userId: 'user2',
            projectId: 'proj1',
            taskId: 'task4'
        },
        {
            title: 'ประชุมทีม QA',
            description: 'ประชุมวางแผนการทดสอบ',
            startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0),
            endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 0),
            type: 'meeting',
            userId: 'user4'
        },
        {
            title: 'ตรวจสอบ Payment API',
            startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 9, 0),
            endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 9, 30),
            type: 'reminder',
            userId: 'user3',
            projectId: 'proj3'
        },
        {
            title: 'Demo ให้ลูกค้า',
            description: 'นำเสนอผลงาน E-Commerce',
            startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 13, 0),
            endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 14, 30),
            type: 'meeting',
            userId: 'user5',
            projectId: 'proj3'
        }
    ];

    for (const event of eventsData) {
        await prisma.calendarEvent.create({ data: event });
    }

    console.log(`  Created ${eventsData.length} calendar events`);

    // ============ Activities ============
    const activitiesData = [
        { userId: 'user1', action: 'created', targetType: 'task', targetId: 'task1', targetName: 'ออกแบบหน้า Login' },
        { userId: 'user1', action: 'completed', targetType: 'task', targetId: 'task1', targetName: 'ออกแบบหน้า Login' },
        { userId: 'user3', action: 'created', targetType: 'task', targetId: 'task2', targetName: 'พัฒนา REST API สำหรับผู้ใช้' },
        { userId: 'user3', action: 'started', targetType: 'task', targetId: 'task2', targetName: 'พัฒนา REST API สำหรับผู้ใช้' },
        { userId: 'user1', action: 'created', targetType: 'task', targetId: 'task3', targetName: 'สร้าง Kanban Board Component' },
        { userId: 'user2', action: 'commented', targetType: 'task', targetId: 'task3', targetName: 'สร้าง Kanban Board Component' },
        { userId: 'user2', action: 'updated', targetType: 'task', targetId: 'task4', targetName: 'ออกแบบ UI Dashboard' },
        { userId: 'user4', action: 'assigned', targetType: 'task', targetId: 'task5', targetName: 'ทดสอบระบบจัดการงาน' },
        { userId: 'user6', action: 'completed', targetType: 'task', targetId: 'task7', targetName: 'สร้างหน้า Product Listing' },
        { userId: 'user5', action: 'created', targetType: 'project', targetId: 'proj2', targetName: 'แอป Mobile Banking' },
    ];

    for (const activity of activitiesData) {
        await prisma.activity.create({ data: activity });
    }

    console.log(`  Created ${activitiesData.length} activities`);
    console.log('✅ Seeding complete!');
}

main()
    .catch(e => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
