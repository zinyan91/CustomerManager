// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CreditContract, LoanContract, RepaymentSchedule } from '../../types';

const deleteSchedulesByIds = vi.fn();
const bulkSave = vi.fn();
const saveContract = vi.fn();
const fetchSchedules = vi.fn();

vi.mock('../../lib/api/loanContractApi', () => ({
  deleteRepaymentSchedulesByIdsAPI: (...a: unknown[]) => deleteSchedulesByIds(...a),
  bulkSaveRepaymentSchedulesAPI: (...a: unknown[]) => bulkSave(...a),
  saveContractAPI: (...a: unknown[]) => saveContract(...a),
  fetchRepaymentSchedulesAPI: (...a: unknown[]) => fetchSchedules(...a),
}));
vi.mock('../../lib/api', async () => ({
  applyEarlySettlementAPI: (await import('../../lib/api/settlementApi')).applyEarlySettlementAPI,
}));

import { useMultiSettlement } from '../useMultiSettlement';

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


const HAN_MUC: LoanContract = { ...HOP_DONG, Id: 77, ContractNumber: 'KUNN-HM-01', CreditContractId: 5 };
const lichHanMuc = (): RepaymentSchedule[] => makeSchedules().map(s => ({ ...s, Id: s.Id + 100, ContractId: 77 }));
const CCS = [{ Id: 5, LoanMethod: 'Hạn mức tín dụng' } as CreditContract];

beforeEach(() => {
  deleteSchedulesByIds.mockReset().mockResolvedValue(undefined);
  bulkSave.mockReset().mockResolvedValue(undefined);
  saveContract.mockReset().mockResolvedValue(undefined);
  fetchSchedules.mockReset().mockResolvedValue([]);
});

function setup(schedulesMap: Record<number, RepaymentSchedule[] | undefined> = { 99: makeSchedules(), 77: lichHanMuc() }) {
  const onSettled = vi.fn();
  const onNotify = vi.fn();
  const hook = renderHook(() => useMultiSettlement({
    openContracts: [HOP_DONG, HAN_MUC], creditContracts: CCS, schedulesMap, onSettled, onNotify,
  }));
  return { ...hook, onSettled, onNotify };
}

describe('useMultiSettlement', () => {
  it('mở từ một KUNN: chỉ khoản đó được chọn sẵn, các khoản khác vẫn hiện để chọn thêm', () => {
    const { result } = setup();
    act(() => result.current.open(99));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.lines.map(l => l.contract.Id)).toEqual([99, 77]);
    expect(result.current.drafts[99].selected).toBe(true);
    expect(result.current.drafts[77].selected).toBe(false);
  });

  it('tất toán hai khoản, hai ngày khác nhau, hai hình thức vay: phí tự tính theo hình thức, cắt lịch từng khoản', async () => {
    const { result, onSettled, onNotify } = setup();
    act(() => result.current.open(99));
    act(() => {
      result.current.updateDraft(99, { settlementDate: '2026-02-15' });
      result.current.updateDraft(77, { selected: true, settlementDate: '2026-02-20' });
    });
    const [vayTungLan, hanMuc] = result.current.lines;
    expect(vayTungLan.penaltyPercent).toBe(4);
    expect(vayTungLan.quote?.penaltyFee).toBe(2_000_000);
    expect(hanMuc.penaltyPercent).toBe(0);
    expect(result.current.totals.count).toBe(2);
    expect(result.current.totals.principal).toBe(100_000_000);

    await act(async () => { await result.current.execute(); });

    expect(deleteSchedulesByIds).toHaveBeenCalledWith([3, 4]);
    expect(deleteSchedulesByIds).toHaveBeenCalledWith([103, 104]);
    expect(saveContract).toHaveBeenCalledWith(expect.objectContaining({ Id: 99, IsSettled: true, SettledDate: '2026-02-15', CurrentBalance: 0 }));
    expect(saveContract).toHaveBeenCalledWith(expect.objectContaining({ Id: 77, IsSettled: true, SettledDate: '2026-02-20', CurrentBalance: 0 }));
    expect(onSettled).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ contract: expect.objectContaining({ Id: 99 }) })]));
    expect(onNotify).toHaveBeenCalledWith('success', 'Đã tất toán 2 khoản vay.');
    expect(result.current.isOpen).toBe(false);
  });

  it('ngày tất toán chung chỉ áp cho các khoản đang chọn', () => {
    const { result } = setup();
    act(() => result.current.open(99));
    act(() => result.current.updateDraft(77, { settlementDate: '2026-03-01' }));
    act(() => result.current.applyDateToSelected('2026-02-28'));
    expect(result.current.drafts[99].settlementDate).toBe('2026-02-28');
    expect(result.current.drafts[77].settlementDate).toBe('2026-03-01');
  });

  it('cán bộ sửa tỷ lệ phí của một khoản thì dùng tỷ lệ đó', () => {
    const { result } = setup();
    act(() => result.current.open(99));
    act(() => result.current.updateDraft(99, { settlementDate: '2026-02-15', penaltyInput: '1,5' }));
    expect(result.current.lines[0].quote?.penaltyFee).toBe(750_000);
  });

  it('một khoản ghi lỗi: khoản kia vẫn tất toán, hộp thoại giữ khoản lỗi kèm lý do', async () => {
    saveContract.mockImplementation(async (p: { Id: number }) => { if (p.Id === 77) throw new Error('mất kết nối'); });
    const { result, onSettled, onNotify } = setup();
    act(() => result.current.open(99));
    act(() => {
      result.current.updateDraft(99, { settlementDate: '2026-02-15' });
      result.current.updateDraft(77, { selected: true, settlementDate: '2026-02-15' });
    });
    await act(async () => { await result.current.execute(); });
    expect(onSettled).toHaveBeenCalledWith([expect.objectContaining({ contract: expect.objectContaining({ Id: 99 }) })]);
    expect(onNotify).toHaveBeenCalledWith('error', 'Đã tất toán 1 khoản; 1 khoản chưa ghi được, xem lý do ở từng dòng.');
    expect(result.current.isOpen).toBe(true);
    expect(result.current.failures[77]).toBe('mất kết nối');
    expect(result.current.drafts[77].selected).toBe(true);
    expect(result.current.drafts[99].selected).toBe(false);
  });

  it('đã ghi tất toán mà đọc lại lịch lỗi: vẫn tính là đã tất toán, báo nguyên lỗi đọc lại', async () => {
    fetchSchedules.mockRejectedValue(new Error('Không nạp được lịch trả nợ: permission denied'));
    const { result, onSettled, onNotify } = setup();
    act(() => result.current.open(99));
    act(() => result.current.updateDraft(99, { settlementDate: '2026-02-15' }));
    await act(async () => { await result.current.execute(); });
    expect(saveContract).toHaveBeenCalledWith(expect.objectContaining({ Id: 99, IsSettled: true }));
    expect(onSettled).toHaveBeenCalledWith([expect.objectContaining({ schedules: null, reloadError: 'Không nạp được lịch trả nợ: permission denied' })]);
    expect(result.current.failures).toEqual({});
    expect(onNotify).toHaveBeenCalledWith('error', 'Đã tất toán 1 khoản vay; chưa đọc lại được lịch trả nợ của KUNN-TT-01: Không nạp được lịch trả nợ: permission denied');
    expect(result.current.isOpen).toBe(false);
  });

  it('khoản chưa tải được lịch trả nợ thì không được tất toán', async () => {
    const { result, onNotify } = setup({ 99: undefined, 77: lichHanMuc() });
    act(() => result.current.open(99));
    expect(result.current.lines[0].blockReason).toContain('Chưa tải được lịch trả nợ');
    await act(async () => { await result.current.execute(); });
    expect(saveContract).not.toHaveBeenCalled();
    expect(onNotify).toHaveBeenCalledWith('error', 'Chưa có khoản nào tất toán được trong các khoản đã chọn.');
  });
});
