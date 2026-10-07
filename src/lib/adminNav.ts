import type { ElementType } from 'react';
import { ArrowRightLeft, LayoutDashboard, Users } from 'lucide-react';

export interface AdminNavItem {
  id: string;
  label: string;
  path: string;
  icon: ElementType;
  /** Chỉ sáng khi đúng đường dẫn này, không sáng ở các đường dẫn con. */
  exact?: boolean;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/admin', icon: LayoutDashboard, exact: true },
  { id: 'users', label: 'Người dùng', path: '/admin/users', icon: Users },
  { id: 'transfer', label: 'Chuyển giao khách hàng', path: '/admin/transfer', icon: ArrowRightLeft },
];
