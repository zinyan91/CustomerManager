import { memo, useCallback } from 'react';
import { Link, useLocation } from 'react-router';
import { PanelLeft } from 'lucide-react';
import { useSelectedCustomerId } from '../hooks/useSelectedCustomerId';
import { useSidebarCollapse } from '../context/SidebarCollapseContext';
import { useModules } from '../context/ModulesContext';
import { useLang } from '../context/LanguageContext';
import { useRailFlyout } from '../hooks/useRailFlyout';
import {
  WORKSPACE_SECTION_ICONS, visibleWorkspaceSections, workspaceItemOfPath, workspaceItemPath, workspaceSectionOfPath,
  type WorkspaceItem, type WorkspaceSectionId,
} from '../lib/workspaceNavigation';
import { PrimaryRailFlyout } from './PrimaryRailFlyout';

export const PrimaryRail = memo(({ isMasterAdmin = false }: { isMasterAdmin?: boolean }) => {
  const { pathname } = useLocation();
  const customerId = useSelectedCustomerId();
  const { toggleSidebar } = useSidebarCollapse();
  const { allowed } = useModules();
  const { t } = useLang();
  const flyout = useRailFlyout<WorkspaceSectionId>();
  const current = workspaceSectionOfPath(pathname);
  const activeId = workspaceItemOfPath(pathname)?.id;
  const sections = visibleWorkspaceSections(allowed, isMasterAdmin);
  const itemLabel = useCallback((item: WorkspaceItem) => item.labelKey ? t(item.labelKey) : item.label ?? '', [t]);
  const openSection = sections.find(s => s.id === flyout.openId && s.items.length > 1);

  return (
    <nav className="fixed top-[56px] bottom-0 left-0 z-40 hidden md:flex flex-col items-center w-[88px] bg-panel border-r border-line/70 py-3 px-1.5 gap-1 overflow-y-auto" aria-label="Phân hệ">
      {sections.map(section => {
        const Icon = WORKSPACE_SECTION_ICONS[section.id];
        const active = current === section.id;
        const hasTabs = section.items.length > 1;
        return (
          <div
            key={section.id}
            className="w-full"
            onMouseEnter={hasTabs ? e => flyout.open(section.id, e.currentTarget) : undefined}
            onMouseLeave={hasTabs ? flyout.scheduleClose : undefined}
            onFocus={hasTabs ? e => flyout.open(section.id, e.currentTarget) : undefined}
            onBlur={hasTabs ? e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) flyout.close(); } : undefined}
            onKeyDown={e => { if (e.key === 'Escape') flyout.close(); }}
          >
            <Link to={workspaceItemPath(section.items[0], customerId)} aria-current={active ? 'page' : undefined}
              aria-haspopup={hasTabs ? 'true' : undefined}
              aria-expanded={hasTabs ? flyout.openId === section.id : undefined}
              onClick={flyout.close}
              className={`w-full min-h-[58px] rounded-lg flex flex-col items-center justify-center gap-1.5 px-1 py-2 text-sidebar text-center leading-tight border focus-visible:outline-2 focus-visible:outline-accent ${active ? 'bg-accent-soft text-accent border-line/70 font-semibold' : 'text-ink-muted border-transparent hover:bg-surface hover:text-ink'}`}>
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{section.label}</span>
            </Link>
            {openSection?.id === section.id && (
              <div onMouseEnter={flyout.cancelClose}>
                <PrimaryRailFlyout
                  section={openSection}
                  top={flyout.top}
                  activeId={activeId}
                  customerId={customerId}
                  itemLabel={itemLabel}
                  onPick={flyout.close}
                />
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={toggleSidebar} aria-label="Mở rộng menu" aria-expanded={false} aria-controls="app-sidebar"
        className="mt-auto w-full min-h-11 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent">
        <PanelLeft className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
});
PrimaryRail.displayName = 'PrimaryRail';
