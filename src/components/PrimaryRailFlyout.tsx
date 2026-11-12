import { Link } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { workspaceItemPath, type WorkspaceItem, type WorkspaceSection } from '../lib/workspaceNavigation';

interface Props {
  section: WorkspaceSection;
  top: number;
  activeId?: string;
  customerId: number | null;
  itemLabel: (item: WorkspaceItem) => string;
  onPick: () => void;
}

export function PrimaryRailFlyout({ section, top, activeId, customerId, itemLabel, onPick }: Props) {
  return (
    <div
      role="region"
      aria-label={`Tab phụ ${section.label}`}
      style={{ top, maxHeight: `calc(100vh - ${top}px - 8px)` }}
      className="fixed left-[88px] z-50 w-60 overflow-y-auto rounded-r-xl border border-l-0 border-line/70 bg-panel shadow-xl py-2"
    >
      <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">{section.label}</div>
      <ul className="space-y-0.5 px-1.5">
        {section.items.map(item => {
          const Icon = item.icon;
          const active = item.id === activeId;
          const className = `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sidebar border focus-visible:outline-2 focus-visible:outline-accent ${
            active ? 'bg-accent-soft text-accent font-semibold border-line/70' : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface'
          }`;
          const body = <>
            {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
            <span className="min-w-0 flex-1">{itemLabel(item)}</span>
            {item.newTab && <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />}
          </>;
          const to = workspaceItemPath(item, customerId);
          return (
            <li key={item.id}>
              {item.newTab
                ? <a href={to} target="_blank" rel="noopener noreferrer" onClick={onPick} className={className}>{body}</a>
                : <Link to={to} aria-current={active ? 'page' : undefined} onClick={onPick} className={className}>{body}</Link>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
