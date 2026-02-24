import { useMemo } from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import type { Task, User, Project } from '@/types';
import { TrendingUp, CheckCircle2, Clock, Users, AlertCircle, Download, FileText } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface ReportsPageProps {
    tasks: Task[];
    users: User[];
    projects: Project[];
}

const COLORS = ['#ff6b35', '#2196f3', '#4caf50', '#9c27b0', '#e91e63'];

export function ReportsPage({ tasks, users, projects }: ReportsPageProps) {
    const { t } = useLanguage();
    const now = new Date();

    // Task completion by month (last 6 months)
    const tasksByMonth = Array.from({ length: 6 }, (_, i) => {
        const m = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const monthTasks = tasks.filter(t => {
            const created = new Date(t.createdAt || '');
            return created.getFullYear() === m.getFullYear() && created.getMonth() === m.getMonth();
        });
        return {
            month: t.reports.months[m.getMonth()],
            [t.reports.created]: monthTasks.length,
            [t.reports.done]: monthTasks.filter(t => t.status === 'done').length,
        };
    });

    // Priority distribution
    const priorityData = [
        { name: t.reports.urgent, value: tasks.filter(t => t.priority === 'urgent').length, color: '#ef4444' },
        { name: t.reports.high, value: tasks.filter(t => t.priority === 'high').length, color: '#f97316' },
        { name: t.reports.medium, value: tasks.filter(t => t.priority === 'medium').length, color: '#eab308' },
        { name: t.reports.low, value: tasks.filter(t => t.priority === 'low').length, color: '#22c55e' },
    ].filter(d => d.value > 0);

    // Team performance
    const teamPerf = users.map(u => {
        const assigned = tasks.filter(t => {
            if (!t.assignees) return false;
            return (t.assignees as Array<string | { id: string }>).some(a =>
                typeof a === 'string' ? a === u.id : a.id === u.id
            );
        }).length;
        const done = tasks.filter(t => {
            if (t.status !== 'done') return false;
            if (!t.assignees) return false;
            return (t.assignees as Array<string | { id: string }>).some(a =>
                typeof a === 'string' ? a === u.id : a.id === u.id
            );
        }).length;
        return { ...u, assigned, done, completion: assigned > 0 ? Math.round((done / assigned) * 100) : 0 };
    }).sort((a, b) => b.assigned - a.assigned);

    // Burndown chart data (last 14 days)
    const burndownData = useMemo(() => {
        return Array.from({ length: 14 }, (_, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() - 13 + i);
            const dayStr = d.toDateString();
            const remaining = tasks.filter(t => {
                const created = new Date(t.createdAt);
                if (created > d) return false;      // not yet created
                if (t.status === 'done' && t.completedAt && new Date(t.completedAt) <= d) return false; // already done
                return true;
            }).length;
            const completedToday = tasks.filter(t => {
                if (t.status !== 'done' || !t.completedAt) return false;
                return new Date(t.completedAt).toDateString() === dayStr;
            }).length;
            return {
                day: `${d.getDate()}/${d.getMonth() + 1}`,
                [t.reports.remaining]: remaining,
                [t.reports.completedToday]: completedToday
            };
        });
    }, [tasks, t]);

    // Summary stats
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done' && t.status !== 'cancelled').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const cancelled = tasks.filter(t => t.status === 'cancelled').length;

    const tooltipStyle = { backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' };

    // --- Export functions ---
    const exportCSV = () => {
        const headers = ['ID', 'Title', 'Status', 'Priority', 'Due Date', 'Created', 'Assignees'];
        const rows = tasks.map(t => [
            t.id,
            `"${t.title.replace(/"/g, '""')}"`,
            t.status,
            t.priority,
            t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
            new Date(t.createdAt).toLocaleDateString(),
            (t.assignees || []).join('; ')
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasks-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportPDF = () => {
        const content = [
            `${t.reports.reportTitle} — ${new Date().toLocaleDateString()}`,
            ``,
            `${t.reports.summary}:`,
            `  ${t.reports.totalTasks}: ${total}`,
            `  ${t.reports.completed}: ${done}`,
            `  ${t.reports.inProgress}: ${inProgress}`,
            `  ${t.reports.cancelled}: ${cancelled}`,
            `  ${t.reports.overdue}: ${overdue}`,
            ``,
            `${t.reports.taskDetails}:`,
            ...tasks.map(t => `  • [${t.status}] ${t.title} (${t.priority})`)
        ].join('\n');

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`
                <html><head><title>Report</title>
                <style>body{font-family:sans-serif;padding:40px;white-space:pre-wrap;line-height:1.6}</style>
                </head><body>${content}</body></html>
            `);
            win.document.close();
            win.print();
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">📊 {t.reports.title}</h2>
                    <p className="text-gray-400 text-sm">{t.reports.subtitle}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-sm font-medium transition-all"
                    >
                        <Download className="w-4 h-4" />
                        CSV
                    </button>
                    <button
                        onClick={exportPDF}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-sm font-medium transition-all"
                    >
                        <FileText className="w-4 h-4" />
                        PDF
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: t.reports.totalTasks, value: total, icon: <Clock className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: t.reports.completed, value: done, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-400', bg: 'bg-green-500/10' },
                    { label: t.reports.inProgress, value: inProgress, icon: <TrendingUp className="w-5 h-5" />, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                    { label: t.reports.cancelled, value: cancelled, icon: <AlertCircle className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-500/10' },
                    { label: t.reports.overdue, value: overdue, icon: <AlertCircle className="w-5 h-5" />, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                ].map(s => (
                    <div key={s.label} className="bg-[#111] border border-white/5 rounded-xl p-5 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>{s.icon}</div>
                        <div>
                            <div className="text-2xl font-bold text-white">{s.value}</div>
                            <div className="text-xs text-gray-400">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly task chart */}
                <div className="bg-[#111] border border-white/5 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-white mb-4">{t.reports.monthlyChart}</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={tasksByMonth} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                            <Bar dataKey={t.reports.created} fill="#2196f3" radius={[4, 4, 0, 0]} />
                            <Bar dataKey={t.reports.done} fill="#4caf50" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Priority pie */}
                <div className="bg-[#111] border border-white/5 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-white mb-4">{t.reports.priorityDistribution}</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={priorityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                                dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}>
                                {priorityData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} ${t.reports.taskCount}`]} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Burndown Chart */}
            <div className="bg-[#111] border border-white/5 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4">📉 {t.reports.burndown}</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={burndownData}>
                        <defs>
                            <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ff6b35" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="doneGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                        <Area type="monotone" dataKey={t.reports.remaining} stroke="#ff6b35" fill="url(#burnGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey={t.reports.completedToday} stroke="#4caf50" fill="url(#doneGrad)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Project progress */}
            <div className="bg-[#111] border border-white/5 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4">{t.reports.projectProgress}</h3>
                <div className="space-y-3">
                    {projects.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-4">
                            <div className="w-36 text-xs text-gray-400 truncate shrink-0">{p.name}</div>
                            <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${p.progress ?? 0}%`, backgroundColor: COLORS[i % COLORS.length] }}
                                />
                            </div>
                            <div className="text-xs text-gray-400 w-10 text-right">{p.progress ?? 0}%</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Team performance table */}
            <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4" /> {t.reports.teamPerformance}</h3>
                </div>
                <div className="divide-y divide-white/5">
                    {teamPerf.map(u => (
                        <div key={u.id} className="flex items-center gap-4 px-6 py-3 hover:bg-white/3 transition-colors">
                            <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover bg-white/10" onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=ff6b35&color=fff`; }} />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{u.name}</div>
                                <div className="text-xs text-gray-500">{u.role}</div>
                            </div>
                            <div className="text-center min-w-[60px]">
                                <div className="text-sm font-semibold text-white">{u.assigned}</div>
                                <div className="text-xs text-gray-500">{t.reports.tasks}</div>
                            </div>
                            <div className="text-center min-w-[60px]">
                                <div className="text-sm font-semibold text-green-400">{u.done}</div>
                                <div className="text-xs text-gray-500">{t.reports.tasksDone}</div>
                            </div>
                            <div className="w-28">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                                        <div className="h-full rounded-full bg-[#ff6b35]" style={{ width: `${u.completion}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-400 w-8 text-right">{u.completion}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
