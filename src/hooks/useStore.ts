import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  User, Team, Project, Task, CalendarEvent, Activity, Sprint,
  TaskStatus, TaskFilter, DashboardStats, TimeEntry
} from '@/types';

const API_BASE = '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const baseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) baseHeaders['Authorization'] = `Bearer ${token}`;
  const mergedHeaders = { ...baseHeaders, ...(options?.headers as Record<string, string> | undefined) };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders
  });
  if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
  return res.json();
}

// Global store hook for state management
export const useStore = () => {
  // State
  const [currentUser, setCurrentUser] = useState<User>({
    id: '', name: '', email: '', avatar: '', role: 'developer', status: 'online'
  });
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0, completedTasks: 0, inProgressTasks: 0,
    reviewTasks: 0, teamMembers: 0, projects: 0, overdueTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref to avoid stale closures in time tracking / subtask callbacks
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // Load all data from API on mount
  const loadData = useCallback(async () => {
    // Don't load if no token
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
        const [usersData, projectsData, teamsData, tasksData, eventsData, activitiesData, statsData, sprintsData] =
          await Promise.all([
            apiFetch<User[]>('/users'),
            apiFetch<(Project & { taskCount: Project['taskCount'] })[]>('/projects'),
            apiFetch<Team[]>('/teams'),
            apiFetch<Task[]>('/tasks'),
            apiFetch<CalendarEvent[]>('/events'),
            apiFetch<Activity[]>('/activities'),
            apiFetch<DashboardStats>('/stats'),
            apiFetch<Sprint[]>('/sprints')
          ]);

        setUsers(usersData);
        // Set currentUser from auth context
        const authToken = getAuthToken();
        if (authToken) {
          try {
            const meRes = await fetch(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${authToken}` }
            });
            if (meRes.ok) {
              const me = await meRes.json();
              const matchedUser = usersData.find((u: User) => u.id === me.id);
              setCurrentUser(matchedUser || me);
            } else {
              setCurrentUser(usersData[0] || currentUser);
            }
          } catch {
            setCurrentUser(usersData[0] || currentUser);
          }
        } else {
          setCurrentUser(usersData[0] || currentUser);
        }
        setProjects(projectsData);
        setTeams(teamsData);
        setTasks(tasksData);
        setCalendarEvents(eventsData);
        setActivities(activitiesData);
        setStats(statsData);
        setSprints(sprintsData);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่');
      } finally {
        setLoading(false);
      }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load data when component mounts or when auth token changes
  useEffect(() => { 
    const token = getAuthToken();
    if (token) {
      loadData();
    }
    
    // Listen for storage changes (when token is set after login)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' && e.newValue) {
        loadData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);

  // Refresh helpers
  const refreshTasks = useCallback(async () => {
    try {
      const [tasksData, statsData, activitiesData, sprintsData, projectsData] = await Promise.all([
        apiFetch<Task[]>('/tasks'),
        apiFetch<DashboardStats>('/stats'),
        apiFetch<Activity[]>('/activities'),
        apiFetch<Sprint[]>('/sprints'),
        apiFetch<(Project & { taskCount: Project['taskCount'] })[]>('/projects'),
      ]);
      setTasks(tasksData);
      setStats(statsData);
      setActivities(activitiesData);
      setSprints(sprintsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    }
  }, []);

  // Task Actions
  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTask = await apiFetch<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          projectId: task.projectId,
          teamId: task.teamId || undefined,
          createdBy: currentUser.id,
          dueDate: task.dueDate,
          assignees: task.assignees,
          tags: task.tags,
          subtasks: task.subtasks?.map(st => ({ title: st.title, completed: st.completed })),
          timeTracking: task.timeTracking ? {
            estimated: task.timeTracking.estimated,
            spent: task.timeTracking.spent
          } : undefined
        })
      });
      await refreshTasks();
      return newTask;
    } catch (error) {
      console.error('Failed to add task:', error);
      return null;
    }
  }, [currentUser.id, refreshTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      await apiFetch<Task>(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: updates.title,
          description: updates.description,
          status: updates.status,
          priority: updates.priority,
          projectId: updates.projectId,
          teamId: updates.teamId || undefined,
          dueDate: updates.dueDate,
          assignees: updates.assignees,
          tags: updates.tags,
          subtasks: updates.subtasks?.map(st => ({ title: st.title, completed: st.completed })),
          timeTracking: updates.timeTracking ? {
            estimated: updates.timeTracking.estimated,
            spent: updates.timeTracking.spent
          } : undefined,
          recurring: updates.recurring,
          sprintId: updates.sprintId,
        })
      });
      await refreshTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, [refreshTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
      await refreshTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, [refreshTasks]);

  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    try {
      await apiFetch(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      await refreshTasks();
    } catch (error) {
      console.error('Failed to move task:', error);
    }
  }, [refreshTasks]);

  const assignTask = useCallback(async (taskId: string, userIds: string[]) => {
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assignees: userIds })
      });
      await refreshTasks();
    } catch (error) {
      console.error('Failed to assign task:', error);
    }
  }, [refreshTasks]);

  // Time Tracking (optimistic update + API call)
  const startTimeTracking = useCallback(async (taskId: string) => {
    try {
      // Call the new backend endpoint to create the entry
      const entry = await apiFetch(`/tasks/${taskId}/time-tracking/start`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id })
      });

      // Update local state with the real entry from database
      setTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            timeTracking: {
              estimated: task.timeTracking?.estimated || 0,
              spent: task.timeTracking?.spent || 0,
              entries: [...(task.timeTracking?.entries || []), entry] as TimeEntry[]
            }
          };
        }
        return task;
      }));
    } catch (error) {
      console.error('Failed to start time tracking:', error);
      // Revert optimistic update on error
      setTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            timeTracking: {
              estimated: task.timeTracking?.estimated || 0,
              spent: task.timeTracking?.spent || 0,
              entries: (task.timeTracking?.entries.filter(e => !e.id.startsWith('te')) || []) as TimeEntry[]
            }
          };
        }
        return task;
      }));
    }
  }, [currentUser]);

  const stopTimeTracking = useCallback(async (taskId: string, entryId: string, description?: string) => {
    try {
      // Call the backend endpoint to stop tracking
      const updatedEntry = await apiFetch(`/tasks/${taskId}/time-tracking/stop`, {
        method: 'POST',
        body: JSON.stringify({ entryId, description })
      });

      // Update local state with the updated entry
      setTasks(prev => prev.map(task => {
        if (task.id === taskId && task.timeTracking) {
          const updatedEntries = task.timeTracking.entries.map(entry => {
            if (entry.id === entryId) {
              return updatedEntry;
            }
            return entry;
          }) as TimeEntry[];
          const totalSpent = updatedEntries.reduce((sum, e) => sum + e.duration, 0);

          return {
            ...task,
            timeTracking: {
              estimated: task.timeTracking.estimated || 0,
              spent: totalSpent,
              entries: updatedEntries
            }
          };
        }
        return task;
      }));
    } catch (error) {
      console.error('Failed to stop time tracking:', error);
    }
  }, []);

  // Subtask Actions
  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    // Optimistic update
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.map(st =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          )
        };
      }
      return task;
    }));
    // Persist subtask changes to server
    try {
      const task = tasksRef.current.find(t => t.id === taskId);
      if (task) {
        const updatedSubtasks = task.subtasks.map(st =>
          st.id === subtaskId ? { title: st.title, completed: !st.completed } : { title: st.title, completed: st.completed }
        );
        await apiFetch(`/tasks/${taskId}`, {
          method: 'PATCH',
          body: JSON.stringify({ subtasks: updatedSubtasks })
        });
      }
    } catch (error) {
      console.error('Failed to persist subtask toggle:', error);
    }
  }, []);

  // Calendar Actions
  const addCalendarEvent = useCallback(async (eventData: Partial<CalendarEvent>): Promise<void> => {
    try {
      const newEvent = await apiFetch<CalendarEvent>('/events', {
        method: 'POST',
        body: JSON.stringify(eventData)
      });
      setCalendarEvents(prev => [...prev, newEvent]);
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  }, []);

  const deleteCalendarEvent = useCallback(async (eventId: string) => {
    try {
      await apiFetch(`/events/${eventId}`, { method: 'DELETE' });
      setCalendarEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }, []);

  // Filter Tasks
  const filterTasks = useCallback((filter: TaskFilter): Task[] => {
    return tasks.filter(task => {
      if (filter.status?.length && !filter.status.includes(task.status)) return false;
      if (filter.priority?.length && !filter.priority.includes(task.priority)) return false;
      if (filter.assignee?.length && !task.assignees.some(a => filter.assignee?.includes(a))) return false;
      if (filter.project?.length && !filter.project.includes(task.projectId)) return false;
      if (filter.team?.length && (!task.teamId || !filter.team.includes(task.teamId))) return false;
      if (filter.sprint?.length && (!task.sprintId || !filter.sprint.includes(task.sprintId))) return false;
      if (filter.tags?.length && !filter.tags.some(t => task.tags.includes(t))) return false;
      if (filter.dueDate?.from && task.dueDate && new Date(task.dueDate) < filter.dueDate.from) return false;
      if (filter.dueDate?.to && task.dueDate && new Date(task.dueDate) > filter.dueDate.to) return false;
      if (filter.search) {
        const search = filter.search.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(search);
        const matchDesc = task.description.toLowerCase().includes(search);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [tasks]);

  // Sprint Actions
  const createSprint = useCallback(async (sprint: Partial<Sprint>) => {
    try {
      await apiFetch<Sprint>('/sprints', {
        method: 'POST',
        body: JSON.stringify(sprint)
      });
      await refreshTasks();
    } catch (error) {
      console.error('Failed to create sprint:', error);
    }
  }, [refreshTasks]);

  const updateSprint = useCallback(async (id: string, updates: Partial<Sprint>) => {
    try {
      await apiFetch(`/sprints/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      await refreshTasks();
    } catch (error) {
      console.error('Failed to update sprint:', error);
    }
  }, [refreshTasks]);

  const deleteSprint = useCallback(async (id: string) => {
    try {
      await apiFetch(`/sprints/${id}`, { method: 'DELETE' });
      await refreshTasks();
    } catch (error) {
      console.error('Failed to delete sprint:', error);
    }
  }, [refreshTasks]);

  const addTasksToSprint = useCallback(async (sprintId: string, taskIds: string[]) => {
    try {
      await apiFetch(`/sprints/${sprintId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ taskIds })
      });
      await refreshTasks();
    } catch (error) {
      console.error('Failed to add tasks to sprint:', error);
    }
  }, [refreshTasks]);

  const removeTaskFromSprint = useCallback(async (sprintId: string, taskId: string) => {
    try {
      await apiFetch(`/sprints/${sprintId}/tasks`, {
        method: 'DELETE',
        body: JSON.stringify({ taskIds: [taskId] })
      });
      await refreshTasks();
    } catch (error) {
      console.error('Failed to remove task from sprint:', error);
    }
  }, [refreshTasks]);

  // Dependency Actions
  const addDependency = useCallback(async (taskId: string, dependsOnId: string, type: string = 'blocks') => {
    try {
      await apiFetch(`/tasks/${taskId}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({ dependsOnId, type })
      });
      await refreshTasks();
    } catch (error) {
      console.error('Failed to add dependency:', error);
    }
  }, [refreshTasks]);

  const removeDependency = useCallback(async (taskId: string, depId: string) => {
    try {
      await apiFetch(`/tasks/${taskId}/dependencies/${depId}`, { method: 'DELETE' });
      await refreshTasks();
    } catch (error) {
      console.error('Failed to remove dependency:', error);
    }
  }, [refreshTasks]);

  // Getters
  const getUserTasks = useCallback((userId: string) => {
    return tasks.filter(t => t.assignees.includes(userId));
  }, [tasks]);

  const getProjectTasks = useCallback((projectId: string) => {
    return tasks.filter(t => t.projectId === projectId);
  }, [tasks]);

  const getUserCalendarEvents = useCallback((userId: string) => {
    return calendarEvents.filter(e => e.userId === userId);
  }, [calendarEvents]);

  // Project Actions
  const deleteProject = useCallback(async (projectId: string) => {
    await apiFetch(`/projects/${projectId}`, { method: 'DELETE' });
    await refreshTasks();
  }, [refreshTasks]);

  // Team Actions
  const createTeam = useCallback(async (data: { name: string; description: string; color: string; members?: { userId: string; role: string }[] }) => {
    const team = await apiFetch<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setTeams(prev => [team, ...prev]);
    return team;
  }, []);

  const deleteTeam = useCallback(async (teamId: string) => {
    await apiFetch(`/teams/${teamId}`, { method: 'DELETE' });
    setTeams(prev => prev.filter(t => t.id !== teamId));
  }, []);

  const addTeamMember = useCallback(async (teamId: string, userId: string, role: string = 'member') => {
    // Get current team to get current members
    const team = teams.find(t => t.id === teamId);
    if (!team) throw new Error('Team not found');
    const newMembers = [...team.members.map(m => ({ userId: m.userId, role: m.role })), { userId, role }];
    const updated = await apiFetch<Team>(`/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify({ members: newMembers }),
    });
    setTeams(prev => prev.map(t => t.id === teamId ? updated : t));
    return updated;
  }, [teams]);

  const removeTeamMember = useCallback(async (teamId: string, userId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) throw new Error('Team not found');
    const newMembers = team.members.filter(m => m.userId !== userId).map(m => ({ userId: m.userId, role: m.role }));
    const updated = await apiFetch<Team>(`/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify({ members: newMembers }),
    });
    setTeams(prev => prev.map(t => t.id === teamId ? updated : t));
    return updated;
  }, [teams]);

  // Refresh users after invite
  const refreshUsers = useCallback(async () => {
    const usersData = await apiFetch<User[]>('/users');
    setUsers(usersData);
  }, []);

  return {
    // State
    currentUser,
    users,
    teams,
    projects,
    tasks,
    calendarEvents,
    activities,
    sprints,
    stats,
    loading,
    error,
    retry: loadData,

    // Task Actions
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    assignTask,
    startTimeTracking,
    stopTimeTracking,
    toggleSubtask,
    refreshTasks,

    // Sprint Actions
    createSprint,
    updateSprint,
    deleteSprint,
    addTasksToSprint,
    removeTaskFromSprint,

    // Dependency Actions
    addDependency,
    removeDependency,

    // Calendar Actions
    addCalendarEvent,
    deleteCalendarEvent,

    // Project Actions
    deleteProject,

    // Team Actions
    createTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
    refreshUsers,

    // Filters & Getters
    filterTasks,
    getUserTasks,
    getProjectTasks,
    getUserCalendarEvents
  };
};

export type Store = ReturnType<typeof useStore>;
