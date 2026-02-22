import { useState } from 'react';
import {
    Filter, ChevronDown, Calendar, Tag, Users, Flag,
    RotateCcw
} from 'lucide-react';
import type { TaskPriority, User, Project } from '@/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

interface TaskFilterPanelProps {
    users: User[];
    projects: Project[];
    allTags: string[];
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
}

export interface FilterState {
    priorities: TaskPriority[];
    assignees: string[];
    projects: string[];
    tags: string[];
    dateRange: { from?: string; to?: string };
}

export const emptyFilters: FilterState = {
    priorities: [],
    assignees: [],
    projects: [],
    tags: [],
    dateRange: {}
};

export function hasActiveFilters(f: FilterState) {
    return f.priorities.length > 0
        || f.assignees.length > 0
        || f.projects.length > 0
        || f.tags.length > 0
        || f.dateRange.from
        || f.dateRange.to;
}

export function TaskFilterPanel({ users, projects, allTags, filters, onFiltersChange }: TaskFilterPanelProps) {
    const { t } = useLanguage();
    const [openSection, setOpenSection] = useState<string | null>('priority');

    const toggle = (section: string) => setOpenSection(prev => prev === section ? null : section);

    const togglePriority = (p: TaskPriority) => {
        const newPriorities = filters.priorities.includes(p)
            ? filters.priorities.filter(x => x !== p)
            : [...filters.priorities, p];
        onFiltersChange({ ...filters, priorities: newPriorities });
    };

    const toggleAssignee = (id: string) => {
        const newAssignees = filters.assignees.includes(id)
            ? filters.assignees.filter(x => x !== id)
            : [...filters.assignees, id];
        onFiltersChange({ ...filters, assignees: newAssignees });
    };

    const toggleProject = (id: string) => {
        const newProjects = filters.projects.includes(id)
            ? filters.projects.filter(x => x !== id)
            : [...filters.projects, id];
        onFiltersChange({ ...filters, projects: newProjects });
    };

    const toggleTag = (tag: string) => {
        const newTags = filters.tags.includes(tag)
            ? filters.tags.filter(x => x !== tag)
            : [...filters.tags, tag];
        onFiltersChange({ ...filters, tags: newTags });
    };

    const priorityItems: { value: TaskPriority; label: string; color: string }[] = [
        { value: 'urgent', label: t.filter.urgent, color: 'border-red-500/30 bg-red-500/10 text-red-400' },
        { value: 'high', label: t.filter.high, color: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
        { value: 'medium', label: t.filter.medium, color: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
        { value: 'low', label: t.filter.low, color: 'border-green-500/30 bg-green-500/10 text-green-400' },
    ];

    const activeCount = (filters.priorities.length + filters.assignees.length + filters.projects.length + filters.tags.length)
        + (filters.dateRange.from ? 1 : 0) + (filters.dateRange.to ? 1 : 0);

    const SectionHeader = ({ id, icon: Icon, label, count }: { id: string; icon: any; label: string; count: number }) => (
        <button
            onClick={() => toggle(id)}
            className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {count > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-[var(--orange)]/20 text-[var(--orange)]">
                        {count}
                    </span>
                )}
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", openSection === id && "rotate-180")} />
        </button>
    );

    return (
        <div className="w-72 bg-[#161616] border border-white/5 rounded-xl p-4 shadow-2xl space-y-1">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2 text-white font-medium text-sm">
                    <Filter className="w-4 h-4 text-[var(--orange)]" />
                    {t.filter.title}
                    {activeCount > 0 && (
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-[var(--orange)] text-white">
                            {activeCount}
                        </span>
                    )}
                </div>
                {activeCount > 0 && (
                    <button
                        onClick={() => onFiltersChange(emptyFilters)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-[var(--orange)] transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" />
                        {t.filter.clear}
                    </button>
                )}
            </div>

            {/* Priority */}
            <div>
                <SectionHeader id="priority" icon={Flag} label={t.filter.priority} count={filters.priorities.length} />
                {openSection === 'priority' && (
                    <div className="flex flex-wrap gap-2 pb-3 animate-slide-in">
                        {priorityItems.map(p => (
                            <button
                                key={p.value}
                                onClick={() => togglePriority(p.value)}
                                className={cn(
                                    "px-3 py-1.5 text-xs rounded-lg border transition-all",
                                    filters.priorities.includes(p.value)
                                        ? p.color
                                        : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Assignees */}
            <div>
                <SectionHeader id="assignees" icon={Users} label={t.filter.assignees} count={filters.assignees.length} />
                {openSection === 'assignees' && (
                    <div className="space-y-1 pb-3 max-h-[200px] overflow-y-auto custom-scrollbar animate-slide-in">
                        {users.map(user => (
                            <button
                                key={user.id}
                                onClick={() => toggleAssignee(user.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all",
                                    filters.assignees.includes(user.id)
                                        ? "bg-[var(--orange)]/10 text-[var(--orange)]"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                                <span className="truncate">{user.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Projects */}
            {projects.length > 0 && (
                <div>
                    <SectionHeader id="projects" icon={Filter} label={t.filter.projects} count={filters.projects.length} />
                    {openSection === 'projects' && (
                        <div className="space-y-1 pb-3 animate-slide-in">
                            {projects.map(proj => (
                                <button
                                    key={proj.id}
                                    onClick={() => toggleProject(proj.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all",
                                        filters.projects.includes(proj.id)
                                            ? "bg-[var(--orange)]/10 text-[var(--orange)]"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: proj.color }} />
                                    <span className="truncate">{proj.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tags */}
            {allTags.length > 0 && (
                <div>
                    <SectionHeader id="tags" icon={Tag} label={t.filter.tags} count={filters.tags.length} />
                    {openSection === 'tags' && (
                        <div className="flex flex-wrap gap-1.5 pb-3 animate-slide-in">
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={cn(
                                        "px-2.5 py-1 text-xs rounded-lg transition-all",
                                        filters.tags.includes(tag)
                                            ? "bg-[var(--orange)]/20 text-[var(--orange)] border border-[var(--orange)]/30"
                                            : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
                                    )}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Date Range */}
            <div>
                <SectionHeader
                    id="date"
                    icon={Calendar}
                    label={t.filter.dueDate}
                    count={(filters.dateRange.from ? 1 : 0) + (filters.dateRange.to ? 1 : 0)}
                />
                {openSection === 'date' && (
                    <div className="grid grid-cols-2 gap-2 pb-3 animate-slide-in">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">{t.filter.from}</label>
                            <input
                                type="date"
                                value={filters.dateRange.from || ''}
                                onChange={e => onFiltersChange({ ...filters, dateRange: { ...filters.dateRange, from: e.target.value || undefined } })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--orange)]"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">{t.filter.to}</label>
                            <input
                                type="date"
                                value={filters.dateRange.to || ''}
                                onChange={e => onFiltersChange({ ...filters, dateRange: { ...filters.dateRange, to: e.target.value || undefined } })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--orange)]"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
