import { useState, useEffect } from 'react';
import { Sparkles, Loader2, ThumbsUp, Tag, Users, Clock, Target } from 'lucide-react';
import type { TaskPriority } from '@/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

interface AISuggestionsProps {
  taskTitle: string;
  taskDescription: string;
  projectId: string;
  onApplySuggestion: (suggestion: Partial<{ priority: TaskPriority; tags: string[]; assignees: string[]; estimatedTime: number }>) => void;
}

interface Suggestion {
  priority: TaskPriority;
  tags: string[];
  assignees: string[];
  estimatedMinutes: number;
  confidence: number;
}

export function AISuggestions({
  taskTitle: title,
  taskDescription: description,
  projectId,
  onApplySuggestion
}: AISuggestionsProps) {
  const { t } = useLanguage();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const fetchSuggestions = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setApplied(new Set());
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/tasks/ai/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ title, description, projectId })
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestion(data);
      }
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-suggest when title changes (debounced)
  useEffect(() => {
    if (!title || title.length < 3) {
      setSuggestion(null);
      return;
    }
    const timer = setTimeout(fetchSuggestions, 800);
    return () => clearTimeout(timer);
  }, [title, description, projectId]);

  const markApplied = (key: string) => {
    setApplied(prev => new Set(prev).add(key));
  };

  const priorityConfig: Record<string, { color: string; label: string }> = {
    urgent: { color: 'text-red-400 bg-red-500/10', label: t.task?.urgent || 'Urgent' },
    high: { color: 'text-orange-400 bg-orange-500/10', label: t.task?.high || 'High' },
    medium: { color: 'text-blue-400 bg-blue-500/10', label: t.task?.medium || 'Medium' },
    low: { color: 'text-green-400 bg-green-500/10', label: t.task?.low || 'Low' }
  };

  if (!suggestion && !loading) return null;

  return (
    <div className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/15 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-purple-300">
          {t.ai?.title || 'AI Suggestions'}
        </span>
        {suggestion && (
          <span className="text-xs text-gray-500">
            {Math.round(suggestion.confidence * 100)}% {t.ai?.confidence || 'confidence'}
          </span>
        )}
        {loading && <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />}
      </div>

      {suggestion && (
        <div className="space-y-2.5">
          {/* Priority suggestion */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-400">{t.modal?.priority || 'Priority'}:</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", priorityConfig[suggestion.priority]?.color)}>
                {priorityConfig[suggestion.priority]?.label}
              </span>
            </div>
            <button
              onClick={() => { onApplySuggestion({ priority: suggestion.priority }); markApplied('priority'); }}
              disabled={applied.has('priority')}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg transition-all",
                applied.has('priority')
                  ? "bg-green-500/10 text-green-400"
                  : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
              )}
            >
              {applied.has('priority') ? <ThumbsUp className="w-3 h-3 inline" /> : (t.ai?.apply || 'Apply')}
            </button>
          </div>

          {/* Tags suggestion */}
          {suggestion.tags.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <Tag className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="text-gray-400">{t.modal?.tags || 'Tags'}:</span>
                {suggestion.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-300">#{tag}</span>
                ))}
              </div>
              <button
                onClick={() => { onApplySuggestion({ tags: suggestion.tags }); markApplied('tags'); }}
                disabled={applied.has('tags')}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-lg transition-all shrink-0 ml-2",
                  applied.has('tags')
                    ? "bg-green-500/10 text-green-400"
                    : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                )}
              >
                {applied.has('tags') ? <ThumbsUp className="w-3 h-3 inline" /> : (t.ai?.apply || 'Apply')}
              </button>
            </div>
          )}

          {/* Assignee suggestion */}
          {suggestion.assignees.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-400">{t.modal?.assignees || 'Assignees'}:</span>
                <span className="text-xs text-gray-300">
                  {suggestion.assignees.length} suggested
                </span>
              </div>
              <button
                onClick={() => { onApplySuggestion({ assignees: suggestion.assignees }); markApplied('assignees'); }}
                disabled={applied.has('assignees')}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-lg transition-all",
                  applied.has('assignees')
                    ? "bg-green-500/10 text-green-400"
                    : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                )}
              >
                {applied.has('assignees') ? <ThumbsUp className="w-3 h-3 inline" /> : (t.ai?.apply || 'Apply')}
              </button>
            </div>
          )}

          {/* Time estimate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-400">{t.modal?.estimatedTime || 'Estimate'}:</span>
              <span className="text-gray-300">{suggestion.estimatedMinutes >= 60 ? `${(suggestion.estimatedMinutes / 60).toFixed(1)}h` : `${suggestion.estimatedMinutes}m`}</span>
            </div>
            <button
              onClick={() => { onApplySuggestion({ estimatedTime: suggestion.estimatedMinutes }); markApplied('estimate'); }}
              disabled={applied.has('estimate')}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg transition-all",
                applied.has('estimate')
                  ? "bg-green-500/10 text-green-400"
                  : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                )}
            >
              {applied.has('estimate') ? <ThumbsUp className="w-3 h-3 inline" /> : (t.ai?.apply || 'Apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
