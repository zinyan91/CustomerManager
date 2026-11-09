import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { SortState } from '../../lib/tableSort';

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  sort: SortState<K> | null;
  onSort: (key: K) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
  rowSpan?: number;
}

export function SortableHeader<K extends string>({
  label, sortKey, sort, onSort, align = 'left', className = '', rowSpan,
}: SortableHeaderProps<K>) {
  const active = sort?.key === sortKey ? sort.direction : null;
  const Icon = active === 'asc' ? ArrowUp : active === 'desc' ? ArrowDown : ArrowUpDown;
  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th
      rowSpan={rowSpan}
      aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none'}
      className={`p-0 ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex w-full items-center gap-1 px-2.5 py-2.5 ${justify} hover:text-ink focus-visible:outline-2 focus-visible:outline-accent cursor-pointer`}
      >
        <span>{label}</span>
        <Icon className={`w-3 h-3 shrink-0 ${active ? 'text-accent' : 'opacity-40'}`} aria-hidden="true" />
      </button>
    </th>
  );
}
