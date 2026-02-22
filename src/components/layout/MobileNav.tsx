import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Calendar,
  Zap,
  Users,
  BarChart3,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

interface MobileNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function MobileNav({ activeView, onViewChange }: MobileNavProps) {
  const { t } = useLanguage();

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.sidebar.dashboard },
    { id: 'tasks', icon: CheckSquare, label: t.sidebar.tasks },
    { id: 'projects', icon: FolderKanban, label: t.sidebar.projects },
    { id: 'calendar', icon: Calendar, label: t.sidebar.calendar },
    { id: 'sprints', icon: Zap, label: t.sidebar.sprints },
    { id: 'team', icon: Users, label: t.sidebar.team },
    { id: 'reports', icon: BarChart3, label: t.sidebar.reports },
    { id: 'settings', icon: Settings, label: t.sidebar.settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-white/10 safe-area-bottom"
      style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)' }}
    >
      <div className="flex items-center overflow-x-auto gap-0.5 px-1 py-1.5 no-scrollbar">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]",
                isActive
                  ? "text-[var(--orange)] bg-[var(--orange)]/10"
                  : "text-gray-400 active:text-white active:bg-white/5"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
              <span className="text-[10px] font-medium leading-tight truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
