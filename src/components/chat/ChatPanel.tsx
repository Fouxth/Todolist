import { useState, useMemo } from 'react';
import {
    MessageSquare, X, Plus, Search, Hash, User as UserIcon,
    ChevronRight, ArrowLeft
} from 'lucide-react';
import type { Chat, User, Project } from '@/types';
import { ChatWindow } from './ChatWindow';
import { cn } from '@/lib/utils';
import type { UseChatReturn } from '@/hooks/useChats';

interface ChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    chatHook: UseChatReturn;
    currentUser: User;
    users: User[];
    projects: Project[];
}

export function ChatPanel({ isOpen, onClose, chatHook, currentUser, users, projects }: ChatPanelProps) {
    const {
        chats,
        activeChatId,
        messages,
        typingUsers,
        totalUnread,
        openChat,
        closeChat,
        openDirectChat,
        openProjectChat,
        sendMessage,
        deleteMessage,
        editMessage,
        markRead,
        sendTyping,
        fetchMessages
    } = chatHook;

    const [tab, setTab] = useState<'chats' | 'new'>('chats');
    const [search, setSearch] = useState('');

    const activeChat = chats.find(c => c.id === activeChatId);

    // Filtered chat list
    const filteredChats = useMemo(() => {
        if (!search.trim()) return chats;
        const q = search.toLowerCase();
        return chats.filter(c => {
            if (c.type === 'project') return c.name?.toLowerCase().includes(q);
            const other = c.members.find(m => m.userId !== currentUser.id);
            return other?.user.name.toLowerCase().includes(q);
        });
    }, [chats, search, currentUser.id]);

    // Users not yet in a direct chat
    const newChatUsers = useMemo(() => {
        if (!search.trim()) return users.filter(u => u.id !== currentUser.id);
        const q = search.toLowerCase();
        return users.filter(u => u.id !== currentUser.id && u.name.toLowerCase().includes(q));
    }, [users, search, currentUser.id]);

    // Projects without a chat yet (or all, so user can open existing)
    const projectsForChat = useMemo(() => {
        if (!search.trim()) return projects;
        const q = search.toLowerCase();
        return projects.filter(p => p.name.toLowerCase().includes(q));
    }, [projects, search]);

    const getChatName = (chat: Chat) => {
        if (chat.type === 'project') return chat.project?.name ?? chat.name ?? 'กลุ่ม';
        const other = chat.members.find(m => m.userId !== currentUser.id);
        return other?.user.name ?? 'แชทส่วนตัว';
    };

    const getChatAvatar = (chat: Chat) => {
        if (chat.type === 'project') return null;
        const other = chat.members.find(m => m.userId !== currentUser.id);
        return other?.user;
    };

    const getLastMessage = (chat: Chat) => {
        const msg = chat.messages?.[0];
        if (!msg) return 'ยังไม่มีข้อความ';
        const prefix = msg.userId === currentUser.id ? 'คุณ: ' : '';
        return `${prefix}${msg.content.substring(0, 40)}`;
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-screen w-[380px] z-50 flex flex-col bg-background border-l border-border shadow-2xl">
                {/* ── Header ────────────────────────────────────────────────── */}
                {activeChatId && activeChat ? (
                    // Chat window header
                    <div className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card">
                        <button
                            onClick={closeChat}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>

                        {activeChat.type === 'direct' ? (
                            <>
                                {(() => {
                                    const avatar = getChatAvatar(activeChat);
                                    return avatar ? (
                                        <div className="relative">
                                            <img src={avatar.avatar} alt={avatar.name} className="w-8 h-8 rounded-full object-cover" />
                                            <div className={cn(
                                                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card',
                                                avatar.status === 'online' ? 'bg-green-500' :
                                                    avatar.status === 'busy' ? 'bg-red-500' :
                                                        avatar.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                                            )} />
                                        </div>
                                    ) : <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><UserIcon className="w-4 h-4" /></div>;
                                })()}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-foreground truncate">{getChatName(activeChat)}</p>
                                    {typingUsers[activeChatId]?.length > 0
                                        ? <p className="text-xs text-[var(--orange)]">กำลังพิมพ์...</p>
                                        : <p className="text-xs text-muted-foreground">แชทส่วนตัว</p>}
                                </div>
                            </>
                        ) : (
                            <>
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                    style={{ backgroundColor: activeChat.project?.color ?? '#ff6b35' }}
                                >
                                    #
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-foreground truncate">{getChatName(activeChat)}</p>
                                    {typingUsers[activeChatId]?.length > 0
                                        ? <p className="text-xs text-[var(--orange)]">กำลังพิมพ์...</p>
                                        : <p className="text-xs text-muted-foreground">{activeChat.members.length} สมาชิก</p>}
                                </div>
                            </>
                        )}

                        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors ml-auto">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    // Chat list header
                    <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-[var(--orange)]" />
                            <span className="font-semibold text-foreground">แชท</span>
                            {totalUnread > 0 && (
                                <span className="bg-[var(--orange)] text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {totalUnread > 99 ? '99+' : totalUnread}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setTab(tab === 'new' ? 'chats' : 'new')}
                                className={cn(
                                    'p-1.5 rounded-lg transition-colors',
                                    tab === 'new'
                                        ? 'bg-[var(--orange)]/20 text-[var(--orange)]'
                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                )}
                                title="แชทใหม่"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Body ──────────────────────────────────────────────────── */}
                {activeChatId ? (
                    /* Chat window */
                    <div className="flex-1 overflow-hidden">
                        <ChatWindow
                            chatId={activeChatId}
                            messages={messages[activeChatId] ?? []}
                            currentUserId={currentUser.id}
                            memberReadAt={chats.find(c => c.id === activeChatId)?.memberReadAt}
                            typingUsers={typingUsers[activeChatId]}
                            onSend={(content, replyToId) => sendMessage(activeChatId, content, replyToId)}
                            onDelete={deleteMessage}
                            onEdit={editMessage}
                            onTyping={(isTyping) => sendTyping(activeChatId, isTyping, currentUser.name)}
                            onMarkRead={() => markRead(activeChatId)}
                            onLoadMore={() => {
                                const msgs = messages[activeChatId];
                                if (msgs?.length) fetchMessages(activeChatId, msgs[0].createdAt);
                            }}
                            hasMore={(messages[activeChatId]?.length ?? 0) >= 50}
                        />
                    </div>
                ) : (
                    /* Chat list / new chat */
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Search */}
                        <div className="p-3 border-b border-border">
                            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl border border-border">
                                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder={tab === 'new' ? 'ค้นหาคน หรือโปรเจกต์...' : 'ค้นหาแชท...'}
                                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {tab === 'chats' ? (
                                /* ── Existing chats ── */
                                filteredChats.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                                        <MessageSquare className="w-10 h-10 opacity-30" />
                                        <p className="text-sm">ยังไม่มีแชท</p>
                                        <button
                                            onClick={() => setTab('new')}
                                            className="text-xs text-[var(--orange)] hover:underline"
                                        >
                                            เริ่มแชทใหม่
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        {filteredChats.map(chat => (
                                            <ChatListItem
                                                key={chat.id}
                                                chat={chat}
                                                name={getChatName(chat)}
                                                avatar={getChatAvatar(chat) ?? null}
                                                lastMessage={getLastMessage(chat)}
                                                currentUserId={currentUser.id}
                                                onClick={() => openChat(chat.id)}
                                            />
                                        ))}
                                    </div>
                                )
                            ) : (
                                /* ── New chat ── */
                                <div className="py-2">
                                    {/* Direct chats */}
                                    <SectionHeader icon={<UserIcon className="w-3.5 h-3.5" />} label="แชทส่วนตัว" />
                                    {newChatUsers.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={async () => {
                                                setTab('chats');
                                                setSearch('');
                                                await openDirectChat(user.id);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                                        >
                                            <div className="relative">
                                                <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                                                <div className={cn(
                                                    'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background',
                                                    user.status === 'online' ? 'bg-green-500' :
                                                        user.status === 'busy' ? 'bg-red-500' :
                                                            user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                                                )} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.role}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                    ))}

                                    {/* Project chats */}
                                    {projectsForChat.length > 0 && (
                                        <>
                                            <SectionHeader icon={<Hash className="w-3.5 h-3.5" />} label="แชทโปรเจกต์" />
                                            {projectsForChat.map(project => (
                                                <button
                                                    key={project.id}
                                                    onClick={async () => {
                                                        setTab('chats');
                                                        setSearch('');
                                                        await openProjectChat(project.id);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                                                >
                                                    <div
                                                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                                        style={{ backgroundColor: project.color }}
                                                    >
                                                        #
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground">{project.name}</p>
                                                        <p className="text-xs text-muted-foreground">แชทกลุ่ม</p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider">
            {icon}
            {label}
        </div>
    );
}

interface ChatListItemProps {
    chat: Chat;
    name: string;
    avatar: { id: string; name: string; avatar: string; status?: string } | null;
    lastMessage: string;
    currentUserId: string;
    onClick: () => void;
}

function ChatListItem({ chat, name, avatar, lastMessage, onClick }: ChatListItemProps) {
    const time = chat.messages?.[0]
        ? new Date(chat.messages[0].createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left group"
        >
            {/* Avatar or project icon */}
            {chat.type === 'direct' && avatar ? (
                <div className="relative flex-shrink-0">
                    <img src={avatar.avatar} alt={avatar.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                        avatar.status === 'online' ? 'bg-green-500' :
                            avatar.status === 'busy' ? 'bg-red-500' :
                                avatar.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                    )} />
                </div>
            ) : (
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: chat.project?.color ?? '#ff6b35' }}
                >
                    #
                </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                        'text-sm truncate',
                        chat.unreadCount ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                    )}>
                        {name}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{time}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className={cn(
                        'text-xs truncate',
                        chat.unreadCount ? 'text-foreground/80' : 'text-muted-foreground'
                    )}>
                        {lastMessage}
                    </span>
                    {(chat.unreadCount ?? 0) > 0 && (
                        <span className="bg-[var(--orange)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                            {chat.unreadCount! > 99 ? '99+' : chat.unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}
