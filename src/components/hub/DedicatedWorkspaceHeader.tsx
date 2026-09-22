import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { HUB_TASKS } from '../../lib/hubTasks';

export const DedicatedWorkspaceHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isCatalog = location.pathname === '/hub';

  return (
    <header className="w-full bg-panel/95 backdrop-blur-md border-b border-line/80 px-3 sm:px-5 py-2 shrink-0 z-30 sticky top-0">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Nút điều hướng chính: Về CRM & Về Danh mục */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line bg-surface hover:bg-panel text-ink text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Quay lại giao diện CRM chính"
          >
            <ArrowLeft size={13} className="text-ink-muted" />
            <span className="hidden sm:inline">Về CRM</span>
          </button>

          {!isCatalog && (
            <button
              type="button"
              onClick={() => navigate('/hub')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line bg-surface hover:bg-panel text-ink text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Quay lại danh mục các tác vụ"
            >
              <LayoutGrid size={13} className="text-ink-muted" />
              <span>Danh mục</span>
            </button>
          )}
        </div>

        {/* Thanh Tabs ngang cuộn mượt mà cho 6 tác vụ */}
        <nav
          aria-label="Tác vụ độc lập"
          className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5"
        >
          {HUB_TASKS.map(task => {
            const Icon = task.icon;
            return (
              <NavLink
                key={task.id}
                to={task.path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-ink text-surface font-bold shadow-xs'
                      : 'bg-transparent hover:bg-surface text-ink-muted hover:text-ink'
                  }`
                }
              >
                <Icon size={13} />
                <span>{task.shortName}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
