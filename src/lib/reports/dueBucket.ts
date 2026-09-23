import { UPCOMING_DAYS } from '../duePeriod';
import { daysUntil } from '../utils';

export type DueBucket = 'overdue' | 'due' | 'upcoming' | 'none';
export type DueBucketFilter = 'all' | DueBucket;

export const REPORT_UPCOMING_DAYS = 30;

export const DUE_BUCKET_LABELS: Record<DueBucket, string> = {
  overdue: 'Quá hạn',
  due: 'Tới hạn',
  upcoming: 'Sắp tới hạn',
  none: 'Chưa tới hạn',
};

export function daysLeftOf(dateIso: string | null | undefined, todayIso?: string): number | null {
  return daysUntil(dateIso, todayIso);
}

export function dueBucketOf(dateIso: string | null | undefined, todayIso?: string): DueBucket {
  const soNgay = daysUntil(dateIso, todayIso);
  if (soNgay === null) return 'none';
  if (soNgay < 0) return 'overdue';
  if (soNgay <= UPCOMING_DAYS) return 'due';
  if (soNgay <= REPORT_UPCOMING_DAYS) return 'upcoming';
  return 'none';
}

export function matchesBucket(bucket: DueBucket, filter: DueBucketFilter): boolean {
  return filter === 'all' || bucket === filter;
}

export function dueStatusLabel(dateIso: string | null | undefined, todayIso?: string): string {
  if (daysUntil(dateIso, todayIso) === null) return '';
  return DUE_BUCKET_LABELS[dueBucketOf(dateIso, todayIso)];
}
