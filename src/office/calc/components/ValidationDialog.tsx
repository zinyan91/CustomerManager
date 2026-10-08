import React, { useEffect, useRef, useState } from 'react';
import { useOfficeI18n } from '../../i18n';
import { rangeName } from '../engine/cellRef';
import type { CalcController } from '../controller';
import { NUMBER_OPERATORS, parseListItems, type NumberOp, type ValidationRule } from '../engine/validation';

type Allow = 'any' | 'list' | 'whole' | 'decimal';

export interface ValidationDialogProps {
  controller: CalcController;
  onClose: () => void;
}

/** Excel's Data Validation for the selected cells: any value, a list, or a whole number or decimal within limits. */
export const ValidationDialog: React.FC<ValidationDialogProps> = ({ controller, onClose }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.validation;
  const range = controller.selection;
  const existing = controller.validationOf(controller.anchor.row, controller.anchor.col);
  const rule = existing?.rule;
  const root = useRef<HTMLDivElement>(null);

  const [allow, setAllow] = useState<Allow>(!rule ? 'any' : rule.kind === 'number' ? (rule.integer ? 'whole' : 'decimal') : 'list');
  const [source, setSource] = useState(!rule ? '' : rule.kind === 'items' ? rule.items.join(', ') : rule.kind === 'range' ? `=${rule.ref}` : '');
  const [op, setOp] = useState<NumberOp>(rule?.kind === 'number' ? rule.op : 'between');
  const [a, setA] = useState(rule?.kind === 'number' ? String(rule.a) : '');
  const [b, setB] = useState(rule?.kind === 'number' && rule.b !== undefined ? String(rule.b) : '');
  const [error, setError] = useState(existing?.error ?? '');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    root.current?.querySelector('select')?.focus();
  }, []);

  const number = (text: string): number | null => {
    const value = Number(text.trim().replace(',', '.'));
    return text.trim() !== '' && Number.isFinite(value) ? value : null;
  };

  const apply = () => {
    let next: ValidationRule | null = null;
    if (allow === 'list') {
      if (source.trim().startsWith('=')) {
        const ref = source.trim().slice(1).trim();
        if (!ref) return setProblem(t.needList);
        next = { kind: 'range', ref };
      } else {
        const items = parseListItems(source);
        if (items.length === 0) return setProblem(t.needList);
        next = { kind: 'items', items };
      }
    } else if (allow === 'whole' || allow === 'decimal') {
      const first = number(a);
      const second = number(b);
      if (first === null || (op === 'between' && second === null)) return setProblem(t.needNumbers);
      next = { kind: 'number', integer: allow === 'whole', op, a: first, ...(op === 'between' && second !== null ? { b: second } : {}) };
    }
    controller.setValidation(range, next, error.trim() || undefined);
    onClose();
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
          <p className="calc-dialog-hint">{t.applyTo(rangeName(range))}</p>
          <label className="calc-dialog-field">
            <span>{t.allow}</span>
            <select value={allow} onChange={(event) => setAllow(event.target.value as Allow)}>
              <option value="any">{t.any}</option>
              <option value="list">{t.list}</option>
              <option value="whole">{t.whole}</option>
              <option value="decimal">{t.decimal}</option>
            </select>
          </label>
          {allow === 'list' && (
            <label className="calc-dialog-field">
              <span>{t.source}</span>
              <input value={source} onChange={(event) => setSource(event.target.value)} placeholder={t.sourceHint} />
            </label>
          )}
          {(allow === 'whole' || allow === 'decimal') && (
            <>
              <label className="calc-dialog-field">
                <span>{t.data}</span>
                <select value={op} onChange={(event) => setOp(event.target.value as NumberOp)}>
                  {NUMBER_OPERATORS.map((name) => (
                    <option key={name} value={name}>
                      {t.operators[name]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="calc-dialog-field">
                <span>{op === 'between' ? t.minimum : t.value}</span>
                <input value={a} onChange={(event) => setA(event.target.value)} inputMode="decimal" />
              </label>
              {op === 'between' && (
                <label className="calc-dialog-field">
                  <span>{t.maximum}</span>
                  <input value={b} onChange={(event) => setB(event.target.value)} inputMode="decimal" />
                </label>
              )}
            </>
          )}
          {allow !== 'any' && (
            <label className="calc-dialog-field">
              <span>{t.errorText}</span>
              <input value={error} onChange={(event) => setError(event.target.value)} placeholder={t.errorHint} />
            </label>
          )}
          {problem && (
            <p className="calc-dialog-problem" role="alert">
              {problem}
            </p>
          )}
        </div>
        <div className="calc-dialog-actions">
          <button type="button" className="wr-text-btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="wr-text-btn is-primary" onClick={apply}>
            {allow === 'any' ? t.clear : t.ok}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ListMenuProps {
  items: string[];
  anchor: { left: number; bottom: number };
  current: string;
  onPick: (item: string) => void;
  onClose: () => void;
}

/** The list a cell with a list rule offers, under its arrow. */
export const ListMenu: React.FC<ListMenuProps> = ({ items, anchor, current, onPick, onClose }) => {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - 220));
  return (
    <div ref={root} className="calc-list-menu" role="listbox" style={{ left, top: anchor.bottom + 2 }}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="option"
          aria-selected={item === current}
          className={`calc-list-item${item === current ? ' is-current' : ''}`}
          onClick={() => {
            onPick(item);
            onClose();
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
};
