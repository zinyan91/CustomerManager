export type DocSortKey = 'docNumber' | 'title' | 'issuedDate' | 'effectiveFrom' | 'effectiveTo';
export type SortDirection = 'asc' | 'desc';

export interface DocSort {
  key: DocSortKey;
  dir: SortDirection;
}

/** Mới ban hành nhất lên đầu: thứ tự người dùng gặp khi chưa bấm gì. */
export const DEFAULT_DOC_SORT: DocSort = { key: 'issuedDate', dir: 'desc' };

export const SORT_COLUMN: Record<DocSortKey, string> = {
  docNumber: 'DocNumber',
  title: 'Title',
  issuedDate: 'IssuedDate',
  effectiveFrom: 'EffectiveFrom',
  effectiveTo: 'EffectiveTo',
};

const isDateKey = (key: DocSortKey) => key !== 'docNumber' && key !== 'title';

/** Bấm tiêu đề cột: cột mới thì chiều tự nhiên (ngày: mới trước; chữ: A đến Z); cột đang sắp thì đảo chiều. */
export function nextSort(current: DocSort, key: DocSortKey): DocSort {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: isDateKey(key) ? 'desc' : 'asc' };
}

/** Thứ tự các cột sắp xếp gửi lên DB: cột chọn, rồi ngày ban hành mới nhất, rồi Id để kết quả ổn định giữa các trang. */
export function sortOrder(sort: DocSort): Array<{ column: string; ascending: boolean }> {
  const orders = [{ column: SORT_COLUMN[sort.key], ascending: sort.dir === 'asc' }];
  if (sort.key !== 'issuedDate') orders.push({ column: SORT_COLUMN.issuedDate, ascending: false });
  orders.push({ column: 'Id', ascending: false });
  return orders;
}

export function ariaSort(sort: DocSort, key: DocSortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.dir === 'asc' ? 'ascending' : 'descending';
}
