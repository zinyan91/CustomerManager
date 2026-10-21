// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { usePaymentModal } from '../usePaymentModal';

const state = vi.hoisted(() => ({
  fetch: vi.fn(), save: vi.fn(), contract: vi.fn(), confirm: vi.fn(),
  rows: null as RepaymentSchedule[] | null,
}));
vi.mock('../../lib/api', () => ({
  fetchRepaymentSchedulesAPI: state.fetch, bulkSaveRepaymentSchedulesAPI: state.save, saveContractAPI: state.contract,
}));
vi.mock('../../context/ConfirmContext', () => ({ useConfirm: () => state.confirm }));
const contract = {
  Id: 1, CustomerId: 1, ContractNumber: 'HD/GNN-01', LoanAmount: 100_000_000,
  DisbursementDate: '2026-01-01', InterestRate: 0.12, PrincipalRepaymentMethod: 'Gốc trả cuối kỳ',
} as LoanContract;
const period: RepaymentSchedule = {
  Id: 1, ContractId: 1, PeriodNumber: 1, DueDate: '2026-01-31',
  PrincipalAmount: 0, InterestAmount: 1_000_000, TotalAmount: 1_000_000, IsPaid: false, OverdueDays: 0, OverdueInterestAmount: 0,
};
const maturity = { ...period, Id: 2, PeriodNumber: 2, DueDate: '2026-03-31', PrincipalAmount: 100_000_000, TotalAmount: 101_000_000 };
const mount = () => {
  const notify = vi.fn(), saved = vi.fn();
  return { ...renderHook(() => usePaymentModal({
    selectedContract: contract, schedules: [period, maturity], onNotify: notify, onSaved: saved, onLoadingChange: vi.fn(),
  })), notify, saved };
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-09T12:00:00'));
  vi.clearAllMocks();
  state.confirm.mockResolvedValue(true);
  state.rows = null;
  state.fetch.mockImplementation(async () => state.rows ?? [period, maturity]);
  state.save.mockImplementation(async rows => { state.rows = rows; });
  state.contract.mockResolvedValue(contract);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('payment modal controller', () => {
  it('opens with current penalty and synchronizes both editable date fields', () => {
    const { result } = mount();
    act(() => result.current.open(period));
    expect(result.current.overdueDaysStr).toBe('9');
    expect(result.current.overdueInterestStr).toBe('2.466');
    act(() => result.current.setOverdueDaysStr('2'));
    expect(result.current.paymentDate).toBe('2026-02-02');
    expect(result.current.overdueInterestStr).toBe('548');
    act(() => result.current.setPaymentDate('2026-02-09'));
    expect(result.current.overdueDaysStr).toBe('9');
    expect(result.current.overdueInterestStr).toBe('2.466');
  });

  it('does not save an invalid date or an incomplete receipt marked paid', async () => {
    const { result, notify } = mount();
    act(() => result.current.open(period));
    act(() => { result.current.setActualPaidInterestStr('1'); result.current.setIsPaid(true); });
    await act(() => result.current.save());
    expect(state.save).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('error', expect.stringContaining('chưa thu đủ'));
  });

  it('saves the selected payment date and grouped penalty exactly once', async () => {
    const { result } = mount();
    act(() => result.current.open(period));
    act(() => { result.current.setOverdueDaysStr('3'); result.current.setIsPaid(true); });
    await act(() => result.current.save());
    expect(state.save.mock.calls[0][0][0]).toMatchObject({
      PaymentDate: '2026-02-03', OverdueDays: 3, OverdueInterestAmount: 822,
      ActualPaidInterest: 1_000_822, TotalAmount: 1_000_822, IsPaid: true,
    });
  });

  it('confirms computed penalties then saves fresh quick receipts at due date plus nine days', async () => {
    const { result, saved } = mount();
    await act(() => result.current.quickSettleAllDue(9));
    expect(state.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Thu nhanh trễ 9 ngày',
      message: expect.stringContaining('09/02/2026'),
    }));
    const rows = state.save.mock.calls[0][0] as RepaymentSchedule[];
    expect(rows[0]).toMatchObject({ PaymentDate: '2026-02-09', OverdueDays: 9, IsPaid: true });
    expect(rows[0].OverdueInterestAmount).toBeGreaterThan(0);
    expect(saved).toHaveBeenCalledTimes(1);
  });

  it('does not write when canceled, stale, or an API rejects the read', async () => {
    const { result, notify } = mount();
    state.confirm.mockResolvedValueOnce(false);
    await act(() => result.current.quickSettleAllDue(1));
    expect(state.save).not.toHaveBeenCalled();
    state.fetch.mockResolvedValueOnce([period]).mockResolvedValueOnce([{ ...period, ActualPaidInterest: 1 }]);
    await act(() => result.current.quickSettleAllDue(1));
    expect(state.save).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('error', expect.stringContaining('đã thay đổi'));
    state.fetch.mockRejectedValueOnce(new Error('Máy chủ không phản hồi'));
    await act(() => result.current.quickSettleAllDue(1));
    expect(notify).toHaveBeenCalledWith('error', 'Máy chủ không phản hồi');
  });

  it('surfaces a failed save and keeps the modal open', async () => {
    const { result, notify } = mount();
    act(() => result.current.open(period));
    state.save.mockRejectedValueOnce(new Error('Không có quyền ghi'));
    await act(() => result.current.save());
    expect(notify).toHaveBeenCalledWith('error', 'Không có quyền ghi');
    expect(result.current.editingSchedule?.Id).toBe(1);
  });

  it('does not report success when reading back data does not match the receipt', async () => {
    const { result, notify, saved } = mount();
    act(() => result.current.open(period));
    state.save.mockResolvedValueOnce(undefined);
    await act(() => result.current.save());
    expect(saved).not.toHaveBeenCalled();
    expect(state.contract).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('error', expect.stringContaining('chưa được lưu khớp'));
  });
});
