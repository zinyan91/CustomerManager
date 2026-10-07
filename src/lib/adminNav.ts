import type { ElementType } from 'react';
import { ArrowRightLeft, HardDrive, LayoutDashboard, Users } from 'lucide-react';
import type { Capability } from './permissions';

export interface AdminNavItem {
  id: string;
  label: string;
  path: string;
  icon: ElementType;
  /** Chỉ sáng khi đúng đường dẫn này, không sáng ở các đường dẫn con. */
  exact?: boolean;
  /** Chỉ hiện với người có quyền này (khu quản trị mở cho cả User Admin nên mục riêng của Master Admin cần lọc). */
  capability?: Capability;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/admin', icon: LayoutDashboard, exact: true },
  { id: 'users', label: 'Người dùng', path: '/admin/users', icon: Users },
  { id: 'transfer', label: 'Chuyển giao khách hàng', path: '/admin/transfer', icon: ArrowRightLeft },
  { id: 'storage', label: 'Cấu hình kho lưu trữ', path: '/admin/storage', icon: HardDrive, capability: 'storage.configure' },
];
