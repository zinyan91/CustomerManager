import React, { useEffect, useRef, useState } from 'react';
import { useOfficeI18n } from '../../i18n';
import type { CalcController } from '../controller';
import { FORMAT_PRESETS, formatValue } from '../engine/numberFormat';
import type { Scalar } from '../engine/values';

export interface NumberFormatDialogProps {
  controller: CalcController;
  onClose: () => void;
}

/** Codes worth offering beyond the presets, each with what it is for. */
const EXTRA_CODES = ['#,##0.00', '0.0', '0.0%', 'dd/mm/yyyy', 'dd/mm/yyyy hh:mm', 'd mmmm yyyy', 'hh:mm', '[h]:mm', '# ?/?', '0.00E+00', '0000', '#,##0 "₫"', '#,##0;[Red]-#,##0'];

/** Format Cells ▸ Number: pick a code or write one, and see what the active cell would show. */
export const NumberFormatDialog: React.FC<NumberFormatDialogProps> = ({ controller, onClose }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.numberFormat;
  const root = useRef<HTMLDivElement>(null);
  const style = controller.activeStyle();
  const [code, setCode] = useState(style.numFmt ?? 'General');

  useEffect(() => {
    root.current?.querySelector('input')?.focus();
  }, []);

  const { row, col } = controller.activeCell;
  const own = controller.wb.valueAt(controller.active, row, col);
  // A cell with nothing numeric in it is previewed with a sample so that the code can be judged.
  const sample: Scalar = typeof own === 'number' ? own : 1234.5678;
  const shown = (() => {
    try {
      return formatValue(sample, code.trim() === '' || code === 'General' ? undefined : code);
    } catch {
      return '';
    }
  })();

  const apply = () => {
    controller.setNumFmt(code.trim() === '' ? 'General' : code.trim());
    onClose();
  };

  const codes = [...Object.values(FORMAT_PRESETS), ...EXTRA_CODES].filter((c, i, all) => all.indexOf(c) === i);
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
          else if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') apply();
        }}
      >
        <h2 className="calc-dialog-title">{t.title}</h2>
        <div className="calc-dialog-body">
          <label className="calc-dialog-field">
            <span>{t.code}</span>
            <input value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} />
          </label>
          <p className="calc-dialog-hint" aria-live="polite">
            {t.sample}: <strong>{shown}</strong>
          </p>
          <ul className="calc-names-list" aria-label={t.codes}>
            {codes.map((candidate) => (
              <li key={candidate} className="calc-names-item">
                <button type="button" className="calc-names-go" onClick={() => setCode(candidate)}>
                  <strong>{candidate}</strong>
                  <span>{formatValue(sample, candidate === 'General' ? undefined : candidate)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="calc-dialog-actions">
          <button type="button" className="wr-text-btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="wr-text-btn is-primary" onClick={apply}>
            {t.ok}
          </button>
        </div>
      </div>
    </div>
  );
};
