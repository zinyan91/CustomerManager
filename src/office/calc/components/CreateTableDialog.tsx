import React, { useEffect, useRef, useState } from 'react';
import { useOfficeI18n } from '../../i18n';
import type { CalcController } from '../controller';
import { columnName, parseRange, type RangePos } from '../engine/cellRef';

export interface CreateTableDialogProps {
  controller: CalcController;
  onClose: () => void;
  onSuccess?: () => void;
}

function formatRangeToAbsoluteA1(range: RangePos): string {
  const c1Name = columnName(range.c1);
  const c2Name = columnName(range.c2);
  return `=$${c1Name}$${range.r1 + 1}:$${c2Name}$${range.r2 + 1}`;
}

export const CreateTableDialog: React.FC<CreateTableDialogProps> = ({
  controller,
  onClose,
  onSuccess,
}) => {
  const { m } = useOfficeI18n();
  const t = m.calc.createTable;
  const inputRef = useRef<HTMLInputElement>(null);

  const initialRangeStr = formatRangeToAbsoluteA1(controller.selection);
  const [rangeStr, setRangeStr] = useState(initialRangeStr);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    // Remove leading '=' and whitespace, remove absolute '$' signs for parsing
    const cleanStr = rangeStr.trim().replace(/^=/, '').replace(/\$/g, '').toUpperCase();
    const parsed = parseRange(cleanStr);
    if (!parsed) {
      setError(t.invalidRange);
      return;
    }

    try {
      controller.createTable(parsed, hasHeaders);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div
      className="calc-dialog-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="calc-dialog calc-create-table-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') onClose();
        }}
      >
        <h2 className="calc-dialog-title">{t.title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="calc-dialog-body">
            <label className="calc-dialog-field">
              <span>{t.prompt}</span>
              <input
                ref={inputRef}
                type="text"
                value={rangeStr}
                onChange={(e) => setRangeStr(e.target.value)}
                className="calc-input"
              />
            </label>

            <label className="calc-dialog-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={hasHeaders}
                onChange={(e) => setHasHeaders(e.target.checked)}
              />
              <span>{t.hasHeaders}</span>
            </label>

            {error && <p className="calc-dialog-problem" style={{ color: 'var(--red-600, #d13438)', fontSize: 12, marginTop: 8 }}>{error}</p>}
          </div>

          <div className="calc-dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              className="wr-text-btn"
              onClick={onClose}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="wr-text-btn is-primary"
            >
              {t.ok}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
