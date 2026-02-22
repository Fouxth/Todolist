import { useEffect, useState } from 'react';
import { Search, Plus, Filter, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/i18n/LanguageContext';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { TaskFilterPanel, hasActiveFilters } from '@/components/tasks/TaskFilterPanel';
import type { FilterState } from '@/components/tasks/TaskFilterPanel';
import type { Notification } from '@/hooks/useNotifications';
import type { User, Project } from '@/types';

interface DashboardHeaderProps {
  currentUser: User;
  onCreateTask: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDeleteNotification: (id: string) => void;
  users: User[];
  projects: Project[];
  allTags: string[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function DashboardHeader({
  currentUser,
  onCreateTask,
  searchQuery,
  onSearchChange,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllRead,
  onDeleteNotification,
  users,
  projects,
  allTags,
  filters,
  onFiltersChange
}: DashboardHeaderProps) {
  const { t, lang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const filterActive = hasActiveFilters(filters);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t.header.goodMorning);
    else if (hour < 18) setGreeting(t.header.goodAfternoon);
    else setGreeting(t.header.goodEvening);

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [t]);

  return (
    <header className="mb-8">
      {/* Top Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            <span className="text-gradient">{greeting}, {currentUser.name.split(' ')[0]}!</span>
          </h1>
          <p className="text-gray-400 text-sm">
            {t.header.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder={t.header.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full sm:w-64 pl-10 bg-white/5 border-white/10 focus:border-[var(--orange)] focus:ring-[var(--orange)]/20"
            />
          </div>

          {/* Filter Toggle */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(prev => !prev)}
              className={`border-white/10 hover:bg-white/5 relative ${filterActive ? 'border-[var(--orange)]/40 text-[var(--orange)]' : ''
                }`}
            >
              <Filter className="w-4 h-4" />
              {filterActive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--orange)]" />
              )}
            </Button>
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <TaskFilterPanel
                  users={users}
                  projects={projects}
                  allTags={allTags}
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                />
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="border-white/10 hover:bg-white/5 text-gray-400 hover:text-yellow-400 transition-colors"
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Notifications */}
          <NotificationPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={onMarkAsRead}
            onMarkAllRead={onMarkAllRead}
            onDelete={onDeleteNotification}
          />

          {/* Create Task Button */}
          <Button
            onClick={onCreateTask}
            className="bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            {t.header.newTask}
          </Button>
        </div>
      </div>

      {/* Time Display */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>{currentTime.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        <span>•</span>
        <span>{currentTime.toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </header>
  );
}
