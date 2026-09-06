import React, { useState, memo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type FieldPriority = 1 | 2 | 3;

export interface ColumnDef<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  priority?: FieldPriority;
  align?: 'left' | 'right' | 'center';
  width?: string;
  headerOnly?: boolean;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => React.Key;
  onRowClick?: (row: T) => void;
  isSelected?: (row: T) => boolean;
  emptyText?: React.ReactNode;
  cardTitle?: (row: T) => React.ReactNode;
  cardSubtitle?: (row: T) => React.ReactNode;
  actions?: (row: T) => React.ReactNode;
  actionsLabel?: string;
  maxHeight?: string;
  stickyHeader?: boolean;
  className?: string;
}

const alignClass = (a?: 'left' | 'right' | 'center') =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

function DataTableImpl<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isSelected,
  emptyText = 'Không có dữ liệu',
  cardTitle,
  cardSubtitle,
  actions,
  actionsLabel = 'Thao tác',
  maxHeight,
  stickyHeader = true,
  className = '',
}: DataTableProps<T>) {
  const [expandedKeys, setExpandedKeys] = useState<Set<React.Key>>(new Set());

  const toggleExpand = (k: React.Key) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const p1 = columns.filter((c) => (c.priority ?? 1) === 1);
  const p2 = columns.filter((c) => c.priority === 2);
  const p3 = columns.filter((c) => c.priority === 3);

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-ink-faint text-[var(--fs-body)]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className={`w-full font-app ${className}`}>
      {/* Mobile Card List (md:hidden) */}
      <ul
        className={`md:hidden space-y-3 ${maxHeight ? 'overflow-y-auto' : ''}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {rows.map((row) => {
          const k = rowKey(row);
          const isExpanded = expandedKeys.has(k);
          const title = cardTitle ? cardTitle(row) : String(k);

          return (
            <li
              key={k}
              className={`rounded-[var(--r-panel)] border transition-all p-4 space-y-3 shadow-xs ${
                isSelected?.(row)
                  ? 'border-accent/50 bg-accent-soft/70 shadow-sm ring-1 ring-accent/30'
                  : 'border-line/70 bg-panel hover:bg-surface/70'
              }`}
            >
              <div
                className={`space-y-2.5 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                <div className="flex items-baseline justify-between gap-2 pb-2 border-b border-line/50">
                  <span className="font-bold text-ink text-[var(--fs-title)] tracking-tight">
                    {title}
                  </span>
                  {cardSubtitle && (
                    <span className="font-mono text-xs text-accent font-bold shrink-0">
                      {cardSubtitle(row)}
                    </span>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {p1.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-[var(--fs-label)] font-bold uppercase tracking-wider text-ink-faint">
                        {c.label}
                      </dt>
                      <dd className="text-xs text-ink font-medium truncate mt-0.5">
                        {c.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {isExpanded && (p2.length > 0 || p3.length > 0) && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2.5 border-t border-line/40 animate-in fade-in duration-150">
                    {[...p2, ...p3].map((c) => (
                      <div key={c.key} className="min-w-0">
                        <dt className="text-[var(--fs-label)] font-bold uppercase tracking-wider text-ink-faint">
                          {c.label}
                        </dt>
                        <dd className="text-xs text-ink font-medium truncate mt-0.5">
                          {c.render(row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                {(p2.length > 0 || p3.length > 0) && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(k)}
                    className="text-accent hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" /> Thu gọn
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" /> Chi tiết
                      </>
                    )}
                  </button>
                )}
                {actions && <div className="ml-auto">{actions(row)}</div>}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop Table (hidden md:block) */}
      <div
        className={`hidden md:block overflow-x-auto rounded-2xl border border-line/65 bg-panel shadow-xs ${maxHeight ? 'overflow-y-auto' : ''}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full text-left text-xs border-collapse font-app">
          <thead className={`${stickyHeader ? 'sticky top-0 z-20 bg-surface' : 'bg-surface'} border-b border-line/80 text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint ${maxHeight ? 'shadow-2xs' : ''}`}>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 whitespace-nowrap text-ink-faint ${alignClass(c.align)}`}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.label}
                </th>
              ))}
              {actions && (
                <th
                  className="px-4 py-3 whitespace-nowrap text-center sticky right-0 z-20 bg-surface border-l border-line/70 text-ink-faint"
                >
                  {actionsLabel}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {rows.map((row) => {
              const k = rowKey(row);
              const selected = isSelected?.(row);

              return (
                <tr
                  key={k}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`group transition-colors duration-150 ${
                    selected ? 'bg-accent-soft/70 border-l-2 border-l-accent font-medium' : 'hover:bg-accent/[0.04]'
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-3 whitespace-nowrap text-ink ${alignClass(c.align)}`}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                  {actions && (
                    <td
                      className={`px-4 py-2.5 text-center whitespace-nowrap sticky right-0 z-10 border-l border-line/50 transition-colors ${
                        selected ? 'bg-accent-soft/80' : 'bg-panel/95 group-hover:bg-surface/95'
                      }`}
                      onClick={(e) => e.stopPropagation()}
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
    </div>
  );
}

export const DataTable = memo(DataTableImpl) as typeof DataTableImpl;
