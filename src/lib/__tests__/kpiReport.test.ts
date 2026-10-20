import { describe, expect, it } from 'vitest';
import { kpiCompletion, kpiSeries, kpiYtdTarget, latestKpiBatches } from '../kpiReport';
import type { KpiBatch, KpiObservation, KpiPeriod } from '../../types/kpi';

const periods: KpiPeriod[] = [
  { Id: 'jan', TeamId: 'team', Month: '2026-01-01', Status: 'open' },
  { Id: 'feb', TeamId: 'team', Month: '2026-02-01', Status: 'open' },
];
const batches: KpiBatch[] = periods.map(period => ({
  Id: period.Id, PeriodId: period.Id, Revision: 1, DataAsOf: `${period.Month.slice(0, 7)}-20`,
  SourceName: 'Source', Rows: 1, PublishedAt: '',
}));
const observations: KpiObservation[] = [
  { BatchId: 'jan', UserId: 'me', MetricCode: 'net_loan', Amount: -5 },
  { BatchId: 'feb', UserId: 'me', MetricCode: 'net_loan', Amount: 10 },
];
const history = [{ UserId: 'me', EffectiveFrom: '2025-12-01T00:00:00Z', EffectiveTo: null }];
describe('monthly and YTD report semantics', () => {
  it('uses strict monthly targets for YTD, and only the final stock target', () => {
    const targets = periods.map((period, index) => ({ PeriodId: period.Id, MetricCode: 'net_loan', Amount: (index + 1) * 10, Version: 1 }));
    expect(kpiYtdTarget(periods, targets, [], '2026-02', 'net_loan', 'flow', null)).toBe(30);
    expect(kpiYtdTarget(periods, targets, [], '2026-02', 'net_loan', 'stock', null)).toBe(20);
    expect(kpiYtdTarget(periods, targets.slice(1), [], '2026-02', 'net_loan', 'flow', null)).toBeNull();
  });
  it('does not divide by zero or invent a target; signed completion remains signed', () => {
    expect(kpiCompletion(10, 0)).toBeNull();
    expect(kpiCompletion(null, 10)).toBeNull();
    expect(kpiCompletion(-5, 10)).toBe(-50);
  });
  it('adds monthly signed flows', () => {
    const series = kpiSeries(periods, batches, observations, history, '2026-02', 'net_loan', 'flow', 'me');
    expect(series.map(row => row.actual)).toEqual([-5, 10]);
    expect(series.at(-1)?.ytd).toBe(5);
  });
  it('does not sum stock balances across months', () => {
    const series = kpiSeries(periods, batches, observations, history, '2026-02', 'net_loan', 'stock', 'me');
    expect(series.at(-1)?.ytd).toBe(10);
  });
  it('does not treat an incomplete year as zero or a full YTD amount', () => {
    expect(kpiSeries(periods.slice(1), batches.slice(1), observations, history, '2026-02', 'net_loan', 'flow', 'me').at(-1)?.ytd).toBeNull();
  });
  it('does not present partial member rows as a complete team total', () => {
    const members = [...history, { ...history[0], UserId: 'other' }];
    expect(kpiSeries(periods, batches, observations, members, '2026-02', 'net_loan', 'flow', null).at(-1)?.actual).toBeNull();
  });
  it('keeps the latest revision only', () => {
    expect(latestKpiBatches([...batches, { ...batches[0], Id: 'replacement', Revision: 2 }]).find(row => row.PeriodId === 'jan')?.Id).toBe('replacement');
  });
});
