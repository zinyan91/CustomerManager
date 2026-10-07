import { Link, NavLink, Outlet } from 'react-router';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_NAV } from '../../lib/adminNav';
import { ROUTE_OF } from '../../lib/routes';
import { LoginView } from '../LoginView';

const ITEM = 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap';

/**
 * Khung riêng của khu quản trị: sidebar quản trị, không dính sidebar ứng dụng.
 * Mở ở tab trình duyệt mới; phiên đăng nhập dùng chung giữa các tab. Chỉ Master Admin và User Admin;
 * luật thật nằm ở RLS và Edge Function.
 */
export function AdminLayout() {
  const { session, loading, can } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface text-ink flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!session) return <LoginView />;

  if (!can('user.manage')) {
    return (
      <div role="alert" className="p-6 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>Chỉ Master Admin và User Admin vào được khu quản trị.</span>
      </div>
    );
  }

  const item = ({ isActive }: { isActive: boolean }) =>
    `${ITEM} ${isActive
      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`;

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col md:flex-row">
      <aside className="md:w-56 shrink-0 md:min-h-screen bg-panel border-b md:border-b-0 md:border-r border-line flex flex-col">
        <div className="px-4 py-3 text-base font-bold text-slate-900 dark:text-slate-100">Quản trị</div>
        <nav aria-label="Khu quản trị" className="flex md:flex-col gap-1 px-2 pb-2 overflow-x-auto md:flex-1">
          {ADMIN_NAV.filter((n) => !n.capability || can(n.capability)).map(({ id, label, path, icon: Icon, exact }) => (
            <NavLink key={id} to={path} end={exact} className={item}>
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block border-t border-line p-2">
          <Link to={ROUTE_OF.dashboard} className={`${ITEM} text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium`}>
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Về ứng dụng</span>
          </Link>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-3 sm:p-5">
        <Outlet />
      </main>
    </div>
  );
}
