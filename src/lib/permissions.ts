import type { Task, User, Project } from '@/types';

/**
 * Check if user can edit a task
 * User can edit if:
 * 1. User is assigned to the task
 * 2. User is admin or manager
 */
export function canEditTask(task: Task, user: User): boolean {
  // Admin and manager can edit any task
  if (user.role === 'admin' || user.role === 'manager') {
    return true;
  }

  // Check if user is assigned to the task
  return task.assignees?.includes(user.id) || false;
}

/**
 * Check if user is assignee (responsible) for the task
 * Used to determine if user can edit restricted fields like status, priority, etc.
 */
export function isUserAssignee(task: Task | null | undefined, userId: string | undefined): boolean {
  if (!task || !userId) return false;
  if (!task.assignees) return false;
  if (!Array.isArray(task.assignees)) return false;
  return task.assignees.includes(userId);
}

/**
 * Check if user can edit all task fields
 * Returns true if user is admin, manager, or assignee
 */
export function canEditTaskFields(task: Task | null | undefined, user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Admin and manager can edit all fields
  if (user.role === 'admin' || user.role === 'manager') {
    return true;
  }

  // Check if user is assigned to the task
  return isUserAssignee(task, user.id);
}

/**
 * Check if user can delete a task
 * User can delete if:
 * 1. User is assigned to the task
 * 2. User is admin or manager
 */
export function canDeleteTask(task: Task, user: User): boolean {
  // Admin and manager can delete any task
  if (user.role === 'admin' || user.role === 'manager') {
    return true;
  }

  // Check if user is assigned to the task
  return task.assignees?.includes(user.id) || false;
}

/**
 * Check if user can change task status
 * User can change status if:
 * 1. User is assigned to the task
 * 2. User is admin or manager
 */
export function canChangeTaskStatus(task: Task, user: User): boolean {
  // Admin and manager can change any task status
  if (user.role === 'admin' || user.role === 'manager') {
    return true;
  }

  // Check if user is assigned to the task
  return task.assignees?.includes(user.id) || false;
}

/**
 * Check if user can manage a project
 * User can manage if:
 * 1. User is admin or manager
 * 2. User has tasks assigned in the project
 */
export function canManageProject(project: Project, user: User, tasks: Task[]): boolean {
  // Admin and manager can manage any project
  if (user.role === 'admin' || user.role === 'manager') {
    return true;
  }

  // Check if user has any tasks in the project
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  return projectTasks.some(task => task.assignees?.includes(user.id));
}

/**
 * Check if user can comment on a task
 * Everyone can comment on tasks
 */
export function canCommentOnTask(_task: Task, _user: User): boolean {
  return true; // Everyone can comment
}

/**
 * Check if user is involved in a project
 * User is involved if they have at least one task assigned in the project
 */
export function isUserInvolvedInProject(project: Project, user: User, tasks: Task[]): boolean {
  if (user.role === 'admin' || user.role === 'manager') {
    return true;
  }

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  return projectTasks.some(task => task.assignees?.includes(user.id));
}
