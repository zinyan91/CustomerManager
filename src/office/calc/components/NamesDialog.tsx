import React, { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useOfficeI18n } from '../../i18n';
import { absoluteAddress, isValidName } from '../engine/definedNames';
import type { CalcController } from '../controller';

export interface NamesDialogProps {
  controller: CalcController;
  onClose: () => void;
}

/** Excel's Name Manager: the names in the workbook, and a place to give the selection one. */
export const NamesDialog: React.FC<NamesDialogProps> = ({ controller, onClose }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.names;
  const root = useRef<HTMLDivElement>(null);
  const wb = controller.wb;
  const [name, setName] = useState('');
  const [refersTo, setRefersTo] = useState(() => absoluteAddress(wb.sheets[controller.active].name, controller.selection));
  const [problem, setProblem] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    root.current?.querySelector('input')?.focus();
  }, []);

  const add = () => {
    if (!isValidName(name.trim())) return setProblem(t.invalidName);
    if (!controller.defineName(name.trim(), refersTo)) return setProblem(t.invalidRefersTo);
    setProblem(null);
    setName('');
    setTick((n) => n + 1);
  };

  const entries = [...wb.names.values()].sort((a, b) => a.name.localeCompare(b.name));
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
          else if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') add();
        }}
      >
        <h2 className="calc-dialog-title">{t.title}</h2>
        <div className="calc-dialog-body">
          <ul className="calc-names-list" aria-label={t.title}>
            {entries.length === 0 && <li className="calc-dialog-hint">{t.none}</li>}
            {entries.map((entry) => (
              <li key={entry.name} className="calc-names-item">
                <button
                  type="button"
                  className="calc-names-go"
                  onClick={() => {
                    if (controller.goToName(entry.name)) onClose();
                  }}
                >
                  <strong>{entry.name}</strong>
                  <span>{entry.refersTo}</span>
                </button>
                <button
                  type="button"
                  className="wr-icon-btn"
                  aria-label={t.remove(entry.name)}
                  onClick={() => {
                    controller.deleteName(entry.name);
                    setTick((n) => n + 1);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <label className="calc-dialog-field">
            <span>{t.name}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} spellCheck={false} />
          </label>
          <label className="calc-dialog-field">
            <span>{t.refersTo}</span>
            <input value={refersTo} onChange={(event) => setRefersTo(event.target.value)} spellCheck={false} />
          </label>
          {problem && (
            <p className="calc-dialog-problem" role="alert">
              {problem}
            </p>
          )}
        </div>
        <div className="calc-dialog-actions">
          <button type="button" className="wr-text-btn" onClick={onClose}>
            {t.close}
          </button>
          <button type="button" className="wr-text-btn is-primary" onClick={add}>
            {t.add}
          </button>
        </div>
      </div>
    </div>
  );
};
