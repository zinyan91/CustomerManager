import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface WorkspacePageHeaderProps {
  title: string;
  icon: LucideIcon;
  actions?: ReactNode;
}

export function WorkspacePageHeader({ title, icon: Icon, actions }: WorkspacePageHeaderProps) {
  return (
    <header data-workspace-panel className="px-4 py-4 border-b border-line flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-5 h-5 text-ink-muted shrink-0" aria-hidden="true" />
        <h1 className="text-base font-semibold text-ink">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
