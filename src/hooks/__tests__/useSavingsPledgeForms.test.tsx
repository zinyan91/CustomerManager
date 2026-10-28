// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SAMPLE, CC_0418, CC_0907 } from '../../lib/__tests__/fixtures/savingsPledgeSample';
import { useRepaymentForm } from '../useRepaymentForm';
import { useLoanFormState } from '../useLoanFormState';

const TODAY = '2026-10-27';

describe('useRepaymentForm', () => {
  const setup = (onSubmit = vi.fn().mockResolvedValue(undefined)) =>
    ({ onSubmit, hook: renderHook(() => useRepaymentForm({ loan: CC_0418, bundle: SAMPLE, today: TODAY, onSubmit })) });

  it('chọn trả khi đến hạn thì ngày trả là ngày đến hạn', () => {
    const { hook } = setup();
    act(() => hook.result.current.setKind('due'));
    expect(hook.result.current.date).toBe('2027-02-15');
    expect(hook.result.current.quote.total).toBe(417095890);
  });

  it('báo giá không hợp lệ thì không gửi', async () => {
    const { hook, onSubmit } = setup();
    act(() => hook.result.current.setPrincipal(0));
    expect(hook.result.current.quote.ok).toBe(false);
    await act(() => hook.result.current.submit());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('tất toán sổ để cấn trừ gửi đúng dữ liệu và cảnh báo sổ dùng chung', async () => {
    const { hook, onSubmit } = setup();
    act(() => hook.result.current.setKind('offset'));
    expect(hook.result.current.quote.warnings[0]).toContain('CC-2026-0907');
    await act(() => hook.result.current.submit());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      loanId: 10, kind: 'offset', date: TODAY, offsetBookId: 1,
      quote: expect.objectContaining({ principal: 400000000, interest: 9189041 }),
    }));
  });

  it('lỗi lưu giữ nguyên thông điệp', async () => {
    const { hook } = setup(vi.fn().mockRejectedValue(new Error('Khoản vay đã tất toán')));
    act(() => hook.result.current.setKind('full'));
    await act(() => hook.result.current.submit());
    expect(hook.result.current.error).toBe('Khoản vay đã tất toán');
  });
});

describe('useLoanFormState', () => {
  it('cảnh báo khi ngày đến hạn vượt đáo hạn sớm nhất của sổ', () => {
    const links = [{ SavingsBookId: 2, PrincipalCovered: 290000000 }, { SavingsBookId: 1, PrincipalCovered: 60000000 }];
    const { result } = renderHook(() => useLoanFormState(CC_0907, links, SAMPLE));
    expect(result.current.warnings).toEqual([]);
    act(() => result.current.setField('DueDate', '2027-03-01'));
    expect(result.current.warnings).toContain('Ngày đến hạn vượt ngày đáo hạn sớm nhất của sổ bảo đảm.');
  });
});
