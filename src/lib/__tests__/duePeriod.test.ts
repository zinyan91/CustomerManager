import { describe, it, expect } from 'vitest';
import { isPeriodOutstanding, contractDueState, type DuePeriodRow } from '../duePeriod';

const ky = (over: Partial<DuePeriodRow> & { PeriodNumber: number; DueDate: string }): DuePeriodRow => ({
  Id: over.PeriodNumber,
  ContractId: 1,
  TotalAmount: 1_000_000,
  IsPaid: false,
  ...over,
});

describe('isPeriodOutstanding', () => {
  it('chưa đánh dấu trả thì còn nợ', () => {
    expect(isPeriodOutstanding({ IsPaid: false })).toBe(true);
  });

  it('đã đánh dấu trả thì xong', () => {
    expect(isPeriodOutstanding({ IsPaid: true })).toBe(false);
  });
});

describe('contractDueState', () => {
  it('không có kỳ nào thì không hiện', () => {
    const r = contractDueState([], '2026-08-16');
    expect(r.kind).toBe('none');
    expect(r.period).toBeNull();
  });

  it('mọi kỳ đã trả thì không hiện', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-07-01', IsPaid: true }),
      ky({ PeriodNumber: 2, DueDate: '2026-08-01', IsPaid: true }),
    ], '2026-08-16');
    expect(r.kind).toBe('none');
  });

  it('kỳ còn nợ đã qua hạn thì báo quá hạn theo số ngày âm', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-08-01' }),
    ], '2026-08-16');
    expect(r.kind).toBe('overdue');
    expect(r.daysLeft).toBe(-15);
    expect(r.dueDateIso).toBe('2026-08-01');
    expect(r.period?.PeriodNumber).toBe(1);
  });

  it('nhiều kỳ còn nợ thì lấy kỳ có hạn sớm nhất', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 3, DueDate: '2026-09-01' }),
      ky({ PeriodNumber: 1, DueDate: '2026-06-01' }),
      ky({ PeriodNumber: 2, DueDate: '2026-07-01' }),
    ], '2026-08-16');
    expect(r.period?.PeriodNumber).toBe(1);
    expect(r.dueDateIso).toBe('2026-06-01');
  });

  it('kỳ đã trả không được chen lên trước kỳ còn nợ', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-05-01', IsPaid: true }),
      ky({ PeriodNumber: 2, DueDate: '2026-08-20' }),
    ], '2026-08-16');
    expect(r.kind).toBe('upcoming');
    expect(r.period?.PeriodNumber).toBe(2);
  });

  it('đến hạn đúng hôm nay là sắp đến hạn 0 ngày, không phải quá hạn', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-08-16' }),
    ], '2026-08-16');
    expect(r.kind).toBe('upcoming');
    expect(r.daysLeft).toBe(0);
  });

  it('đến hạn đúng ngưỡng 5 ngày vẫn hiện', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-08-21' }),
    ], '2026-08-16');
    expect(r.kind).toBe('upcoming');
    expect(r.daysLeft).toBe(5);
  });

  it('xa hơn 5 ngày thì không hiện', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-08-22' }),
    ], '2026-08-16');
    expect(r.kind).toBe('none');
    expect(r.daysLeft).toBe(6);
  });

  it('kỳ không có ngày đến hạn thì bỏ qua, không làm hỏng cả hợp đồng', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '' }),
      ky({ PeriodNumber: 2, DueDate: '2026-08-01' }),
    ], '2026-08-16');
    expect(r.kind).toBe('overdue');
    expect(r.period?.PeriodNumber).toBe(2);
  });

  it('đọc được ngày kiểu dd/mm/yyyy', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '01/08/2026' }),
    ], '2026-08-16');
    expect(r.dueDateIso).toBe('2026-08-01');
    expect(r.daysLeft).toBe(-15);
  });

  it('ca Đặng Bá Nhân: đã đóng kỳ tháng 8, kỳ sau 01/09, hôm nay 16/08 thì không hiện', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 7, DueDate: '2026-07-01', IsPaid: true }),
      ky({ PeriodNumber: 8, DueDate: '2026-08-01', IsPaid: true }),
      ky({ PeriodNumber: 9, DueDate: '2026-09-01' }),
    ], '2026-08-16');
    expect(r.kind).toBe('none');
  });
});
