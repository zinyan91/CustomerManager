import { describe, it, expect } from 'vitest';
import { scheduleRowsForContract, reconcileScheduleRows } from '../scheduleSync';
import type { RepaymentSchedule } from '../../types';

const daCo = (over: Partial<RepaymentSchedule> & { Id: number; PeriodNumber: number }): RepaymentSchedule => ({
  ContractId: 1014,
  DueDate: '2026-04-15',
  PrincipalAmount: 1_000_000,
  InterestAmount: 50_000,
  TotalAmount: 1_050_000,
  IsPaid: false,
  ...over,
});

describe('scheduleRowsForContract', () => {
  it('không bao giờ tự đặt Id — khoá chính do cơ sở dữ liệu cấp', () => {
    const rows = scheduleRowsForContract(
      [{ PeriodNumber: 1, DueDate: '2026-04-15' }, { PeriodNumber: 2, DueDate: '2026-05-15' }],
      1014
    );
    rows.forEach(r => expect('Id' in r).toBe(false));
  });

  it('gắn đúng mã hợp đồng và đánh số kỳ khi thiếu', () => {
    const rows = scheduleRowsForContract([{ DueDate: '2026-04-15' }, { DueDate: '2026-05-15' }], 77);
    expect(rows.map(r => r.ContractId)).toEqual([77, 77]);
    expect(rows.map(r => r.PeriodNumber)).toEqual([1, 2]);
  });

  it('giữ số 0 hợp lệ, không nuốt thành giá trị khác', () => {
    const rows = scheduleRowsForContract(
      [{ PeriodNumber: 1, DueDate: '2026-04-15', PrincipalAmount: 0, InterestAmount: 0 }],
      1
    );
    expect(rows[0].PrincipalAmount).toBe(0);
    expect(rows[0].InterestAmount).toBe(0);
  });
});

describe('reconcileScheduleRows', () => {
  it('kỳ hạn dài ra: giữ kỳ cũ, chỉ thêm kỳ mới', () => {
    const existing = [1, 2, 3, 4, 5].map(n => daCo({ Id: 270 + n, PeriodNumber: n }));
    const generated = scheduleRowsForContract(
      [1, 2, 3, 4, 5, 6].map(n => ({ PeriodNumber: n, DueDate: `2026-0${n + 3}-15` })),
      1014
    );

    const r = reconcileScheduleRows(existing, generated);

    expect(r.toUpsert.filter(x => x.Id).length).toBe(5);
    expect(r.toUpsert.filter(x => !x.Id).length).toBe(1);
    expect(r.toDeleteIds).toEqual([]);
    expect(r.blockedPaidPeriods).toEqual([]);
  });

  it('không xoá dấu đã thu của kỳ cũ khi tính lại', () => {
    const existing = [
      daCo({ Id: 272, PeriodNumber: 1, IsPaid: true, PaymentDate: '2026-04-15', ActualPaidPrincipal: 1_000_000, Note: 'thu tiền mặt' }),
      daCo({ Id: 273, PeriodNumber: 2 }),
    ];
    const generated = scheduleRowsForContract(
      [{ PeriodNumber: 1, DueDate: '2026-04-20', PrincipalAmount: 900_000 },
       { PeriodNumber: 2, DueDate: '2026-05-20', PrincipalAmount: 900_000 }],
      1014
    );

    const ky1 = reconcileScheduleRows(existing, generated).toUpsert.find(x => x.PeriodNumber === 1)!;

    expect(ky1.Id).toBe(272);
    expect(ky1.IsPaid).toBe(true);
    expect(ky1.PaymentDate).toBe('2026-04-15');
    expect(ky1.ActualPaidPrincipal).toBe(1_000_000);
    expect(ky1.Note).toBe('thu tiền mặt');
    expect(ky1.PrincipalAmount).toBe(900_000);
    expect(ky1.DueDate).toBe('2026-04-20');
  });

  it('kỳ hạn ngắn lại: xoá kỳ dư chưa thu', () => {
    const existing = [1, 2, 3, 4, 5, 6].map(n => daCo({ Id: 270 + n, PeriodNumber: n }));
    const generated = scheduleRowsForContract(
      [1, 2, 3, 4, 5].map(n => ({ PeriodNumber: n, DueDate: '2026-04-15' })),
      1014
    );

    const r = reconcileScheduleRows(existing, generated);

    expect(r.toDeleteIds).toEqual([276]);
    expect(r.blockedPaidPeriods).toEqual([]);
  });

  it('kỳ dư mà ĐÃ THU thì chặn, không xoá lịch sử tiền', () => {
    const existing = [1, 2, 3, 4, 5, 6].map(n =>
      daCo({ Id: 270 + n, PeriodNumber: n, IsPaid: n === 6 })
    );
    const generated = scheduleRowsForContract(
      [1, 2, 3, 4, 5].map(n => ({ PeriodNumber: n, DueDate: '2026-04-15' })),
      1014
    );

    const r = reconcileScheduleRows(existing, generated);

    expect(r.blockedPaidPeriods).toEqual([6]);
    expect(r.toDeleteIds).toEqual([]);
  });

  it('hợp đồng chưa có lịch thì mọi kỳ đều là thêm mới, không dòng nào mang Id', () => {
    const generated = scheduleRowsForContract(
      [1, 2, 3].map(n => ({ PeriodNumber: n, DueDate: '2026-04-15' })),
      1014
    );

    const r = reconcileScheduleRows([], generated);

    expect(r.toUpsert.length).toBe(3);
    expect(r.toUpsert.every(x => !('Id' in x))).toBe(true);
    expect(r.toDeleteIds).toEqual([]);
  });

  it('trùng số kỳ mà chỉ một bản có dấu đã thu: giữ bản đó, xoá bản rỗng', () => {
    const existing = [
      daCo({ Id: 273, PeriodNumber: 2, IsPaid: true, PaymentDate: '2026-05-15' }),
      daCo({ Id: 2, PeriodNumber: 2 }),
    ];
    const generated = scheduleRowsForContract([{ PeriodNumber: 2, DueDate: '2026-05-15' }], 1014);

    const r = reconcileScheduleRows(existing, generated);

    expect(r.toUpsert.map(x => x.Id)).toEqual([273]);
    expect(r.toDeleteIds).toEqual([2]);
    expect(r.ambiguousPeriods).toEqual([]);
  });

  it('trùng số kỳ mà cả hai đều có dấu đã thu: chặn, không đoán bản nào đúng', () => {
    const existing = [
      daCo({ Id: 272, PeriodNumber: 1, IsPaid: true }),
      daCo({ Id: 1, PeriodNumber: 1, IsPaid: true }),
    ];
    const generated = scheduleRowsForContract([{ PeriodNumber: 1, DueDate: '2026-04-15' }], 1014);

    const r = reconcileScheduleRows(existing, generated);

    expect(r.ambiguousPeriods).toEqual([1]);
    expect(r.toDeleteIds).toEqual([]);
  });

  it('trùng số kỳ mà không bản nào có dấu đã thu: chặn luôn, để người quyết', () => {
    const existing = [
      daCo({ Id: 274, PeriodNumber: 3 }),
      daCo({ Id: 3, PeriodNumber: 3 }),
    ];
    const generated = scheduleRowsForContract([{ PeriodNumber: 3, DueDate: '2026-06-15' }], 1014);

    const r = reconcileScheduleRows(existing, generated);

    expect(r.ambiguousPeriods).toEqual([3]);
    expect(r.toDeleteIds).toEqual([]);
  });
});
