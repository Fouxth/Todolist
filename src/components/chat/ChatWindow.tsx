import { useRef, useEffect, useState } from 'react';
import { Send, X, Reply, Trash2, Edit2, Check, CheckCheck, ChevronUp } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';

// ─── MessageBubble ────────────────────────────────────────────────────────────
interface MessageBubbleProps {
    message: ChatMessage;
    isOwn: boolean;
    isRead: boolean;
    onReply: (msg: ChatMessage) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string, content: string) => void;
}

export function MessageBubble({ message, isOwn, isRead, onReply, onDelete, onEdit }: MessageBubbleProps) {
    const [showActions, setShowActions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const editRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing) editRef.current?.focus();
    }, [isEditing]);

    const commitEdit = () => {
        if (editContent.trim() && editContent !== message.content) {
            onEdit(message.id, editContent.trim());
        }
        setIsEditing(false);
    };

    const timeStr = new Date(message.createdAt).toLocaleTimeString('th-TH', {
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <div
            className={cn('group flex gap-2 items-end', isOwn && 'flex-row-reverse')}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Avatar */}
            {!isOwn && (
                <img
                    src={message.user.avatar}
                    alt={message.user.name}
                    className="w-7 h-7 rounded-full flex-shrink-0 object-cover"
                />
            )}

            <div className={cn('max-w-[70%] flex flex-col gap-0.5', isOwn && 'items-end')}>
                {/* Sender name (only for group chats, non-own) */}
                {!isOwn && (
                    <span className="text-xs text-muted-foreground ml-1">{message.user.name}</span>
                )}

                {/* Reply preview */}
                {message.replyTo && (
                    <div className={cn(
                        'px-3 py-1.5 rounded-lg text-xs border-l-2 border-[var(--orange)] bg-muted',
                        'text-muted-foreground max-w-full truncate'
                    )}>
                        <span className="font-medium text-[var(--orange)]">{message.replyTo.user.name}</span>
                        <span className="ml-1">{message.replyTo.content.substring(0, 60)}</span>
                    </div>
                )}

                {/* Bubble */}
                {isEditing ? (
                    <div className="flex flex-col gap-1 w-64">
                        <textarea
                            ref={editRef}
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                                if (e.key === 'Escape') setIsEditing(false);
                            }}
                            rows={2}
                            className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm resize-none focus:outline-none"
                        />
                        <div className="flex gap-1 justify-end">
                            <button onClick={() => setIsEditing(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">ยกเลิก</button>
                            <button onClick={commitEdit} className="text-xs bg-[var(--orange)] text-white px-2 py-1 rounded">
                                <Check className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={cn(
                        'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
                        isOwn
                            ? 'bg-[var(--orange)] text-white rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                    )}>
                        {message.content}
                        {message.editedAt && (
                            <span className="text-[10px] opacity-60 ml-1">(แก้ไขแล้ว)</span>
                        )}
                    </div>
                )}

                {/* Timestamp + read receipt */}
                <div className={cn('flex items-center gap-1 px-1', isOwn && 'justify-end')}>
                    <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                    {isOwn && (
                        isRead
                            ? <CheckCheck className="w-3 h-3 text-[var(--orange)]" />
                            : <Check className="w-3 h-3 text-muted-foreground" />
                    )}
                </div>
            </div>

            {/* Hover actions */}
            {showActions && !isEditing && (
                <div className={cn(
                    'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                    'bg-card border border-border rounded-lg p-1 self-center shadow-lg',
                    isOwn ? 'flex-row-reverse' : ''
                )}>
                    <button
                        onClick={() => onReply(message)}
                        className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="ตอบกลับ"
                    >
                        <Reply className="w-3.5 h-3.5" />
                    </button>
                    {isOwn && (
                        <>
                            <button
                                onClick={() => { setIsEditing(true); setEditContent(message.content); }}
                                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-blue-500 transition-colors"
                                title="แก้ไข"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => onDelete(message.id)}
                                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-red-500 transition-colors"
                                title="ลบ"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── MessageInput ─────────────────────────────────────────────────────────────
interface MessageInputProps {
    onSend: (content: string, replyToId?: string) => void;
    onTyping: (isTyping: boolean) => void;
    onMarkRead: () => void;
    replyTo?: ChatMessage | null;
    onCancelReply: () => void;
    disabled?: boolean;
}

export function MessageInput({ onSend, onTyping, onMarkRead, replyTo, onCancelReply, disabled }: MessageInputProps) {
    const [content, setContent] = useState('');
    const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isTypingRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleChange = (value: string) => {
        setContent(value);
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            onTyping(true);
        }
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            isTypingRef.current = false;
            onTyping(false);
        }, 1500);
    };

    const handleSubmit = () => {
        if (!content.trim() || disabled) return;
        onSend(content.trim(), replyTo?.id);
        setContent('');
        clearTimeout(typingTimeout.current);
        isTypingRef.current = false;
        onTyping(false);
        textareaRef.current?.focus();
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [content]);

    return (
        <div className="border-t border-border bg-card p-3">
            {/* Reply preview */}
            {replyTo && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-muted rounded-lg border-l-2 border-[var(--orange)]">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-[var(--orange)] font-medium">{replyTo.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
                    </div>
                    <button onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="flex items-end gap-2">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={e => handleChange(e.target.value)}
                    onFocus={onMarkRead}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                    placeholder="พิมพ์ข้อความ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
                    disabled={disabled}
                    rows={1}
                    className={cn(
                        'flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border',
                        'text-foreground text-sm placeholder:text-muted-foreground resize-none',
                        'focus:outline-none focus:border-[var(--orange)]/50',
                        'transition-colors min-h-[42px]'
                    )}
                />
                <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || disabled}
                    className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        'transition-all duration-200',
                        content.trim() && !disabled
                            ? 'bg-[var(--orange)] hover:bg-[var(--orange)]/80 text-white scale-100'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                    )}
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 px-1">Enter ส่ง • Shift+Enter ขึ้นบรรทัดใหม่</p>
        </div>
    );
}

// ─── ChatWindow ───────────────────────────────────────────────────────────────
interface ChatWindowProps {
    chatId: string;
    messages: ChatMessage[];
    currentUserId: string;
    memberReadAt?: Record<string, string>;
    typingUsers?: { userId: string; userName: string }[];
    onSend: (content: string, replyToId?: string) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string, content: string) => void;
    onTyping: (isTyping: boolean) => void;
    onMarkRead: () => void;
    onLoadMore: () => void;
    hasMore?: boolean;
}

export function ChatWindow({
    messages,
    currentUserId,
    memberReadAt = {},
    typingUsers = [],
    onSend,
    onDelete,
    onEdit,
    onTyping,
    onMarkRead,
    onLoadMore,
    hasMore
}: ChatWindowProps) {
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevLengthRef = useRef(0);

    // Auto-scroll only for new messages (not on load-more)
    useEffect(() => {
        if (messages.length > prevLengthRef.current) {
            const added = messages.length - prevLengthRef.current;
            if (added === 1) {
                // Single new message → scroll to bottom
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
        prevLengthRef.current = messages.length;
    }, [messages.length]);

    // Scroll to bottom on initial load
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Group messages by date
    const grouped = groupByDate(messages);

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                {/* Load more */}
                {hasMore && (
                    <button
                        onClick={onLoadMore}
                        className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                        โหลดข้อความก่อนหน้า
                    </button>
                )}

                {grouped.map(([date, msgs]) => (
                    <div key={date}>
                        {/* Date divider */}
                        <div className="flex items-center gap-3 my-3">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                                {date}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        <div className="space-y-2">
                            {msgs.map(msg => {
                                // Message is read if ANY other member has readAt > message.createdAt
                                const isRead = Object.entries(memberReadAt).some(
                                    ([uid, readAt]) => uid !== currentUserId && new Date(readAt) >= new Date(msg.createdAt)
                                );
                                return (
                                    <MessageBubble
                                        key={msg.id}
                                        message={msg}
                                        isOwn={msg.userId === currentUserId}
                                        isRead={isRead}
                                        onReply={setReplyTo}
                                        onDelete={onDelete}
                                        onEdit={onEdit}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2 px-2">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {typingUsers.map(u => u.userName).join(', ')} กำลังพิมพ์...
                        </span>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <MessageInput
                onSend={onSend}
                onTyping={onTyping}
                onMarkRead={onMarkRead}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
            />
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupByDate(messages: ChatMessage[]): [string, ChatMessage[]][] {
    const map = new Map<string, ChatMessage[]>();
    for (const msg of messages) {
        const d = new Date(msg.createdAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        let label: string;
        if (isSameDay(d, today)) label = 'วันนี้';
        else if (isSameDay(d, yesterday)) label = 'เมื่อวาน';
        else label = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

        if (!map.has(label)) map.set(label, []);
        map.get(label)!.push(msg);
    }
    return Array.from(map.entries());
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}
