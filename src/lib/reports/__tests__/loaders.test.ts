import { describe, it, expect, vi, beforeEach } from 'vitest';

const loi = new Error('mat ket noi');

vi.mock('../../api/customerApi', () => ({
  fetchCustomersAPI: vi.fn(async () => []),
  fetchCustomersStrictAPI: vi.fn(async () => { throw loi; }),
}));
vi.mock('../../api/loanContractApi', () => ({
  fetchContractsAPI: vi.fn(async () => []),
  fetchContractsStrictAPI: vi.fn(async () => { throw loi; }),
  fetchOutstandingScheduleDetailsAPI: vi.fn(async () => []),
  fetchPaidPrincipalMapAPI: vi.fn(async () => ({})),
}));
vi.mock('../../api/creditContractApi', () => ({
  fetchAllCreditContractsAPI: vi.fn(async () => []),
}));
vi.mock('../../api/collateralApi', () => ({
  fetchCollateralsAPI: vi.fn(async () => []),
  fetchCollateralsStrictAPI: vi.fn(async () => { throw loi; }),
}));

import { loadCollateralRows, loadCreditRows, loadDueRows, loadKunnRows, loadPortfolioParams } from '../loaders';
import { loadAlertSnapshot } from '../alertLoader';

const CTX = { todayIso: '2026-09-23' };

describe('C1: tang nap khong duoc bien loi mang thanh bao cao rong', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));

  it('moi ham nap deu nem loi khi API loi, de gatherSheets bao ten bao cao hong', async () => {
    await expect(loadPortfolioParams()).rejects.toThrow('mat ket noi');
    await expect(loadDueRows(CTX)).rejects.toThrow('mat ket noi');
    await expect(loadKunnRows(CTX)).rejects.toThrow('mat ket noi');
    await expect(loadCreditRows(CTX)).rejects.toThrow('mat ket noi');
    await expect(loadCollateralRows()).rejects.toThrow('mat ket noi');
    await expect(loadAlertSnapshot(CTX.todayIso)).rejects.toThrow('mat ket noi');
  });
});
