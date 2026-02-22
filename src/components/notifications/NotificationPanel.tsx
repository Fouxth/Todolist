import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, UserPlus, CheckCircle, MessageSquare, Clock, X } from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';
import { useLanguage } from '@/i18n/LanguageContext';

interface NotificationPanelProps {
    notifications: Notification[];
    unreadCount: number;
    onMarkAsRead: (id: string) => void;
    onMarkAllRead: () => void;
    onDelete: (id: string) => void;
    onNotificationClick?: (notif: Notification) => void;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
    task_assigned: { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    task_completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    task_created: { icon: Bell, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    comment: { icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    mention: { icon: Bell, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    due_soon: { icon: Clock, color: 'text-red-400', bg: 'bg-red-500/10' },
};

export function NotificationPanel({
    notifications,
    unreadCount,
    onMarkAsRead,
    onMarkAllRead,
    onDelete,
    onNotificationClick
}: NotificationPanelProps) {
    const { t, lang } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    function timeAgo(dateStr: string): string {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t.notification.justNow;
        if (mins < 60) return `${mins} ${t.notification.minutesAgo}`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} ${t.notification.hoursAgo}`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} ${t.notification.daysAgo}`;
        return new Date(dateStr).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' });
    }

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--orange)] text-xs flex items-center justify-center font-bold animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[500px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-white font-semibold text-sm">{t.notification.title}</h3>
                            {unreadCount > 0 && (
                                <span className="text-xs bg-[var(--orange)] text-white px-1.5 py-0.5 rounded-full font-medium">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={onMarkAllRead}
                                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-md hover:bg-white/5 transition-colors flex items-center gap-1"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    {t.notification.markAllRead}
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-md hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-[420px] scrollbar-thin">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <Bell className="w-10 h-10 mb-3 opacity-30" />
                                <p className="text-sm">{t.notification.empty}</p>
                            </div>
                        ) : (
                            notifications.map(notif => {
                                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.task_created;
                                const Icon = config.icon;

                                return (
                                    <div
                                        key={notif.id}
                                        className={`group flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/[0.03] ${!notif.read ? 'bg-white/[0.02]' : ''}`}
                                        onClick={() => {
                                            if (!notif.read) onMarkAsRead(notif.id);
                                            onNotificationClick?.(notif);
                                        }}
                                    >
                                        {/* Icon */}
                                        <div className={`shrink-0 w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center mt-0.5`}>
                                            <Icon className={`w-4 h-4 ${config.color}`} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm leading-snug ${!notif.read ? 'text-white font-medium' : 'text-gray-300'}`}>
                                                    {notif.title}
                                                </p>
                                                {!notif.read && (
                                                    <div className="shrink-0 w-2 h-2 rounded-full bg-[var(--orange)] mt-1.5" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                            <p className="text-xs text-gray-600 mt-1">{timeAgo(notif.createdAt)}</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notif.read && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onMarkAsRead(notif.id); }}
                                                    className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-green-400 transition-colors"
                                                    title={t.notification.read}
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
                                                className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors"
                                                title={t.notification.delete}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
