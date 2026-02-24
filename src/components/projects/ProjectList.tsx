import { useState } from 'react';
import {
  Calendar,
  Users,
  CheckSquare,
  ArrowRight,
  Plus,
  Trash2,
  MoreHorizontal,
  XCircle
} from 'lucide-react';
import type { Project, Team, Task } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useLanguage } from '@/i18n/LanguageContext';

interface ProjectListProps {
  projects: Project[];
  teams: Team[];
  tasks: Task[];
  onProjectClick: (project: Project) => void;
  onCreateProject: () => void;
  onDeleteProject?: (id: string) => void;
}

export function ProjectList({ projects, teams, onProjectClick, onCreateProject, onDeleteProject }: ProjectListProps) {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const { t } = useLanguage();

  const statusConfig: Record<string, { color: string; label: string }> = {
    active: { color: 'text-green-400 bg-green-400/10', label: t.projects.active },
    completed: { color: 'text-blue-400 bg-blue-400/10', label: t.projects.completed },
    'on-hold': { color: 'text-yellow-400 bg-yellow-400/10', label: t.projects.onHold },
    cancelled: { color: 'text-red-400 bg-red-400/10', label: t.projects.cancelled }
  };

  const getProjectTeams = (projectId: string) => {
    return teams.filter(t => t.projectId === projectId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t.projects.title}</h2>
          <p className="text-gray-400 mt-1">{t.projects.subtitle}</p>
        </div>
        <Button
          onClick={onCreateProject}
          className="bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          {t.projects.newProject}
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const projectTeams = getProjectTeams(project.id);
          const isHovered = hoveredProject === project.id;

          return (
            <div
              key={project.id}
              onClick={() => onProjectClick(project)}
              onMouseEnter={() => setHoveredProject(project.id)}
              onMouseLeave={() => setHoveredProject(null)}
              className={cn(
                "group relative p-6 rounded-xl bg-[#1a1a1a] border border-white/5 cursor-pointer",
                "transition-all duration-300 overflow-hidden"
              )}
              style={{ transitionTimingFunction: 'var(--ease-expo-out)' }}
            >
              {/* Background gradient on hover */}
              <div
                className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                )}
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${project.color}15, transparent 70%)`
                }}
              />

              <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${project.color}20` }}
                  >
                    <span
                      className="text-xl font-bold"
                      style={{ color: project.color }}
                    >
                      {project.name.charAt(0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      statusConfig[project.status].color
                    )}>
                      {statusConfig[project.status].label}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => { e.stopPropagation(); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg"
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10">
                        {onDeleteProject && (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setDeleteProjectId(project.id); }}
                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t.common?.deleteProject || 'Delete Project'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[var(--orange)] transition-colors">
                  {project.name}
                </h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {project.description}
                </p>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">{t.projects.progress}</span>
                    <span className="text-white font-medium">{project.progress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${project.progress}%`,
                        backgroundColor: project.color
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <CheckSquare className="w-4 h-4" />
                    <span>{project.taskCount.completed}/{project.taskCount.total - (project.taskCount.cancelled ?? 0)}</span>
                  </div>
                  {(project.taskCount.cancelled ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 text-red-400">
                      <XCircle className="w-4 h-4" />
                      <span>{project.taskCount.cancelled} ยกเลิก</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{projectTeams.length} {t.projects.teams}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{format(project.startDate, 'MMM d')}</span>
                  </div>
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex -space-x-2">
                    {projectTeams.slice(0, 3).map(team => (
                      <div
                        key={team.id}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#1a1a1a]"
                        style={{ backgroundColor: `${team.color}30`, color: team.color }}
                        title={team.name}
                      >
                        {team.name.charAt(0)}
                      </div>
                    ))}
                    {projectTeams.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400 border-2 border-[#1a1a1a]">
                        +{projectTeams.length - 3}
                      </div>
                    )}
                  </div>

                  <div className={cn(
                    "flex items-center gap-1 text-sm text-[var(--orange)] opacity-0 group-hover:opacity-100 transition-all duration-300",
                    isHovered && "translate-x-0"
                  )}>
                    <span>{t.projects.view}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Project Confirmation */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={(open) => { if (!open) setDeleteProjectId(null); }}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t.common?.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {t.common?.deleteProjectConfirm || 'Are you sure you want to delete this project?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10">
              {t.common?.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteProjectId && onDeleteProject) {
                  onDeleteProject(deleteProjectId);
                  setDeleteProjectId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t.common?.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
