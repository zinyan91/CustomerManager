import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { HUB_TASKS } from '../../lib/hubTasks';

export const WorkspaceHubView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return HUB_TASKS;
    const q = searchQuery.toLowerCase().trim();
    return HUB_TASKS.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q) ||
        t.keywords.some(k => k.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div className="w-full space-y-4 font-app animate-in fade-in duration-150 py-1 sm:py-2">
      {/* Lưới 3 cột đồng nhất toàn màn hình */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredTasks.map(task => {
          const Icon = task.icon;
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => navigate(task.path)}
              className={`group relative flex items-center justify-between p-3.5 rounded-xl border border-line bg-panel hover:bg-surface text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs border-l-4 ${task.color.borderLeft} ${task.color.hoverBorder} min-h-[58px]`}
            >
              <div className="flex items-center gap-3 min-w-0 pr-1">
                <div
                  className={`p-2.5 rounded-lg shrink-0 transition-transform group-hover:scale-105 ${task.color.iconBg} ${task.color.iconColor}`}
                >
                  <Icon size={18} />
                </div>
                <span
                  className={`font-semibold text-xs sm:text-sm text-ink leading-snug transition-colors ${task.color.hoverText}`}
                >
                  {task.name}
                </span>
              </div>
              <ArrowRight
                size={16}
                className="text-ink-faint group-hover:text-ink group-hover:translate-x-1 transition-all shrink-0 ml-1.5"
              />
            </button>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="p-8 text-center rounded-xl border border-line bg-panel/50 text-xs text-ink-muted">
          Không tìm thấy tác vụ phù hợp với "{searchQuery}"
        </div>
      )}
    </div>
  );
};
