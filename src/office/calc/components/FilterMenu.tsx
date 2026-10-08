import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOfficeI18n } from '../../i18n';
import type { CalcController } from '../controller';
import { NUMBER_OPS, TEXT_OPS, type FilterOp } from '../engine/filterCondition';

export interface FilterMenuProps {
  controller: CalcController;
  col: number;
  /** The header button it opened from, in viewport pixels. */
  anchor: { left: number; bottom: number };
  onClose: () => void;
}

/** Excel's column filter: sort, a searchable checklist of the column's values, apply or cancel. */
export const FilterMenu: React.FC<FilterMenuProps> = ({ controller, col, anchor, onClose }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.filter;
  const values = useMemo(() => controller.filterValues(col), [controller, col]);
  const [checked, setChecked] = useState(() => new Set(values.filter((v) => !v.hidden).map((v) => v.value)));
  const [query, setQuery] = useState('');
  const existing = controller.filter?.conditions?.[col];
  const [op, setOp] = useState<FilterOp | ''>(existing?.op ?? '');
  const [a, setA] = useState(existing?.a ?? '');
  const [b, setB] = useState(existing?.b ?? '');
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

  const label = (value: string) => (value === '' ? t.blanks : value);
  const needle = query.trim().toLocaleLowerCase();
  const shown = values.filter((v) => needle === '' || label(v.value).toLocaleLowerCase().includes(needle));
  const allShownChecked = shown.length > 0 && shown.every((v) => checked.has(v.value));

  const toggle = (value: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const apply = () => {
    controller.setFilterExcluded(col, values.filter((v) => !checked.has(v.value)).map((v) => v.value));
    controller.setFilterCondition(col, op === '' ? null : { op, a, ...(op === 'between' ? { b } : {}) });
    onClose();
  };

  const left = Math.max(4, Math.min(anchor.left, window.innerWidth - 252));
  return (
    <div ref={root} className="calc-filter-menu" role="dialog" aria-label={t.open} style={{ left, top: anchor.bottom + 2 }}>
      <button
        type="button"
        className="calc-filter-item"
        onClick={() => {
          controller.sortFilterColumn(col, true);
          onClose();
        }}
      >
        {t.sortAsc}
      </button>
      <button
        type="button"
        className="calc-filter-item"
        onClick={() => {
          controller.sortFilterColumn(col, false);
          onClose();
        }}
      >
        {t.sortDesc}
      </button>
      <button
        type="button"
        className="calc-filter-item"
        disabled={values.every((v) => !v.hidden) && !existing}
        onClick={() => {
          controller.setFilterExcluded(col, []);
          controller.setFilterCondition(col, null);
          onClose();
        }}
      >
        {t.clearColumn}
      </button>
      <div className="calc-filter-condition">
        <select className="wr-select" aria-label={t.condition} value={op} onChange={(event) => setOp(event.target.value as FilterOp | '')}>
          <option value="">{t.noCondition}</option>
          <optgroup label={t.condition}>
            {TEXT_OPS.map((o) => (
              <option key={o} value={o}>
                {t.ops[o]}
              </option>
            ))}
            {NUMBER_OPS.map((o) => (
              <option key={o} value={o}>
                {t.ops[o]}
              </option>
            ))}
          </optgroup>
        </select>
        {op !== '' && <input className="calc-filter-search" type="text" value={a} placeholder={t.value} aria-label={t.value} onChange={(event) => setA(event.target.value)} />}
        {op === 'between' && <input className="calc-filter-search" type="text" value={b} placeholder={t.valueTo} aria-label={t.valueTo} onChange={(event) => setB(event.target.value)} />}
      </div>
      <input className="calc-filter-search" type="search" value={query} placeholder={t.search} aria-label={t.search} autoFocus onChange={(event) => setQuery(event.target.value)} />
      <div className="calc-filter-list" role="group">
        <label className="calc-filter-row">
          <input
            type="checkbox"
            checked={allShownChecked}
            onChange={() =>
              setChecked((current) => {
                const next = new Set(current);
                for (const v of shown) {
                  if (allShownChecked) next.delete(v.value);
                  else next.add(v.value);
                }
                return next;
              })
            }
          />
          <span>{t.selectAll}</span>
        </label>
        {shown.map((v) => (
          <label key={v.value} className="calc-filter-row">
            <input type="checkbox" checked={checked.has(v.value)} onChange={() => toggle(v.value)} />
            <span className="calc-filter-value">{label(v.value)}</span>
            <span className="calc-filter-count">{v.count}</span>
          </label>
        ))}
      </div>
      <div className="calc-filter-actions">
        <button type="button" className="wr-text-btn" onClick={onClose}>
          {t.cancel}
        </button>
        <button type="button" className="wr-text-btn is-primary" onClick={apply}>
          {t.apply}
        </button>
      </div>
    </div>
  );
};
