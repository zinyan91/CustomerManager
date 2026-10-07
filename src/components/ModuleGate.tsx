import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useModules } from '../context/ModulesContext';
import { canOpenPath, landingPath } from '../lib/modules';

/** Chặn tuyến thuộc module tài khoản không có: chuyển về màn đầu tiên được phép. Không thay cho RLS, chỉ để người dùng không rơi vào màn trống. */
export function ModuleGate({ children }: { children: ReactNode }) {
  const { allowed, ready, error, reload } = useModules();
  const { pathname } = useLocation();

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center" role="alert">
        <p className="text-sm text-rose-800 dark:text-rose-300">{error}</p>
        <button
          type="button"
          onClick={reload}
          className="px-3 py-1.5 rounded-lg border border-line bg-panel hover:bg-surface text-xs font-semibold text-ink cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Đang nạp quyền truy cập">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!canOpenPath(allowed, pathname)) return <Navigate to={landingPath(allowed)} replace />;
  return <>{children}</>;
}
