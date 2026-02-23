import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Chat, ChatMessage } from '@/types';

interface UseChatsOptions {
    token: string | null;
    currentUserId: string;
}

export function useChats({ token, currentUserId }: UseChatsOptions) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
    const [typingUsers, setTypingUsers] = useState<Record<string, { userId: string; userName: string }[]>>({});
    const [totalUnread, setTotalUnread] = useState(0);
    const socketRef = useRef<Socket | null>(null);
    const typingTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const activeChatIdRef = useRef<string | null>(null);

    // Keep ref in sync
    useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const authHeader = useCallback(() => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
    }), [token]);

    const computeTotal = useCallback((list: Chat[]) => {
        setTotalUnread(list.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0));
    }, []);

    // ─── Fetch chats list ─────────────────────────────────────────────────────
    const fetchChats = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch('/api/chats', { headers: authHeader() });
            if (res.ok) {
                const data: Chat[] = await res.json();
                setChats(data);
                computeTotal(data);
            }
        } catch (err) {
            console.error('Failed to fetch chats', err);
        } finally {
            setLoading(false);
        }
    }, [token, authHeader, computeTotal]);

    // ─── Fetch messages for a chat ────────────────────────────────────────────
    const fetchMessages = useCallback(async (chatId: string, before?: string) => {
        if (!token) return;
        try {
            const url = `/api/chats/${chatId}/messages${before ? `?before=${before}` : ''}`;
            const res = await fetch(url, { headers: authHeader() });
            if (res.ok) {
                const data: ChatMessage[] = await res.json();
                setMessages(prev => ({
                    ...prev,
                    [chatId]: before
                        ? [...data, ...(prev[chatId] ?? [])]
                        : data
                }));
            }
        } catch (err) {
            console.error('Failed to fetch messages', err);
        }
    }, [token, authHeader]);

    // ─── Open a chat ──────────────────────────────────────────────────────────
    const openChat = useCallback(async (chatId: string) => {
        setActiveChatId(chatId);
        if (!messages[chatId]) {
            await fetchMessages(chatId);
        }
        // Join socket room & mark read
        socketRef.current?.emit('chat:join', chatId);
        markRead(chatId);
    }, [messages, fetchMessages]); // eslint-disable-line react-hooks/exhaustive-deps

    const closeChat = useCallback(() => {
        if (activeChatId) {
            socketRef.current?.emit('chat:leave', activeChatId);
        }
        setActiveChatId(null);
    }, [activeChatId]);

    // ─── Create / get chat ────────────────────────────────────────────────────
    const openDirectChat = useCallback(async (otherUserId: string): Promise<Chat | null> => {
        if (!token) return null;
        try {
            const res = await fetch('/api/chats', {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ type: 'direct', memberIds: [otherUserId] })
            });
            if (res.ok) {
                const chat: Chat = await res.json();
                setChats(prev => {
                    const exists = prev.find(c => c.id === chat.id);
                    if (exists) return prev;
                    return [chat, ...prev];
                });
                openChat(chat.id);
                return chat;
            }
        } catch (err) {
            console.error('Failed to open direct chat', err);
        }
        return null;
    }, [token, authHeader, openChat]);

    const openProjectChat = useCallback(async (projectId: string): Promise<Chat | null> => {
        if (!token) return null;
        try {
            const res = await fetch('/api/chats', {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ type: 'project', projectId })
            });
            if (res.ok) {
                const chat: Chat = await res.json();
                setChats(prev => {
                    const exists = prev.find(c => c.id === chat.id);
                    if (exists) return prev;
                    return [chat, ...prev];
                });
                openChat(chat.id);
                return chat;
            }
        } catch (err) {
            console.error('Failed to open project chat', err);
        }
        return null;
    }, [token, authHeader, openChat]);

    // ─── Send message ─────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (
        chatId: string,
        content: string,
        replyToId?: string
    ): Promise<boolean> => {
        if (!token || !content.trim()) return false;
        try {
            const res = await fetch(`/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ content, replyToId })
            });
            return res.ok;
        } catch {
            return false;
        }
    }, [token, authHeader]);

    // ─── Delete message ───────────────────────────────────────────────────────
    const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
        if (!token) return false;
        try {
            const res = await fetch(`/api/chats/messages/${messageId}`, {
                method: 'DELETE',
                headers: authHeader()
            });
            return res.ok;
        } catch {
            return false;
        }
    }, [token, authHeader]);

    // ─── Edit message ─────────────────────────────────────────────────────────
    const editMessage = useCallback(async (messageId: string, content: string): Promise<boolean> => {
        if (!token) return false;
        try {
            const res = await fetch(`/api/chats/messages/${messageId}`, {
                method: 'PATCH',
                headers: authHeader(),
                body: JSON.stringify({ content })
            });
            return res.ok;
        } catch {
            return false;
        }
    }, [token, authHeader]);

    // ─── Mark read ────────────────────────────────────────────────────────────
    const markRead = useCallback(async (chatId: string) => {
        if (!token) return;
        try {
            await fetch(`/api/chats/${chatId}/read`, {
                method: 'PATCH',
                headers: authHeader()
            });
            setChats(prev => {
                const updated = prev.map(c =>
                    c.id === chatId ? { ...c, unreadCount: 0 } : c
                );
                computeTotal(updated);
                return updated;
            });
        } catch { /* ignore */ }
    }, [token, authHeader, computeTotal]);

    // ─── Typing indicator ─────────────────────────────────────────────────────
    const sendTyping = useCallback((chatId: string, isTyping: boolean, userName: string) => {
        socketRef.current?.emit('chat:typing', { chatId, isTyping, userName });
    }, []);

    // ─── Socket.IO ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token) return;

        // Always use relative URL so requests go through Vercel proxy (avoids mixed-content block)
        const url = typeof window !== 'undefined' && window.location.protocol === 'https:'
            ? window.location.origin
            : (import.meta.env.VITE_SOCKET_URL || '/');
        const socket = io(url, {
            auth: { token },
            transports: ['polling'],
            path: '/socket.io'
        });
        socketRef.current = socket;

        socket.on('chat:message', (msg: ChatMessage) => {
            setMessages(prev => ({
                ...prev,
                [msg.chatId]: [...(prev[msg.chatId] ?? []), msg]
            }));

            const isActive = msg.chatId === activeChatIdRef.current;
            const isOwn = msg.userId === currentUserId;

            // Auto mark-read if this chat is currently open and message is from others
            if (isActive && !isOwn) {
                fetch(`/api/chats/${msg.chatId}/read`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                }).catch(() => {});
            }

            // Bump chat to top + increment unread if not the active chat
            setChats(prev => {
                const updated = prev.map(c => {
                    if (c.id !== msg.chatId) return c;
                    return {
                        ...c,
                        updatedAt: new Date().toISOString(),
                        messages: [msg],
                        unreadCount: (isActive || isOwn) ? 0 : (c.unreadCount ?? 0) + 1
                    };
                });
                const sorted = [...updated].sort(
                    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                );
                computeTotal(sorted);
                return sorted;
            });
        });

        socket.on('chat:message:deleted', ({ id, chatId }: { id: string; chatId: string }) => {
            setMessages(prev => ({
                ...prev,
                [chatId]: (prev[chatId] ?? []).filter(m => m.id !== id)
            }));
        });

        socket.on('chat:message:edited', (updated: ChatMessage) => {
            setMessages(prev => ({
                ...prev,
                [updated.chatId]: (prev[updated.chatId] ?? []).map(m =>
                    m.id === updated.id ? updated : m
                )
            }));
        });

        socket.on('chat:typing', (data: { userId: string; userName: string; isTyping: boolean; chatId?: string }) => {
            if (!data.chatId) return;
            setTypingUsers(prev => {
                const current = prev[data.chatId!] ?? [];
                if (data.isTyping) {
                    const exists = current.find(u => u.userId === data.userId);
                    if (exists) return prev;
                    return { ...prev, [data.chatId!]: [...current, { userId: data.userId, userName: data.userName }] };
                } else {
                    return { ...prev, [data.chatId!]: current.filter(u => u.userId !== data.userId) };
                }
            });

            // Auto-clear typing after 3s
            if (data.isTyping) {
                clearTimeout(typingTimerRef.current[data.userId]);
                typingTimerRef.current[data.userId] = setTimeout(() => {
                    setTypingUsers(prev => {
                        if (!data.chatId) return prev;
                        return {
                            ...prev,
                            [data.chatId]: (prev[data.chatId] ?? []).filter(u => u.userId !== data.userId)
                        };
                    });
                }, 3000);
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    // Initial load
    useEffect(() => {
        if (token) fetchChats();
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        chats,
        loading,
        activeChatId,
        messages,
        typingUsers,
        totalUnread,
        fetchChats,
        fetchMessages,
        openChat,
        closeChat,
        openDirectChat,
        openProjectChat,
        sendMessage,
        deleteMessage,
        editMessage,
        markRead,
        sendTyping,
        setActiveChatId
    };
}

export type UseChatReturn = ReturnType<typeof useChats>;
