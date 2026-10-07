import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { buildHubSections } from '../../lib/hubSections';

export const WorkspaceHubView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const sections = useMemo(() => buildHubSections(searchQuery), [searchQuery]);

  return (
    <div className="w-full space-y-6 font-app animate-in fade-in duration-150 py-1 sm:py-2">
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`hub-group-${section.id}`} className="space-y-2.5">
          <div className="flex items-center gap-2 px-0.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${section.dotColor}`} aria-hidden="true" />
            <h2 id={`hub-group-${section.id}`} className="text-sm font-bold text-ink">
              {section.title}
            </h2>
            <span className="text-xs text-ink-muted">{section.tasks.length}</span>
          </div>

          <div className={`grid gap-3.5 ${section.gridCols}`}>
            {section.tasks.map((task) => {
              const Icon = task.icon;
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => navigate(task.path)}
                  className={`group relative flex items-center justify-between p-3.5 rounded-xl border border-line bg-panel hover:bg-surface text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs border-l-4 ${task.color.borderLeft} ${task.color.hoverBorder} min-h-[58px]`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-1">
                    <div className={`p-2.5 rounded-lg shrink-0 transition-transform group-hover:scale-105 ${task.color.iconBg} ${task.color.iconColor}`}>
                      <Icon size={18} />
                    </div>
                    <span className={`font-semibold text-xs sm:text-sm text-ink leading-snug transition-colors ${task.color.hoverText}`}>
                      {task.name}
                    </span>
                  </div>
                  <ArrowRight size={16} className="text-ink-faint group-hover:text-ink group-hover:translate-x-1 transition-all shrink-0 ml-1.5" />
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {sections.length === 0 && (
        <div className="p-8 text-center rounded-xl border border-line bg-panel/50 text-xs text-ink-muted">
          Không tìm thấy tác vụ phù hợp với "{searchQuery}"
        </div>
      )}
    </div>
  );
};
