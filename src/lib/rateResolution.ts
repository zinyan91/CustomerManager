import type { LoanContract, RateAdjustmentHistoryItem } from '../types';
import { diffDays } from './calcMath';
import { getContractRateHistory } from './utils';

export type RateSourceKind = 'preferential' | 'floating' | 'adjustment' | 'contract';

export interface RateTimelinePoint {
  fromDate: string;
  ratePercent: number;
  kind: RateSourceKind;
  label: string;
  forecast: boolean;
}

export interface RateSegment {
  fromDate: string;
  toDate: string;
  days: number;
  ratePercent: number;
  kind: RateSourceKind;
  label: string;
  forecast: boolean;
}

export interface RateTimelineInput {
  startDate?: string | null;
  preferentialRate?: number | null;
  preferentialPeriodMonths?: number | null;
  postPreferentialRate?: number | null;
  baseRate?: number | null;
  marginRate?: number | null;
  normalRate?: number | null;
  interestRate?: number | null;
  rateHistory?: RateAdjustmentHistoryItem[];
}

export interface RateTimelineOptions {
  today?: string | null;
}

const DEFAULT_RATE_PERCENT = 8.5;

function toPercent(v?: number | null): number {
  if (v === undefined || v === null || isNaN(v)) return 0;
  if (v <= 0) return 0;
  return v <= 1 ? v * 100 : v;
}

function addMonthsClamped(dateStr: string, months: number): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const total = m + months;
  const targetYear = y + Math.floor(total / 12);
  const targetMonth = ((total % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function floatingRatePercent(input: RateTimelineInput): number {
  const base = toPercent(input.baseRate);
  const margin = toPercent(input.marginRate);
  if (base > 0) return base + margin;

  const postPref = toPercent(input.postPreferentialRate);
  if (postPref > 0) return postPref;

  const normal = toPercent(input.normalRate);
  if (normal > 0) return normal;

  return toPercent(input.interestRate);
}

function fmtDayMonthYear(iso: string): string {
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

/**
 * Dựng MỘT dòng thời gian lãi suất duy nhất cho khoản vay.
 *
 * Thứ tự ưu tiên, sau đè lên trước:
 *  1. Lãi ưu đãi cho `preferentialPeriodMonths` tháng đầu kể từ ngày giải ngân
 *  2. Hết ưu đãi chuyển sang thả nổi = base rate + biên
 *  3. Từng mốc trong bảng điều chỉnh lãi suất ghi đè theo `effectiveDate`
 *
 * Trước đây ba việc này nằm ở ba nơi và loại trừ nhau: hễ hợp đồng có một mốc
 * điều chỉnh là kỳ ưu đãi bị bỏ hoàn toàn khỏi cách tính.
 *
 * Lãi suất nhận cả dạng thập phân (0.095) và dạng phần trăm (9.5); giá trị trên
 * 1 được coi là phần trăm, theo đúng quy ước đang dùng trong dự án. Kết quả luôn
 * trả về theo phần trăm/năm.
 */
export function buildRateTimeline(
  input: RateTimelineInput,
  options?: RateTimelineOptions
): RateTimelinePoint[] {
  const today = options?.today ?? null;
  const start = input.startDate || '';

  const prefRate = toPercent(input.preferentialRate);
  const prefMonths = input.preferentialPeriodMonths || 0;
  const floating = floatingRatePercent(input);

  const points: RateTimelinePoint[] = [];

  if (start) {
    if (prefRate > 0 && prefMonths > 0) {
      points.push({
        fromDate: start,
        ratePercent: prefRate,
        kind: 'preferential',
        label: `Ưu đãi ${prefMonths} tháng đầu`,
        forecast: false,
      });
      const afterPref = addMonthsClamped(start, prefMonths);
      const afterRate = floating > 0 ? floating : prefRate;
      points.push({
        fromDate: afterPref,
        ratePercent: afterRate,
        kind: 'floating',
        label: 'Thả nổi (base + biên)',
        forecast: !!(today && afterPref > today),
      });
    } else {
      const opening = floating > 0 ? floating : (prefRate > 0 ? prefRate : DEFAULT_RATE_PERCENT);
      points.push({
        fromDate: start,
        ratePercent: opening,
        kind: floating > 0 ? 'floating' : 'contract',
        label: floating > 0 ? 'Thả nổi (base + biên)' : 'Lãi suất hợp đồng',
        forecast: false,
      });
    }
  }

  for (const item of input.rateHistory || []) {
    if (!item?.effectiveDate) continue;
    const explicit = toPercent(item.ratePercent);
    const composed = toPercent(item.baseRatePercent) + toPercent(item.marginPercent);
    const rate = explicit > 0 ? explicit : composed;
    if (rate <= 0) continue;
    points.push({
      fromDate: item.effectiveDate,
      ratePercent: rate,
      kind: 'adjustment',
      label: `Điều chỉnh ${fmtDayMonthYear(item.effectiveDate)}`,
      forecast: false,
    });
  }

  points.sort((a, b) => {
    if (a.fromDate !== b.fromDate) return a.fromDate.localeCompare(b.fromDate);
    return rankOf(a.kind) - rankOf(b.kind);
  });

  const deduped: RateTimelinePoint[] = [];
  for (const p of points) {
    const last = deduped[deduped.length - 1];
    if (last && last.fromDate === p.fromDate) {
      deduped[deduped.length - 1] = p;
      continue;
    }
    deduped.push(p);
  }
  return deduped;
}

function rankOf(kind: RateSourceKind): number {
  if (kind === 'adjustment') return 3;
  if (kind === 'floating') return 2;
  if (kind === 'preferential') return 1;
  return 0;
}

export function buildContractRateTimeline(
  c?: LoanContract | null,
  options?: RateTimelineOptions
): RateTimelinePoint[] {
  if (!c) return [];
  return buildRateTimeline({
    startDate: c.DisbursementDate || c.RepaymentStartDate || c.ContractStartDate,
    preferentialRate: c.PreferentialRate,
    preferentialPeriodMonths: c.PreferentialPeriodMonths,
    postPreferentialRate: c.PostPreferentialRate,
    baseRate: c.BaseRate,
    marginRate: c.MarginRate,
    normalRate: c.NormalRate,
    interestRate: c.InterestRate,
    rateHistory: getContractRateHistory(c),
  }, options);
}

export function resolveRateAt(
  timeline: RateTimelinePoint[],
  dateStr: string
): RateTimelinePoint | null {
  let active: RateTimelinePoint | null = null;
  for (const p of timeline) {
    if (p.fromDate <= dateStr) active = p;
    else break;
  }
  return active ?? (timeline.length > 0 ? timeline[0] : null);
}

/**
 * Cắt một kỳ trả nợ thành các đoạn lãi suất theo số ngày thực tế.
 *
 * Mốc đổi lãi suất rơi giữa kỳ thì kỳ đó có hai đoạn, đúng cách ngân hàng thực
 * tính. `totalDays` là số ngày của cả kỳ do bên gọi tính; tổng số ngày các đoạn
 * luôn bằng đúng `totalDays` để tiền lãi của kỳ không bị lệch vì làm tròn.
 */
export function splitPeriodByRate(
  timeline: RateTimelinePoint[],
  periodStart: string,
  periodEnd: string,
  totalDays: number
): RateSegment[] {
  const opening = resolveRateAt(timeline, periodStart);
  const fallback: RateSegment = {
    fromDate: periodStart,
    toDate: periodEnd,
    days: totalDays,
    ratePercent: opening?.ratePercent ?? 0,
    kind: opening?.kind ?? 'contract',
    label: opening?.label ?? 'Lãi suất hợp đồng',
    forecast: opening?.forecast ?? false,
  };

  if (totalDays <= 0 || !periodStart || !periodEnd) return [fallback];

  const interior = timeline.filter(p => p.fromDate > periodStart && p.fromDate < periodEnd);
  if (interior.length === 0) return [fallback];

  const cuts = [
    { date: periodStart, point: opening },
    ...interior.map(p => ({ date: p.fromDate, point: p as RateTimelinePoint | null })),
  ];

  const segments: RateSegment[] = [];
  let usedDays = 0;

  for (let i = 0; i < cuts.length; i++) {
    const from = cuts[i].date;
    const to = i + 1 < cuts.length ? cuts[i + 1].date : periodEnd;
    const isLast = i === cuts.length - 1;
    const days = isLast
      ? Math.max(0, totalDays - usedDays)
      : Math.min(diffDays(from, to), Math.max(0, totalDays - usedDays));
    usedDays += days;

    const p = cuts[i].point;
    segments.push({
      fromDate: from,
      toDate: to,
      days,
      ratePercent: p?.ratePercent ?? 0,
      kind: p?.kind ?? 'contract',
      label: p?.label ?? 'Lãi suất hợp đồng',
      forecast: p?.forecast ?? false,
    });
  }

  return segments.filter(s => s.days > 0);
}

export function weightedRatePercent(segments: RateSegment[]): number {
  const totalDays = segments.reduce((s, x) => s + x.days, 0);
  if (totalDays <= 0) return segments.length > 0 ? segments[0].ratePercent : 0;
  const acc = segments.reduce((s, x) => s + x.ratePercent * x.days, 0);
  return acc / totalDays;
}

export function formatSegmentsLabel(segments: RateSegment[]): string {
  if (segments.length === 0) return '';
  const uniq: number[] = [];
  for (const s of segments) {
    if (uniq[uniq.length - 1] !== s.ratePercent) uniq.push(s.ratePercent);
  }
  return uniq.map(r => `${r.toFixed(2).replace('.', ',')}%`).join(' → ');
}
