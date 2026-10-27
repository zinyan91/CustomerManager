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
    expect(result.current.bookKpis.freeCapacity).toBe(259280000);
    expect(result.current.loanKpis.outstanding).toBe(750000000);
  });

  it('loi nap giu nguyen thong diep server', async () => {
    m.books.mockRejectedValue(new Error('relation "SavingsBooks" does not exist'));
    const { result } = renderHook(() => useSavingsPledgeController());
    await waitFor(() => expect(result.current.error).toBe('relation "SavingsBooks" does not exist'));
  });

  it('chon tra khi den han thi ngay tra la ngay den han', async () => {
    const { result } = await loaded();
    act(() => result.current.repayDialog.openFor(10));
    act(() => result.current.repayDialog.setKind('due'));
    expect(result.current.repayDialog.date).toBe('2027-02-15');
    expect(result.current.repayDialog.quote?.total).toBe(417095890);
  });

  it('bao gia khong hop le thi khong goi API', async () => {
    const { result } = await loaded();
    act(() => result.current.repayDialog.openFor(10));
    act(() => result.current.repayDialog.setPrincipal(0));
    expect(result.current.repayDialog.quote?.ok).toBe(false);
    await act(() => result.current.repayDialog.submit());
    expect(m.record).not.toHaveBeenCalled();
  });

  it('tat toan so can tru gui dung du lieu', async () => {
    const { result } = await loaded();
    act(() => result.current.repayDialog.openFor(10));
    act(() => result.current.repayDialog.setKind('offset'));
    expect(result.current.repayDialog.quote?.warnings[0]).toContain('CC-2026-0907');
    await act(() => result.current.repayDialog.submit());
    expect(m.record).toHaveBeenCalledWith(10, {
      RepaymentDate: '2026-10-27', Kind: 'offset', PrincipalPaid: 400000000, InterestPaid: 9189041,
      PenaltyPaid: 0, OffsetSavingsBookId: 1, Note: null,
    }, 534247);
    expect(result.current.repayDialog.open).toBe(false);
  });

  it('form khoan vay chan tong goc bao dam lech', async () => {
    const { result } = await loaded();
    act(() => result.current.loanForm.openNew(3));
    act(() => {
      result.current.loanForm.setField('ContractNumber', 'CC-NEW');
      result.current.loanForm.setField('Amount', 100000000);
      result.current.loanForm.setField('InterestRate', 6);
      result.current.loanForm.setField('DueDate', '2027-01-10');
    });
    await act(() => result.current.loanForm.submit());
    expect(m.saveLoan).not.toHaveBeenCalled();
    expect(result.current.loanForm.error).toBe('Tổng phần gốc bảo đảm 0 phải bằng số tiền vay 100.000.000.');
  });
});
