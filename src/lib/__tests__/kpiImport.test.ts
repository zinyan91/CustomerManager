import { describe, expect, it } from 'vitest';
import { parseKpiImportRows, reconcileKpiImport, summarizeKpiImport } from '../kpiImport';
import type { KpiDefinition } from '../../types/kpi';

const user = '00000000-0000-4000-8000-000000000001';
const definitions: KpiDefinition[] = [
  { Code: 'net_loan', Name: 'Tăng ròng', Unit: 'VND', Aggregation: 'flow', SortOrder: 1 },
  { Code: 'service_fees', Name: 'Phí', Unit: 'VND', Aggregation: 'flow', SortOrder: 2 },
  { Code: 'loan_balance', Name: 'Dư nợ', Unit: 'VND', Aggregation: 'stock', SortOrder: 3 },
];
const raw = { UserId: user, MetricCode: 'net_loan', Amount: -50, Basis: 'month' };
describe('normalized monthly Excel contract', () => {
  it('accepts signed monthly growth without CIF or employee lookup', () => {
    expect(parseKpiImportRows([raw], definitions, [user])).toEqual({
      rows: [{ UserId: user, MetricCode: 'net_loan', Amount: -50 }], errors: [],
    });
  });
  it('rejects YTD values instead of spreading them into months', () => {
    expect(parseKpiImportRows([{ ...raw, Basis: 'ytd' }], definitions, [user]).errors.join()).toContain('month');
  });
  it('requires an explicit snapshot basis for balance', () => {
    expect(parseKpiImportRows([{ ...raw, MetricCode: 'loan_balance' }], definitions, [user]).errors.join()).toContain('snapshot');
  });
  it('does not turn a blank value into zero', () => {
    expect(parseKpiImportRows([{ ...raw, Amount: '' }], definitions, [user]).errors).toHaveLength(1);
    expect(parseKpiImportRows([{ ...raw, Amount: 0 }], definitions, [user]).rows[0].Amount).toBe(0);
  });
  it('rejects duplicates and unmapped accounts', () => {
    expect(parseKpiImportRows([raw, raw], definitions, [user]).errors.join()).toContain('Trùng');
    expect(parseKpiImportRows([raw], definitions, []).errors.join()).toContain('tài khoản');
  });
  it('requires fee components to reconcile, including negative refunds', () => {
    const fee = { ...raw, MetricCode: 'service_fees', Amount: 5, FeeNiceNumber: 10,
      FeeNonLife: 0, FeeLife: 0, FeeCancellation: -5, FeeCredit: 0, FeeFx: 0, FeeCounterDigital: 0 };
    expect(parseKpiImportRows([fee], definitions, [user]).errors).toEqual([]);
    expect(parseKpiImportRows([{ ...fee, Amount: 10 }], definitions, [user]).errors.join()).toContain('Tổng phí');
  });
});
describe('import preview', () => {
  it('reconciles team totals per metric without mixing units or turning missing into zero', () => {
    expect(summarizeKpiImport([
      { userId:'one',metricCode:'fee',before:10,after:20,change:'changed' },
      { userId:'two',metricCode:'fee',before:-5,after:null,change:'removed' },
      { userId:'one',metricCode:'cards',before:null,after:1,change:'added' },
    ])).toEqual([{ metricCode:'fee',before:5,after:20 },{ metricCode:'cards',before:null,after:1 }]);
  });
  it('shows replacement removals rather than silently retaining old rows', () => {
    const rows = [{ UserId: user, MetricCode: 'net_loan', Amount: 30 }];
    const old = [...rows.map(row => ({ ...row, Amount: 20 })), { UserId: user, MetricCode: 'service_fees', Amount: 10 }];
    expect(reconcileKpiImport(rows, old)).toEqual([
      { userId: user, metricCode: 'net_loan', before: 20, after: 30, change: 'changed' },
      { userId: user, metricCode: 'service_fees', before: 10, after: null, change: 'removed' },
    ]);
  });
});
