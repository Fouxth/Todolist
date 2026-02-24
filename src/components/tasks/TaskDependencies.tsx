import { useState } from 'react';
import { Link2, Plus, Trash2, AlertTriangle, CheckCircle2, ArrowRight, Search, X } from 'lucide-react';
import type { Task, TaskDependency } from '@/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

interface TaskDependenciesProps {
  taskId: string;
  dependencies: TaskDependency[];
  dependedOnBy: TaskDependency[];
  allTasks: Task[];
  onAddDependency: (dependsOnId: string, type: string) => void;
  onRemoveDependency: (depId: string) => void;
  readOnly?: boolean;
}

export function TaskDependencies({
  taskId,
  dependencies,
  dependedOnBy,
  allTasks,
  onAddDependency,
  onRemoveDependency,
  readOnly = false
}: TaskDependenciesProps) {
  const { t } = useLanguage();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [depType, setDepType] = useState<'blocks' | 'related'>('blocks');

  // Filter tasks that can be added as dependencies
  const availableTasks = allTasks.filter(task => {
    if (task.id === taskId) return false;
    if (dependencies.some(d => d.dependsOnId === task.id)) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const hasBlockers = dependencies.some(d => d.type === 'blocks' && d.dependsOn?.status !== 'done');

  return (
    <div className="space-y-3">
      {/* Blocker warning */}
      {hasBlockers && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-300">
            {t.dependencies?.blockerWarning || 'This task is blocked by incomplete dependencies'}
          </span>
        </div>
      )}

      {/* Blocked by (dependencies) */}
      {dependencies.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            {t.dependencies?.blockedBy || 'Blocked by'}
          </h4>
          <div className="space-y-1.5">
            {dependencies.map(dep => (
              <div key={dep.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 group">
                {dep.dependsOn?.status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                )}
                <span className={cn(
                  "flex-1 text-sm truncate",
                  dep.dependsOn?.status === 'done' ? "text-gray-500 line-through" : "text-gray-300"
                )}>
                  {dep.dependsOn?.title || 'Unknown task'}
                </span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  dep.type === 'blocks' ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                )}>
                  {dep.type === 'blocks' ? (t.dependencies?.blocks || 'blocks') : (t.dependencies?.related || 'related')}
                </span>
                {!readOnly && (
                  <button
                    onClick={() => onRemoveDependency(dep.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocks (dependedOnBy) */}
      {dependedOnBy.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5" />
            {t.dependencies?.blocking || 'Blocking'}
          </h4>
          <div className="space-y-1.5">
            {dependedOnBy.map(dep => (
              <div key={dep.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                <Link2 className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-sm text-gray-400 truncate">
                  {dep.task?.title || 'Unknown task'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add dependency */}
      {!readOnly && !showSearch ? (
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#ff6b35] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.dependencies?.addDependency || 'Add dependency'}
        </button>
      ) : !readOnly && showSearch ? (
        <div className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.dependencies?.searchPlaceholder || 'Search tasks...'}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#ff6b35]"
                autoFocus
              />
            </div>
            <select
              value={depType}
              onChange={e => setDepType(e.target.value as 'blocks' | 'related')}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff6b35]"
            >
              <option value="blocks" className="bg-[#1a1a1a]">{t.dependencies?.typeBlocks || 'Blocks'}</option>
              <option value="related" className="bg-[#1a1a1a]">{t.dependencies?.typeRelated || 'Related'}</option>
            </select>
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(''); }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
            {availableTasks.slice(0, 10).map(task => (
              <button
                key={task.id}
                onClick={() => {
                  onAddDependency(task.id, depType);
                  setSearchQuery('');
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  task.status === 'done' ? "bg-green-400" :
                  task.status === 'in-progress' ? "bg-[#ff6b35]" :
                  task.status === 'review' ? "bg-blue-400" :
                  task.status === 'cancelled' ? "bg-red-400" : "bg-gray-400"
                )} />
                <span className="text-sm text-gray-300 truncate">{task.title}</span>
                <span className="text-xs text-gray-500">{task.status}</span>
              </button>
            ))}
            {availableTasks.length === 0 && (
              <p className="text-xs text-gray-500 py-2 text-center">
                {t.dependencies?.noTasks || 'No matching tasks found'}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
