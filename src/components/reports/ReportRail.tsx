import React from 'react';
import { REPORTS } from '../../lib/reports/registry';
import type { ReportId } from '../../lib/reports/types';
import { UI } from '../../lib/uiClasses';

interface ReportRailProps {
  selected: ReportId[];
  onToggle: (id: ReportId) => void;
}

export const ReportRail: React.FC<ReportRailProps> = ({ selected, onToggle }) => (
  <nav className={`${UI.containerCardBg} rounded-xl p-2 lg:w-56 shrink-0`} aria-label="Chọn báo cáo">
    <div className="px-2 pt-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
      Báo cáo
    </div>
    <ul className="flex lg:flex-col gap-1 overflow-x-auto">
      {REPORTS.map(r => {
        const dangChon = selected.includes(r.id);
        return (
          <li key={r.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onToggle(r.id)}
              aria-pressed={dangChon}
              title={r.name}
              className={`w-full text-left px-3 py-2 text-xs border-l-2 transition-colors ${
                dangChon
                  ? 'border-accent bg-panel-muted font-bold text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink hover:bg-panel-muted/60'
              }`}
            >
              {r.shortName}
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
