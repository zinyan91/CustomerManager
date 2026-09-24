import type { Customer } from '../types';

export type CustomerStatusFilter = 'active' | 'archived' | 'ALL';

export const CUSTOMER_STATUS_LABEL: Record<CustomerStatusFilter, string> = {
  active: 'Đang làm việc',
  archived: 'Đã lưu trữ',
  ALL: 'Tất cả',
};

export function isCustomerArchived(c?: Customer | null): boolean {
  if (!c) return false;
  const at = c.ArchivedAt;
  if (at === null || at === undefined) return false;
  return String(at).trim().length > 0;
}

export function filterCustomersByStatus(
  customers: Customer[] | null | undefined,
  status: CustomerStatusFilter
): Customer[] {
  if (!customers) return [];
  if (status === 'ALL') return customers.slice();
  const archived = status === 'archived';
  return customers.filter(c => isCustomerArchived(c) === archived);
}

export interface CustomerLinkCounts {
  kunn: number;
  hdtd: number;
  collaterals: number;
  cards: number;
  mortgages: number;
}

const BLOCKER_LABEL: { key: keyof CustomerLinkCounts; noun: string }[] = [
  { key: 'kunn', noun: 'khoản vay (KUNN)' },
  { key: 'mortgages', noun: 'hợp đồng thế chấp' },
  { key: 'hdtd', noun: 'hợp đồng tín dụng' },
  { key: 'collaterals', noun: 'tài sản bảo đảm' },
  { key: 'cards', noun: 'thẻ tín dụng' },
];

export function customerDeleteBlockers(counts?: Partial<CustomerLinkCounts> | null): string[] {
  if (!counts) return [];
  return BLOCKER_LABEL
    .filter(({ key }) => (counts[key] ?? 0) > 0)
    .map(({ key, noun }) => `${counts[key]} ${noun}`);
}

export function customerDeleteBlockedMessage(blockers: string[]): string | null {
  if (blockers.length === 0) return null;
  return `Không thể xoá khách hàng: hồ sơ còn ${blockers.join(', ')}. `
    + 'Xoá các bản ghi đó trước, hoặc lưu trữ hồ sơ nếu chỉ muốn ẩn khỏi danh sách.';
}

export function countCustomersByStatus(
  customers: Customer[] | null | undefined
): Record<CustomerStatusFilter, number> {
  const list = customers || [];
  const archived = list.filter(isCustomerArchived).length;
  return {
    active: list.length - archived,
    archived,
    ALL: list.length,
  };
}
