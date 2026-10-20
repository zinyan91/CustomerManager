import { memo, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  FolderArchive,
  Boxes,
  Landmark,
  Settings,
  UserCog,
  PanelLeftClose,
  PanelLeft,
  ExternalLink,
} from 'lucide-react';
import { useSelectedCustomerId } from '../hooks/useSelectedCustomerId';
import { screenPathFor } from '../lib/customerRoutes';
import { useSidebarCollapse } from '../context/SidebarCollapseContext';
import { ROUTE_OF } from '../lib/routes';

interface PrimaryRailProps {
  canManageUsers?: boolean;
}

interface RailPillar {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  targetPath: string;
  isActive: (pathname: string) => boolean;
  newTab?: boolean;
}

export const PrimaryRail = memo<PrimaryRailProps>(({ canManageUsers = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const customerId = useSelectedCustomerId();
  const { isSidebarCollapsed, toggleSidebar } = useSidebarCollapse();
  const pathname = location.pathname;

  const pillars = useMemo<RailPillar[]>(() => [
    {
      id: 'credit',
      label: 'Tín dụng',
      icon: Users,
      targetPath: screenPathFor('customers', customerId),
      isActive: (p) =>
        ['/customers', '/credit-contracts', '/loans', '/collaterals', '/mortgage-contracts', '/credit-cards', '/post-loan'].some(
          (route) => p.startsWith(route)
        ),
    },
    {
      id: 'finance',
      label: 'Tài chính',
      icon: TrendingUp,
      targetPath: ROUTE_OF['business-plan'],
      isActive: (p) =>
        ['/business-plan', '/calculators', '/rate-quote', '/office', '/hub/corporate-financial', '/hub/cof', '/hub/toi'].some(
          (route) => p.startsWith(route)
        ),
    },
    {
      id: 'dossier',
      label: 'Văn thư/Kho',
      icon: FolderArchive,
      targetPath: ROUTE_OF.dispatches,
      isActive: (p) =>
        ['/dispatches', '/storage', '/hub/documents', '/hub/reports', '/hub/dispatches', '/hub/storage'].some((route) =>
          p.startsWith(route)
        ),
    },
    {
      id: 'retail',
      label: 'Dự toán/Kho',
      icon: Boxes,
      targetPath: ROUTE_OF.inventory,
      isActive: (p) =>
        ['/inventory', '/hub/estimate', '/hub/shopping', '/hub/invoice', '/hub/statement'].some((route) =>
          p.startsWith(route)
        ),
    },
    {
      id: 'reference',
      label: 'Tra cứu',
      icon: Landmark,
      targetPath: ROUTE_OF.hub,
      isActive: (p) =>
        p === '/hub' ||
        ['/hub/mdsdv', '/hub/card-fees', '/hub/quiz'].some((route) => p.startsWith(route)),
    },
  ], [customerId]);

  const isDashboardActive = pathname === '/dashboard' || pathname === '/';
  const isSettingsActive = pathname.startsWith('/settings');

  return (
    <aside
      className="fixed top-[56px] bottom-0 left-0 z-40 hidden md:flex flex-col items-center w-[68px] bg-[#091F38] border-r border-[#133358] py-2.5 px-1.5 gap-1 select-none shadow-lg shadow-black/20"
      aria-label="Thanh điều hướng nghiệp vụ chính"
    >
      {/* Vị trí số 1: Dashboard / Bàn làm việc tổng quan */}
      <button
        type="button"
        onClick={() => navigate(ROUTE_OF.dashboard)}
        className={`relative w-14 h-[52px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer ${
          isDashboardActive
            ? 'bg-sky-500/20 text-sky-400 border border-sky-400/40 font-bold shadow-xs'
            : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
        }`}
        title="0. Bàn làm việc tổng quan (Dashboard)"
      >
        {isDashboardActive && (
          <span className="absolute -left-1.5 top-2.5 bottom-2.5 w-1 bg-sky-400 rounded-r shadow-[0_0_8px_#38bdf8]" />
        )}
        <LayoutDashboard className="w-5 h-5 shrink-0" />
        <span className="text-[10px] leading-none tracking-tight whitespace-nowrap font-medium">Dashboard</span>
      </button>

      {/* Đường phân cách sau Dashboard */}
      <div className="w-9 h-[1px] bg-[#1a385c] my-1" />

      {/* 5 Trụ cột nghiệp vụ chính */}
      <div className="flex flex-col gap-1 w-full items-center">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          const active = pillar.isActive(pathname);
          return (
            <button
              key={pillar.id}
              type="button"
              onClick={() => navigate(pillar.targetPath)}
              className={`relative w-14 h-[50px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer ${
                active
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-400/40 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
              }`}
              title={pillar.label}
            >
              {active && (
                <span className="absolute -left-1.5 top-2 bottom-2 w-1 bg-sky-400 rounded-r shadow-[0_0_8px_#38bdf8]" />
              )}
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[9.5px] leading-none tracking-tight whitespace-nowrap font-medium truncate max-w-[50px]">
                {pillar.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Cụm công cụ dưới cùng Rail */}
      <div className="flex flex-col gap-1 w-full items-center pt-2 border-t border-[#1a385c]">
        {/* Nút Thu gọn / Mở rộng Menu phụ (Secondary Drawer) */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="w-14 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
          title={isSidebarCollapsed ? 'Mở rộng menu phụ (Ctrl+\\)' : 'Thu gọn menu phụ mở rộng màn hình'}
          aria-label={isSidebarCollapsed ? 'Mở menu phụ' : 'Thu menu phụ'}
        >
          {isSidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Mục Quản trị nếu có quyền */}
        {canManageUsers && (
          <a
            href={ROUTE_OF.admin}
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors relative"
            title="Quản trị người dùng & Phân quyền (Tab mới)"
          >
            <UserCog className="w-4 h-4" />
            <ExternalLink className="w-2.5 h-2.5 absolute top-1.5 right-1.5 text-slate-500" />
          </a>
        )}

        {/* Cài đặt hệ thống */}
        <button
          type="button"
          onClick={() => navigate(ROUTE_OF.settings)}
          className={`w-14 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
            isSettingsActive
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/40'
              : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
          }`}
          title="Cài đặt hệ thống"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
});

PrimaryRail.displayName = 'PrimaryRail';
