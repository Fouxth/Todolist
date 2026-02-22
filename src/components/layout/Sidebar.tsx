import { useState } from 'react';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Code2,
  LogOut,
  Languages,
  Sun,
  Moon,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import type { User } from '@/types';

interface SidebarProps {
  currentUser: User;
  activeView: string;
  onViewChange: (view: string) => void;
  onLogout?: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ currentUser, activeView, onViewChange, onLogout, isMobile, isOpen, onToggle }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { t, lang, toggleLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const allNavItems = [
    { id: 'dashboard', label: t.sidebar.dashboard, icon: LayoutDashboard },
    { id: 'tasks', label: t.sidebar.tasks, icon: CheckSquare },
    { id: 'projects', label: t.sidebar.projects, icon: FolderKanban },
    { id: 'sprints', label: t.sidebar.sprints || 'Sprints', icon: Zap },
    { id: 'team', label: t.sidebar.team, icon: Users },
    { id: 'calendar', label: t.sidebar.calendar, icon: Calendar },
    { id: 'reports', label: t.sidebar.reports, icon: BarChart3, roles: ['admin', 'manager'] as string[] },
    { id: 'settings', label: t.sidebar.settings, icon: Settings },
  ];

  const navItems = allNavItems.filter(item =>
    !item.roles || item.roles.includes(currentUser.role)
  );

  // On mobile, hide sidebar when not open
  if (isMobile && !isOpen) return null;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen glass z-50 flex flex-col transition-all duration-400",
        isMobile ? "w-[250px] shadow-2xl" : (collapsed ? "w-[70px]" : "w-[250px]")
      )}
      style={{ transitionTimingFunction: 'var(--ease-spring)' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--orange)] to-[var(--neon-cyan)] flex items-center justify-center flex-shrink-0 animate-glow-pulse">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg whitespace-nowrap animate-slide-in">
              {t.app.name}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-250 group relative overflow-hidden",
                isActive
                  ? "bg-[var(--orange)]/20 text-[var(--orange)]"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
              style={{
                transitionTimingFunction: 'var(--ease-expo-out)',
                animationDelay: `${index * 60}ms`
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--orange)] rounded-r-full glow-orange" />
              )}

              <Icon className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform duration-250",
                !collapsed && "group-hover:scale-110 group-hover:rotate-6"
              )} />

              {!collapsed && (
                <span className="text-sm font-medium whitespace-nowrap animate-slide-in">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Quick Actions */}
      <div className="px-2 pb-2 flex items-center gap-1">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 p-2 rounded-lg transition-all duration-250 group",
            isDark
              ? "text-gray-400 hover:text-yellow-300 hover:bg-white/5"
              : "text-gray-400 hover:text-orange-500 hover:bg-white/5"
          )}
          title={isDark ? 'Light Mode' : 'Dark Mode'}
        >
          <div className="w-4 h-4 flex-shrink-0 transition-transform duration-300 group-hover:rotate-12">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>
          {!collapsed && (
            <span className="text-xs font-medium whitespace-nowrap">
              {isDark ? 'Light' : 'Dark'}
            </span>
          )}
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg transition-all duration-250 group text-gray-400 hover:text-white hover:bg-white/5"
          title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นไทย'}
        >
          <Languages className="w-4 h-4 flex-shrink-0 transition-transform duration-250 group-hover:scale-110" />
          {!collapsed && (
            <span className="text-xs font-medium whitespace-nowrap">
              {lang === 'th' ? 'EN' : 'TH'}
            </span>
          )}
        </button>
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-white/5">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer",
          collapsed && "justify-center"
        )}>
          <div className="relative flex-shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10"
            />
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a1a1a]",
              currentUser.status === 'online' && "status-online",
              currentUser.status === 'busy' && "status-busy",
              currentUser.status === 'away' && "status-away",
              currentUser.status === 'offline' && "status-offline"
            )} />
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0 animate-slide-in">
              <p className="text-sm font-medium truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-400 truncate">{currentUser.role}</p>
            </div>
          )}

          {!collapsed && (
            <LogOut
              className="w-4 h-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
              onClick={onLogout}
            />
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[var(--orange)] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
