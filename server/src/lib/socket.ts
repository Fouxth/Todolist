import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function setIO(socketIO: SocketIOServer) {
    io = socketIO;
}

export function getIO(): SocketIOServer {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
}

/** Send a notification event to a specific user's room */
export function emitToUser(userId: string, event: string, data: unknown) {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
}
