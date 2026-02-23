import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Bell, CheckCircle, MessageSquare, UserPlus, AlertCircle } from 'lucide-react';

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

export interface NotificationPrefs {
    taskAssigned: boolean;
    taskDue: boolean;
    mention: boolean;
    projectUpdate: boolean;
    weeklyReport: boolean;
}

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
    taskAssigned: true,
    taskDue: true,
    mention: true,
    projectUpdate: false,
    weeklyReport: true,
};

// Map notification type → pref key
const TYPE_TO_PREF: Record<string, keyof NotificationPrefs> = {
    task_assigned: 'taskAssigned',
    due_soon:      'taskDue',
    mention:       'mention',
    task_created:  'projectUpdate',
    task_completed:'projectUpdate',
    comment:       'projectUpdate',
};

interface UseNotificationsOptions {
    token: string | null;
    prefs?: NotificationPrefs;
    onNotification?: (notification: Notification) => void;
}

// Notification icon mapping
const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, any> = {
        'task_assigned': UserPlus,
        'comment': MessageSquare,
        'mention': MessageSquare,
        'task_completed': CheckCircle,
        'due_soon': AlertCircle,
        'task_created': Bell,
        'default': Bell
    };
    const Icon = iconMap[type] || iconMap.default;
    return <Icon className="w-4 h-4" />;
};

// Create notification sound using Web Audio API
const playNotificationSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        
        // Create a simple pleasant notification tone
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Two-tone notification (E5 -> G#5)
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(830.61, audioContext.currentTime + 0.1);
        
        // Envelope for smooth sound
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.type = 'sine';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        // Clean up
        setTimeout(() => audioContext.close(), 400);
    } catch (error) {
        console.error('Failed to play notification sound:', error);
    }
};

export function useNotifications({ token, prefs, onNotification }: UseNotificationsOptions) {
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

        const socketUrl = import.meta.env.VITE_SOCKET_URL || '/';
        const socket = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            // connected
        });

        socket.on('new_notification', (notif: Notification) => {
            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Skip toast for chat notifications — handled by ChatPanel unread badge
            if (notif.type !== 'chat' as any) {
                // Check user prefs — if the pref key exists and is false, suppress
                const prefKey = TYPE_TO_PREF[notif.type];
                const allowed = !prefKey || !prefs || prefs[prefKey] !== false;

                if (allowed) {
                    toast(notif.title, {
                        description: notif.message,
                        duration: 5000,
                        icon: getNotificationIcon(notif.type),
                    });
                    playNotificationSound();
                }
            }

            // Call callback if provided (also gated by prefs)
            if (onNotification) {
                const prefKey = TYPE_TO_PREF[notif.type];
                const allowed = !prefKey || !prefs || prefs[prefKey] !== false;
                if (allowed && (notif.type as string) !== 'chat') {
                    onNotification(notif);
                }
            }
        });

        socket.on('disconnect', () => {
            // disconnected
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
