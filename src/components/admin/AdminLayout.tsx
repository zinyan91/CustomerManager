import { NavLink, Outlet } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TAB = 'px-3 py-2 text-sm -mb-px border-b-2';

/** Khung khu quản trị: hai tab và vùng nội dung. Chỉ Master Admin và User Admin; luật thật nằm ở RLS và Edge Function. */
export function AdminLayout() {
  const { can } = useAuth();

  if (!can('user.manage')) {
    return (
      <div role="alert" className="p-6 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>Chỉ Master Admin và User Admin vào được khu quản trị.</span>
      </div>
    );
  }

  const tab = ({ isActive }: { isActive: boolean }) =>
    `${TAB} ${isActive
      ? 'border-slate-900 dark:border-slate-100 font-bold text-slate-900 dark:text-slate-100'
      : 'border-transparent font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`;

  return (
    <div className="space-y-3">
      <nav aria-label="Khu quản trị" className="flex gap-1 border-b border-slate-300 dark:border-slate-700">
        <NavLink to="/admin" end className={tab}>Tổng quan</NavLink>
        <NavLink to="/admin/users" className={tab}>Người dùng</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
