import React, { useEffect, useRef, useState } from 'react';
import { useOfficeI18n } from '../../i18n';
import type { CalcController } from '../controller';
import { SUMMARY_FUNCTIONS, SummaryTooLargeError, type SummaryFn } from '../engine/summary';

export interface SummaryDialogProps {
  controller: CalcController;
  onClose: () => void;
  onMessage: (text: string) => void;
}

/** Chooses what a PivotTable-style summary of the table at the cursor is made of. */
export const SummaryDialog: React.FC<SummaryDialogProps> = ({ controller, onClose, onMessage }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.summary;
  const source = controller.summarySource();
  const root = useRef<HTMLDivElement>(null);
  const [rowColumn, setRowColumn] = useState(0);
  const [columnColumn, setColumnColumn] = useState(-1);
  const [valueColumn, setValueColumn] = useState(source ? Math.min(source.headers.length - 1, 1) : 0);
  const [fn, setFn] = useState<SummaryFn>('sum');

  useEffect(() => {
    root.current?.querySelector('select')?.focus();
  }, []);

  if (!source) {
    return (
      <div className="calc-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <div ref={root} className="calc-dialog" role="alertdialog" aria-label={t.title}>
          <p className="calc-dialog-text">{t.noSource}</p>
          <div className="calc-dialog-actions">
            <button type="button" className="wr-text-btn is-primary" onClick={onClose}>
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { range, headers } = source;
  const options = headers.map((name, i) => (
    <option key={i} value={i}>
      {name}
    </option>
  ));

  const create = () => {
    try {
      controller.insertSummary(
        {
          source: range,
          rowColumn: range.c1 + rowColumn,
          columnColumn: columnColumn < 0 ? null : range.c1 + columnColumn,
          valueColumn: range.c1 + valueColumn,
          fn,
        },
        { corner: t.corner(t.fns[fn], headers[valueColumn]), total: t.total, sheetName: t.sheetName },
      );
      onClose();
    } catch (caught) {
      if (caught instanceof SummaryTooLargeError) onMessage(t.tooMany(caught.axis === 'rows' ? t.rows : t.columns, caught.count));
      else throw caught;
      onClose();
    }
  };

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
          <label className="calc-dialog-field">
            <span>{t.rows}</span>
            <select value={rowColumn} onChange={(event) => setRowColumn(Number(event.target.value))}>
              {options}
            </select>
          </label>
          <label className="calc-dialog-field">
            <span>{t.columns}</span>
            <select value={columnColumn} onChange={(event) => setColumnColumn(Number(event.target.value))}>
              <option value={-1}>{t.none}</option>
              {options}
            </select>
          </label>
          <label className="calc-dialog-field">
            <span>{t.values}</span>
            <select value={valueColumn} onChange={(event) => setValueColumn(Number(event.target.value))}>
              {options}
            </select>
          </label>
          <label className="calc-dialog-field">
            <span>{t.function}</span>
            <select value={fn} onChange={(event) => setFn(event.target.value as SummaryFn)}>
              {SUMMARY_FUNCTIONS.map((name) => (
                <option key={name} value={name}>
                  {t.fns[name]}
                </option>
              ))}
            </select>
          </label>
          <p className="calc-dialog-hint">{t.hint}</p>
        </div>
        <div className="calc-dialog-actions">
          <button type="button" className="wr-text-btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="wr-text-btn is-primary" onClick={create}>
            {t.create}
          </button>
        </div>
      </div>
    </div>
  );
};
