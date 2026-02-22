import { useState, useRef } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import type { Task, TaskStatus, User } from '@/types';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

interface KanbanBoardProps {
  tasks: Task[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCreateTask: (status: TaskStatus) => void;
  onDeleteTask?: (taskId: string) => void;
  onStartTimeTracking?: (taskId: string) => void;
  onStopTimeTracking?: (taskId: string, entryId: string, description?: string) => void;
}

interface Column {
  id: TaskStatus;
  titleKey: 'todo' | 'inProgress' | 'review' | 'done';
  color: string;
  bgColor: string;
}

const columns: Column[] = [
  { id: 'todo', titleKey: 'todo', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.05)' },
  { id: 'in-progress', titleKey: 'inProgress', color: '#ff6b35', bgColor: 'rgba(255, 107, 53, 0.05)' },
  { id: 'review', titleKey: 'review', color: '#2196f3', bgColor: 'rgba(33, 150, 243, 0.05)' },
  { id: 'done', titleKey: 'done', color: '#4caf50', bgColor: 'rgba(76, 175, 80, 0.05)' }
];

export function KanbanBoard({
  tasks,
  users,
  onTaskClick,
  onStatusChange,
  onCreateTask,
  onDeleteTask,
  onStartTimeTracking,
  onStopTimeTracking
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedEl, setDraggedEl] = useState<HTMLElement | null>(null);
  const { t } = useLanguage();
  const dragCountRef = useRef(0);

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    const el = e.currentTarget as HTMLElement;
    setDraggedEl(el);

    // Custom drag ghost
    const ghost = el.cloneNode(true) as HTMLElement;
    ghost.style.width = `${el.offsetWidth}px`;
    ghost.style.opacity = '0.85';
    ghost.style.transform = 'rotate(3deg) scale(1.02)';
    ghost.style.position = 'absolute';
    ghost.style.top = '-9999px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, el.offsetWidth / 2, 30);
    e.dataTransfer.effectAllowed = 'move';

    // Mark original as dragging
    requestAnimationFrame(() => {
      el.style.opacity = '0.3';
      el.style.transform = 'scale(0.95)';
    });

    // Clean up ghost
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragEnd = () => {
    if (draggedEl) {
      draggedEl.style.opacity = '1';
      draggedEl.style.transform = '';
    }
    setDraggedTask(null);
    setDragOverColumn(null);
    setDragOverIndex(null);
    setDraggedEl(null);
    dragCountRef.current = 0;
  };

  const handleColumnDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    dragCountRef.current++;
    setDragOverColumn(columnId);
  };

  const handleColumnDragLeave = () => {
    dragCountRef.current--;
    if (dragCountRef.current <= 0) {
      setDragOverColumn(null);
      setDragOverIndex(null);
      dragCountRef.current = 0;
    }
  };

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== columnId) {
      onStatusChange(draggedTask.id, columnId);
    }
    handleDragEnd();
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
      {columns.map((column, _columnIndex) => {
        const columnTasks = getTasksByStatus(column.id);
        const isDragOver = dragOverColumn === column.id;
        const columnTitle = t.kanban[column.titleKey];

        return (
          <div
            key={column.id}
            className={cn(
              "flex-shrink-0 w-80 flex flex-col rounded-xl transition-all duration-300",
              "border border-white/5",
              isDragOver && "border-white/20 shadow-lg shadow-white/5"
            )}
            style={{
              backgroundColor: isDragOver
                ? column.bgColor.replace('0.05', '0.12')
                : column.bgColor,
              transform: 'translateY(0)',
              transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
            }}
            onDragEnter={(e) => handleColumnDragEnter(e, column.id)}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDragLeave={handleColumnDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div
              className="flex items-center justify-between p-4 border-b border-white/5"
              style={{ borderTop: `4px solid ${column.color}` }}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{columnTitle}</h3>
                <span
                  className="px-2 py-0.5 text-xs rounded-full font-medium"
                  style={{
                    backgroundColor: `${column.color}20`,
                    color: column.color
                  }}
                >
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => onCreateTask(column.id)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 p-3 space-y-1 min-h-[200px]">
              {columnTasks.map((task, taskIndex) => {
                const isBeingDragged = draggedTask?.id === task.id;
                const showDropBefore = isDragOver && dragOverIndex === taskIndex && !isBeingDragged;

                return (
                  <div key={task.id}>
                    {/* Drop indicator line */}
                    {showDropBefore && (
                      <div className="flex items-center gap-2 py-1 animate-slide-in">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
                        <div className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: column.color }} />
                      </div>
                    )}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleCardDragOver(e, taskIndex)}
                      className={cn(
                        "transition-all duration-200 mb-2",
                        isBeingDragged && "opacity-30 scale-95"
                      )}
                      style={{
                        animationDelay: `${taskIndex * 80}ms`,
                        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
                      }}
                    >
                      <TaskCard
                        task={task}
                        users={users}
                        onClick={() => onTaskClick(task)}
                        onDelete={onDeleteTask ? () => onDeleteTask(task.id) : undefined}
                        onStartTimeTracking={onStartTimeTracking ? () => onStartTimeTracking(task.id) : undefined}
                        onStopTimeTracking={onStopTimeTracking}
                        showDragHandle
                      />
                    </div>
                  </div>
                );
              })}

              {/* Drop zone at end */}
              {isDragOver && (dragOverIndex === null || dragOverIndex >= columnTasks.length) && (
                <div className="flex items-center gap-2 py-1 animate-slide-in">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
                  <div className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: column.color }} />
                </div>
              )}

              {columnTasks.length === 0 && !isDragOver && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${column.color}10` }}
                  >
                    <Plus className="w-5 h-5" style={{ color: column.color }} />
                  </div>
                  <p className="text-sm">{t.kanban.noTasks}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCreateTask(column.id)}
                    className="mt-2 text-xs hover:text-white"
                    style={{ color: column.color }}
                  >
                    {t.kanban.addTask}
                  </Button>
                </div>
              )}

              {/* Drop here message for empty columns */}
              {columnTasks.length === 0 && isDragOver && (
                <div className="flex items-center justify-center py-12 rounded-xl border-2 border-dashed transition-all"
                  style={{ borderColor: column.color, backgroundColor: `${column.color}10` }}
                >
                  <span className="text-sm font-medium" style={{ color: column.color }}>
                    {t.kanban.dropHere}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
