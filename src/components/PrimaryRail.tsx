import { memo, useCallback } from 'react';
import { Link, useLocation } from 'react-router';
import { useSelectedCustomerId } from '../hooks/useSelectedCustomerId';
import { useModules } from '../context/ModulesContext';
import { useLang } from '../context/LanguageContext';
import { useRailFlyout } from '../hooks/useRailFlyout';
import {
  WORKSPACE_SECTION_ICONS, visibleWorkspaceSections, workspaceItemOfPath, workspaceItemPath, workspaceSectionOfPath,
  type WorkspaceItem, type WorkspaceSectionId,
} from '../lib/workspaceNavigation';
import { PrimaryRailFlyout } from './PrimaryRailFlyout';
import { APP_VERSION } from '../lib/appVersion';

const RAIL_OPEN = 'bg-panel-muted text-ink font-semibold border-line';
const RAIL_IDLE = 'text-ink-muted border-transparent hover:bg-panel-muted hover:text-ink hover:font-semibold hover:border-line';

export const PrimaryRail = memo(({ isMasterAdmin = false }: { isMasterAdmin?: boolean }) => {
  const { pathname } = useLocation();
  const customerId = useSelectedCustomerId();
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
              className={`w-full min-h-[58px] rounded-lg flex flex-col items-center justify-center gap-1.5 px-1 py-2 text-sidebar text-center leading-tight border transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                active
                  ? 'bg-accent-soft text-accent border-accent/40 font-semibold'
                  : flyout.openId === section.id
                  ? RAIL_OPEN
                  : RAIL_IDLE
              }`}>
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
      <div className="mt-auto pt-2 text-[10px] font-mono text-ink-faint">{APP_VERSION}</div>
    </nav>
  );
});
PrimaryRail.displayName = 'PrimaryRail';
