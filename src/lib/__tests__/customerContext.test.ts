import { describe, it, expect } from 'vitest';
import { buildCustomerContext } from '../customerContext';
import type { CreditContract, LoanContract, RepaymentSchedule } from '../../types';

const HOM_NAY = '2026-08-20';

const hdtd = (over: Partial<CreditContract> = {}): CreditContract => ({
  Id: 1, CustomerId: 55, HdtdNumber: 'HDTD-01',
  LoanMethod: 'Hạn mức tín dụng',
  ContractAmount: 1_000_000_000,
  ContractStartDate: '2026-01-01', ContractEndDate: '2027-01-01',
  IsClosed: false,
  ...over,
} as CreditContract);

const kunn = (over: Partial<LoanContract> = {}): LoanContract => ({
  Id: 100, CustomerId: 55, CreditContractId: 1,
  ContractNumber: 'KUNN-01',
  LoanAmount: 400_000_000,
  IsSettled: false,
  ...over,
} as LoanContract);

describe('buildCustomerContext', () => {
  it('khách chưa có HĐTD thì mọi số bằng 0 và nhóm nợ là 1', () => {
    const r = buildCustomerContext({
      creditContracts: [], kunns: [], paidPrincipal: {},
      overdueSchedules: [], today: HOM_NAY,
    });
    expect(r).toEqual({
      granted: 0, outstanding: 0, available: 0,
      debtGroup: 1, maxOverdueDays: 0, activeKunnCount: 0,
    });
  });

  it('dư nợ trừ gốc đã trả lấy từ ContractPaidPrincipal', () => {
    const r = buildCustomerContext({
      creditContracts: [hdtd()],
      kunns: [kunn()],
      paidPrincipal: { 100: 150_000_000 },
      overdueSchedules: [],
      today: HOM_NAY,
    });
    expect(r.outstanding).toBe(250_000_000);
    expect(r.granted).toBe(1_000_000_000);
    expect(r.available).toBe(750_000_000);
    expect(r.activeKunnCount).toBe(1);
  });

  it('không có bản ghi gốc đã trả thì lùi về CurrentBalance của KUNN', () => {
    const r = buildCustomerContext({
      creditContracts: [hdtd()],
      kunns: [kunn({ CurrentBalance: 380_000_000 })],
      paidPrincipal: {},
      overdueSchedules: [],
      today: HOM_NAY,
    });
    expect(r.outstanding).toBe(380_000_000);
  });

  it('KUNN đã tất toán không tính vào dư nợ', () => {
    const r = buildCustomerContext({
      creditContracts: [hdtd()],
      kunns: [kunn({ IsSettled: true })],
      paidPrincipal: {},
      overdueSchedules: [],
      today: HOM_NAY,
    });
    expect(r.outstanding).toBe(0);
    expect(r.activeKunnCount).toBe(0);
  });

  it('HĐTD hết hiệu lực thì hạn mức khả dụng về 0 dù còn dư địa', () => {
    const r = buildCustomerContext({
      creditContracts: [hdtd({ ContractEndDate: '2026-06-30' })],
      kunns: [kunn()],
      paidPrincipal: {},
      overdueSchedules: [],
      today: HOM_NAY,
    });
    expect(r.available).toBe(0);
  });

  it('nhóm nợ suy từ số ngày quá hạn lớn nhất', () => {
    const qua = (dueDate: string): RepaymentSchedule => ({
      Id: 1, ContractId: 100, PeriodNumber: 1, DueDate: dueDate,
      IsPaid: false, PrincipalAmount: 1_000_000, InterestAmount: 100_000,
    } as RepaymentSchedule);

    const r = buildCustomerContext({
      creditContracts: [hdtd()],
      kunns: [kunn()],
      paidPrincipal: {},
      overdueSchedules: [qua('2026-06-01'), qua('2026-08-10')],
      today: HOM_NAY,
    });
    expect(r.maxOverdueDays).toBe(80);
    expect(r.debtGroup).toBeGreaterThan(1);
  });

  it('không có kỳ quá hạn thì nhóm 1, 0 ngày', () => {
    const r = buildCustomerContext({
      creditContracts: [hdtd()],
      kunns: [kunn()],
      paidPrincipal: {},
      overdueSchedules: [],
      today: HOM_NAY,
    });
    expect(r.debtGroup).toBe(1);
    expect(r.maxOverdueDays).toBe(0);
  });

  it('KUNN đã tất toán dù sót lịch cũ quá hạn 787 ngày thì vẫn nhóm 1 và 0 ngày quá hạn', () => {
    const qua = (dueDate: string): RepaymentSchedule => ({
      Id: 8703, ContractId: 100, PeriodNumber: 1, DueDate: dueDate,
      IsPaid: false, PrincipalAmount: 18_340_000, InterestAmount: 8_504_658,
    } as RepaymentSchedule);

    const r = buildCustomerContext({
      creditContracts: [hdtd({ IsClosed: true })],
      kunns: [kunn({ IsSettled: true })],
      paidPrincipal: {},
      overdueSchedules: [qua('2024-07-15')],
      today: '2026-09-10',
    });
    expect(r.outstanding).toBe(0);
    expect(r.activeKunnCount).toBe(0);
    expect(r.debtGroup).toBe(1);
    expect(r.maxOverdueDays).toBe(0);
  });

  it('chỉ tính quá hạn cho KUNN đang lưu nợ, bỏ qua kỳ cũ của KUNN đã tất toán', () => {
    const qua = (contractId: number, dueDate: string): RepaymentSchedule => ({
      Id: contractId === 100 ? 8703 : 8800, ContractId: contractId, PeriodNumber: 1, DueDate: dueDate,
      IsPaid: false, PrincipalAmount: 10_000_000, InterestAmount: 1_000_000,
    } as RepaymentSchedule);

    const r = buildCustomerContext({
      creditContracts: [hdtd()],
      kunns: [
        kunn({ Id: 100, IsSettled: true }), // Đã tất toán
        kunn({ Id: 200, IsSettled: false, LoanAmount: 100_000_000 }), // Đang vay, trễ 15 ngày (Nhóm 2)
      ],
      paidPrincipal: {},
      overdueSchedules: [
        qua(100, '2024-07-15'), // Lịch cũ 787 ngày của KUNN đã tất toán -> BỎ QUA
        qua(200, '2026-08-26'), // Lịch 15 ngày của KUNN đang vay -> TÍNH
      ],
      today: '2026-09-10',
    });
    expect(r.outstanding).toBe(100_000_000);
    expect(r.activeKunnCount).toBe(1);
    expect(r.maxOverdueDays).toBe(15);
    expect(r.debtGroup).toBe(2); // 15 ngày quá hạn thuộc nhóm 2, không bị phóng đại lên nhóm 5
  });
});

