import { Outlet } from 'react-router';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoginView } from '../LoginView';

export function AdminLayout() {
  const { session, loading, roleLoading, can } = useAuth();
  if (loading || roleLoading) {
    return <div role="status" aria-label="Đang tải quản trị" className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>;
  }
  if (!session) return <LoginView />;
  if (!can('user.manage')) {
    return <div role="alert" className="flex items-center gap-2 p-5 text-sm text-ink">
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span>Chỉ Master Admin và User Admin vào được khu quản trị.</span>
    </div>;
  }
  return <section aria-label="Quản trị" className="admin-workspace min-w-0 p-4 sm:p-5 text-ink">
    <Outlet />
  </section>;
}
