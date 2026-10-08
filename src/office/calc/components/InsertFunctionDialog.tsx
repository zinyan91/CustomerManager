import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOfficeI18n } from '../../i18n';
import { allFunctions, type FunctionGroup, FUNCTION_GROUPS } from '../engine/functionCatalog';

export interface InsertFunctionDialogProps {
  onInsert: (name: string) => void;
  onClose: () => void;
}

/** Chọn một hàm trong thư viện, lọc theo nhóm hoặc gõ tên; chọn xong thì chèn vào công thức. */
export const InsertFunctionDialog: React.FC<InsertFunctionDialogProps> = ({ onInsert, onClose }) => {
  const { m } = useOfficeI18n();
  const t = m.ribbon.formulas;
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<FunctionGroup | 'all'>('all');
  const [picked, setPicked] = useState<string | null>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    search.current?.focus();
  }, []);

  const list = useMemo(() => {
    const needle = query.trim().toUpperCase();
    return allFunctions().filter((f) => (group === 'all' || f.group === group) && (!needle || f.name.includes(needle)));
  }, [query, group]);
  const current = picked && list.some((f) => f.name === picked) ? picked : (list[0]?.name ?? null);

  const submit = () => {
    if (current) onInsert(current);
  };

  return (
    <div className="calc-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className="calc-dialog calc-fn-dialog"
        role="dialog"
        aria-label={t.dialog.title}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
      >
        <div className="calc-dialog-title">{t.dialog.title}</div>
        <div className="calc-dialog-body">
          <label className="calc-dialog-field">
            <span>{t.dialog.search}</span>
            <input ref={search} type="text" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="calc-dialog-field">
            <span>{t.dialog.category}</span>
            <select value={group} onChange={(event) => setGroup(event.target.value as FunctionGroup | 'all')}>
              <option value="all">{t.dialog.all}</option>
              {(Object.keys(FUNCTION_GROUPS) as FunctionGroup[]).map((key) => (
                <option key={key} value={key}>
                  {t.groups[key]}
                </option>
              ))}
            </select>
          </label>
          <ul className="calc-fn-list" role="listbox" aria-label={t.dialog.title}>
            {list.length === 0 && <li className="calc-fn-empty">{t.dialog.noMatch}</li>}
            {list.map((f) => (
              <li key={f.name} role="option" aria-selected={f.name === current}>
                <button type="button" className={f.name === current ? 'is-picked' : ''} onClick={() => setPicked(f.name)} onDoubleClick={() => onInsert(f.name)}>
                  <span>{f.name}</span>
                  <small>{t.groups[f.group]}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="calc-dialog-actions">
          <button type="button" className="wr-text-btn" onClick={onClose}>
            {t.dialog.cancel}
          </button>
          <button type="button" className="wr-text-btn is-primary" disabled={!current} onClick={submit}>
            {t.dialog.insert}
          </button>
        </div>
      </div>
    </div>
  );
};
