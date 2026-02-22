import { useState, useEffect, useRef } from 'react';
import { Send, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { io, Socket } from 'socket.io-client';

interface CommentUser {
    id: string;
    name: string;
    avatar: string;
    role: string;
}

interface Comment {
    id: string;
    taskId: string;
    userId: string;
    content: string;
    createdAt: string;
    user: CommentUser;
}

interface CommentSectionProps {
    taskId: string;
}

export function CommentSection({ taskId }: CommentSectionProps) {
    const { token, currentUser } = useAuth();
    const { t } = useLanguage();

    function timeAgo(dateStr: string): string {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t.comment.justNow;
        if (mins < 60) return `${mins} ${t.comment.minutesAgo}`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} ${t.comment.hoursAgo}`;
        const days = Math.floor(hours / 24);
        return `${days} ${t.comment.daysAgo}`;
    }
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch comments
    useEffect(() => {
        if (!taskId || !token) return;
        setLoading(true);
        fetch(`/api/comments/${taskId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => { setComments(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [taskId, token]);

    // Real-time comments via socket
    useEffect(() => {
        if (!taskId || !token) return;
        const socket: Socket = io({ auth: { token } });

        socket.on(`task:${taskId}:comment`, (comment: Comment) => {
            setComments(prev => {
                if (prev.some(c => c.id === comment.id)) return prev;
                return [...prev, comment];
            });
        });

        return () => { socket.disconnect(); };
    }, [taskId, token]);

    // Auto-scroll to bottom on new comments
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || sending) return;

        setSending(true);
        try {
            const res = await fetch(`/api/comments/${taskId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content: newComment.trim() })
            });
            if (res.ok) {
                const comment = await res.json();
                setComments(prev => {
                    if (prev.some(c => c.id === comment.id)) return prev;
                    return [...prev, comment];
                });
                setNewComment('');
            }
        } catch (err) {
            console.error('Failed to send comment:', err);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/comments/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setComments(prev => prev.filter(c => c.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete comment:', err);
        }
    };

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-[var(--orange)]" />
                <span className="text-sm font-medium text-white">
                    {t.comment.title} ({comments.length})
                </span>
            </div>

            {/* Comments List */}
            <div
                ref={scrollRef}
                className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar"
            >
                {loading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">
                        {t.comment.empty}
                    </div>
                ) : (
                    comments.map(comment => {
                        const isOwn = comment.userId === currentUser?.id;
                        return (
                            <div
                                key={comment.id}
                                className={cn(
                                    "group flex gap-3 animate-slide-in",
                                    isOwn && "flex-row-reverse"
                                )}
                            >
                                <img
                                    src={comment.user.avatar}
                                    alt={comment.user.name}
                                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white/10 shrink-0 mt-1"
                                />
                                <div className={cn("flex-1 min-w-0", isOwn && "text-right")}>
                                    <div className={cn(
                                        "flex items-center gap-2 mb-1",
                                        isOwn && "flex-row-reverse"
                                    )}>
                                        <span className="text-xs font-medium text-white">
                                            {comment.user.name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {timeAgo(comment.createdAt)}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "inline-block px-3 py-2 rounded-xl text-sm max-w-full",
                                        isOwn
                                            ? "bg-[var(--orange)]/20 text-orange-200 rounded-tr-sm"
                                            : "bg-white/5 text-gray-300 rounded-tl-sm"
                                    )}>
                                        <p className="whitespace-pre-wrap break-words text-left">
                                            {comment.content}
                                        </p>
                                    </div>
                                    {isOwn && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className="mt-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all"
                                            title={t.comment.delete}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder={t.comment.placeholder}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[var(--orange)]/50 transition-all"
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={!newComment.trim() || sending}
                    className={cn(
                        "p-2 rounded-lg transition-all",
                        newComment.trim()
                            ? "bg-[var(--orange)] hover:bg-[var(--orange)]/80 text-white"
                            : "bg-white/5 text-gray-500 cursor-not-allowed"
                    )}
                >
                    {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                </button>
            </form>
        </div>
    );
}
