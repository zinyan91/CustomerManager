import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import type { KqkdColumn, KqkdRow, KqkdSheet } from '../../types/businessResult';
import {
  addRow, cellValue, formatKqkdNumber, moveColumn, moveRow, parseKqkdInput, periodColumns,
  removeColumn, removeRow, rowNumbers, setCell, updateColumn, updateRow,
} from '../../lib/businessResult/sheet';
import { fmtDecimals, parseDecimalNumber } from '../../lib/utils';

interface Props {
  sheet: KqkdSheet;
  editing: boolean;
  onEdit: (fn: (s: KqkdSheet) => KqkdSheet) => void;
}

const fmt = (v: number | null) => formatKqkdNumber(v, (n, d) => fmtDecimals(n, d, ''));
const parse = (s: string) => parseKqkdInput(s, parseDecimalNumber);

const cellInput =
  'w-full min-w-0 bg-transparent px-1.5 py-1 rounded-[var(--r-control)] border text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

const iconBtn =
  'inline-flex h-5 w-5 items-center justify-center rounded text-ink-muted hover:bg-panel-muted hover:text-ink cursor-pointer disabled:opacity-30 disabled:cursor-default';

/** Ô chữ: sửa tại chỗ, ghi khi rời ô hoặc nhấn Enter. */
function TextCell({ value, onCommit, label, className = '' }: { value: string; onCommit: (v: string) => void; label: string; className?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => { if (text !== value) onCommit(text); };
  return (
    <input
      aria-label={label}
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setText(value); }}
      className={`${cellInput} border-line/60 ${className}`}
    />
  );
}

/** Ô số: nhận "1.234", "(212)", "-" hoặc để trống; gõ sai thì viền đỏ và không ghi. */
function NumberCell({ value, onCommit, label }: { value: number | null; onCommit: (v: number | null) => void; label: string }) {
  const shown = value === null ? '' : fmt(value);
  const [text, setText] = useState(shown);
  const [bad, setBad] = useState(false);
  useEffect(() => { setText(shown); setBad(false); }, [shown]);
  const commit = () => {
    if (text === shown) return;
    const v = parse(text);
    if (v === undefined) { setBad(true); return; }
    setBad(false);
    onCommit(v);
  };
  return (
    <input
      aria-label={label}
      aria-invalid={bad || undefined}
      inputMode="decimal"
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setText(shown); setBad(false); } }}
      className={`${cellInput} text-right font-mono ${bad ? 'border-neg' : 'border-line/60'}`}
    />
  );
}

function ColumnHeader({ sheet, col, index, editing, onEdit }: { sheet: KqkdSheet; col: KqkdColumn; index: number; editing: boolean; onEdit: Props['onEdit'] }) {
  const computed = col.kind !== 'value';
  const thClass = `text-center align-top whitespace-nowrap ${computed ? 'bg-panel-muted' : ''}`;
  if (!editing) return <th className={thClass}>{col.label}</th>;

  const sources = sheet.columns.filter(c => c.kind === 'value');
  const periods = periodColumns(sheet);
  return (
    <th className={`${thClass} min-w-[8.5rem]`}>
      <div className="space-y-1">
        <TextCell value={col.label} label={`Tên cột ${col.label}`} onCommit={v => onEdit(s => updateColumn(s, col.id, { label: v }))} className="text-center font-semibold" />
        {col.kind === 'diff' && (
          <div className="flex items-center gap-0.5 font-normal">
            <select aria-label="Cột bị trừ" value={col.minuend} onChange={e => onEdit(s => updateColumn(s, col.id, { minuend: e.target.value }))} className="w-full text-[10px] bg-surface border border-line/60 rounded">
              {periods.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <span aria-hidden="true">−</span>
            <select aria-label="Cột trừ" value={col.subtrahend} onChange={e => onEdit(s => updateColumn(s, col.id, { subtrahend: e.target.value }))} className="w-full text-[10px] bg-surface border border-line/60 rounded">
              {periods.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        )}
        {col.kind === 'gap' && (
          <select aria-label="Cột kế hoạch" value={col.plan} onChange={e => onEdit(s => updateColumn(s, col.id, { plan: e.target.value }))} className="w-full text-[10px] font-normal bg-surface border border-line/60 rounded">
            {sources.map(c => <option key={c.id} value={c.id}>KH: {c.label}</option>)}
          </select>
        )}
        <div className="flex items-center justify-center gap-0.5">
          <button type="button" className={iconBtn} disabled={index === 0} onClick={() => onEdit(s => moveColumn(s, col.id, -1))} aria-label={`Chuyển cột ${col.label} sang trái`}><ChevronLeft className="h-3.5 w-3.5" /></button>
          <button type="button" className={iconBtn} disabled={index === sheet.columns.length - 1} onClick={() => onEdit(s => moveColumn(s, col.id, 1))} aria-label={`Chuyển cột ${col.label} sang phải`}><ChevronRight className="h-3.5 w-3.5" /></button>
          <button type="button" className={`${iconBtn} hover:text-neg`} onClick={() => onEdit(s => removeColumn(s, col.id))} aria-label={`Xóa cột ${col.label}`}><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </th>
  );
}

function RowCells({ sheet, row, editing, onEdit }: { sheet: KqkdSheet; row: KqkdRow; editing: boolean; onEdit: Props['onEdit'] }) {
  return (
    <>
      {sheet.columns.map(col => {
        const computed = col.kind !== 'value';
        const v = cellValue(sheet, row, col);
        const tone = v !== null && v < 0 ? 'text-neg' : '';
        if (editing && !computed) {
          return (
            <td key={col.id} className="p-0.5">
              <NumberCell value={v} label={`${row.label} – ${col.label}`} onCommit={n => onEdit(s => setCell(s, row.id, col.id, n))} />
            </td>
          );
        }
        return (
          <td key={col.id} className={`text-right font-mono whitespace-nowrap ${computed ? 'bg-panel-muted/60' : ''} ${tone} ${row.sub ? 'italic' : ''}`}>
            {fmt(v)}
          </td>
        );
      })}
    </>
  );
}

export function BusinessResultTable({ sheet, editing, onEdit }: Props) {
  const nums = rowNumbers(sheet);
  return (
    <div className="overflow-x-auto bg-panel">
      <table className="table-fintech w-full text-xs">
        <thead>
          <tr>
            <th className="w-10 text-center sticky left-0 z-10 bg-panel-muted">STT</th>
            <th className="text-left min-w-[13rem] sticky left-10 z-10 bg-panel-muted">Chỉ tiêu</th>
            <th className="text-center w-24">ĐVT</th>
            {sheet.columns.map((col, i) => (
              <ColumnHeader key={col.id} sheet={sheet} col={col} index={i} editing={editing} onEdit={onEdit} />
            ))}
            {editing && <th className="text-center w-40">Dòng</th>}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((row, i) => (
            <tr key={row.id}>
              <td className="text-center sticky left-0 z-[1] bg-panel font-semibold">{nums.get(row.id) ?? ''}</td>
              <td className={`sticky left-10 z-[1] bg-panel ${row.sub ? 'italic pl-6' : 'font-semibold text-ink'}`}>
                {editing
                  ? <TextCell value={row.label} label="Tên chỉ tiêu" onCommit={v => onEdit(s => updateRow(s, row.id, { label: v }))} />
                  : row.sub ? `+ ${row.label}` : row.label}
              </td>
              <td className={`text-center text-ink-muted ${row.sub ? 'italic' : ''}`}>
                {editing
                  ? <TextCell value={row.unit} label={`Đơn vị tính ${row.label}`} onCommit={v => onEdit(s => updateRow(s, row.id, { unit: v }))} className="text-center" />
                  : row.unit}
              </td>
              <RowCells sheet={sheet} row={row} editing={editing} onEdit={onEdit} />
              {editing && (
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <label className="flex items-center gap-1 text-[10px] text-ink-muted cursor-pointer" title="Dòng chi tiết của dòng chính phía trên">
                      <input type="checkbox" checked={row.sub} onChange={e => onEdit(s => updateRow(s, row.id, { sub: e.target.checked }))} className="accent-accent" />
                      Con
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-ink-muted cursor-pointer" title="Số phát sinh trong kỳ: GAP so với tổng các mốc. Bỏ chọn: số dư, GAP so với mốc gần nhất.">
                      <input type="checkbox" checked={row.cumulative} onChange={e => onEdit(s => updateRow(s, row.id, { cumulative: e.target.checked }))} className="accent-accent" />
                      Cộng dồn
                    </label>
                    <button type="button" className={iconBtn} disabled={i === 0} onClick={() => onEdit(s => moveRow(s, row.id, -1))} aria-label={`Chuyển dòng ${row.label} lên`}><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" className={iconBtn} disabled={i === sheet.rows.length - 1} onClick={() => onEdit(s => moveRow(s, row.id, 1))} aria-label={`Chuyển dòng ${row.label} xuống`}><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" className={iconBtn} onClick={() => onEdit(s => addRow(s, row.id))} aria-label={`Thêm dòng dưới ${row.label}`}><Plus className="h-3.5 w-3.5" /></button>
                    <button type="button" className={`${iconBtn} hover:text-neg`} onClick={() => onEdit(s => removeRow(s, row.id))} aria-label={`Xóa dòng ${row.label}`}><X className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
