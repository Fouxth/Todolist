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
}

export function TaskCard({ task, users, onClick, onDelete, onStartTimeTracking, onStopTimeTracking, showDragHandle }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { t } = useLanguage();

  // Check if there's an active time entry (no endTime)
  const activeEntry = task.timeTracking?.entries?.find(e => !e.endTime);
  const isTracking = !!activeEntry;

  const priorityConfig = {
    urgent: { color: 'text-red-400 bg-red-400/10 border-red-400/20', label: t.task.urgent },
    high: { color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', label: t.task.high },
    medium: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', label: t.task.medium },
    low: { color: 'text-green-400 bg-green-400/10 border-green-400/20', label: t.task.low }
  };

  const assignees = users.filter(u => task.assignees.includes(u.id));
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const isOverdue = task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && task.status !== 'done';

  const handleTimeTracking = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTracking && activeEntry && onStopTimeTracking) {
      onStopTimeTracking(task.id, activeEntry.id);
    } else if (!isTracking && onStartTimeTracking) {
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
      {showDragHandle && (
        <div className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-500" />
        </div>
      )}

      {/* Priority indicator line */}
      <div
        className={cn(
          "absolute left-0 top-4 bottom-4 w-1 rounded-full transition-all duration-300",
          isHovered && "top-2 bottom-2"
        )}
        style={{
          backgroundColor:
            task.priority === 'urgent' ? '#f44336' :
              task.priority === 'high' ? '#ff6b35' :
                task.priority === 'medium' ? '#2196f3' : '#4caf50'
        }}
      />

      <div className="pl-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full border",
              priorityConfig[task.priority].color
            )}>
              {priorityConfig[task.priority].label}
            </span>
            {isOverdue && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                {t.task.overdue}
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
            {/* Time tracking */}
            <button
              onClick={handleTimeTracking}
              className={cn(
                "flex items-center gap-1 text-xs hover:text-white transition-colors",
                isTracking && "text-[var(--orange)]"
              )}
            >
              {isTracking ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {task.timeTracking ? `${Math.floor(task.timeTracking.spent / 60)}h` : '0h'}
            </button>

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
