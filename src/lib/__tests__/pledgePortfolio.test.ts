import { describe, expect, it } from 'vitest';
import type { Customer } from '../../types';
import { pledgeLoanDueRow, pledgePortfolioRows, summarizePledgePortfolio } from '../pledgePortfolio';
import { buildActivePortfolioData } from '../customerPortfolioExport';
import { CC_0418, SAMPLE, repayment } from './fixtures/savingsPledgeSample';

const KH = { Id: 1, CifKh: '1002345678', FullName: 'Trần Thị Minh Hạnh' } as Customer;

describe('summarizePledgePortfolio', () => {
  it('tong hop bo mau ngay 27/10/2026', () => {
    const s = summarizePledgePortfolio(SAMPLE, '2026-10-27');
    expect(s.count).toBe(2);
    expect(s.outstanding).toBe(750000000);
    expect(s.granted).toBe(750000000);
    expect(s.collateralValue).toBe(800000000);
    expect(s.collateralCount).toBe(2);
    expect([...s.customerIds]).toEqual([1]);
    expect(s.byDebtGroup[1]).toEqual({ count: 2, amount: 750000000 });
    expect(s.byDebtGroup[2]).toEqual({ count: 0, amount: 0 });
  });

  it('khoan qua han tu 10 ngay vao nhom 2', () => {
    expect(summarizePledgePortfolio(SAMPLE, '2027-02-11').byDebtGroup[2]).toEqual({ count: 0, amount: 0 });
    expect(summarizePledgePortfolio(SAMPLE, '2027-02-12').byDebtGroup[2]).toEqual({ count: 1, amount: 350000000 });
    expect(summarizePledgePortfolio(SAMPLE, '2027-02-25').byDebtGroup[2]).toEqual({ count: 2, amount: 750000000 });
  });

  it('bo qua khoan da tat toan va tinh du no sau tra mot phan', () => {
    const bundle = {
      ...SAMPLE,
      loans: [{ ...SAMPLE.loans[0] }, { ...SAMPLE.loans[1], IsClosed: true }],
      links: SAMPLE.links.map((l) => (l.PledgeLoanId === 11 ? { ...l, ReleasedDate: '2026-10-01' } : l)),
      repayments: [repayment({ Id: 1, PledgeLoanId: 10, RepaymentDate: '2026-10-27', Kind: 'partial', PrincipalPaid: 100000000 })],
    };
    const s = summarizePledgePortfolio(bundle, '2026-10-28');
    expect(s.count).toBe(1);
    expect(s.outstanding).toBe(300000000);
    expect(s.collateralValue).toBe(500000000);
  });
});

describe('pledgeLoanDueRow', () => {
  it('mot dong ky 1 voi goc va lai den han', () => {
    expect(pledgeLoanDueRow(CC_0418, [], KH, '2026-10-27')).toEqual({
      cif: '1002345678', customerName: 'Trần Thị Minh Hạnh', kunnNumber: 'CC-2026-0418', periodNumber: 1,
      dueDate: '2027-02-15', principal: 400000000, interest: 17095890, total: 417095890, outstanding: 400000000,
      storedDebtGroup: 1, overdueSchedules: [],
    });
  });
});

describe('bao cao danh muc', () => {
  it('them mot dong cho moi khoan cam co con mo', () => {
    const rows = pledgePortfolioRows(SAMPLE, [KH]);
    expect(rows.map((r) => [r.kunn.ContractNumber, r.currentBalance])).toEqual([
      ['CC-2026-0418', 400000000],
      ['CC-2026-0907', 350000000],
    ]);
    expect(rows[1].matchedCollaterals.map((c) => c.AssetCode)).toEqual(['STK-0123-002', 'STK-0123-001']);
    expect(rows[0].kunn.LoanMethod).toBe('Cầm cố sổ tiết kiệm');
  });

  it('buildActivePortfolioData noi them dong cam co', () => {
    const rows = buildActivePortfolioData({ customers: [KH], contracts: [], creditContracts: [], collaterals: [], pledge: SAMPLE });
    expect(rows.map((r) => r.currentBalance)).toEqual([400000000, 350000000]);
  });
});
