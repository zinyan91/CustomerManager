import { describe, it, expect, vi } from 'vitest';
import { SAMPLE } from '../../__tests__/fixtures/savingsPledgeSample';

vi.mock('../../api/customerApi', () => ({
  fetchCustomersStrictAPI: vi.fn(async () => [{ Id: 1, CifKh: '1002345678', FullName: 'Trần Thị Minh Hạnh' }]),
}));
vi.mock('../../api/loanContractApi', () => ({
  fetchContractsStrictAPI: vi.fn(async () => []),
  fetchOutstandingScheduleDetailsAPI: vi.fn(async () => []),
  fetchPaidPrincipalMapAPI: vi.fn(async () => ({})),
}));
vi.mock('../../api/creditContractApi', () => ({ fetchAllCreditContractsAPI: vi.fn(async () => []) }));
vi.mock('../../api/collateralApi', () => ({ fetchCollateralsStrictAPI: vi.fn(async () => []) }));
vi.mock('../../api/pledgeLoanApi', () => ({ fetchAllPledgeLoanBundlesAPI: vi.fn(async () => SAMPLE) }));

import { loadDueRows, loadPortfolioParams } from '../loaders';

describe('bao cao gom khoan vay cam co', () => {
  it('bao cao den han co dong cam co', async () => {
    const { rows } = await loadDueRows({ todayIso: '2026-10-27' });
    expect(rows.map((r) => (r as { kunnNumber: string }).kunnNumber)).toEqual(['CC-2026-0418', 'CC-2026-0907']);
  });

  it('bao cao danh muc nhan bundle cam co', async () => {
    const { rows } = await loadPortfolioParams();
    expect((rows[0] as { pledge: unknown }).pledge).toBe(SAMPLE);
  });
});
