import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { usersRouter } from './routes/users.js';
import { projectsRouter } from './routes/projects.js';
import { teamsRouter } from './routes/teams.js';
import { tasksRouter } from './routes/tasks.js';
import { eventsRouter } from './routes/events.js';
import { activitiesRouter } from './routes/activities.js';
import { statsRouter } from './routes/stats.js';
import { authRouter } from './routes/auth.js';
import { notificationsRouter } from './routes/notifications.js';
import { commentsRouter } from './routes/comments.js';
import { profileRouter } from './routes/profile.js';
import { attachmentsRouter } from './routes/attachments.js';
import { sprintsRouter } from './routes/sprints.js';
import { chatsRouter } from './routes/chats.js';
import { publicRouter } from './routes/public.js';
import { publicWorksRouter } from './routes/publicWorks.js';
import { quotationRequestsRouter } from './routes/quotationRequests.js';
import { systemSettingsRouter } from './routes/systemSettings.js';
import { quotationsRouter } from './routes/quotations.js';
import { invoicesRouter } from './routes/invoices.js';
import { setIO } from './lib/socket.js';
import { checkUpcomingDeadlines } from './lib/email.js';
import { authenticate } from './middleware/auth.js';
import { JWT_SECRET } from './lib/config.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 2004;

// Trust proxy for proper IP detection behind load balancers
// Set to 1 to trust the first proxy (for development/single proxy)
app.set('trust proxy', 1);

// Socket.io
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5174',
            'http://localhost:4173',
            'http://127.0.0.1:4173',
            'https://dev4th.xyz',
            'https://www.dev4th.xyz',
            'https://dxv4th.vercel.app',
            /\.vercel\.app$/,
            /\.trycloudflare\.com$/
        ],
        methods: ['GET', 'POST'],
        credentials: true
    },
    allowEIO3: true,
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Share io instance globally
setIO(io);

import { prisma } from './lib/prisma.js';

// Socket authentication & room join
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        (socket as any).userId = decoded.userId;
        next();
    } catch {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    socket.join(`user:${userId}`);
    console.log(`🔌 User ${userId} connected (socket ${socket.id})`);

    // Chat room management — validate membership before joining or sending typing events
    socket.on('chat:join', async (chatId: string) => {
        if (!chatId || typeof chatId !== 'string') return;
        const member = await prisma.chatMember.findUnique({
            where: { chatId_userId: { chatId, userId } }
        });
        if (member) {
            socket.join(`chat:${chatId}`);
        }
    });

    socket.on('chat:leave', (chatId: string) => {
        if (!chatId || typeof chatId !== 'string') return;
        socket.leave(`chat:${chatId}`);
    });

    socket.on('chat:typing', async (data: { chatId: string; isTyping: boolean; userName: string }) => {
        if (!data?.chatId || typeof data.chatId !== 'string') return;
        const member = await prisma.chatMember.findUnique({
            where: { chatId_userId: { chatId: data.chatId, userId } }
        });
        if (member) {
            socket.to(`chat:${data.chatId}`).emit('chat:typing', {
                userId,
                chatId: data.chatId,
                userName: data.userName,
                isTyping: data.isTyping
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 User ${userId} disconnected`);
    });
});

// Security middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Rate limiting for auth routes
const authLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 20, 
    message: { error: 'Too many requests, please try again later' }
});
const apiLimiter = rateLimit({ 
    windowMs: 1 * 60 * 1000, 
    max: 200
});

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
        'https://dev4th.xyz',
        'https://www.dev4th.xyz',
        'https://dxv4th.vercel.app',
        /\.vercel\.app$/
    ],
    credentials: true
}));
app.use(express.json());
app.use('/api', apiLimiter);

// File downloads are handled securely with authorization checks in attachmentsRouter: /api/attachments/:id/download

// Routes — auth is public, everything else is protected
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/public-works', authenticate, publicWorksRouter);
app.use('/api/quotation-requests', authenticate, quotationRequestsRouter);
app.use('/api/quotations', authenticate, quotationsRouter);
app.use('/api/invoices', authenticate, invoicesRouter);
app.use('/api/system-settings', authenticate, systemSettingsRouter);
app.use('/api/users', authenticate, usersRouter);
app.use('/api/projects', authenticate, projectsRouter);
app.use('/api/teams', authenticate, teamsRouter);
app.use('/api/tasks', authenticate, tasksRouter);
app.use('/api/events', authenticate, eventsRouter);
app.use('/api/activities', authenticate, activitiesRouter);
app.use('/api/stats', authenticate, statsRouter);
app.use('/api/notifications', authenticate, notificationsRouter);
app.use('/api/comments', authenticate, commentsRouter);
app.use('/api/profile', authenticate, profileRouter);
app.use('/api/sprints', authenticate, sprintsRouter);
app.use('/api', authenticate, attachmentsRouter);
app.use('/api/chats', authenticate, chatsRouter);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);

    // Check for upcoming deadlines every hour
    checkUpcomingDeadlines();
    setInterval(checkUpcomingDeadlines, 60 * 60 * 1000);
});
