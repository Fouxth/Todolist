import { useState } from 'react';
import {
  Clock,
  MessageSquare,
  Paperclip,
  MoreHorizontal,
  Play,
  Pause,
  GripVertical,
  Trash2
} from 'lucide-react';
import type { Task, User } from '@/types';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { useLanguage } from '@/i18n/LanguageContext';

interface TaskCardProps {
  task: Task;
  users: User[];
  onClick: () => void;
  onDelete?: () => void;
  onStartTimeTracking?: () => void;
  onStopTimeTracking?: (taskId: string, entryId: string, description?: string) => void;
  showDragHandle?: boolean;
  currentUserId?: string;
}

export function TaskCard({ task, users, onClick, onDelete, onStartTimeTracking, onStopTimeTracking, showDragHandle, currentUserId }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { t } = useLanguage();

  // Find all active entries (no endTime) from any user
  const activeEntries = task.timeTracking?.entries?.filter(e => !e.endTime) || [];
  const isTracking = activeEntries.length > 0;
  
  // Find all users who are tracking
  const trackingUsers = activeEntries
    .map(entry => users.find(u => u.id === entry.userId))
    .filter(Boolean) as User[];

  const priorityConfig = {
    urgent: {
      color: 'text-red-500 bg-red-500/20 border-red-500/50 shadow-sm shadow-red-500/20',
      label: '🔥 ' + t.task.urgent,
      bgGradient: 'from-red-500/10 to-transparent'
    },
    high: {
      color: 'text-orange-500 bg-orange-500/20 border-orange-500/50 shadow-sm shadow-orange-500/20',
      label: '⚡ ' + t.task.high,
      bgGradient: 'from-orange-500/10 to-transparent'
    },
    medium: {
      color: 'text-blue-500 bg-blue-500/15 border-blue-500/30',
      label: '📄 ' + t.task.medium,
      bgGradient: 'from-blue-500/10 to-transparent'
    },
    low: {
      color: 'text-green-500 bg-green-500/15 border-green-500/30',
      label: '🌿 ' + t.task.low,
      bgGradient: 'from-green-500/10 to-transparent'
    }
  };

  const assignees = users.filter(u => task.assignees.includes(u.id));
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const isAssignedToMe = currentUserId ? task.assignees.includes(currentUserId) : true;

  const isOverdue = task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && task.status !== 'done';

  const handleTimeTracking = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Find current user's active entry
    const myActiveEntry = currentUserId 
      ? activeEntries.find(entry => entry.userId === currentUserId)
      : null;
    
    if (myActiveEntry && onStopTimeTracking) {
      onStopTimeTracking(task.id, myActiveEntry.id);
    } else if (!myActiveEntry && onStartTimeTracking) {
      onStartTimeTracking();
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative p-4 rounded-xl bg-[#1a1a1a] border border-white/5 cursor-pointer",
        "transition-all duration-300 preserve-3d",
        isHovered && "-translate-y-2 border-[var(--orange)]/30 shadow-lg"
      )}
      style={{
        transitionTimingFunction: 'var(--ease-expo-out)',
        transform: isHovered ? 'translateY(-8px) translateZ(30px)' : 'translateZ(0)'
      }}
    >
      {/* Drag handle */}
      {showDragHandle && isAssignedToMe && (
        <div className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-500" />
        </div>
      )}
      
      {/* Not assigned indicator */}
      {!isAssignedToMe && currentUserId && (
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-gray-500/20 text-gray-400 border border-gray-500/30 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {t.task.readOnly}
          </span>
        </div>
      )}

      {/* Priority indicator line */}
      <div
        className={cn(
          "absolute left-0 top-4 bottom-4 w-1 rounded-full transition-all duration-300",
          isHovered && "top-2 bottom-2 w-1.5"
        )}
        style={{
          backgroundColor:
            task.priority === 'urgent' ? '#ef4444' :
              task.priority === 'high' ? '#f97316' :
                task.priority === 'medium' ? '#3b82f6' : '#22c55e',
          boxShadow: isHovered 
            ? task.priority === 'urgent' ? '0 0 10px #ef4444' :
              task.priority === 'high' ? '0 0 10px #f97316' :
                task.priority === 'medium' ? '0 0 8px #3b82f6' : '0 0 8px #22c55e'
            : 'none'
        }}
      />

      <div className="pl-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "px-2.5 py-1 text-xs font-semibold rounded-lg border",
              priorityConfig[task.priority].color
            )}>
              {priorityConfig[task.priority].label}
            </span>
            {isOverdue && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                {t.task.overdue}
              </span>
            )}
            {isTracking && trackingUsers.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--orange)]/10 text-[var(--orange)] border border-[var(--orange)]/20 flex items-center gap-1 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--orange)]" />
                {trackingUsers.length === 1 
                  ? `${trackingUsers[0].name} กำลังจับเวลา`
                  : `${trackingUsers.length} คนกำลังจับเวลา`
                }
              </span>
            )}
          </div>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-20 py-1 min-w-[120px]">
                <button
                  onClick={(e) => { e.stopPropagation(); onClick(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                >
                  ✏️ {t.modal.editTask}
                </button>
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 inline mr-1" /> {t.notification.delete}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-medium text-white mb-2 line-clamp-2 group-hover:text-[var(--orange)] transition-colors">
          {task.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
          {task.description}
        </p>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded bg-white/5 text-gray-400"
              >
                #{tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs rounded bg-white/5 text-gray-400">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Progress bar */}
        {totalSubtasks > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">{t.task.progress}</span>
              <span className="text-gray-300">{completedSubtasks}/{totalSubtasks}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--orange)] to-[var(--neon-cyan)] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          {/* Assignees */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map((user) => (
                <img
                  key={user.id}
                  src={user.avatar}
                  alt={user.name}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 border-[#1a1a1a] object-cover transition-transform duration-200",
                    isHovered && "hover:scale-110"
                  )}
                  title={user.name}
                />
              ))}
            </div>
            {assignees.length > 3 && (
              <span className="ml-2 text-xs text-gray-400">
                +{assignees.length - 3}
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 text-gray-400">
            {/* Time tracking with user indicator */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleTimeTracking}
                className={cn(
                  "flex items-center gap-1 text-xs hover:text-white transition-colors",
                  isTracking && "text-[var(--orange)] animate-pulse"
                )}
                title={
                  isTracking && trackingUsers.length > 0
                    ? trackingUsers.map(u => u.name).join(', ') + ' กำลังจับเวลา'
                    : 'เริ่มจับเวลา'
                }
              >
                {isTracking ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {task.timeTracking ? `${Math.floor(task.timeTracking.spent / 60)}h` : '0h'}
              </button>
              {trackingUsers.length > 0 && (
                <div className="flex -space-x-1">
                  {trackingUsers.slice(0, 3).map((user, idx) => (
                    <img
                      key={user.id}
                      src={user.avatar}
                      alt={user.name}
                      className="w-4 h-4 rounded-full border border-[var(--orange)] ring-1 ring-[var(--orange)]/30"
                      title={`${user.name} กำลังจับเวลา`}
                      style={{ zIndex: 10 - idx }}
                    />
                  ))}
                  {trackingUsers.length > 3 && (
                    <div 
                      className="w-4 h-4 rounded-full bg-[var(--orange)]/20 border border-[var(--orange)] flex items-center justify-center text-[8px] text-[var(--orange)] font-bold"
                      title={trackingUsers.slice(3).map(u => u.name).join(', ')}
                    >
                      +{trackingUsers.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comments */}
            {task.comments.length > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <MessageSquare className="w-3.5 h-3.5" />
                {task.comments.length}
              </span>
            )}

            {/* Attachments */}
            {task.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <Paperclip className="w-3.5 h-3.5" />
                {task.attachments.length}
              </span>
            )}

            {/* Due date */}
            {task.dueDate && (
              <span className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue ? "text-red-400" : "text-gray-400"
              )}>
                <Clock className="w-3.5 h-3.5" />
                {format(task.dueDate, 'MMM d')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
