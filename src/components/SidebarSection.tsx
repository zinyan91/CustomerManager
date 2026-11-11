import { memo } from 'react';
import { Link } from 'react-router';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { WORKSPACE_SECTION_ICONS, workspaceItemPath, type WorkspaceItem, type WorkspaceSection } from '../lib/workspaceNavigation';

const ROW = 'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar text-left border focus-visible:outline-2 focus-visible:outline-accent';
const ACTIVE = 'bg-accent-soft text-accent font-semibold border-line/70';
const IDLE = 'border-transparent text-ink-muted hover:text-ink hover:bg-surface';

interface SidebarLinkProps {
  item: WorkspaceItem;
  label: string;
  icon?: WorkspaceItem['icon'];
  active: boolean;
  customerId: number | null;
  onNavigate?: () => void;
}

const SidebarLink = ({ item, label, icon: Icon, active, customerId, onNavigate }: SidebarLinkProps) => {
  const to = workspaceItemPath(item, customerId);
  const className = `${ROW} ${active ? ACTIVE : IDLE}`;
  const body = <>
    {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
    <span className="min-w-0 flex-1">{label}</span>
    {item.newTab && <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />}
  </>;
  return item.newTab
    ? <a href={to} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>{body}</a>
    : <Link to={to} aria-current={active ? 'page' : undefined} onClick={onNavigate} className={className}>{body}</Link>;
};

interface SidebarSectionProps {
  section: WorkspaceSection;
  open: boolean;
  activeId?: string;
  customerId: number | null;
  itemLabel: (item: WorkspaceItem) => string;
  onToggle: () => void;
  onNavigate?: () => void;
}

export const SidebarSection = memo(({ section, open, activeId, customerId, itemLabel, onToggle, onNavigate }: SidebarSectionProps) => {
  const Icon = WORKSPACE_SECTION_ICONS[section.id];
  if (section.items.length === 1) {
    const [item] = section.items;
    return <SidebarLink item={item} label={section.label} icon={Icon} active={activeId === item.id} customerId={customerId} onNavigate={onNavigate} />;
  }
  const containsActive = section.items.some(item => item.id === activeId);
  const groupId = `sidebar-section-${section.id}`;
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={groupId}
        className={`${ROW} border-transparent hover:bg-surface ${containsActive ? 'text-ink font-semibold' : 'text-ink-muted hover:text-ink'}`}>
        <Icon className={`w-4 h-4 shrink-0 ${containsActive ? 'text-accent' : ''}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">{section.label}</span>
        <ChevronRight className={`w-3.5 h-3.5 shrink-0 text-ink-faint transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      {open && <div id={groupId} role="group" aria-label={section.label} className="ml-5 mt-0.5 mb-1 pl-2 border-l border-line/70 space-y-0.5">
        {section.items.map(item => <SidebarLink key={item.id} item={item} label={itemLabel(item)} active={activeId === item.id} customerId={customerId} onNavigate={onNavigate} />)}
      </div>}
    </div>
  );
});
SidebarSection.displayName = 'SidebarSection';
