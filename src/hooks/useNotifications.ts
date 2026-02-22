import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

export interface Notification {
    id: string;
    userId: string;
    type: 'task_assigned' | 'task_completed' | 'task_created' | 'comment' | 'mention' | 'due_soon';
    title: string;
    message: string;
    read: boolean;
    link?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

interface UseNotificationsOptions {
    token: string | null;
}

export function useNotifications({ token }: UseNotificationsOptions) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const socketRef = useRef<Socket | null>(null);

    // Fetch notifications from REST API
    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }, [token]);

    // Connect socket
    useEffect(() => {
        if (!token) return;

        const socket = io('/', {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('🔌 Socket connected');
        });

        socket.on('new_notification', (notif: Notification) => {
            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Toast notification
            toast(notif.title, {
                description: notif.message,
                duration: 5000,
            });

            // Play notification sound
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRl9vT19telegramXAAMACIAEABkAGQAAABklAAIBigBMITMx');
                audio.volume = 0.3;
                audio.play().catch(() => { });
            } catch { }
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });

        socketRef.current = socket;

        // Initial load
        fetchNotifications();

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token, fetchNotifications]);

    // Mark single as read
    const markAsRead = useCallback(async (id: string) => {
        if (!token) return;
        try {
            await fetch(`/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    }, [token]);

    // Mark all as read
    const markAllRead = useCallback(async () => {
        if (!token) return;
        try {
            await fetch('/api/notifications/read-all', {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    }, [token]);

    // Delete notification
    const deleteNotification = useCallback(async (id: string) => {
        if (!token) return;
        try {
            await fetch(`/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => {
                const notif = prev.find(n => n.id === id);
                if (notif && !notif.read) {
                    setUnreadCount(c => Math.max(0, c - 1));
                }
                return prev.filter(n => n.id !== id);
            });
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    }, [token]);

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllRead,
        deleteNotification,
        refetch: fetchNotifications
    };
}
