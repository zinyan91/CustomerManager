import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import { ArrowLeft, LayoutGrid, Search, X } from 'lucide-react';
import { HUB_TASKS } from '../../lib/hubTasks';
import { landingPath } from '../../lib/modules';
import { useModules } from '../../context/ModulesContext';
import { UserScopeSelector } from '../common/UserScopeSelector';

export const DedicatedWorkspaceHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { allowed } = useModules();

  const isCatalog = location.pathname === '/hub';
  const searchQuery = searchParams.get('q') || '';

  const currentTask = HUB_TASKS.find(t => t.path === location.pathname);

  const handleSearchChange = (value: string) => {
    if (value) {
      setSearchParams({ q: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleClearSearch = () => {
    setSearchParams({}, { replace: true });
  };

  return (
    <header className="w-full bg-panel/95 backdrop-blur-md border-b border-line/80 px-3 sm:px-6 2xl:px-8 py-2 shrink-0 z-30 sticky top-0">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Nhánh trái: Nút điều hướng & Tiêu đề / Breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate(landingPath(allowed))}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-line/70 bg-panel hover:bg-surface text-ink text-xs font-medium transition-all cursor-pointer shadow-2xs shrink-0"
            title="Quay lại giao diện CRM chính"
          >
            <ArrowLeft size={13} className="text-ink-muted" />
            <span>CRM</span>
          </button>

          {!isCatalog && (
            <button
              type="button"
              onClick={() => navigate('/hub')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line bg-panel hover:bg-surface text-ink text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0"
              title="Quay lại danh mục các tác vụ"
            >
              <LayoutGrid size={14} className="text-ink-muted" />
              <span>Danh mục</span>
            </button>
          )}

          <div className="h-4 w-px bg-line/80 shrink-0" />

          {isCatalog ? (
            <div className="flex items-center gap-2 min-w-0">
              <LayoutGrid size={16} className="text-ink-muted shrink-0" />
              <h1 className="text-sm sm:text-base font-bold text-ink truncate">
                Danh Mục Tác Vụ Độc Lập
              </h1>
            </div>
          ) : location.pathname === '/dispatches' || location.pathname === '/hub/dispatches' ? (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-ink truncate">
                Sổ Quản Lý Văn Thư & Công Văn
              </h1>
            </div>
          ) : location.pathname === '/storage' || location.pathname === '/hub/storage' ? (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-ink truncate">
                Kho Lưu Trữ Cá Nhân
              </h1>
            </div>
          ) : currentTask ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded-md shrink-0 ${currentTask.color.iconBg} ${currentTask.color.iconColor}`}>
                <currentTask.icon size={15} />
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-ink truncate">
                {currentTask.name}
              </h1>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-ink truncate">
                Không gian tác vụ
              </h1>
            </div>
          )}
        </div>

        {/* Nhánh phải: Bộ chọn tài khoản cho Admin & Ô tìm kiếm nhanh */}
        <div className="flex items-center gap-2.5 shrink-0">
          <UserScopeSelector />

          {isCatalog && (
            <div className="w-48 sm:w-64 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="Tìm tác vụ..."
                  className="w-full rounded-lg pl-8 pr-7 py-1.5 bg-panel border border-line focus:border-ink-muted text-xs text-ink placeholder:text-ink-faint transition-all outline-hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
