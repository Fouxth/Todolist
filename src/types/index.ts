// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'developer' | 'designer' | 'tester' | 'manager';
  status: 'online' | 'busy' | 'away' | 'offline';
  currentTask?: string;
  department?: string;
}

// Team Types
export interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  projectId: string;
  color: string;
  createdAt: Date;
}

export interface TeamMember {
  userId: string;
  role: 'lead' | 'member';
  joinedAt: Date;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  progress: number;
  startDate: Date;
  endDate?: Date;
  teams: string[];
  color: string;
  taskCount: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
  };
}

// Sprint Types
export interface Sprint {
  id: string;
  name: string;
  description: string;
  projectId: string;
  status: 'planning' | 'active' | 'completed';
  goal: string;
  startDate: Date;
  endDate: Date;
  tasks: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Task Types
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: string[];
  projectId: string;
  teamId?: string;
  sprintId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];
  subtasks: Subtask[];
  timeTracking?: TimeTracking;
  comments: Comment[];
  attachments: Attachment[];
  dependencies?: TaskDependency[];
  dependedOnBy?: TaskDependency[];
  recurring?: RecurringConfig;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnId: string;
  type: 'blocks' | 'related';
  dependsOn?: { id: string; title: string; status: TaskStatus };
  task?: { id: string; title: string; status: TaskStatus };
}

export interface RecurringConfig {
  enabled: boolean;
  interval: 'daily' | 'weekly' | 'monthly' | 'custom';
  customDays?: number;
  nextRun?: Date;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
}

// Time Tracking Types
export interface TimeTracking {
  estimated: number; // in minutes
  spent: number; // in minutes
  entries: TimeEntry[];
}

export interface TimeEntry {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  description?: string;
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: 'task' | 'meeting' | 'deadline' | 'reminder';
  userId: string;
  projectId?: string;
  taskId?: string;
  color?: string;
}

// Activity Types
export interface Activity {
  id: string;
  userId: string;
  action: 'created' | 'updated' | 'deleted' | 'assigned' | 'completed' | 'commented' | 'started' | 'paused';
  targetType: 'task' | 'project' | 'team' | 'sprint';
  targetId: string;
  targetName: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Dashboard Types
export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  teamMembers: number;
  projects: number;
  overdueTasks: number;
}

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  color: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'task_completed' | 'task_created' | 'comment' | 'mention' | 'due_soon' | 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  link?: string;
  metadata?: Record<string, unknown>;
}

// Filter Types
export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignee?: string[];
  project?: string[];
  team?: string[];
  sprint?: string[];
  tags?: string[];
  dueDate?: {
    from?: Date;
    to?: Date;
  };
  search?: string;
}

// Undo/Redo Types
export interface UndoAction {
  id: string;
  type: 'task_create' | 'task_update' | 'task_delete' | 'task_move' | 'sprint_create' | 'sprint_update';
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  timestamp: Date;
}
