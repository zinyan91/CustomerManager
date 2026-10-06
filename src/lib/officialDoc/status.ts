import type { OfficialDocStatus } from '../../types/officialDoc';

/**
 * Tình trạng luôn tính sống từ ngày, không lưu: lưu thì sẽ cũ ngay khi qua ngày.
 * Mốc so sánh là chuỗi YYYY-MM-DD nên so sánh chuỗi là đúng thứ tự thời gian.
 */
export function computeStatus(effectiveFrom: string, effectiveTo: string | null, today: string): OfficialDocStatus {
  if (effectiveFrom > today) return 'upcoming';
  if (effectiveTo && effectiveTo < today) return 'expired';
  return 'active';
}

const LABELS: Record<OfficialDocStatus, string> = {
  upcoming: 'Chưa hiệu lực',
  active: 'Hiện hành',
  expired: 'Hết hiệu lực',
};

export const STATUS_OPTIONS: ReadonlyArray<{ id: OfficialDocStatus; label: string }> = (
  ['active', 'upcoming', 'expired'] as const
).map((id) => ({ id, label: LABELS[id] }));

export function statusLabel(status: OfficialDocStatus): string {
  return LABELS[status];
}
