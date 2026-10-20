import { memo } from 'react';
import { Link } from 'react-router';
import { X, ExternalLink } from 'lucide-react';
import { APP_VERSION } from '../lib/appVersion';
import { useSidebarNavigation } from '../hooks/useSidebarNavigation';
import { workspaceItemPath, type WorkspaceItem } from '../lib/workspaceNavigation';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  canManageUsers?: boolean;
  contextual?: boolean;
  overlay?: boolean;
}

export const Sidebar = memo<SidebarProps>(({ isOpenMobile = false, onCloseMobile, canManageUsers = false, contextual = false, overlay = false }) => {
  const { t, customerId, isSidebarCollapsed, asideRef, activeId, current, groups, drawerVisible } = useSidebarNavigation({
    isOpenMobile, onCloseMobile, canManageUsers, contextual, overlay,
  });

  if (overlay && !isOpenMobile) return null;
  const position = overlay
    ? 'top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl'
    : `top-0 md:top-[56px] bottom-0 left-0 md:left-[88px] z-50 md:z-30 w-72 max-w-[85vw] md:w-[220px] ${isOpenMobile ? 'translate-x-0' : isSidebarCollapsed ? '-translate-x-full md:-translate-x-[calc(100%+88px)]' : '-translate-x-full md:translate-x-0'}`;
  return <>
    {isOpenMobile && <div className={`fixed inset-0 bg-black/50 z-40 ${overlay ? '' : 'md:hidden'}`} onClick={onCloseMobile} aria-hidden="true" />}
    <aside id="app-sidebar" ref={asideRef} inert={!drawerVisible} className={`fixed ${position} bg-panel border-r border-line/70 flex flex-col transition-transform duration-200`} aria-label="Sidebar Navigation">
      <div className={`flex items-center justify-between p-3.5 border-b border-line/60 ${overlay ? '' : 'md:hidden'}`}>
        <span className="text-sm font-semibold text-ink">Menu Hệ Thống</span>
        <button type="button" onClick={onCloseMobile} className="p-2 rounded-lg hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent" aria-label={t('header.closeMenu')}><X className="w-4 h-4" /></button>
      </div>
      {!overlay && <div className="hidden md:block px-4 py-4 border-b border-line/60 text-sm font-semibold text-ink">{contextual ? current?.label ?? 'Chức năng' : 'Chức năng'}</div>}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 overscroll-contain">
        {groups.map(group => <div key={group.id}>
          {(!contextual || isOpenMobile || overlay) && <div className="px-3 pb-2 text-xs font-semibold text-ink-faint">{group.label}</div>}
          <div className="space-y-1">{group.items.map((item: WorkspaceItem) => {
            const Icon = item.icon;
            const to = workspaceItemPath(item, customerId);
            const active = activeId === item.id;
            const className = `w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-left focus-visible:outline-2 focus-visible:outline-accent ${active ? 'bg-accent-soft text-accent font-semibold border border-line/70' : 'border border-transparent text-ink-muted hover:text-ink hover:bg-surface'}`;
            const body = <><Icon className="w-4 h-4 shrink-0" aria-hidden="true" /><span>{item.labelKey ? t(item.labelKey) : item.label}</span>{item.newTab && <ExternalLink className="w-3 h-3 ml-auto shrink-0" aria-hidden="true" />}</>;
            return item.newTab
              ? <a key={item.id} href={to} target="_blank" rel="noopener noreferrer" onClick={onCloseMobile} className={className}>{body}</a>
              : <Link key={item.id} to={to} aria-current={active ? 'page' : undefined} onClick={onCloseMobile} className={className}>{body}</Link>;
          })}</div>
        </div>)}
      </nav>
      <div className="border-t border-line/50 p-3 flex items-center justify-between text-xs text-ink-faint"><span>{t('header.version')}</span><span>{APP_VERSION}</span></div>
    </aside>
  </>;
});
Sidebar.displayName = 'Sidebar';
