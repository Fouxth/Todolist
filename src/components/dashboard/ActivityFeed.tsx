import { useState } from 'react';
import {
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  UserPlus,
  MessageSquare,
  Play,
  Flag
} from 'lucide-react';
import type { Activity, User } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { th as thLocale } from 'date-fns/locale';
import { useLanguage } from '@/i18n/LanguageContext';

interface ActivityFeedProps {
  activities: Activity[];
  users: User[];
}

const actionIcons: Record<string, { icon: React.ElementType; color: string }> = {
  created: { icon: Plus, color: 'text-green-400' },
  updated: { icon: Edit3, color: 'text-blue-400' },
  deleted: { icon: Trash2, color: 'text-red-400' },
  assigned: { icon: UserPlus, color: 'text-purple-400' },
  completed: { icon: CheckCircle2, color: 'text-green-400' },
  commented: { icon: MessageSquare, color: 'text-yellow-400' },
  started: { icon: Play, color: 'text-orange-400' },
  paused: { icon: Flag, color: 'text-gray-400' }
};

export function ActivityFeed({ activities, users }: ActivityFeedProps) {
  const [expanded, setExpanded] = useState(false);
  const { t, lang } = useLanguage();

  const actionLabels: Record<string, string> = {
    created: t.activity.created,
    updated: t.activity.updated,
    deleted: t.activity.deleted,
    assigned: t.activity.assigned,
    completed: t.activity.completed,
    commented: t.activity.commented,
    started: t.activity.started,
    paused: t.activity.paused,
  };

  const displayActivities = expanded ? activities : activities.slice(0, 5);

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">{t.activity.title}</h3>
        <span className="text-sm text-gray-400">{activities.length} {t.activity.activities}</span>
      </div>

      <div className="space-y-4">
        {displayActivities.map((activity, index) => {
          const user = users.find(u => u.id === activity.userId);
          const iconConfig = actionIcons[activity.action];
          const Icon = iconConfig.icon;
          const label = actionLabels[activity.action] || activity.action;

          return (
            <div
              key={activity.id}
              className="flex gap-4 group animate-slide-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  "bg-white/5 group-hover:bg-white/10 transition-colors"
                )}>
                  <Icon className={cn("w-5 h-5", iconConfig.color)} />
                </div>
                {index < displayActivities.length - 1 && (
                  <div className="w-px flex-1 bg-white/10 mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start gap-3">
                  {user && (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-white/5"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium text-white">{user?.name || 'Unknown'}</span>
                      {' '}{label}{' '}
                      <span className="font-medium text-[var(--orange)] hover:underline cursor-pointer">
                        {activity.targetName}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(activity.createdAt, {
                        addSuffix: true,
                        locale: lang === 'th' ? thLocale : undefined
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activities.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 py-2 text-sm text-[var(--orange)] hover:text-[var(--orange)]/80 transition-colors"
        >
          {expanded ? t.activity.showLess : `${t.activity.showMore} ${activities.length - 5} more`}
        </button>
      )}
    </div>
  );
}
