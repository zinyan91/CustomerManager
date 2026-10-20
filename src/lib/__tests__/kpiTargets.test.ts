import { describe, expect, it } from 'vitest';
import { kpiTargetRows } from '../kpiTargets';
import type { KpiTargetsData } from '../../types/kpi';

const data: KpiTargetsData = {
  definitions: [{ Code: 'fee', Name: 'Phí', Unit: 'VND', Aggregation: 'flow', SortOrder: 1 }],
  periods: [], periodId: 'period', teamTargets: [], memberTargets: [],
};
describe('target allocation presentation', () => {
  it('keeps unassigned distinct from a zero target', () => {
    expect(kpiTargetRows(data, 'me', true)[0]).toMatchObject({ budget: null, own: null, remaining: null });
    expect(kpiTargetRows({ ...data, teamTargets: [{ PeriodId: 'period', MetricCode: 'fee', Amount: 0, Version: 1 }] }, 'me', true)[0])
      .toMatchObject({ budget: 0, allocated: 0, remaining: 0 });
  });
  it('reconciles fractions and filters own targets explicitly', () => {
    const result = kpiTargetRows({
      ...data, teamTargets: [{ PeriodId: 'period', MetricCode: 'fee', Amount: 1, Version: 1 }],
      memberTargets: [
        { PeriodId: 'period', MetricCode: 'fee', UserId: 'me', Amount: 0.1, Version: 1 },
        { PeriodId: 'period', MetricCode: 'fee', UserId: 'other', Amount: 0.2, Version: 1 },
      ],
    }, 'me', true)[0];
    expect(result).toMatchObject({ budget: 1, allocated: 0.3, remaining: 0.7, own: 0.1 });
  });
  it('never treats the partial rows visible to a member as total team allocation', () => {
    expect(kpiTargetRows(data, 'me', false)[0]).toMatchObject({ allocated: null, remaining: null });
  });
});
