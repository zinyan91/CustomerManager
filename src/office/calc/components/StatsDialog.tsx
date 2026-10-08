import React, { useEffect, useRef } from 'react';
import { useOfficeI18n } from '../../i18n';
import type { CalcController } from '../controller';
import { workbookStats } from '../model/workbookStats';

/** Số trang tính, ô, công thức, biểu đồ, ảnh và ghi chú của cả sổ tính. */
export const StatsDialog: React.FC<{ controller: CalcController; onClose: () => void }> = ({ controller, onClose }) => {
  const { m } = useOfficeI18n();
  const t = m.ribbon.review.statsDialog;
  const stats = workbookStats(controller.wb);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  const rows: Array<[string, number]> = [
    [t.sheets, stats.sheets],
    [t.cells, stats.cells],
    [t.formulas, stats.formulas],
    [t.charts, stats.charts],
    [t.pictures, stats.pictures],
    [t.comments, stats.comments],
  ];
  return (
    <div className="calc-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="calc-dialog" role="dialog" aria-label={t.title} onKeyDown={(event) => event.key === 'Escape' && onClose()}>
        <div className="calc-dialog-title">{t.title}</div>
        <dl className="calc-stats">
          {rows.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value.toLocaleString()}</dd>
            </React.Fragment>
          ))}
        </dl>
        <div className="calc-dialog-actions">
          <button ref={close} type="button" className="wr-text-btn is-primary" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
