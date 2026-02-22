import { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock, Timer } from 'lucide-react';
import type { TimeTracking } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '@/i18n/LanguageContext';

interface TimeTrackerProps {
  taskId: string;
  timeTracking?: TimeTracking;
  onStart: () => void;
  onStop: (entryId: string, description?: string) => void;
  currentUserId: string;
}

export function TimeTracker({ timeTracking, onStart, onStop, currentUserId }: TimeTrackerProps) {
  const { t } = useLanguage();
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Find active entry (no endTime)
  const activeEntry = timeTracking?.entries.find(e => !e.endTime && e.userId === currentUserId);

  useEffect(() => {
    if (activeEntry) {
      const start = new Date(activeEntry.startTime).getTime();
      const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      update();
      intervalRef.current = setInterval(update, 1000);
    } else {
      setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeEntry]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const totalSpent = timeTracking?.spent || 0;
  const estimated = timeTracking?.estimated || 0;
  const progress = estimated > 0 ? Math.min((totalSpent / estimated) * 100, 100) : 0;

  const handleStop = () => {
    if (activeEntry) {
      onStop(activeEntry.id, description);
      setDescription('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Timer Display */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4 text-[var(--orange)]" />
            <span className="text-sm font-medium text-gray-300">
              {t.timeTracker?.title || 'Time Tracker'}
            </span>
          </div>
          <div className={cn(
            "text-3xl font-mono font-bold tabular-nums",
            activeEntry ? "text-[var(--orange)]" : "text-white"
          )}>
            {activeEntry ? formatTime(elapsed) : formatTime(0)}
          </div>
          {activeEntry && (
            <div className="w-full h-1 mt-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--orange)] rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {activeEntry ? (
            <>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t.timeTracker?.whatWorking || 'What are you working on?'}
                className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--orange)] w-48"
              />
              <button
                onClick={handleStop}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <Square className="w-4 h-4 fill-current" />
                <span className="text-sm font-medium">{t.timeTracker?.stop || 'Stop'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--orange)]/20 text-[var(--orange)] hover:bg-[var(--orange)]/30 transition-colors"
            >
              <Play className="w-5 h-5 fill-current" />
              <span className="text-sm font-medium">{t.timeTracker?.start || 'Start Timer'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {estimated > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>{t.timeTracker?.spent || 'Spent'}: {formatMinutes(totalSpent)}</span>
            <span>{t.timeTracker?.estimated || 'Estimated'}: {formatMinutes(estimated)}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress > 90 ? "bg-red-500" : progress > 70 ? "bg-yellow-500" : "bg-gradient-to-r from-[var(--orange)] to-[var(--neon-cyan)]"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-500 mt-1">{Math.round(progress)}%</div>
        </div>
      )}

      {/* Time Entries History */}
      {timeTracking && timeTracking.entries.filter(e => e.endTime).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            {t.timeTracker?.history || 'History'}
          </h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
            {timeTracking.entries
              .filter(e => e.endTime)
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
              .map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/3 text-sm group">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--orange)]" />
                  <span className="text-gray-400 text-xs whitespace-nowrap">
                    {format(new Date(entry.startTime), 'MMM d, HH:mm')}
                  </span>
                  <span className="text-white font-medium font-mono">{formatMinutes(entry.duration)}</span>
                  {entry.description && (
                    <span className="text-gray-500 text-xs truncate flex-1">— {entry.description}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
