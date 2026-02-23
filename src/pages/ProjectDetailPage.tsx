import { useMemo } from 'react';
import { ArrowLeft, Users, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Project, Task, User, Team } from '@/types';

interface ProjectDetailPageProps {
  project: Project;
  tasks: Task[];
  users: User[];
  teams: Team[];
  onBack: () => void;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onCreateTask: (status?: Task['status']) => void;
  onDeleteTask: (taskId: string) => void;
  onStartTimeTracking: (taskId: string) => void;
  onStopTimeTracking: (taskId: string, entryId: string, description?: string) => void;
  currentUserId?: string;
}

export function ProjectDetailPage({
  project,
  tasks,
  users,
  onBack,
  onTaskClick,
  onStatusChange,
  onCreateTask,
  onDeleteTask,
  onStartTimeTracking,
  onStopTimeTracking,
  currentUserId,
}: ProjectDetailPageProps) {
  const { t } = useLanguage();

  // Filter tasks for this project
  const projectTasks = useMemo(() => {
    return tasks.filter(task => task.projectId === project.id);
  }, [tasks, project.id]);
  
  // Check if current user is involved in the project
  const isUserInvolved = useMemo(() => {
    if (!currentUserId) return true; // Allow if no user ID provided
    return projectTasks.some(task => task.assignees?.includes(currentUserId));
  }, [projectTasks, currentUserId]);
  
  const readOnly = !isUserInvolved;

  // Calculate statistics
  const stats = useMemo(() => {
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.status === 'done').length;
    const inProgress = projectTasks.filter(t => t.status === 'in-progress').length;
    const todo = projectTasks.filter(t => t.status === 'todo').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Get all unique assignees in this project
    const assigneeIds = new Set<string>();
    projectTasks.forEach(task => {
      task.assignees?.forEach(assigneeId => assigneeIds.add(assigneeId));
    });
    const assignees = users.filter(u => assigneeIds.has(u.id));

    // Calculate tasks per person
    const tasksByAssignee = assignees.map(user => {
      const userTasks = projectTasks.filter(t => t.assignees?.includes(user.id));
      const userCompleted = userTasks.filter(t => t.status === 'done').length;
      const userInProgress = userTasks.filter(t => t.status === 'in-progress').length;
      const userTodo = userTasks.filter(t => t.status === 'todo').length;
      
      return {
        user,
        total: userTasks.length,
        completed: userCompleted,
        inProgress: userInProgress,
        todo: userTodo,
        progress: userTasks.length > 0 ? Math.round((userCompleted / userTasks.length) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);

    // Get overdue tasks
    const now = new Date();
    const overdue = projectTasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < now && 
      t.status !== 'done'
    ).length;

    return {
      total,
      completed,
      inProgress,
      todo,
      progress,
      assignees,
      tasksByAssignee,
      overdue,
    };
  }, [projectTasks, users]);

  // Get team info - check if project has teams property
  const projectTeam = useMemo(() => {
    const project_teams = (project as any).teams;
    if (Array.isArray(project_teams) && project_teams.length > 0) {
      return project_teams[0];
    }
    return null;
  }, [project]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.common?.back || 'กลับ'}
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: project.color }}
              >
                {(project as any).icon || '📁'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                {projectTeam && (
                  <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                    <Users className="w-4 h-4" />
                    {projectTeam.name}
                  </div>
                )}
              </div>
            </div>
            {project.description && (
              <p className="text-gray-400 mt-2">{project.description}</p>
            )}
          </div>

          {/* Overall Progress */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[200px]">
            <div className="text-sm text-gray-400 mb-2">{t.projects?.progress || 'ความคืบหน้า'}</div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-white">{stats.progress}%</span>
              <span className="text-sm text-gray-500">
                {stats.completed}/{stats.total}
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--orange)] to-[var(--neon-cyan)] transition-all duration-500"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{t.kanban?.todo || 'งานทั้งหมด'}</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{t.kanban?.inProgress || 'กำลังทำ'}</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.inProgress}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{t.kanban?.done || 'เสร็จแล้ว'}</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{t.common?.overdue || 'เลยกำหนด'}</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.overdue}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Team Members & Their Tasks */}
      {stats.tasksByAssignee.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--orange)]" />
            {t.teamPage?.member || 'สมาชิกทีม'} ({stats.assignees.length})
          </h3>
          
          <div className="space-y-4">
            {stats.tasksByAssignee.map(({ user, total, completed, inProgress, todo, progress }) => (
              <div key={user.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
                {/* User Info */}
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff6b35&color=fff`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white truncate">{user.name}</h4>
                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-white/5 rounded">
                      {user.role}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>{progress}%</span>
                        <span>{completed}/{total} งาน</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[var(--orange)] to-green-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Counts */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Todo</div>
                    <div className="text-white font-medium">{todo}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">In Progress</div>
                    <div className="text-orange-400 font-medium">{inProgress}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Done</div>
                    <div className="text-green-400 font-medium">{completed}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          {t.tasksPage?.allTasks || 'งานทั้งหมด'}
        </h3>
        <KanbanBoard
          tasks={projectTasks}
          users={users}
          onTaskClick={onTaskClick}
          onStatusChange={onStatusChange}
          onCreateTask={onCreateTask}
          onDeleteTask={onDeleteTask}
          onStartTimeTracking={onStartTimeTracking}
          onStopTimeTracking={onStopTimeTracking}
          readOnly={readOnly}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
