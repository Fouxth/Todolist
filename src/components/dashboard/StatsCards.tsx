import { useEffect, useRef, useState, useMemo } from 'react';
import { CheckSquare, Clock, Users, AlertCircle } from 'lucide-react';
import type { DashboardStats, Task } from '@/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

interface StatsCardsProps {
  stats: DashboardStats;
  tasks?: Task[];
}

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  delay: number;
  sparkData?: number[];
}

/* Tiny inline sparkline — pure SVG, no library */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="opacity-50 group-hover:opacity-100 transition-opacity">
      <defs>
        <linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
      <polygon
        fill={`url(#g-${color.replace('#', '')})`}
        points={`0,${h} ${pts} ${w},${h}`}
      />
    </svg>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color, delay, sparkData }: StatCardProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative p-6 rounded-xl bg-[#1a1a1a] border border-white/5 card-hover perspective-1000",
        "transform transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{
        transitionTimingFunction: 'var(--ease-spring)',
        transitionDelay: `${delay}ms`
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color}20, transparent 70%)`,
        }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white mb-1">{count}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon className="w-6 h-6" />
          </div>
          {sparkData && <Sparkline data={sparkData} color={color} />}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl opacity-50"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

export function StatsCards({ stats, tasks = [] }: StatsCardsProps) {
  const { t } = useLanguage();

  // Calculate stats from actual tasks instead of API stats
  const calculatedStats = useMemo(() => {
    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      reviewTasks: tasks.filter(t => t.status === 'review').length,
      cancelledTasks: tasks.filter(t => t.status === 'cancelled').length,
      teamMembers: stats.teamMembers,
      projects: stats.projects,
      overdueTasks: tasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < new Date() && 
        t.status !== 'done' && t.status !== 'cancelled'
      ).length
    };
  }, [tasks, stats.teamMembers, stats.projects]);

  // Build 7-day sparkline data from tasks
  const sparklines = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - 6 + i);
      return d;
    });

    const created = days.map(d =>
      tasks.filter(t => {
        const c = new Date(t.createdAt);
        return c.toDateString() === d.toDateString();
      }).length
    );

    const completed = days.map(d =>
      tasks.filter(t => {
        if (t.status !== 'done' || !t.completedAt) return false;
        return new Date(t.completedAt).toDateString() === d.toDateString();
      }).length
    );

    const inProg = days.map(d =>
      tasks.filter(t => {
        if (t.status !== 'in-progress') return false;
        const c = new Date(t.updatedAt);
        return c.toDateString() === d.toDateString();
      }).length
    );

    return { created, completed, inProg };
  }, [tasks]);

  const cards = [
    {
      title: t.stats.totalTasks,
      value: calculatedStats.totalTasks,
      subtitle: `${calculatedStats.completedTasks} ${t.stats.completed}`,
      icon: CheckSquare,
      color: '#ff6b35',
      sparkData: sparklines.created
    },
    {
      title: t.stats.inProgress,
      value: calculatedStats.inProgressTasks,
      subtitle: t.stats.activeTasks,
      icon: Clock,
      color: '#2196f3',
      sparkData: sparklines.inProg
    },
    {
      title: t.stats.inReview,
      value: calculatedStats.reviewTasks,
      subtitle: t.stats.pendingApproval,
      icon: AlertCircle,
      color: '#ffc107'
    },
    {
      title: t.stats.teamMembers,
      value: calculatedStats.teamMembers,
      subtitle: `${calculatedStats.projects} ${t.stats.activeProjects}`,
      icon: Users,
      color: '#4caf50',
      sparkData: sparklines.completed
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => (
        <StatCard
          key={card.title}
          {...card}
          delay={index * 100}
        />
      ))}
    </div>
  );
}
