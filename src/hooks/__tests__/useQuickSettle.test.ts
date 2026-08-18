// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { LoanContract, RepaymentSchedule } from '../../types';

const fetchSchedules = vi.fn();
const bulkSave = vi.fn();
const saveContract = vi.fn();

vi.mock('../../lib/api', () => ({
  fetchRepaymentSchedulesAPI: (...a: unknown[]) => fetchSchedules(...a),
  bulkSaveRepaymentSchedulesAPI: (...a: unknown[]) => bulkSave(...a),
  saveContractAPI: (...a: unknown[]) => saveContract(...a),
}));

import { useQuickSettle } from '../useQuickSettle';

const HOP_DONG = {
  Id: 9, CustomerId: 4, ContractNumber: 'GNN-01',
  LoanAmount: 100_000_000, PrincipalRepaymentMethod: 'Gốc trả cuối kỳ',
} as LoanContract;

const ky = (over: Partial<RepaymentSchedule> = {}): RepaymentSchedule => ({
  Id: 5, ContractId: 9, PeriodNumber: 1, DueDate: '2999-12-31',
  PrincipalAmount: 0, InterestAmount: 2_000_000, IsPaid: false,
  ...over,
} as RepaymentSchedule);

const dung = (opts: { confirm?: () => boolean } = {}) => {
  const onNotify = vi.fn();
  const onDone = vi.fn();
  const r = renderHook(() => useQuickSettle({
    onNotify, onDone, confirm: opts.confirm ?? (() => true),
  }));
  return { ...r, onNotify, onDone };
};

beforeEach(() => {
  fetchSchedules.mockReset().mockResolvedValue([ky()]);
  bulkSave.mockReset().mockResolvedValue(undefined);
  saveContract.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.clearAllMocks());

describe('useQuickSettle — thu nhanh một kỳ từ dashboard', () => {
  it('ghi được kỳ chưa quá hạn: đánh dấu đã thu, không lãi phạt', async () => {
    const { result, onDone } = dung();
    await act(async () => { await result.current.settle(HOP_DONG, ky(), 'ok?'); });

    expect(bulkSave).toHaveBeenCalledTimes(1);
    const daGhi = bulkSave.mock.calls[0][0].find((s: RepaymentSchedule) => s.Id === 5);
    expect(daGhi.IsPaid).toBe(true);
    expect(daGhi.OverdueInterestAmount).toBe(0);
    expect(onDone).toHaveBeenCalled();
  });

  it('CHẶN kỳ đã quá hạn, không gọi lệnh ghi nào', async () => {
    const { result, onNotify } = dung();
    await act(async () => {
      await result.current.settle(HOP_DONG, ky({ DueDate: '2020-01-01' }), 'ok?');
    });
    expect(bulkSave).not.toHaveBeenCalled();
    expect(saveContract).not.toHaveBeenCalled();
    expect(onNotify).toHaveBeenCalledWith('error', expect.stringContaining('quá hạn'));
  });

  it('người dùng bấm Huỷ thì không ghi gì', async () => {
    const { result } = dung({ confirm: () => false });
    await act(async () => { await result.current.settle(HOP_DONG, ky(), 'ok?'); });
    expect(fetchSchedules).not.toHaveBeenCalled();
    expect(bulkSave).not.toHaveBeenCalled();
  });

  it('kiểm lại trên dữ liệu THẬT trước khi ghi — kỳ vừa bị người khác thu thì dừng', async () => {
    fetchSchedules.mockResolvedValue([ky({ IsPaid: true })]);
    const { result, onNotify } = dung();
    await act(async () => { await result.current.settle(HOP_DONG, ky(), 'ok?'); });

    expect(bulkSave).not.toHaveBeenCalled();
    expect(onNotify).toHaveBeenCalledWith('error', expect.stringContaining('đã ghi nhận thu'));
  });

  it('kỳ biến mất khỏi cơ sở dữ liệu thì báo lỗi, không ghi bừa', async () => {
    fetchSchedules.mockResolvedValue([]);
    const { result, onNotify } = dung();
    await act(async () => { await result.current.settle(HOP_DONG, ky(), 'ok?'); });

    expect(bulkSave).not.toHaveBeenCalled();
    expect(onNotify).toHaveBeenCalledWith('error', expect.stringContaining('không còn tồn tại'));
  });

  it('cập nhật dư nợ và nhóm nợ của hợp đồng sau khi ghi', async () => {
    const { result } = dung();
    await act(async () => { await result.current.settle(HOP_DONG, ky(), 'ok?'); });

    expect(saveContract).toHaveBeenCalledTimes(1);
    const payload = saveContract.mock.calls[0][0];
    expect(payload.Id).toBe(9);
    expect(payload).toHaveProperty('CurrentBalance');
    expect(payload).toHaveProperty('DebtGroup');
  });

  it('lỗi mạng thì báo lỗi chứ không nuốt', async () => {
    bulkSave.mockRejectedValue(new Error('mất mạng'));
    const { result, onNotify, onDone } = dung();
    await act(async () => { await result.current.settle(HOP_DONG, ky(), 'ok?'); });

    expect(onNotify).toHaveBeenCalledWith('error', expect.stringContaining('mất mạng'));
    expect(onDone).not.toHaveBeenCalled();
  });
});
