import type { OfficialDocInput } from '../../types/officialDoc';
import { isCategory } from './categories';

/** YYYY-MM-DD và là ngày có thật (loại 2026-13-40, 2026-02-30). */
function isRealIsoDate(value: string | null | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Trả thông điệp lỗi tiếng Việt, hoặc null nếu hợp lệ. */
export function validateOfficialDoc(input: OfficialDocInput): string | null {
  if (!input.docNumber.trim()) return 'Nhập số hiệu văn bản.';
  if (!input.title.trim()) return 'Nhập tiêu đề văn bản.';
  if (!isCategory(input.category)) return 'Chọn mục cho văn bản.';
  if (!isRealIsoDate(input.issuedDate)) return 'Nhập ngày ban hành hợp lệ.';
  if (!isRealIsoDate(input.effectiveFrom)) return 'Nhập ngày hiệu lực hợp lệ.';
  if (input.effectiveTo && !isRealIsoDate(input.effectiveTo)) return 'Ngày hết hiệu lực không hợp lệ.';
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
    return 'Ngày hết hiệu lực không được trước ngày hiệu lực.';
  }
  return null;
}
