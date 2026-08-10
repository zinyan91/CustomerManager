import React from 'react';
import { TABLE_CELL, TABLE_HEAD } from '../lib/uiClasses';

export type FieldPriority = 1 | 2 | 3;

export interface AdaptiveColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  priority: FieldPriority;
  align?: 'left' | 'right' | 'center';
  headerOnly?: boolean;
}

interface AdaptiveTableProps<T> {
  columns: AdaptiveColumn<T>[];
  rows: T[];
  rowKey: (row: T) => React.Key;
  onRowClick?: (row: T) => void;
  isSelected?: (row: T) => boolean;
  emptyText: string;
  cardTitle: (row: T) => React.ReactNode;
  cardSubtitle?: (row: T) => React.ReactNode;
  actions?: (row: T) => React.ReactNode;
  actionsLabel?: string;
  maxHeight?: string;
}

const alignClass = (a?: 'left' | 'right' | 'center') =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

export function AdaptiveTable<T>({
  columns, rows, rowKey, onRowClick, isSelected,
  emptyText, cardTitle, cardSubtitle, actions, actionsLabel = 'Thao tác', maxHeight,
}: AdaptiveTableProps<T>) {
  const [moRong, setMoRong] = React.useState<Set<React.Key>>(new Set());

  const toggle = (k: React.Key) =>
    setMoRong(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });

  const chinh = columns.filter(c => c.priority === 1);
  const phu = columns.filter(c => c.priority === 2);
  const an = columns.filter(c => c.priority === 3);

  if (rows.length === 0) {
    return <div className="text-center py-10 text-ink-faint text-xs">{emptyText}</div>;
  }

  return (
    <>
      <ul
        className={`md:hidden divide-y divide-line ${maxHeight ? 'overflow-y-auto' : ''}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {rows.map(row => {
          const k = rowKey(row);
          const mo = moRong.has(k);
          return (
            <li key={k} className={isSelected?.(row) ? 'bg-accent-soft' : ''}>
              <div
                className={`px-3 py-3 space-y-2 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-ink text-sm">{cardTitle(row)}</span>
                  {cardSubtitle && (
                    <span className="font-mono text-xs text-ink-muted shrink-0">{cardSubtitle(row)}</span>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {chinh.map(c => (
                    <div key={c.key} className="min-w-0">
                      <dt className={`${TABLE_HEAD} bg-transparent font-semibold`}>{c.label}</dt>
                      <dd className="text-xs text-ink truncate">{c.render(row)}</dd>
                    </div>
                  ))}
                </dl>

                {mo && (phu.length > 0 || an.length > 0) && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1.5 border-t border-line">
                    {[...phu, ...an].map(c => (
                      <div key={c.key} className="min-w-0">
                        <dt className={`${TABLE_HEAD} bg-transparent font-semibold`}>{c.label}</dt>
                        <dd className="text-xs text-ink truncate">{c.render(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>

              <div className="px-3 pb-2.5 flex items-center justify-between gap-2">
                {(phu.length > 0 || an.length > 0) ? (
                  <button
                    type="button"
                    onClick={() => toggle(k)}
                    aria-expanded={mo}
                    className="text-[11px] font-semibold text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded"
                  >
                    {mo ? 'Thu gọn' : `Xem thêm ${phu.length + an.length} mục`}
                  </button>
                ) : <span />}
                {actions && <div className="flex items-center gap-1.5">{actions(row)}</div>}
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className={`hidden md:block overflow-x-auto ${maxHeight ? 'overflow-y-auto' : ''}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead className={`${TABLE_HEAD} ${maxHeight ? 'sticky top-0 z-10' : ''}`}>
            <tr className="border-b border-line">
              {columns.map(c => (
                <th key={c.key} className={`${TABLE_CELL} font-semibold whitespace-nowrap ${alignClass(c.align)}`}>
                  {c.label}
                </th>
              ))}
              {actions && (
                <th className={`${TABLE_CELL} font-semibold whitespace-nowrap text-center sticky right-0 z-20 bg-panel-muted border-l border-line`}>
                  {actionsLabel}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const chon = isSelected?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`group border-b border-line/60 transition-colors duration-150 ${
                    chon ? 'bg-accent-soft' : 'hover:bg-panel-muted'
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map(c => (
                    <td key={c.key} className={`${TABLE_CELL} whitespace-nowrap ${alignClass(c.align)}`}>
                      {c.render(row)}
                    </td>
                  ))}
                  {actions && (
                    <td
                      className={`${TABLE_CELL} text-center whitespace-nowrap sticky right-0 z-10 border-l border-line ${
                        chon ? 'bg-accent-soft' : 'bg-panel group-hover:bg-panel-muted'
                      }`}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
