// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { LoanContract, RepaymentSchedule } from '../../types';

const deleteSchedulesByIds = vi.fn();
const bulkSave = vi.fn();
const saveContract = vi.fn();
const fetchSchedules = vi.fn();

vi.mock('../../lib/api', () => ({
  deleteRepaymentSchedulesByIdsAPI: (...a: unknown[]) => deleteSchedulesByIds(...a),
  bulkSaveRepaymentSchedulesAPI: (...a: unknown[]) => bulkSave(...a),
  saveContractAPI: (...a: unknown[]) => saveContract(...a),
  fetchRepaymentSchedulesAPI: (...a: unknown[]) => fetchSchedules(...a),
}));

import { useEarlySettlement } from '../useEarlySettlement';

const HOP_DONG: LoanContract = {
  Id: 99,
  CustomerId: 1,
  ContractNumber: 'KUNN-TT-01',
  ContractType: 1,
  LoanAmount: 60_000_000,
  CurrentBalance: 60_000_000,
  InterestRate: 0.12,
  DisbursementDate: '2026-01-01',
  IsSettled: false,
};

const makeSchedules = (): RepaymentSchedule[] => [
  {
    Id: 1,
    ContractId: 99,
    PeriodNumber: 1,
    DueDate: '2026-02-01',
    PrincipalAmount: 10_000_000,
    InterestAmount: 600_000,
    TotalAmount: 10_600_000,
    IsPaid: true,
    ActualPaidPrincipal: 10_000_000,
    ActualPaidInterest: 600_000,
  },
  {
    Id: 2,
    ContractId: 99,
    PeriodNumber: 2,
    DueDate: '2026-03-01',
    PrincipalAmount: 10_000_000,
    InterestAmount: 500_000,
    TotalAmount: 10_500_000,
    IsPaid: false,
  },
  {
    Id: 3,
    ContractId: 99,
    PeriodNumber: 3,
    DueDate: '2026-04-01',
    PrincipalAmount: 10_000_000,
    InterestAmount: 400_000,
    TotalAmount: 10_400_000,
    IsPaid: false,
  },
  {
    Id: 4,
    ContractId: 99,
    PeriodNumber: 4,
    DueDate: '2026-05-01',
    PrincipalAmount: 10_000_000,
    InterestAmount: 300_000,
    TotalAmount: 10_300_000,
    IsPaid: false,
  },
];

beforeEach(() => {
  deleteSchedulesByIds.mockReset().mockResolvedValue(undefined);
  bulkSave.mockReset().mockResolvedValue(undefined);
  saveContract.mockReset().mockResolvedValue(undefined);
  fetchSchedules.mockReset().mockResolvedValue([]);
});

afterEach(() => vi.clearAllMocks());

describe('useEarlySettlement hook', () => {
  it('tính toán quote đúng và thực thi cắt lịch, xóa các kỳ tương lai', async () => {
    const onSettled = vi.fn();
    const onNotify = vi.fn();

    const { result } = renderHook(() =>
      useEarlySettlement({
        selectedContract: HOP_DONG,
        schedules: makeSchedules(),
        onSettled,
        onNotify,
      })
    );

    // Mở modal
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    // Cài đặt ngày tất toán và phí phạt 1%
    act(() => {
      result.current.setSettlementDate('2026-02-15');
      result.current.setPenaltyRateStr('1');
    });

    // Kiểm tra quote
    expect(result.current.quote?.canSettle).toBe(true);
    expect(result.current.quote?.remainingPrincipal).toBe(50_000_000);
    expect(result.current.quote?.penaltyFee).toBe(500_000);
    // Các kỳ cần xóa: kỳ 3 (Id 3) và kỳ 4 (Id 4)
    expect(result.current.quote?.futureScheduleIds).toEqual([3, 4]);

    // Thực hiện tất toán
    await act(async () => {
      await result.current.executeSettlement();
    });

    // Kiểm tra đã xóa các kỳ tương lai
    expect(deleteSchedulesByIds).toHaveBeenCalledWith([3, 4]);

    // Kiểm tra đã lưu kỳ tất toán
    expect(bulkSave).toHaveBeenCalledTimes(1);
    const savedPeriod = bulkSave.mock.calls[0][0][0];
    expect(savedPeriod.PeriodNumber).toBe(2);
    expect(savedPeriod.PrincipalAmount).toBe(50_000_000);
    expect(savedPeriod.IsPaid).toBe(true);
    expect(savedPeriod.PaymentDate).toBe('2026-02-15');

    // Kiểm tra đã cập nhật trạng thái hợp đồng
    expect(saveContract).toHaveBeenCalledWith(
      expect.objectContaining({
        Id: 99,
        CurrentBalance: 0,
        IsSettled: true,
        SettledDate: '2026-02-15',
        DebtGroup: 1,
      })
    );

    // Đã đóng modal và báo thành công
    expect(result.current.isOpen).toBe(false);
    expect(onNotify).toHaveBeenCalledWith('success', expect.stringContaining('thành công'));
    expect(onSettled).toHaveBeenCalled();
  });
});
