import type { LoanContract, RateAdjustmentHistoryItem } from '../types';
import { diffDays } from './calcMath';
import { getContractRateHistory, todayIso } from './utils';

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
  rateFloorAnnual?: number | null;
  conditionSurchargePercent?: number | null;
  rateHistory?: RateAdjustmentHistoryItem[];
}

export interface RateTimelineOptions {
  today?: string | null;
}


function toPercent(v?: number | null): number {
  if (v === undefined || v === null || isNaN(v)) return 0;
  if (v <= 0) return 0;
  return v <= 1 ? v * 100 : v;
}

function toPercentSigned(v?: number | null): number {
  if (v === undefined || v === null || isNaN(v)) return 0;
  return Math.abs(v) <= 1 ? v * 100 : v;
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

function surchargePoints(input: RateTimelineInput): number {
  const v = input.conditionSurchargePercent;
  if (v === undefined || v === null || isNaN(v) || v <= 0) return 0;
  return v;
}

function applyRateFloor(ratePercent: number, input: RateTimelineInput): number {
  const floor = toPercent(input.rateFloorAnnual);
  return Math.max(floor, ratePercent, 0);
}

function floatingRate(input: RateTimelineInput): { value: number; configured: boolean } {
  const base = toPercent(input.baseRate);
  if (base > 0) {
    return { value: applyRateFloor(base + toPercentSigned(input.marginRate), input), configured: true };
  }

  const postPref = toPercent(input.postPreferentialRate);
  if (postPref > 0) return { value: postPref, configured: true };

  const normal = toPercent(input.normalRate);
  if (normal > 0) return { value: normal, configured: true };

  const interest = toPercent(input.interestRate);
  if (interest > 0) return { value: interest, configured: true };

  return { value: 0, configured: false };
}

function fmtDayMonthYear(iso: string): string {
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

export function buildRateTimeline(
  input: RateTimelineInput,
  options?: RateTimelineOptions
): RateTimelinePoint[] {
  const today = options?.today ?? null;
  const start = input.startDate || '';

  const prefRate = toPercent(input.preferentialRate);
  const prefMonths = input.preferentialPeriodMonths || 0;
  const floating = floatingRate(input);
  const surcharge = surchargePoints(input);

  const points: RateTimelinePoint[] = [];

  if (start) {
    if (prefRate > 0 && prefMonths > 0) {
      points.push({
        fromDate: start,
        ratePercent: prefRate + surcharge,
        kind: 'preferential',
        label: `Ưu đãi ${prefMonths} tháng đầu`,
        forecast: false,
      });
      const afterPref = addMonthsClamped(start, prefMonths);
      const afterRate = floating.configured ? floating.value : prefRate;
      points.push({
        fromDate: afterPref,
        ratePercent: afterRate + surcharge,
        kind: 'floating',
        label: 'Thả nổi (base + biên)',
        forecast: !!(today && afterPref > today),
      });
    } else {
      const opening = floating.configured ? floating.value : prefRate;
      if (floating.configured || prefRate > 0) {
        points.push({
          fromDate: start,
          ratePercent: opening + surcharge,
          kind: floating.configured ? 'floating' : 'contract',
          label: floating.configured
            ? 'Thả nổi (base + biên)'
            : (prefMonths > 0 ? 'Lãi suất hợp đồng' : 'Lãi suất cố định suốt kỳ vay'),
          forecast: false,
        });
      }
    }
  }

  for (const item of input.rateHistory || []) {
    if (!item?.effectiveDate) continue;
    const explicit = toPercent(item.ratePercent);
    const composedBase = toPercent(item.baseRatePercent);
    const itemSurcharge = item.penaltyPercent && item.penaltyPercent > 0 ? item.penaltyPercent : 0;
    const composed = composedBase > 0
      ? applyRateFloor(composedBase + toPercentSigned(item.marginPercent), input) + itemSurcharge
      : 0;
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

function contractRateInput(c: LoanContract): RateTimelineInput {
  return {
    startDate: c.DisbursementDate || c.RepaymentStartDate || c.ContractStartDate,
    preferentialRate: c.PreferentialRate,
    preferentialPeriodMonths: c.PreferentialPeriodMonths,
    postPreferentialRate: c.PostPreferentialRate,
    baseRate: c.BaseRate,
    marginRate: c.MarginRate,
    rateFloorAnnual: c.RateFloorAnnual,
    conditionSurchargePercent: c.PenaltySurcharge,
    normalRate: c.NormalRate,
    interestRate: c.InterestRate,
    rateHistory: getContractRateHistory(c),
  };
}

export function buildContractRateTimeline(
  c?: LoanContract | null,
  options?: RateTimelineOptions
): RateTimelinePoint[] {
  if (!c) return [];
  return buildRateTimeline(contractRateInput(c), options);
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

export function getEffectiveActiveRate(
  c?: LoanContract | null,
  targetDateStr?: string
): number {
  if (!c) return 0;

  const timeline = buildContractRateTimeline(c);
  const point = timeline.length > 0
    ? resolveRateAt(timeline, targetDateStr || todayIso())
    : null;
  if (point && point.ratePercent > 0) return point.ratePercent / 100;

  const input = contractRateInput(c);
  const surcharge = surchargePoints(input);

  const floating = floatingRate(input);
  if (floating.configured && floating.value > 0) return (floating.value + surcharge) / 100;

  const pref = toPercent(c.PreferentialRate);
  if (pref > 0) return (pref + surcharge) / 100;

  return 0;
}

export type RateMode = 'pref' | 'base';

export function resolveRateModeOf(c?: LoanContract | null): RateMode {
  if (!c) return 'pref';
  const pref = toPercent(c.PreferentialRate);
  const months = c.PreferentialPeriodMonths || 0;
  if (pref > 0 && months > 0) return 'pref';
  if (toPercent(c.BaseRate) > 0) return 'base';
  return 'pref';
}

export interface RateFieldsInput {
  prefPercent?: number | null;
  prefMonths?: number | null;
  basePercent?: number | null;
  marginPercent?: number | null;
  floorPercent?: number | null;
}

export interface RateFields {
  PreferentialRate: number | null;
  PreferentialPeriodMonths: number | null;
  PostPreferentialRate: number | null;
  BaseRate: number | null;
  MarginRate: number | null;
  NormalRate: number | null;
  RateFloorAnnual: number | null;
}

export function buildRateFields(mode: RateMode, input: RateFieldsInput): RateFields {
  const pref = input.prefPercent && input.prefPercent > 0 ? input.prefPercent : 0;
  const months = input.prefMonths && input.prefMonths > 0 ? input.prefMonths : 0;
  const base = input.basePercent && input.basePercent > 0 ? input.basePercent : 0;
  const margin = input.marginPercent ?? 0;
  const floor = input.floorPercent && input.floorPercent > 0 ? input.floorPercent : 0;

  const usePref = mode === 'pref' && pref > 0 && months > 0;
  const prefPhang = mode === 'pref' && pref > 0 && months <= 0;

  return {
    PreferentialRate: usePref || prefPhang ? pref / 100 : null,
    PreferentialPeriodMonths: usePref ? months : null,
    PostPreferentialRate: usePref ? (pref + margin) / 100 : null,
    BaseRate: usePref || prefPhang ? null : (base > 0 ? base / 100 : null),
    MarginRate: prefPhang ? null : (margin !== 0 ? margin / 100 : null),
    NormalRate: usePref || prefPhang ? null : (base > 0 ? (base + margin) / 100 : null),
    RateFloorAnnual: floor > 0 ? floor / 100 : null,
  };
}

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
