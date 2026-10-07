import { effectiveModules } from './adminOverview';
import type { ModuleId } from './modules';
import type { AdminUser } from './userAdmin';

export const TRANSFER_COUNT_KEYS = [
  'customers', 'creditContracts', 'loans', 'collaterals', 'mortgages', 'cards', 'postLoan', 'dispatches',
] as const;
export type TransferCountKey = (typeof TRANSFER_COUNT_KEYS)[number];
export type TransferCounts = Record<TransferCountKey, number>;

export const TRANSFER_COUNT_LABELS: Record<TransferCountKey, string> = {
  customers: 'Khách hàng',
  creditContracts: 'Hợp đồng tín dụng',
  loans: 'Khoản vay (KUNN)',
  collaterals: 'Tài sản bảo đảm',
  mortgages: 'Hợp đồng thế chấp',
  cards: 'Hợp đồng thẻ',
  postLoan: 'Kiểm soát sau vay',
  dispatches: 'Văn bản Văn thư gắn khách',
};

export interface TransferCustomer {
  id: number;
  cif: string;
  name: string;
}

/** Đọc kết quả hàm chuyển giao/xem trước. Thiếu hay sai kiểu thì báo lỗi, không đoán thành 0. */
export function parseTransferCounts(raw: unknown): TransferCounts {
  const obj = raw as Record<string, unknown> | null;
  const out = {} as TransferCounts;
  for (const key of TRANSFER_COUNT_KEYS) {
    const value = obj?.[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`Máy chủ trả về số liệu chuyển giao không hợp lệ (thiếu "${key}").`);
    }
    out[key] = value;
  }
  return out;
}

/** Tài khoản nhận được khách: có vai trò, chưa bị khóa, khác người chuyển. */
export function transferTargets(users: readonly AdminUser[], fromId: string | null): AdminUser[] {
  return users.filter((u) => u.role !== null && !u.disabled && u.id !== fromId);
}

export function transferBlocker(input: { fromId: string | null; toId: string | null; selectedCount: number }): string | null {
  if (!input.fromId) return 'Chọn người chuyển.';
  if (!input.toId) return 'Chọn người nhận.';
  if (input.fromId === input.toId) return 'Người chuyển và người nhận phải khác nhau.';
  if (input.selectedCount === 0) return 'Chọn ít nhất một khách hàng.';
  return null;
}

/** Cảnh báo (không chặn): người nhận không có module Hồ sơ tín dụng thì không thấy khách vừa nhận. */
export function transferWarning(target: AdminUser | null, storedModules: readonly ModuleId[] | undefined): string | null {
  if (!target) return null;
  if (!effectiveModules(target, storedModules).includes('credit')) {
    return 'Người nhận chưa có module Hồ sơ tín dụng nên sẽ không thấy các khách này.';
  }
  return null;
}

export function toggleSelected(selected: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Bấm "chọn tất cả": đã chọn hết thì bỏ chọn hết, ngược lại chọn hết. */
export function toggleAll(customers: readonly TransferCustomer[], selected: ReadonlySet<number>): Set<number> {
  return customers.length > 0 && customers.every((c) => selected.has(c.id)) ? new Set() : new Set(customers.map((c) => c.id));
}

export function confirmQuestion(counts: TransferCounts, fromName: string, toName: string): string {
  const related = TRANSFER_COUNT_KEYS.filter((k) => k !== 'customers' && counts[k] > 0)
    .map((k) => `${counts[k]} ${TRANSFER_COUNT_LABELS[k].toLowerCase()}`)
    .join(', ');
  const tail = related ? ` cùng ${related}` : '';
  return `Chuyển ${counts.customers} khách hàng${tail} từ ${fromName} sang ${toName}? Người nhận sẽ thấy và sửa các hồ sơ này, người chuyển không còn thấy nữa.`;
}
