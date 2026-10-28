// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SAMPLE } from '../../lib/__tests__/fixtures/savingsPledgeSample';

const m = vi.hoisted(() => ({
  record: vi.fn(),
  saveLoan: vi.fn(),
  books: vi.fn(),
  loans: vi.fn(),
}));

vi.mock('../useSelectedCustomerId', () => ({
  useSelectedCustomerId: () => 1,
  useCustomerNavigate: () => vi.fn(),
}));
vi.mock('../useCurrentDate', () => ({ useCurrentDate: () => '2026-10-27' }));
vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => [{ Id: 1, FullName: 'Trần Thị Minh Hạnh' }],
  fetchSavingsBooksByCustomerAPI: m.books,
  fetchPledgeLoanBundleByCustomerAPI: m.loans,
  saveSavingsBookAPI: vi.fn(),
  savePledgeLoanAPI: m.saveLoan,
  recordPledgeRepaymentAPI: m.record,
}));

import { useSavingsPledgeController } from '../useSavingsPledgeController';

beforeEach(() => {
  m.record.mockReset().mockResolvedValue(1);
  m.saveLoan.mockReset().mockResolvedValue(99);
  m.books.mockReset().mockResolvedValue(SAMPLE.books);
  m.loans.mockReset().mockResolvedValue({ loans: SAMPLE.loans, links: SAMPLE.links, repayments: [] });
});

async function loaded() {
  const hook = renderHook(() => useSavingsPledgeController());
  await waitFor(() => expect(hook.result.current.loanRows).toHaveLength(2));
  return hook;
}

describe('useSavingsPledgeController', () => {
  it('KPI tinh tu du lieu da nap', async () => {
    const { result } = await loaded();
    expect(result.current.bookKpis.pledgedObligation).toBe(775894794);
    expect(result.current.loanKpis.outstanding).toBe(750000000);
  });

  it('loi nap giu nguyen thong diep server', async () => {
    m.books.mockRejectedValue(new Error('relation "SavingsBooks" does not exist'));
    const { result } = renderHook(() => useSavingsPledgeController());
    await waitFor(() => expect(result.current.error).toBe('relation "SavingsBooks" does not exist'));
  });

  it('ghi nhan tra no goi API, dong hop thoai va bao thanh cong', async () => {
    const { result } = await loaded();
    act(() => result.current.repayDialog.openFor(10));
    expect(result.current.repayDialog.loan?.ContractNumber).toBe('CC-2026-0418');
    const quote = { ok: true, interest: 9189041, principal: 400000000, principalPenalty: 0, interestPenalty: 0, total: 409189041, remainingPrincipal: 0, nextInterestFrom: null, warnings: [] };
    await act(() => result.current.repayDialog.record({ loanId: 10, kind: 'full', date: '2026-10-27', quote, offsetBookId: null }));
    expect(m.record).toHaveBeenCalledWith(10, expect.objectContaining({ Kind: 'full', PrincipalPaid: 400000000, InterestPaid: 9189041 }), null);
    expect(result.current.repayDialog.loan).toBeNull();
    expect(result.current.notification?.type).toBe('success');
  });

  it('form khoan vay chan tong goc bao dam lech', async () => {
    const { result } = await loaded();
    act(() => result.current.loanForm.openNew(3));
    expect(result.current.loanForm.initialLinks).toEqual([{ SavingsBookId: 3, PrincipalCovered: 0 }]);
    await act(() => result.current.loanForm.submit(
      { ContractNumber: 'CC-NEW', Amount: 100000000, InterestRate: 6, DisbursementDate: '2026-10-27', DueDate: '2027-01-10' },
      result.current.loanForm.initialLinks,
    ));
    expect(m.saveLoan).not.toHaveBeenCalled();
    expect(result.current.loanForm.error).toBe('Tổng phần gốc bảo đảm 0 phải bằng số tiền vay 100.000.000.');
  });
});
