import { memo, useCallback } from 'react';
import { X } from 'lucide-react';
import { APP_VERSION } from '../lib/appVersion';
import { useSidebarNavigation } from '../hooks/useSidebarNavigation';
import type { WorkspaceItem } from '../lib/workspaceNavigation';
import { SidebarSection } from './SidebarSection';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isMasterAdmin?: boolean;
  overlay?: boolean;
}

export const Sidebar = memo<SidebarProps>(({ isOpenMobile = false, onCloseMobile, isMasterAdmin = false, overlay = false }) => {
  const { t, customerId, asideRef, activeId, groups, openId, toggleSection, drawerVisible } = useSidebarNavigation({
    isOpenMobile, onCloseMobile, isMasterAdmin,
  });
  const itemLabel = useCallback((item: WorkspaceItem) => item.labelKey ? t(item.labelKey) : item.label ?? '', [t]);

  if (overlay && !isOpenMobile) return null;
  const position = overlay
    ? 'top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl'
    : `top-0 md:top-[56px] bottom-0 left-0 z-50 md:z-30 w-72 max-w-[85vw] md:w-[240px] ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}`;
  return <>
    {isOpenMobile && <div className={`fixed inset-0 bg-black/50 z-40 ${overlay ? '' : 'md:hidden'}`} onClick={onCloseMobile} aria-hidden="true" />}
    <aside id="app-sidebar" ref={asideRef} inert={!drawerVisible} className={`fixed ${position} bg-panel border-r border-line/70 flex flex-col transition-transform duration-200 motion-reduce:transition-none`} aria-label="Menu chức năng">
      <div className={`flex items-center justify-between p-3.5 border-b border-line/60 ${overlay ? '' : 'md:hidden'}`}>
        <span className="text-sm font-semibold text-ink">Menu Hệ Thống</span>
        <button type="button" onClick={onCloseMobile} className="p-2 rounded-lg hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent" aria-label={t('header.closeMenu')}><X className="w-4 h-4" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5 overscroll-contain">
        {groups.map(section => <SidebarSection key={section.id} section={section} open={openId === section.id} activeId={activeId}
          customerId={customerId} itemLabel={itemLabel} onToggle={() => toggleSection(section.id)} onNavigate={onCloseMobile} />)}
      </nav>
      <div className="border-t border-line/50 px-2.5 py-2 flex items-center gap-2 text-xs text-ink-faint">
        <span className="flex-1 px-1">{t('header.version')}</span>
        <span className="px-1">{APP_VERSION}</span>
      </div>
    </aside>
  </>;
});
Sidebar.displayName = 'Sidebar';
