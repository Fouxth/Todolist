/**
 * Email Notification Service
 * 
 * Uses nodemailer to send email notifications.
 * Configure via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * 
 * If SMTP is not configured, emails will be logged to console instead.
 */

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'DevTeam <noreply@devteam.app>';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

let transporter: any = null;

async function getTransporter() {
    if (transporter) return transporter;

    if (!SMTP_HOST || !SMTP_USER) {
        console.log('📧 SMTP not configured — emails will be logged to console');
        return null;
    }

    try {
        // @ts-ignore - nodemailer is an optional dependency
        const nodemailer = await import('nodemailer');
        transporter = nodemailer.default.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
        console.log('📧 SMTP transport ready');
        return transporter;
    } catch (error) {
        console.error('📧 Failed to create SMTP transport:', error);
        return null;
    }
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
    try {
        const transport = await getTransporter();

        if (!transport) {
            // Fallback: log to console
            console.log(`📧 [EMAIL] To: ${to} | Subject: ${subject}`);
            console.log(`📧 [EMAIL] Body preview: ${html.replace(/<[^>]*>/g, '').substring(0, 200)}`);
            return true;
        }

        await transport.sendMail({
            from: SMTP_FROM,
            to,
            subject,
            html,
        });
        console.log(`📧 Email sent to ${to}: ${subject}`);
        return true;
    } catch (error) {
        console.error(`📧 Failed to send email to ${to}:`, error);
        return false;
    }
}

// ---- Email Templates ----

export function taskAssignedEmail(assigneeName: string, assignerName: string, taskTitle: string, taskId: string): EmailOptions {
    return {
        to: '', // caller fills this
        subject: `🔔 New Task Assigned: ${taskTitle}`,
        html: `
            <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #1a1a2e; color: #ffffff; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; padding: 12px 20px; background: linear-gradient(135deg, #ff6b35, #ff8c42); border-radius: 12px; font-size: 20px; font-weight: bold;">
                        DevTeam
                    </div>
                </div>
                <h2 style="color: #ff6b35; margin-bottom: 8px;">New Task Assigned to You</h2>
                <p style="color: #9ca3af;">Hi ${assigneeName},</p>
                <p style="color: #d1d5db;"><strong>${assignerName}</strong> has assigned you a new task:</p>
                <div style="background: #16213e; border: 1px solid rgba(255,255,255,0.1); border-left: 4px solid #ff6b35; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="color: #ffffff; margin: 0 0 4px 0;">${taskTitle}</h3>
                </div>
                <a href="${APP_URL}?task=${taskId}" style="display: inline-block; padding: 12px 24px; background: #ff6b35; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 16px;">
                    View Task →
                </a>
                <p style="color: #6b7280; font-size: 12px; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
                    You're receiving this because you were assigned a task on DevTeam.
                </p>
            </div>
        `,
    };
}

export function taskDeadlineEmail(userName: string, taskTitle: string, taskId: string, dueDate: Date): EmailOptions {
    const formattedDate = dueDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    return {
        to: '', // caller fills this
        subject: `⏰ Deadline Approaching: ${taskTitle}`,
        html: `
            <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #1a1a2e; color: #ffffff; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; padding: 12px 20px; background: linear-gradient(135deg, #ff6b35, #ff8c42); border-radius: 12px; font-size: 20px; font-weight: bold;">
                        DevTeam
                    </div>
                </div>
                <h2 style="color: #f44336; margin-bottom: 8px;">⏰ Deadline Approaching</h2>
                <p style="color: #9ca3af;">Hi ${userName},</p>
                <p style="color: #d1d5db;">Your task is due soon:</p>
                <div style="background: #16213e; border: 1px solid rgba(255,255,255,0.1); border-left: 4px solid #f44336; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="color: #ffffff; margin: 0 0 8px 0;">${taskTitle}</h3>
                    <p style="color: #f44336; font-weight: 600; margin: 0;">Due: ${formattedDate}</p>
                </div>
                <a href="${APP_URL}?task=${taskId}" style="display: inline-block; padding: 12px 24px; background: #ff6b35; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 16px;">
                    View Task →
                </a>
                <p style="color: #6b7280; font-size: 12px; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
                    You're receiving this because a task assigned to you is due within 24 hours.
                </p>
            </div>
        `,
    };
}

// ---- Deadline Checker (run periodically) ----

import { prisma } from './prisma.js';
import { emitToUser } from './socket.js';

export async function checkUpcomingDeadlines() {
    try {
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Find tasks due within next 24 hours that haven't been completed
        const tasks = await prisma.task.findMany({
            where: {
                dueDate: {
                    gte: now,
                    lte: in24h,
                },
                status: { not: 'done' },
            },
            include: {
                assignees: {
                    include: { user: true }
                },
            },
        });

        for (const task of tasks) {
            for (const assignee of task.assignees) {
                // Check if we already sent a due_soon notification in the last 24h
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId: assignee.userId,
                        type: 'due_soon',
                        link: task.id,
                        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
                    },
                });

                if (!existing) {
                    // Create in-app notification
                    const notif = await prisma.notification.create({
                        data: {
                            userId: assignee.userId,
                            type: 'due_soon',
                            title: '⏰ งานใกล้ถึงกำหนด',
                            message: `งาน "${task.title}" จะครบกำหนดภายใน 24 ชั่วโมง`,
                            link: task.id,
                        },
                    });
                    emitToUser(assignee.userId, 'new_notification', notif);

                    // Send email notification
                    if (assignee.user.email) {
                        const email = taskDeadlineEmail(
                            assignee.user.name,
                            task.title,
                            task.id,
                            task.dueDate!
                        );
                        email.to = assignee.user.email;
                        await sendEmail(email);
                    }
                }
            }
        }

        console.log(`📧 Deadline check complete: ${tasks.length} tasks due within 24h`);
    } catch (error) {
        console.error('📧 Deadline check failed:', error);
    }
}
