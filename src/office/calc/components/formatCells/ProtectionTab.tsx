import React from 'react';
import { useOfficeI18n } from '../../../i18n';
import type { FormatCellsDraft } from './types';

export interface ProtectionTabProps {
  draft: FormatCellsDraft;
  onChange: (patch: Partial<FormatCellsDraft>) => void;
}

export const ProtectionTab: React.FC<ProtectionTabProps> = ({ draft, onChange }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.formatCells.protection;

  const isLocked = !draft.unlocked;

  return (
    <div className="fc-tab-pane fc-protection-pane">
      <div className="fc-protection-layout">
        <label className="fc-check-row">
          <input
            type="checkbox"
            checked={isLocked}
            onChange={(e) => onChange({ unlocked: e.target.checked ? undefined : true })}
          />
          <span>{t.locked}</span>
        </label>
        <p className="fc-protection-note">{t.lockedDesc}</p>
      </div>
    </div>
  );
};
