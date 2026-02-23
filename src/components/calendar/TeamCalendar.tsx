import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { CalendarEvent, Task, User, Project } from '@/types';
import { cn } from '@/lib/utils';
import { EventModal } from '@/components/modals/EventModal';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, addMonths, subMonths
} from 'date-fns';
import { th as thLocale } from 'date-fns/locale';
import { useLanguage } from '@/i18n/LanguageContext';

interface TeamCalendarProps {
  events: CalendarEvent[];
  tasks: Task[];
  users: User[];
  projects: Project[];
  currentUserId: string;
  onUpdateDueDate?: (taskId: string, newDate: Date) => void;
  onTaskClick?: (task: Task) => void;
  onCreateEvent?: (eventData: Partial<CalendarEvent>) => Promise<void>;
  onUpdateEvent?: (eventId: string, eventData: Partial<CalendarEvent>) => Promise<void>;
  onDeleteEvent?: (eventId: string) => Promise<void>;
}

export function TeamCalendar({ events, tasks, users, projects, currentUserId, onUpdateDueDate, onTaskClick, onCreateEvent, onUpdateEvent, onDeleteEvent }: TeamCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventDefaultDate, setEventDefaultDate] = useState<Date | null>(null);
  const { t, lang } = useLanguage();

  const eventTypeColors: Record<string, string> = {
    task: '#ff6b35',
    meeting: '#2196f3',
    deadline: '#f44336',
    reminder: '#ffc107'
  };

  const eventTypeLabels: Record<string, string> = {
    task: t.calendar.task,
    meeting: t.calendar.meeting,
    deadline: t.calendar.deadline,
    reminder: t.calendar.reminder,
  };

  const priorityColors: Record<string, string> = {
    urgent: '#f44336',
    high: '#ff6b35',
    medium: '#2196f3',
    low: '#4caf50',
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.startTime), date));
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => task.dueDate && isSameDay(new Date(task.dueDate), date));
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleCreateEvent = (date?: Date) => {
    setEditingEvent(null);
    setEventDefaultDate(date || selectedDate || new Date());
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    if (editingEvent) {
      await onUpdateEvent?.(editingEvent.id, eventData);
    } else {
      await onCreateEvent?.(eventData);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('ต้องการลบ event นี้ใช่หรือไม่?')) {
      await onDeleteEvent?.(eventId);
    }
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  const dateLocale = lang === 'th' ? thLocale : undefined;

  // Drag-and-drop handlers for tasks
  const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
    e.stopPropagation();
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    const el = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => { el.style.opacity = '0.4'; });
  };

  const handleTaskDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedTask(null);
    setDragOverDate(null);
  };

  const handleDateDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  const handleDateDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedTask && onUpdateDueDate) {
      const newDate = new Date(date);
      newDate.setHours(12, 0, 0, 0);
      onUpdateDueDate(draggedTask.id, newDate);
    }
    setDraggedTask(null);
    setDragOverDate(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calendar Grid */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-white">
              {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {draggedTask && (
              <span className="text-xs text-[var(--orange)] bg-[var(--orange)]/10 px-3 py-1 rounded-full animate-pulse">
                📅 {t.calendar.dragToMove || 'Drop on a date to move'}
              </span>
            )}
            <button
              onClick={() => handleCreateEvent()}
              className="px-4 py-2 text-sm bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Event
            </button>
            <button onClick={handleToday} className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
              {t.calendar.today}
            </button>
          </div>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {t.calendar.weekDays.map((weekDay: string) => (
            <div key={weekDay} className="text-center text-sm text-gray-400 py-2 font-medium">
              {weekDay}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date) => {
            const dayEvents = getEventsForDate(date);
            const dayTasks = getTasksForDate(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isToday = isSameDay(date, new Date());
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isDragOver = dragOverDate && isSameDay(date, dragOverDate);

            return (
              <div
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                onDragOver={(e) => handleDateDragOver(e, date)}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => handleDateDrop(e, date)}
                className={cn(
                  "group/cell relative min-h-[100px] p-2 rounded-lg border transition-all duration-200 text-left cursor-pointer",
                  "hover:border-white/20 hover:bg-white/5",
                  !isCurrentMonth && "opacity-40",
                  isToday && "border-[var(--orange)]/50 bg-[var(--orange)]/5",
                  isSelected && "border-[var(--orange)] bg-[var(--orange)]/10",
                  isDragOver && "border-[var(--orange)] bg-[var(--orange)]/20 scale-[1.02] shadow-lg shadow-[var(--orange)]/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm font-medium", isToday ? "text-[var(--orange)]" : "text-white")}>
                    {format(date, 'd')}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCreateEvent(date); }}
                    className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-[var(--orange)]/20 rounded transition-opacity"
                    title="เพิ่ม Event"
                  >
                    <Plus className="w-3 h-3 text-[var(--orange)]" />
                  </button>
                </div>

                {/* Task items (draggable) */}
                {dayTasks.slice(0, 2).map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleTaskDragStart(e, task)}
                    onDragEnd={handleTaskDragEnd}
                    onClick={(e) => { e.stopPropagation(); onTaskClick?.(task); }}
                    className={cn(
                      "mt-1 px-1.5 py-0.5 text-xs rounded truncate cursor-grab active:cursor-grabbing",
                      "hover:brightness-110 transition-all group flex items-center gap-1",
                      draggedTask?.id === task.id && "opacity-40"
                    )}
                    style={{
                      backgroundColor: `${priorityColors[task.priority]}20`,
                      color: priorityColors[task.priority],
                      borderLeft: `2px solid ${priorityColors[task.priority]}`,
                    }}
                  >
                    <GripVertical className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 flex-shrink-0" />
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}

                {/* Event dots */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: eventTypeColors[event.type] }} title={event.title} />
                  ))}
                  {(dayTasks.length > 2 || dayEvents.length > 3) && (
                    <span className="text-[10px] text-gray-400">+{Math.max(0, dayTasks.length - 2) + Math.max(0, dayEvents.length - 3)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
          <span className="text-gray-400">{t.calendar.eventTypes}</span>
          {Object.entries(eventTypeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-gray-300">{eventTypeLabels[type]}</span>
            </div>
          ))}
          <span className="text-gray-500 text-xs ml-2">💡 {t.calendar.dragHint || 'Drag tasks to change due date'}</span>
        </div>
      </div>

      {/* Selected Date Panel */}
      <div className="w-full lg:w-80 glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="w-5 h-5 text-[var(--orange)]" />
          <h3 className="font-semibold text-white">
            {selectedDate
              ? format(selectedDate, 'EEEE, MMM d', { locale: dateLocale })
              : t.calendar.selectDate}
          </h3>
        </div>

        {/* Tasks for selected date */}
        {selectedDateTasks.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              {t.calendar.task} ({selectedDateTasks.length})
            </h4>
            <div className="space-y-2">
              {selectedDateTasks.map(task => {
                const assignees = users.filter(u => task.assignees.includes(u.id));
                
                // Priority config with Thai labels and emojis
                const priorityConfig = {
                  urgent: { label: '🔥 ด่วนมาก', color: '#dc2626', bgColor: '#dc262620' },
                  high: { label: '⚡ สำคัญ', color: '#f97316', bgColor: '#f9731620' },
                  medium: { label: '📄 ปานกลาง', color: '#3b82f6', bgColor: '#3b82f620' },
                  low: { label: '🌿 ต่ำ', color: '#22c55e', bgColor: '#22c55e20' }
                };

                // Status config with Thai labels
                const statusConfig = {
                  'todo': { label: 'รอดำเนินการ', color: '#9ca3af' },
                  'in-progress': { label: 'กำลังดำเนินการ', color: '#3b82f6' },
                  'review': { label: 'รอตรวจสอบ', color: '#f59e0b' },
                  'done': { label: 'เสร็จสิ้น', color: '#22c55e' }
                };

                const priority = priorityConfig[task.priority] || priorityConfig.medium;
                const status = statusConfig[task.status] || statusConfig.todo;

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleTaskDragStart(e, task)}
                    onDragEnd={handleTaskDragEnd}
                    onClick={() => onTaskClick?.(task)}
                    className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: priority.color }} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm truncate group-hover:text-[var(--orange)] transition-colors">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span 
                            className="text-xs px-2 py-0.5 rounded font-medium"
                            style={{ backgroundColor: priority.bgColor, color: priority.color }}
                          >
                            {priority.label}
                          </span>
                          <span 
                            className="text-xs px-2 py-0.5 rounded font-medium"
                            style={{ backgroundColor: `${status.color}20`, color: status.color }}
                          >
                            {status.label}
                          </span>
                        </div>
                        {assignees.length > 0 && (
                          <div className="flex -space-x-1 mt-2">
                            {assignees.slice(0, 3).map(u => (
                              <img key={u.id} src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full border border-[#1a1a1a]" title={u.name} />
                            ))}
                          </div>
                        )}
                      </div>
                      <GripVertical className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 cursor-grab" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Events for selected date */}
        {selectedDateEvents.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Events ({selectedDateEvents.length})</h4>
            <div className="space-y-2">
              {selectedDateEvents.map(event => {
                const eventAttendees = event.attendees 
                  ? users.filter(u => event.attendees.includes(u.id))
                  : [];
                return (
                  <div
                    key={event.id}
                    className="group p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => handleEditEvent(event)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: eventTypeColors[event.type] }} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm truncate group-hover:text-[var(--orange)] transition-colors">{event.title}</h4>
                        {event.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{event.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(event.startTime), 'HH:mm')} - {format(new Date(event.endTime), 'HH:mm')}
                          </span>
                        </div>
                        {eventAttendees.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-xs text-gray-500">ผู้เกี่ยวข้อง:</span>
                            <div className="flex -space-x-1">
                              {eventAttendees.slice(0, 3).map(u => (
                                <img 
                                  key={u.id} 
                                  src={u.avatar} 
                                  alt={u.name} 
                                  className="w-5 h-5 rounded-full border border-[#1a1a1a]" 
                                  title={u.name} 
                                />
                              ))}
                              {eventAttendees.length > 3 && (
                                <div className="w-5 h-5 rounded-full bg-gray-700 border border-[#1a1a1a] flex items-center justify-center text-[10px] text-gray-300">
                                  +{eventAttendees.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                        title="ลบ Event"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedDate && selectedDateTasks.length === 0 && selectedDateEvents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t.calendar.noEvents}</p>
          </div>
        )}

        {!selectedDate && (
          <div className="text-center py-8 text-gray-500">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t.calendar.selectDate}</p>
          </div>
        )}
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
          setEventDefaultDate(null);
        }}
        onSave={handleSaveEvent}
        event={editingEvent}
        users={users}
        projects={projects}
        currentUserId={currentUserId}
        defaultDate={eventDefaultDate || undefined}
      />
    </div>
  );
}
