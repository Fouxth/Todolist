import { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, Circle, Eye, Edit3, Repeat, Link2 } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, User, Project, Team, Sprint, RecurringConfig } from '@/types';
import { cn } from '@/lib/utils';
import { CommentSection } from '@/components/tasks/CommentSection';
import { TimeTracker } from '@/components/tasks/TimeTracker';
import { FileAttachments } from '@/components/tasks/FileAttachments';
import { TaskDependencies } from '@/components/tasks/TaskDependencies';
import { MarkdownRenderer } from '@/components/tasks/MarkdownRenderer';
import { AISuggestions } from '@/components/ai/AISuggestions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useLanguage } from '@/i18n/LanguageContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task | null;
  users: User[];
  projects: Project[];
  teams: Team[];
  allTasks?: Task[];
  sprints?: Sprint[];
  defaultStatus?: TaskStatus;
  currentUserId?: string;
  onStartTimeTracking?: (taskId: string) => void;
  onStopTimeTracking?: (taskId: string, entryId: string, description?: string) => void;
  onRefreshTasks?: () => void;
  onAddDependency?: (taskId: string, dependsOnId: string, type: string) => void;
  onRemoveDependency?: (taskId: string, depId: string) => void;
}

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  users,
  projects,
  teams,
  allTasks = [],
  sprints = [],
  defaultStatus = 'todo',
  currentUserId,
  onStartTimeTracking,
  onStopTimeTracking,
  onRefreshTasks,
  onAddDependency,
  onRemoveDependency,
}: TaskModalProps) {
  const { t } = useLanguage();

  const priorities: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'urgent', label: t.task.urgent, color: '#f44336' },
    { value: 'high', label: t.task.high, color: '#ff6b35' },
    { value: 'medium', label: t.task.medium, color: '#2196f3' },
    { value: 'low', label: t.task.low, color: '#4caf50' }
  ];

  const statuses: { value: TaskStatus; label: string; color: string }[] = [
    { value: 'todo', label: t.kanban.todo, color: '#6b7280' },
    { value: 'in-progress', label: t.kanban.inProgress, color: '#ff6b35' },
    { value: 'review', label: t.kanban.review, color: '#2196f3' },
    { value: 'done', label: t.kanban.done, color: '#4caf50' }
  ];

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: defaultStatus,
    priority: 'medium',
    assignees: [],
    projectId: '',
    teamId: '',
    sprintId: undefined,
    dueDate: undefined,
    tags: [],
    subtasks: [],
    recurring: undefined,
    timeTracking: {
      estimated: 0,
      spent: 0,
      entries: []
    }
  });

  const [newTag, setNewTag] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [descPreview, setDescPreview] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>({
    enabled: false,
    interval: 'weekly',
    customDays: 7,
  });

  useEffect(() => {
    if (task) {
      setFormData({ ...task });
      if (task.recurring && typeof task.recurring === 'object') {
        const rc = task.recurring as RecurringConfig;
        setRecurringConfig(rc);
        setShowRecurring(rc.enabled);
      }
    } else {
      setFormData({
        title: '',
        description: '',
        status: defaultStatus,
        priority: 'medium',
        assignees: [],
        projectId: projects[0]?.id || '',
        teamId: '',
        sprintId: undefined,
        dueDate: undefined,
        tags: [],
        subtasks: [],
        timeTracking: {
          estimated: 0,
          spent: 0,
          entries: []
        }
      });
    }
  }, [task, defaultStatus, projects]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      recurring: showRecurring ? recurringConfig : undefined,
    };
    onSave(dataToSave);
    onClose();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), newTag.trim()] }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) || [] }));
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      const subtask = {
        id: `st${Date.now()}`,
        title: newSubtask.trim(),
        completed: false,
        createdAt: new Date()
      };
      setFormData(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), subtask] }));
      setNewSubtask('');
    }
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks?.map(st =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      ) || []
    }));
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks?.filter(st => st.id !== subtaskId) || []
    }));
  };

  const toggleAssignee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees?.includes(userId)
        ? prev.assignees.filter(id => id !== userId)
        : [...(prev.assignees || []), userId]
    }));
  };

  const availableTeams = teams.filter(t => t.projectId === formData.projectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl animate-scale-in custom-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold text-white">
            {task ? t.modal.editTask : t.modal.createTask}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-gray-300">{t.modal.taskTitle}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t.modal.titlePlaceholder}
              className="mt-1.5 bg-white/5 border-white/10 focus:border-[var(--orange)] focus:ring-[var(--orange)]/20"
              required
            />
          </div>

          {/* Description with Markdown Preview */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-gray-300">{t.modal.description}</Label>
              <button
                type="button"
                onClick={() => setDescPreview(!descPreview)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                {descPreview ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {descPreview ? (t.modal?.edit || 'Edit') : (t.modal?.preview || 'Preview')}
              </button>
            </div>
            {descPreview ? (
              <div className="mt-1.5 p-3 rounded-lg bg-white/5 border border-white/10 min-h-[80px] text-sm">
                <MarkdownRenderer content={formData.description || '*No description*'} />
              </div>
            ) : (
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t.modal.descPlaceholder + ' (supports **markdown**)'}
                rows={3}
                className="mt-1.5 bg-white/5 border-white/10 focus:border-[var(--orange)] focus:ring-[var(--orange)]/20 resize-none font-mono text-sm"
              />
            )}
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">{t.modal.status}</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {statuses.map(status => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: status.value }))}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg border transition-all",
                      formData.status === status.value
                        ? "text-white border-transparent"
                        : "text-gray-400 border-white/10 hover:border-white/20"
                    )}
                    style={{
                      backgroundColor: formData.status === status.value ? status.color : 'transparent'
                    }}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300">{t.modal.priority}</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {priorities.map(priority => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg border transition-all",
                      formData.priority === priority.value
                        ? "text-white border-transparent"
                        : "text-gray-400 border-white/10 hover:border-white/20"
                    )}
                    style={{
                      backgroundColor: formData.priority === priority.value ? priority.color : 'transparent'
                    }}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Project & Team */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">{t.modal.project}</Label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  projectId: e.target.value,
                  teamId: ''
                }))}
                className="w-full mt-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-[var(--orange)] focus:outline-none"
                required
              >
                <option value="" className="bg-[#1a1a1a]">{t.modal.selectProject}</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id} className="bg-[#1a1a1a]">
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-300">{t.modal.team}</Label>
              <select
                value={formData.teamId}
                onChange={(e) => setFormData(prev => ({ ...prev, teamId: e.target.value }))}
                className="w-full mt-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-[var(--orange)] focus:outline-none"
              >
                <option value="" className="bg-[#1a1a1a]">{t.modal.selectTeam}</option>
                {availableTeams.map(team => (
                  <option key={team.id} value={team.id} className="bg-[#1a1a1a]">
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date & Estimated Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">{t.modal.dueDate}</Label>
              <Input
                type="date"
                value={formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dueDate: e.target.value ? new Date(e.target.value) : undefined
                }))}
                className="mt-1.5 bg-white/5 border-white/10 focus:border-[var(--orange)] focus:ring-[var(--orange)]/20"
              />
            </div>

            <div>
              <Label className="text-gray-300">{t.modal.estimatedTime}</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={(formData.timeTracking?.estimated || 0) / 60}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  timeTracking: {
                    estimated: parseFloat(e.target.value) * 60 || 0,
                    spent: prev.timeTracking?.spent || 0,
                    entries: prev.timeTracking?.entries || []
                  }
                }))}
                className="mt-1.5 bg-white/5 border-white/10 focus:border-[var(--orange)] focus:ring-[var(--orange)]/20"
              />
            </div>
          </div>

          {/* Sprint Selector */}
          {sprints.length > 0 && (
            <div>
              <Label className="text-gray-300 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                {t.modal?.sprint || 'Sprint'}
              </Label>
              <select
                value={formData.sprintId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sprintId: e.target.value || undefined }))}
                className="w-full mt-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-[var(--orange)] focus:outline-none"
              >
                <option value="" className="bg-[#1a1a1a]">{t.modal?.noSprint || 'No Sprint'}</option>
                {sprints
                  .filter(s => !formData.projectId || s.projectId === formData.projectId)
                  .map(sprint => (
                    <option key={sprint.id} value={sprint.id} className="bg-[#1a1a1a]">
                      {sprint.name} ({sprint.status})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Recurring Task Config */}
          <div>
            <button
              type="button"
              onClick={() => {
                setShowRecurring(!showRecurring);
                if (!showRecurring) {
                  setRecurringConfig(prev => ({ ...prev, enabled: true }));
                } else {
                  setRecurringConfig(prev => ({ ...prev, enabled: false }));
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all w-full",
                showRecurring
                  ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]"
                  : "border-white/10 text-gray-400 hover:border-white/20"
              )}
            >
              <Repeat className="w-4 h-4" />
              {showRecurring ? (t.recurring?.recurringEnabled || 'Recurring Task Enabled') : (t.recurring?.makeRecurring || 'Make Recurring Task')}
            </button>
            {showRecurring && (
              <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                <div>
                  <Label className="text-gray-300 text-xs">{t.recurring?.interval || 'Repeat Interval'}</Label>
                  <select
                    value={recurringConfig.interval}
                    onChange={(e) => setRecurringConfig(prev => ({
                      ...prev,
                      interval: e.target.value as RecurringConfig['interval']
                    }))}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[var(--orange)] focus:outline-none"
                  >
                    <option value="daily" className="bg-[#1a1a1a]">{t.recurring?.daily || 'Daily'}</option>
                    <option value="weekly" className="bg-[#1a1a1a]">{t.recurring?.weekly || 'Weekly'}</option>
                    <option value="monthly" className="bg-[#1a1a1a]">{t.recurring?.monthly || 'Monthly'}</option>
                    <option value="custom" className="bg-[#1a1a1a]">{t.recurring?.custom || 'Custom'}</option>
                  </select>
                </div>
                {recurringConfig.interval === 'custom' && (
                  <div>
                    <Label className="text-gray-300 text-xs">{t.recurring?.everyXDays || 'Every X days'}</Label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={recurringConfig.customDays || 7}
                      onChange={(e) => setRecurringConfig(prev => ({
                        ...prev,
                        customDays: parseInt(e.target.value) || 7
                      }))}
                      className="mt-1 bg-white/5 border-white/10 focus:border-[var(--orange)] text-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assignees */}
          <div>
            <Label className="text-gray-300">{t.modal.assignees}</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {users.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleAssignee(user.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
                    formData.assignees?.includes(user.id)
                      ? "border-[var(--orange)] bg-[var(--orange)]/10"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full" />
                  <span className="text-sm">{user.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-gray-300">{t.modal.tags}</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder={t.modal.addTag}
                className="flex-1 bg-white/5 border-white/10 focus:border-[var(--orange)] focus:ring-[var(--orange)]/20"
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="outline"
                className="border-white/10 hover:bg-white/5"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags?.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-white/10 text-gray-300 hover:bg-white/20 cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                >
                  #{tag}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <Label className="text-gray-300">{t.modal.subtasks}</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                placeholder={t.modal.addSubtask}
                className="flex-1 bg-white/5 border-white/10 focus:border-[var(--orange)] focus:ring-[var(--orange)]/20"
              />
              <Button
                type="button"
                onClick={handleAddSubtask}
                variant="outline"
                className="border-white/10 hover:bg-white/5"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {formData.subtasks?.map(subtask => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/5 group"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(subtask.id)}
                    className="text-gray-400 hover:text-[var(--orange)]"
                  >
                    {subtask.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <span className={cn(
                    "flex-1 text-sm",
                    subtask.completed && "line-through text-gray-500"
                  )}>
                    {subtask.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(subtask.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Time Tracking (only for existing tasks) */}
          {task?.id && onStartTimeTracking && onStopTimeTracking && currentUserId && (
            <div className="pt-4 border-t border-white/5">
              <Label className="text-gray-300 mb-2 block">{t.timeTracker?.title || '⏱ Time Tracking'}</Label>
              <TimeTracker
                taskId={task.id}
                timeTracking={task.timeTracking}
                onStart={() => onStartTimeTracking(task.id)}
                onStop={(entryId, desc) => onStopTimeTracking(task.id, entryId, desc)}
                currentUserId={currentUserId}
              />
            </div>
          )}

          {/* File Attachments (only for existing tasks) */}
          {task?.id && (
            <div className="pt-4 border-t border-white/5">
              <Label className="text-gray-300 mb-2 block">{t.attachments?.title || '📎 Attachments'}</Label>
              <FileAttachments
                taskId={task.id}
                attachments={task.attachments || []}
                onRefresh={() => onRefreshTasks?.()}
              />
            </div>
          )}

          {/* AI Suggestions (for new tasks) */}
          {!task?.id && formData.title && formData.title.length > 3 && (
            <div className="pt-4 border-t border-white/5">
              <AISuggestions
                taskTitle={formData.title || ''}
                taskDescription={formData.description || ''}
                projectId={formData.projectId || ''}
                onApplySuggestion={(suggestion) => {
                  setFormData(prev => ({
                    ...prev,
                    priority: suggestion.priority || prev.priority,
                    tags: suggestion.tags && suggestion.tags.length > 0
                      ? [...new Set([...(prev.tags || []), ...suggestion.tags])]
                      : prev.tags,
                    assignees: suggestion.assignees && suggestion.assignees.length > 0
                      ? suggestion.assignees
                      : prev.assignees,
                    timeTracking: suggestion.estimatedTime
                      ? { estimated: suggestion.estimatedTime, spent: prev.timeTracking?.spent || 0, entries: prev.timeTracking?.entries || [] }
                      : prev.timeTracking,
                  }));
                }}
              />
            </div>
          )}

          {/* Task Dependencies (only for existing tasks) */}
          {task?.id && onAddDependency && onRemoveDependency && (
            <div className="pt-4 border-t border-white/5">
              <TaskDependencies
                taskId={task.id}
                dependencies={task.dependencies || []}
                dependedOnBy={task.dependedOnBy || []}
                allTasks={allTasks}
                onAddDependency={(dependsOnId, type) => onAddDependency(task.id, dependsOnId, type)}
                onRemoveDependency={(depId) => onRemoveDependency(task.id, depId)}
              />
            </div>
          )}

          {/* Comments (only for existing tasks) */}
          {task?.id && (
            <div className="pt-4 border-t border-white/5">
              <CommentSection taskId={task.id} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-white/10 hover:bg-white/5"
            >
              {t.modal.cancel}
            </Button>
            <Button
              type="submit"
              className="bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white"
            >
              {task ? t.modal.saveChanges : t.modal.create}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
