import { useState, useMemo } from 'react';
import {
  Plus, Calendar, Target,
  Zap, CheckCircle2, Circle, Clock, TrendingUp, Trash2, Play
} from 'lucide-react';
import type { Sprint, Task, Project, User } from '@/types';
import { format, differenceInDays, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

interface SprintBoardProps {
  sprints: Sprint[];
  tasks: Task[];
  projects: Project[];
  users: User[];
  onCreateSprint: (sprint: Partial<Sprint>) => void;
  onUpdateSprint: (id: string, updates: Partial<Sprint>) => void;
  onDeleteSprint: (id: string) => void;
  onAddTasksToSprint: (sprintId: string, taskIds: string[]) => void;
  onRemoveTaskFromSprint: (sprintId: string, taskId: string) => void;
  onTaskClick: (task: Task) => void;
}

export function SprintBoard({
  sprints,
  tasks,
  projects,
  onCreateSprint,
  onUpdateSprint,
  onDeleteSprint,
  onAddTasksToSprint,
  onRemoveTaskFromSprint,
  onTaskClick
}: SprintBoardProps) {
  const { t } = useLanguage();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddTasks, setShowAddTasks] = useState<string | null>(null);
  const [sprintErrors, setSprintErrors] = useState<{ name?: boolean; projectId?: boolean }>({});
  const [newSprint, setNewSprint] = useState({
    name: '', description: '', projectId: '', goal: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd')
  });

  const activeSprint = sprints.find(s => s.status === 'active');
  const planningSprints = sprints.filter(s => s.status === 'planning');
  const completedSprints = sprints.filter(s => s.status === 'completed');

  const getSprintTasks = (sprintId: string) =>
    tasks.filter(t => t.sprintId === sprintId);

  const getSprintProgress = (sprintId: string) => {
    const sTasks = getSprintTasks(sprintId);
    if (sTasks.length === 0) return 0;
    return Math.round((sTasks.filter(t => t.status === 'done').length / sTasks.length) * 100);
  };

  const unassignedTasks = useMemo(() =>
    tasks.filter(t => !t.sprintId && t.status !== 'done' && t.status !== 'cancelled'),
    [tasks]
  );

  const handleCreateSprint = () => {
    const errors = { name: !newSprint.name.trim(), projectId: !newSprint.projectId };
    setSprintErrors(errors);
    if (errors.name || errors.projectId) return;
    onCreateSprint({
      ...newSprint,
      startDate: new Date(newSprint.startDate),
      endDate: new Date(newSprint.endDate),
      status: 'planning'
    });
    setSprintErrors({});
    setNewSprint({
      name: '', description: '', projectId: '', goal: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd')
    });
    setShowCreateForm(false);
  };

  const SprintCard = ({ sprint }: { sprint: Sprint }) => {
    const sTasks = getSprintTasks(sprint.id);
    const progress = getSprintProgress(sprint.id);
    const daysLeft = differenceInDays(new Date(sprint.endDate), new Date());
    const isActive = sprint.status === 'active';
    const isOverdue = isPast(new Date(sprint.endDate)) && sprint.status !== 'completed';
    const doneCount = sTasks.filter(t => t.status === 'done').length;
    const inProgressCount = sTasks.filter(t => t.status === 'in-progress').length;
    const cancelledCount = sTasks.filter(t => t.status === 'cancelled').length;

    return (
      <div className={cn(
        "bg-[#111] border rounded-xl overflow-hidden transition-all hover:border-white/20",
        isActive ? "border-[#ff6b35]/30" : "border-white/5"
      )}>
        {/* Sprint Header */}
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {isActive && <Zap className="w-4 h-4 text-[#ff6b35]" />}
              <h3 className="font-semibold text-white">{sprint.name}</h3>
              <span className={cn(
                "px-2 py-0.5 text-xs rounded-full font-medium",
                sprint.status === 'active' ? "bg-[#ff6b35]/10 text-[#ff6b35]" :
                sprint.status === 'completed' ? "bg-green-500/10 text-green-400" :
                "bg-blue-500/10 text-blue-400"
              )}>
                {sprint.status === 'active' ? (t.sprint?.active || 'Active') :
                 sprint.status === 'completed' ? (t.sprint?.completed || 'Completed') :
                 (t.sprint?.planning || 'Planning')}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {sprint.status === 'planning' && (
                <button
                  onClick={() => onUpdateSprint(sprint.id, { status: 'active' })}
                  className="p-1.5 hover:bg-green-500/10 rounded-lg transition-colors text-green-400"
                  title="Start Sprint"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              {sprint.status === 'active' && (
                <button
                  onClick={() => onUpdateSprint(sprint.id, { status: 'completed' })}
                  className="p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors text-blue-400"
                  title="Complete Sprint"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowAddTasks(showAddTasks === sprint.id ? null : sprint.id)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteSprint(sprint.id)}
                className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {sprint.goal && (
            <p className="text-sm text-gray-400 mb-3 flex items-start gap-2">
              <Target className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
              {sprint.goal}
            </p>
          )}

          {/* Dates & Progress */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(sprint.startDate), 'MMM d')} — {format(new Date(sprint.endDate), 'MMM d')}
            </span>
            {isActive && (
              <span className={cn(
                "flex items-center gap-1",
                isOverdue ? "text-red-400" : daysLeft <= 3 ? "text-orange-400" : "text-gray-500"
              )}>
                <Clock className="w-3.5 h-3.5" />
                {isOverdue ? (t.sprint?.overdue || 'Overdue') : `${daysLeft}${t.sprint?.daysLeft || 'd left'}`}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">{doneCount}/{sTasks.length} {t.sprint?.tasks || 'tasks'}</span>
              <span className="text-gray-400">{progress}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Task Status Summary */}
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1 text-gray-400">
              <Circle className="w-3 h-3" /> {sTasks.filter(t => t.status === 'todo').length} {t.sprint?.todoCount || 'Todo'}
            </span>
            <span className="flex items-center gap-1 text-[#ff6b35]">
              <TrendingUp className="w-3 h-3" /> {inProgressCount} {t.sprint?.inProgressCount || 'In Progress'}
            </span>
            <span className="flex items-center gap-1 text-blue-400">
              <Clock className="w-3 h-3" /> {sTasks.filter(t => t.status === 'review').length} {t.sprint?.reviewCount || 'Review'}
            </span>
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle2 className="w-3 h-3" /> {doneCount} {t.sprint?.doneCount || 'Done'}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <Circle className="w-3 h-3" /> {cancelledCount} {t.sprint?.cancelledCount || 'Cancelled'}
            </span>
          </div>
        </div>

        {/* Add Tasks Dropdown */}
        {showAddTasks === sprint.id && (
          <div className="border-t border-white/5 p-4 bg-white/2 max-h-60 overflow-y-auto custom-scrollbar">
            <p className="text-xs text-gray-400 mb-2">{t.sprint?.addTasks || 'Add unassigned tasks to this sprint:'}</p>
            {unassignedTasks.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">{t.sprint?.noUnassigned || 'No unassigned tasks available'}</p>
            ) : (
              <div className="space-y-1">
                {unassignedTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => onAddTasksToSprint(sprint.id, [task.id])}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      task.priority === 'urgent' ? "bg-red-400" :
                      task.priority === 'high' ? "bg-orange-400" :
                      task.priority === 'medium' ? "bg-blue-400" : "bg-green-400"
                    )} />
                    <span className="text-sm text-gray-300 truncate">{task.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sprint Tasks List */}
        {sTasks.length > 0 && (
          <div className="border-t border-white/5 divide-y divide-white/5">
            {sTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 cursor-pointer transition-colors group"
                onClick={() => onTaskClick(task)}
              >
                <span className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  task.status === 'done' ? "bg-green-400" :
                  task.status === 'in-progress' ? "bg-[#ff6b35]" :
                  task.status === 'review' ? "bg-blue-400" :
                  task.status === 'cancelled' ? "bg-red-400" : "bg-gray-400"
                )} />
                <span className={cn(
                  "flex-1 text-sm truncate",
                  task.status === 'done' ? "text-gray-500 line-through" : task.status === 'cancelled' ? "text-red-400/70 line-through" : "text-gray-300"
                )}>
                  {task.title}
                </span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  task.priority === 'urgent' ? "bg-red-500/10 text-red-400" :
                  task.priority === 'high' ? "bg-orange-500/10 text-orange-400" :
                  task.priority === 'medium' ? "bg-blue-500/10 text-blue-400" :
                  "bg-green-500/10 text-green-400"
                )}>
                  {task.priority}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveTaskFromSprint(sprint.id, task.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">🏃 {t.sprint?.title || 'Sprints'}</h2>
          <p className="text-gray-400 text-sm">{t.sprint?.subtitle || 'Plan and manage your sprint cycles'}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff6b35] text-white font-medium text-sm hover:bg-[#ff6b35]/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          {t.sprint?.newSprint || 'New Sprint'}
        </button>
      </div>

      {/* Create Sprint Form */}
      {showCreateForm && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-slide-in">
          <h3 className="text-foreground font-semibold">{t.sprint?.createSprint || 'Create Sprint'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t.sprint?.sprintName || 'Sprint Name'}</label>
              <input
                value={newSprint.name}
                onChange={e => { setNewSprint(prev => ({ ...prev, name: e.target.value })); setSprintErrors(prev => ({ ...prev, name: false })); }}
                placeholder="Sprint 1"
                className={cn(
                  'w-full bg-muted border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none',
                  sprintErrors.name ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-[#ff6b35]'
                )}
              />
              {sprintErrors.name && <p className="text-xs text-red-500 mt-1">กรุณากรอกชื่อสปรินท์</p>}
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t.modal?.project || 'Project'} <span className="text-red-500">*</span></label>
              <select
                value={newSprint.projectId}
                onChange={e => { setNewSprint(prev => ({ ...prev, projectId: e.target.value })); setSprintErrors(prev => ({ ...prev, projectId: false })); }}
                className={cn(
                  'w-full bg-muted border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none',
                  sprintErrors.projectId ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-[#ff6b35]'
                )}
              >
                <option value="">{t.modal?.selectProject || 'Select project'}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {sprintErrors.projectId && <p className="text-xs text-red-500 mt-1">กรุณาเลือกโปรเจกต์</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-muted-foreground mb-1">{t.sprint?.goal || 'Sprint Goal'}</label>
              <input
                value={newSprint.goal}
                onChange={e => setNewSprint(prev => ({ ...prev, goal: e.target.value }))}
                placeholder={t.sprint?.goalPlaceholder || 'What do you aim to accomplish?'}
                className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-[#ff6b35] placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t.sprint?.startDate || 'Start Date'}</label>
              <input
                type="date"
                value={newSprint.startDate}
                onChange={e => setNewSprint(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-[#ff6b35]"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t.sprint?.endDate || 'End Date'}</label>
              <input
                type="date"
                value={newSprint.endDate}
                onChange={e => setNewSprint(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-[#ff6b35]"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateSprint}
              className="px-5 py-2.5 rounded-lg bg-[#ff6b35] text-white font-medium text-sm hover:bg-[#ff6b35]/90"
            >
              {t.sprint?.create || 'Create'}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setSprintErrors({}); }}
              className="px-5 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted"
            >
              {t.modal?.cancel || 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Active Sprint */}
      {activeSprint && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#ff6b35]" /> {t.sprint?.activeSprint || 'Active Sprint'}
          </h3>
          <SprintCard sprint={activeSprint} />
        </div>
      )}

      {/* Planning Sprints */}
      {planningSprints.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            📋 {t.sprint?.planningSprints || 'Planning'}
          </h3>
          <div className="grid gap-4">
            {planningSprints.map(sprint => (
              <SprintCard key={sprint.id} sprint={sprint} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Sprints */}
      {completedSprints.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            ✅ {t.sprint?.completedSprints || 'Completed'}
          </h3>
          <div className="grid gap-4">
            {completedSprints.slice(0, 5).map(sprint => (
              <SprintCard key={sprint.id} sprint={sprint} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sprints.length === 0 && !showCreateForm && (
        <div className="text-center py-16 bg-[#111] border border-white/5 rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#ff6b35]/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-[#ff6b35]" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t.sprint?.noSprints || 'No Sprints Yet'}</h3>
          <p className="text-gray-400 text-sm mb-6">{t.sprint?.noSprintsDesc || 'Create your first sprint to start organizing tasks into iterations.'}</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-5 py-2.5 rounded-lg bg-[#ff6b35] text-white font-medium text-sm hover:bg-[#ff6b35]/90"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            {t.sprint?.newSprint || 'New Sprint'}
          </button>
        </div>
      )}
    </div>
  );
}
