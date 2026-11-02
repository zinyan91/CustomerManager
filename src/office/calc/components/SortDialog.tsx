import React, { useEffect, useRef, useState } from 'react';
import { useOfficeI18n } from '../../i18n';
import { columnName, rangeName } from '../engine/cellRef';
import { currentRegion } from '../engine/chartData';
import type { CalcController } from '../controller';

export interface SortDialogProps {
  controller: CalcController;
  onClose: () => void;
}

interface Level {
  column: number;
  ascending: boolean;
}

const MAX_LEVELS = 4;

/** Data ▸ Sort: up to four keys, each a column of the data and a direction. */
export const SortDialog: React.FC<SortDialogProps> = ({ controller, onClose }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.sort;
  const root = useRef<HTMLDivElement>(null);
  const sel = controller.selection;
  const single = sel.r1 === sel.r2 && sel.c1 === sel.c2;
  const filled = (r: number, c: number) => (controller.wb.getCell(controller.active, r, c)?.raw ?? '') !== '';
  const range = single ? currentRegion(sel.r1, sel.c1, filled) : sel;
  const width = range.c2 - range.c1 + 1;
  const [hasHeader, setHasHeader] = useState(true);
  const [levels, setLevels] = useState<Level[]>([{ column: 0, ascending: true }]);

  useEffect(() => {
    root.current?.querySelector('select')?.focus();
  }, []);

  const label = (offset: number): string => {
    const header = hasHeader ? controller.wb.displayAt(controller.active, range.r1, range.c1 + offset) : '';
    return header ? header : t.column(columnName(range.c1 + offset));
  };
  const change = (index: number, patch: Partial<Level>) => setLevels((all) => all.map((level, i) => (i === index ? { ...level, ...patch } : level)));

  return (
    <div className="calc-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={root}
        className="calc-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') onClose();
        }}
      >
        <h2 className="calc-dialog-title">{t.title}</h2>
        <div className="calc-dialog-body">
          <p className="calc-dialog-hint">{rangeName(range)}</p>
          <label className="calc-dialog-field">
            <input type="checkbox" checked={hasHeader} onChange={(event) => setHasHeader(event.target.checked)} />
            <span>{t.header}</span>
          </label>
          {levels.map((level, index) => (
            <div key={index} className="calc-dialog-field">
              <span>{index === 0 ? t.sortBy : t.thenBy}</span>
              <select value={level.column} aria-label={index === 0 ? t.sortBy : t.thenBy} onChange={(event) => change(index, { column: Number(event.target.value) })}>
                {Array.from({ length: width }, (_v, offset) => (
                  <option key={offset} value={offset}>
                    {label(offset)}
                  </option>
                ))}
              </select>
              <select value={level.ascending ? 'asc' : 'desc'} aria-label={t.order} onChange={(event) => change(index, { ascending: event.target.value === 'asc' })}>
                <option value="asc">{t.ascending}</option>
                <option value="desc">{t.descending}</option>
              </select>
            </div>
          ))}
          {levels.length < MAX_LEVELS && (
            <button type="button" className="wr-text-btn" onClick={() => setLevels((all) => [...all, { column: Math.min(width - 1, all.length), ascending: true }])}>
              {t.addLevel}
            </button>
          )}
        </div>
        <div className="calc-dialog-actions">
          <button type="button" className="wr-text-btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            type="button"
            className="wr-text-btn is-primary"
            onClick={() => {
              controller.sortByKeys(levels, hasHeader);
              onClose();
            }}
          >
            {t.ok}
          </button>
        </div>
      </div>
    </div>
  );
};
