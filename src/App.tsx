import { useState, useMemo, useEffect } from 'react';
import { emptyFilters } from '@/components/tasks/TaskFilterPanel';
import type { FilterState } from '@/components/tasks/TaskFilterPanel';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useChats } from '@/hooks/useChats';
import { MobileNav } from '@/components/layout/MobileNav';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TeamCalendar } from '@/components/calendar/TeamCalendar';
import { TeamMembers } from '@/components/team/TeamMembers';
import { ProjectList } from '@/components/projects/ProjectList';
import { TaskModal } from '@/components/modals/TaskModal';
import { SprintBoard } from '@/components/sprints/SprintBoard';
import { AlertSystem } from '@/components/notifications/AlertSystem';
import { useStore } from '@/hooks/useStore';
import { useNotifications, type NotificationPrefs, DEFAULT_NOTIF_PREFS } from '@/hooks/useNotifications';
import { useAlerts } from '@/hooks/useAlerts';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useKeyboardShortcuts, KeyboardShortcutsDialog } from '@/hooks/useKeyboardShortcuts';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import type { Task, TaskStatus, TaskFilter, User } from '@/types';
import { cn } from '@/lib/utils';
import { Menu, Undo2, Redo2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState<TaskStatus>('todo');
  const [selectedProject] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [myTasksProjectFilter, setMyTasksProjectFilter] = useState<string>('all');
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const store = useStore();
  const { t, lang, setLang } = useLanguage();
  const { currentUser: authUser, token, isLoading: authLoading, logout, refreshUser } = useAuth();
  const alerts = useAlerts();
  const chatHook = useChats({ token, currentUserId: authUser?.id ?? '' });

  // Notification prefs — persisted in localStorage
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => {
    try {
      const saved = localStorage.getItem('notif_prefs');
      return saved ? { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(saved) } : DEFAULT_NOTIF_PREFS;
    } catch { return DEFAULT_NOTIF_PREFS; }
  });

  const handleNotifPrefsChange = (prefs: NotificationPrefs) => {
    setNotifPrefs(prefs);
    localStorage.setItem('notif_prefs', JSON.stringify(prefs));
  };

  const { notifications, markAsRead, markAllRead, deleteNotification } = useNotifications({
    token,
    prefs: notifPrefs,
    onNotification: (notification) => {
      // Skip alert popup for chat — handled by ChatPanel unread badge
      if ((notification.type as string) === 'chat') return;

      const alertTypeMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
        'task_assigned': 'info',
        'task_completed': 'success',
        'due_soon': 'warning',
        'task_created': 'info',
        'comment': 'info',
        'mention': 'warning',
      };
      const alertType = alertTypeMap[notification.type] || 'info';
      alerts[alertType](notification.title, notification.message, 6000);
    }
  });
  const { pushAction, undo, redo, canUndo, canRedo } = useUndoRedo();
  const { registerShortcut, setShowDialog: setShowShortcuts } = useKeyboardShortcuts();

  // Reload store data when user logs in
  useEffect(() => {
    if (authUser && token) {
      store.retry();
    }
  }, [authUser, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Register keyboard shortcuts
  useEffect(() => {
    registerShortcut({ key: 'n', description: 'New task', category: 'Tasks', action: () => handleCreateTask() });
    registerShortcut({ key: '/', description: 'Focus search', category: 'Navigation', action: () => {
      const input = document.querySelector('input[placeholder]') as HTMLInputElement;
      input?.focus();
    }});
    registerShortcut({ key: 'z', ctrl: true, description: 'Undo', category: 'General', action: () => undo() });
    registerShortcut({ key: 'z', ctrl: true, shift: true, description: 'Redo', category: 'General', action: () => redo() });
    registerShortcut({ key: '?', shift: true, description: 'Show shortcuts', category: 'General', action: () => setShowShortcuts(true) });
    registerShortcut({ key: '1', description: 'Go to Dashboard', category: 'Navigation', action: () => setActiveView('dashboard') });
    registerShortcut({ key: '2', description: 'Go to Tasks', category: 'Navigation', action: () => setActiveView('tasks') });
    registerShortcut({ key: '3', description: 'Go to Projects', category: 'Navigation', action: () => setActiveView('projects') });
    registerShortcut({ key: '4', description: 'Go to Sprints', category: 'Navigation', action: () => setActiveView('sprints') });
    registerShortcut({ key: '5', description: 'Go to Calendar', category: 'Navigation', action: () => setActiveView('calendar') });
    registerShortcut({ key: 'Escape', description: 'Close modal', category: 'General', action: () => setIsTaskModalOpen(false) });
  }, [registerShortcut, setShowShortcuts]);

  // ALL hooks must be called before any conditional returns
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    store.tasks.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [store.tasks]);

  // Filter tasks for "My Tasks" view - only show tasks assigned to current user
  const myTasks = useMemo(() => {
    if (!authUser) return [];
    let tasks = store.tasks.filter(t => t.assignees?.includes(authUser.id));
    
    // Apply project filter if not "all"
    if (myTasksProjectFilter !== 'all') {
      tasks = tasks.filter(t => t.projectId === myTasksProjectFilter);
    }
    
    return tasks;
  }, [store.tasks, authUser, myTasksProjectFilter]);

  const filteredTasks = useMemo(() => {
    const filter: TaskFilter = {
      search: searchQuery || undefined,
      project: selectedProject ? [selectedProject] : undefined
    };
    let result = store.filterTasks(filter);

    // Apply advanced filters
    if (filters.priorities.length > 0) {
      result = result.filter(t => filters.priorities.includes(t.priority));
    }
    if (filters.assignees.length > 0) {
      result = result.filter(t => t.assignees?.some(a => filters.assignees.includes(a)));
    }
    if (filters.projects.length > 0) {
      result = result.filter(t => t.projectId && filters.projects.includes(t.projectId));
    }
    if (filters.tags.length > 0) {
      result = result.filter(t => t.tags?.some(tag => filters.tags.includes(tag)));
    }
    if (filters.dateRange.from) {
      const from = new Date(filters.dateRange.from);
      result = result.filter(t => t.dueDate && new Date(t.dueDate) >= from);
    }
    if (filters.dateRange.to) {
      const to = new Date(filters.dateRange.to);
      result = result.filter(t => t.dueDate && new Date(t.dueDate) <= to);
    }

    return result;
  }, [store, searchQuery, selectedProject, filters]);

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-10 h-10 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in → Show login page
  if (!authUser) return <LoginPage />;

  // Loading data
  if (store.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">{t.login.loadingData}</p>
        </div>
      </div>
    );
  }

  // Error loading data
  if (store.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">{t.common.loadError || store.error}</p>
          <Button onClick={store.retry} className="bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white">
            {t.common.retry || 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  const handleCreateTask = (status: TaskStatus = 'todo') => {
    setSelectedTask(null);
    setDefaultTaskStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (selectedTask) {
      const prevTask = { ...selectedTask };
      store.updateTask(selectedTask.id, taskData);
      pushAction({
        id: `update-${Date.now()}`,
        type: 'task_update',
        description: `Updated "${selectedTask.title}"`,
        undo: async () => store.updateTask(selectedTask.id, prevTask),
        redo: async () => store.updateTask(selectedTask.id, taskData),
        timestamp: new Date()
      });
      alerts.success('อัปเดตงานแล้ว', `"${selectedTask.title}" ได้รับการอัปเดตเรียบร้อย`, 3000);
    } else {
      const result = await store.addTask(taskData as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>);
      if (!result) {
        alerts.error('ไม่สามารถสร้างงานได้', 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', 5000);
      } else {
        alerts.success('สร้างงานใหม่แล้ว', `"${taskData.title}" ถูกสร้างเรียบร้อยแล้ว`, 4000);
      }
    }
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    const task = store.tasks.find(t => t.id === taskId);
    const prevStatus = task?.status;
    store.moveTask(taskId, status);
    
    // Show alert for status change
    if (task) {
      const statusLabels = {
        'todo': t.kanban.todo,
        'in-progress': t.kanban.inProgress,
        'review': t.kanban.review,
        'done': t.kanban.done
      };
      
      alerts.success(
        'อัปเดตสถานะแล้ว',
        `"${task.title}" → ${statusLabels[status]}`,
        3000
      );
    }
    
    if (task && prevStatus) {
      pushAction({
        id: `move-${Date.now()}`,
        type: 'task_move',
        description: `Moved "${task.title}" to ${status}`,
        undo: async () => store.moveTask(taskId, prevStatus),
        redo: async () => store.moveTask(taskId, status),
        timestamp: new Date()
      });
    }
  };

  const handleProjectClick = (projectId: string) => {
    setViewingProjectId(projectId);
    setActiveView('project-detail');
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeleteTaskId(taskId);
  };

  const confirmDeleteTask = async () => {
    const taskId = deleteTaskId;
    if (!taskId) return;
    setDeleteTaskId(null);
    const task = store.tasks.find(t => t.id === taskId);
    try {
      await store.deleteTask(taskId);
      alerts.success('ลบงานแล้ว', `"${task?.title}" ถูกลบออกจากระบบ`, 4000);
      if (task) {
        pushAction({
          id: `delete-${Date.now()}`,
          type: 'task_delete',
          description: `Deleted "${task.title}"`,
          undo: async () => { await store.addTask(task as any); },
          redo: async () => { await store.deleteTask(taskId); },
          timestamp: new Date()
        });
      }
    } catch {
      alerts.error('ไม่สามารถลบได้', 'เกิดข้อผิดพลาดในการลบงาน กรุณาลองใหม่', 5000);
    }
  };

  const handleUpdateDueDate = (taskId: string, newDate: Date) => {
    store.updateTask(taskId, { dueDate: newDate });
  };

  const handleInviteUser = async (data: { name: string; email: string; password: string; role: string; department?: string }) => {
    const token = localStorage.getItem('auth_token');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to register user');
    return res.json();
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <StatsCards stats={store.stats} tasks={filteredTasks} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-white mb-1">{t.kanban.taskBoard}</h2>
                  <p className="text-gray-400 text-sm">{t.kanban.taskBoardDesc}</p>
                </div>
                <KanbanBoard
                  tasks={filteredTasks.slice(0, 8)}
                  users={store.users}
                  onTaskClick={handleEditTask}
                  onStatusChange={handleStatusChange}
                  onCreateTask={handleCreateTask}
                  onDeleteTask={handleDeleteTask}
                  onStartTimeTracking={store.startTimeTracking}
                  onStopTimeTracking={store.stopTimeTracking}
                />
              </div>

              <div className="space-y-6">
                <ActivityFeed
                  activities={store.activities.slice(0, 10)}
                  users={store.users}
                />
              </div>
            </div>
          </div>
        );

      case 'tasks':
        return (
          <div>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {t.tasksPage.myTasks || 'งานของฉัน'}
                </h2>
                <p className="text-gray-400">{t.tasksPage.myTasksSubtitle || 'งานที่คุณได้รับมอบหมายทั้งหมด'}</p>
              </div>
              
              {/* Project Filter Dropdown */}
              <div className="min-w-[200px]">
                <select
                  value={myTasksProjectFilter}
                  onChange={(e) => setMyTasksProjectFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--orange)] transition-colors"
                >
                  <option value="all">{t.tasksPage.allProjects || 'ทุกโปรเจกต์'}</option>
                  {store.projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <KanbanBoard
              tasks={myTasks}
              users={store.users}
              onTaskClick={handleEditTask}
              onStatusChange={handleStatusChange}
              onCreateTask={handleCreateTask}
              onDeleteTask={handleDeleteTask}
              onStartTimeTracking={store.startTimeTracking}
              onStopTimeTracking={store.stopTimeTracking}
            />
          </div>
        );

      case 'projects':
        return (
          <ProjectList
            projects={store.projects}
            teams={store.teams}
            tasks={store.tasks}
            onProjectClick={(project) => handleProjectClick(project.id)}
            onCreateProject={() => setShowCreateProject(true)}
            onDeleteProject={async (id) => {
              try {
                await store.deleteProject(id);
                toast.success(t.common.projectDeleted);
              } catch {
                toast.error(t.common.deleteError);
              }
            }}
          />
        );

      case 'project-detail':
        const viewingProject = store.projects.find(p => p.id === viewingProjectId);
        if (!viewingProject) {
          setActiveView('projects');
          return null;
        }
        return (
          <ProjectDetailPage
            project={viewingProject}
            tasks={store.tasks}
            users={store.users}
            teams={store.teams}
            onBack={() => setActiveView('projects')}
            onTaskClick={handleEditTask}
            onStatusChange={handleStatusChange}
            onCreateTask={handleCreateTask}
            onDeleteTask={handleDeleteTask}
            onStartTimeTracking={store.startTimeTracking}
            onStopTimeTracking={store.stopTimeTracking}
            currentUserId={authUser?.id}
          />
        );

      case 'team':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">{t.teamPage.title}</h2>
              <p className="text-gray-400">{t.teamPage.subtitle}</p>
            </div>
            <TeamMembers
              users={store.users}
              tasks={store.tasks}
              teams={store.teams}
              onAddTeamMember={store.addTeamMember}
              onRemoveTeamMember={store.removeTeamMember}
              onCreateTeam={store.createTeam}
              onDeleteTeam={store.deleteTeam}
              onInviteUser={handleInviteUser}
              onRefreshUsers={store.refreshUsers}
              onMessageUser={async (userId) => {
                await chatHook.openDirectChat(userId);
                setIsChatOpen(true);
              }}
              onViewUserTasks={(userId) => {
                setFilters({ ...emptyFilters, assignees: [userId] });
                setActiveView('tasks');
              }}
              currentUserId={authUser?.id}
              currentUserRole={authUser?.role}
              onUpdateUser={async (userId, data) => {
                const res = await fetch(`/api/users/${userId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error('update failed');
                await store.refreshUsers();
              }}
            />
          </div>
        );

      case 'calendar':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">{t.calendar.title}</h2>
              <p className="text-gray-400">{t.calendar.subtitle}</p>
            </div>
            <TeamCalendar
              events={store.calendarEvents}
              tasks={store.tasks}
              users={store.users}
              projects={store.projects}
              currentUserId={authUser?.id || ''}
              onUpdateDueDate={handleUpdateDueDate}
              onTaskClick={handleEditTask}
              onCreateEvent={store.addCalendarEvent}
              onUpdateEvent={async (eventId, eventData) => {
                // Update event via API
                const token = localStorage.getItem('auth_token');
                const res = await fetch(`/api/events/${eventId}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                  },
                  body: JSON.stringify(eventData)
                });
                if (res.ok) {
                  await store.retry();
                  toast.success('✅ อัพเดท Event สำเร็จ');
                } else {
                  toast.error('❌ ไม่สามารถอัพเดท Event ได้');
                }
              }}
              onDeleteEvent={store.deleteCalendarEvent}
            />
          </div>
        );

      case 'reports':
        return (
          <ReportsPage
            tasks={store.tasks}
            users={store.users}
            projects={store.projects}
          />
        );

      case 'sprints':
        return (
          <SprintBoard
            sprints={store.sprints}
            tasks={store.tasks}
            projects={store.projects}
            users={store.users}
            onCreateSprint={store.createSprint}
            onUpdateSprint={store.updateSprint}
            onDeleteSprint={store.deleteSprint}
            onAddTasksToSprint={store.addTasksToSprint}
            onRemoveTaskFromSprint={store.removeTaskFromSprint}
            onTaskClick={handleEditTask}
          />
        );

      case 'settings':
        return (
          <SettingsPage
            currentUser={authUser}
            lang={lang}
            onLangChange={setLang}
            notifPrefs={notifPrefs}
            onNotifPrefsChange={handleNotifPrefsChange}
            onUserUpdate={async (data: Partial<User>) => {
              const res = await fetch(`/api/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(data)
              });
              if (!res.ok) {
                toast.error(t.common.createError);
                return;
              }
              await refreshUser();
              toast.success(t.settings.profile.saved);
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Alert System */}
      <AlertSystem alerts={alerts.alerts} onDismiss={alerts.dismissAlert} />

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <Sidebar
        currentUser={authUser}
        activeView={activeView}
        onViewChange={(view) => { setActiveView(view); if (isMobile) setSidebarOpen(false); }}
        onLogout={logout}
        isMobile={isMobile}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        totalUnread={chatHook.totalUnread}
        onChatOpen={() => setIsChatOpen(true)}
      />

      {/* Mobile Nav */}
      <MobileNav activeView={activeView} onViewChange={setActiveView} />

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-400 min-h-screen",
        isMobile ? "ml-0 pb-20" : "ml-[250px]"
      )}>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {/* Mobile Header with hamburger */}
          {isMobile && (
            <div className="flex items-center gap-3 mb-4 lg:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
              <h1 className="text-lg font-semibold text-white">{t.app.name}</h1>
            </div>
          )}
          {/* Header - Only show on dashboard and tasks */}
          {(activeView === 'dashboard' || activeView === 'tasks') && (
            <DashboardHeader
              currentUser={store.currentUser}
              onCreateTask={() => handleCreateTask()}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onMarkAllRead={markAllRead}
              onDeleteNotification={deleteNotification}
              users={store.users}
              projects={store.projects}
              allTags={allTags}
              filters={filters}
              onFiltersChange={setFilters}
            />
          )}

          {/* Content */}
          {renderContent()}

          {/* Undo/Redo floating buttons */}
          {(canUndo || canRedo) && (
            <div className="fixed bottom-6 right-6 flex items-center gap-2 z-30 lg:bottom-8 lg:right-8">
              {canUndo && (
                <button
                  onClick={undo}
                  className="p-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 shadow-lg transition-all"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
              )}
              {canRedo && (
                <button
                  onClick={redo}
                  className="p-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 shadow-lg transition-all"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        chatHook={chatHook}
        currentUser={authUser}
        users={store.users}
        projects={store.projects}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog />

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        task={selectedTask}
        users={store.users}
        projects={store.projects}
        teams={store.teams}
        allTasks={store.tasks}
        defaultStatus={defaultTaskStatus}
        currentUserId={authUser.id}
        onStartTimeTracking={store.startTimeTracking}
        onStopTimeTracking={store.stopTimeTracking}
        onRefreshTasks={store.refreshTasks}
        onAddDependency={store.addDependency}
        onRemoveDependency={store.removeDependency}
        sprints={store.sprints}
      />

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => { if (!open) setDeleteTaskId(null); }}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t.common.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {t.common.deleteConfirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10">
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent className="bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{t.common.createProject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.common.projectName}</label>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t.common.projectNamePlaceholder}
                className="bg-white/5 border-white/10 text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectName.trim()) {
                    fetch('/api/projects', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ name: newProjectName.trim(), description: '', color: '#ff6b35', status: 'active' })
                    }).then(res => {
                      if (!res.ok) throw new Error('Failed');
                      store.refreshTasks(); setShowCreateProject(false); setNewProjectName(''); toast.success(t.common.createProject);
                    }).catch(() => toast.error(t.common.createError));
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateProject(false); setNewProjectName(''); }} className="border-white/10 text-gray-300">
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => {
                if (newProjectName.trim()) {
                  fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ name: newProjectName.trim(), description: '', color: '#ff6b35', status: 'active' })
                  }).then(res => {
                    if (!res.ok) throw new Error('Failed');
                    store.refreshTasks(); setShowCreateProject(false); setNewProjectName(''); toast.success(t.common.createProject);
                  }).catch(() => toast.error(t.common.createError));
                }
              }}
              className="bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white"
              disabled={!newProjectName.trim()}
            >
              {t.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
