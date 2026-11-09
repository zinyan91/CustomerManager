export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string = string> {
  key: K;
  direction: SortDirection;
}

export type SortAccessors<T, K extends string> = Record<K, (row: T) => string | number>;

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

export function nextSortState<K extends string>(current: SortState<K> | null, key: K): SortState<K> | null {
  if (!current || current.key !== key) return { key, direction: 'asc' };
  if (current.direction === 'asc') return { key, direction: 'desc' };
  return null;
}

export function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: SortState<K> | null,
  accessors: SortAccessors<T, K>,
): T[] {
  if (!sort) return [...rows];
  const read = accessors[sort.key];
  const sign = sort.direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: read(row) }))
    .sort((a, b) => {
      const diff = typeof a.value === 'number' && typeof b.value === 'number'
        ? a.value - b.value
        : collator.compare(String(a.value), String(b.value));
      return diff !== 0 ? diff * sign : a.index - b.index;
    })
    .map(entry => entry.row);
}
