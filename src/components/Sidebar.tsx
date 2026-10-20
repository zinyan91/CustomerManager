import { memo, useEffect, useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router';
import { X, Sparkles, ExternalLink, Layers } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { visibleNavGroups } from '../lib/navigation';
import { filterNavGroups } from '../lib/modules';
import { useModules } from '../context/ModulesContext';
import { APP_VERSION } from '../lib/appVersion';
import { useSelectedCustomerId } from '../hooks/useSelectedCustomerId';
import { screenPathFor } from '../lib/customerRoutes';
import { useSidebarCollapse } from '../context/SidebarCollapseContext';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  /** Hiện mục Người dùng (chỉ hai role admin). */
  canManageUsers?: boolean;
  /** Chế độ ngăn kéo ngữ cảnh theo phân hệ được chọn từ Primary Command Rail */
  contextual?: boolean;
}

export const Sidebar = memo<SidebarProps>(({
  isOpenMobile = false,
  onCloseMobile,
  canManageUsers = false,
  contextual = false,
}) => {
  const { t } = useLang();
  const customerId = useSelectedCustomerId();
  const { isSidebarCollapsed } = useSidebarCollapse();
  const { allowed } = useModules();
  const [showAllModules, setShowAllModules] = useState(false);

  let pathname = '';
  try {
    pathname = useLocation().pathname;
  } catch {
    // fallback if rendered outside router in tests
  }

  const isOverview = pathname === '/dashboard' || pathname === '/' || !pathname;
  const isCredit = ['/customers', '/credit-contracts', '/loans', '/collaterals', '/mortgage-contracts', '/credit-cards', '/post-loan'].some(p => pathname.startsWith(p));
  const isFinance = ['/business-plan', '/calculators', '/rate-quote', '/office'].some(p => pathname.startsWith(p));
  const isDossier = ['/dispatches', '/storage'].some(p => pathname.startsWith(p));
  const isTools = ['/inventory'].some(p => pathname.startsWith(p));
  const isLookup = ['/hub', '/settings', '/admin'].some(p => pathname.startsWith(p));

  const drawerTitle = isOverview
    ? 'BÀN LÀM VIỆC TỔNG QUAN'
    : isCredit
    ? 'HỒ SƠ TÍN DỤNG'
    : isFinance
    ? 'TÀI CHÍNH & THẨM ĐỊNH'
    : isDossier
    ? 'VĂN THƯ & KHO HỒ SƠ'
    : isTools
    ? 'DỰ TOÁN & BÁN LẺ'
    : isLookup
    ? 'TRA CỨU & QUẢN TRỊ'
    : 'BÀN LÀM VIỆC TỔNG QUAN';

  const drawerBadge = isOverview
    ? 'KPIs Live'
    : isCredit
    ? 'Vòng đời'
    : isFinance
    ? 'TT 39'
    : isDossier
    ? 'Cloud R2'
    : isTools
    ? 'Kho hàng'
    : isLookup
    ? 'Quy chuẩn'
    : 'CRM';

  useEffect(() => {
    if (!isOpenMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);

  useEffect(() => {
    if (isOpenMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpenMobile]);

  const contextualGroups = useMemo(() => {
    const allGroups = filterNavGroups(visibleNavGroups(canManageUsers), allowed);
    const itemMap = new Map<string, (typeof allGroups)[0]['items'][0]>();
    allGroups.forEach(g => g.items.forEach(i => itemMap.set(i.id, i)));

    const getItems = (ids: string[]) => ids.map(id => itemMap.get(id)).filter(Boolean) as (typeof allGroups)[0]['items'];

    if (isOverview) {
      return [
        {
          groupKey: 'nav.groupOverview' as const,
          items: getItems(['dashboard', 'hub']),
        },
        {
          groupKey: 'nav.groupRecords' as const,
          items: getItems(['customers', 'loans', 'credit-contracts']),
        },
        {
          groupKey: 'nav.groupFinancialTools' as const,
          items: getItems(['calculators', 'business-plan']),
        },
      ].filter(g => g.items.length > 0);
    }

    if (isCredit) {
      return [
        {
          groupKey: 'nav.groupRecords' as const,
          items: getItems(['customers', 'credit-contracts', 'loans', 'collaterals', 'mortgage-contracts', 'credit-cards']),
        },
        {
          groupKey: 'nav.groupLookupControl' as const,
          items: getItems(['post-loan']),
        },
      ].filter(g => g.items.length > 0);
    }

    if (isFinance) {
      return [
        {
          groupKey: 'nav.groupCorporate' as const,
          items: getItems(['business-plan']),
        },
        {
          groupKey: 'nav.groupFinancialTools' as const,
          items: getItems(['calculators', 'rate-quote', 'office']),
        },
      ].filter(g => g.items.length > 0);
    }

    if (isDossier) {
      return [
        {
          groupKey: 'nav.groupRecords' as const,
          items: getItems(['dispatches', 'storage']),
        },
      ].filter(g => g.items.length > 0);
    }

    if (isTools) {
      return [
        {
          groupKey: 'nav.groupCorporate' as const,
          items: getItems(['inventory']),
        },
      ].filter(g => g.items.length > 0);
    }

    if (isLookup) {
      return [
        {
          groupKey: 'nav.groupOverview' as const,
          items: getItems(['hub']),
        },
        {
          groupKey: 'nav.groupLookupControl' as const,
          items: getItems(['admin', 'settings']),
        },
      ].filter(g => g.items.length > 0);
    }

    return allGroups;
  }, [canManageUsers, allowed, isOverview, isCredit, isFinance, isDossier, isTools, isLookup]);

  const effectiveGroups = (contextual && !showAllModules)
    ? contextualGroups
    : filterNavGroups(visibleNavGroups(canManageUsers), allowed);

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 md:top-[56px] bottom-0 left-0 md:left-[68px] z-50 md:z-30 w-72 max-w-[85vw] md:w-60 bg-panel border-r border-line/70 flex flex-col shrink-0 transition-transform duration-200 ease-in-out shadow-2xl md:shadow-none ${
          isOpenMobile
            ? 'translate-x-0'
            : isSidebarCollapsed
            ? '-translate-x-full md:-translate-x-full'
            : '-translate-x-full md:translate-x-0'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="flex items-center justify-between p-3.5 md:hidden border-b border-line/60 bg-panel">
          <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Menu Hệ Thống
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-ink-faint hover:text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
            aria-label={t('header.closeMenu')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Drawer Header theo chuẩn Mockup */}
        <div className="hidden md:flex items-center justify-between px-3.5 py-2.5 border-b border-line/60 bg-surface/50">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            {drawerTitle}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-panel border border-line text-accent font-semibold shrink-0">
            {drawerBadge}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-4 overscroll-contain">
          {effectiveGroups.map((group, gi) => (
            <div key={group.groupKey} className={gi === 0 ? '' : 'pt-2 border-t border-line/40'}>
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-accent/60" />
                <span>{t(group.groupKey)}</span>
              </div>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const to = screenPathFor(item.id, customerId);
                  const ketThuc = item.id === 'customers';
                  if (item.newTab) {
                    return (
                      <a
                        key={item.id}
                        href={to}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onCloseMobile}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-accent group text-ink-muted hover:text-ink hover:bg-surface/70 font-medium"
                      >
                        <Icon className="w-4 h-4 shrink-0 text-ink-faint group-hover:text-accent" />
                        <span className="truncate">{t(item.labelKey)}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 ml-auto text-ink-faint" aria-hidden="true" />
                      </a>
                    );
                  }
                  return (
                    <NavLink
                      key={item.id}
                      to={to}
                      end={ketThuc}
                      onClick={onCloseMobile}
                      className={({ isActive }) => `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-accent group ${
                        isActive
                          ? 'bg-accent text-accent-ink font-bold shadow-md shadow-accent/25'
                          : 'text-ink-muted hover:text-ink hover:bg-surface/70 font-medium'
                      }`}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                            isActive ? 'text-accent-ink' : 'text-ink-faint group-hover:text-accent'
                          }`} />
                          <span className="truncate">{t(item.labelKey)}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {contextual && (
          <div className="px-3 py-2 border-t border-line/40 bg-surface/30">
            <button
              type="button"
              onClick={() => setShowAllModules(prev => !prev)}
              className="w-full py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 text-ink-muted hover:text-ink hover:bg-panel transition-all border border-line/60 cursor-pointer"
              title="Chuyển đổi giữa chế độ xem theo phân hệ hoặc xem toàn bộ"
            >
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>{showAllModules ? 'Thu gọn theo phân hệ' : 'Xem tất cả 28 phân hệ'}</span>
            </button>
          </div>
        )}

        <div className="border-t border-line/50 p-3 flex items-center justify-between bg-surface/40 md:rounded-b-2xl">
          <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-ink-faint">{t('header.version')}</span>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-panel border border-line/60 text-accent font-bold">{APP_VERSION}</span>
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';
