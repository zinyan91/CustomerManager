import { describe, expect, it } from 'vitest';
import type { CreditContract, LoanContract, RepaymentSchedule } from '../../types';
import { openLoansForEstimate } from '../settlementEstimateSource';
import { calculateEarlySettlementQuote } from '../loanSettlement';
import { estimateSettlementLine } from '../settlementEstimate';

const kunn = (over: Partial<LoanContract>): LoanContract => ({
  Id: 1, CustomerId: 9, ContractNumber: 'KUNN-01', ContractType: 1, LoanMethod: 'Cho vay từng lần',
  LoanAmount: 600_000_000, InterestRate: 0.09, DisbursementDate: '2026-01-10', IsSettled: false, ...over,
} as LoanContract);

const period = (n: number, due: string, principal: number, paid: boolean): RepaymentSchedule => ({
  Id: n, ContractId: 1, PeriodNumber: n, DueDate: due, PrincipalAmount: principal, InterestAmount: 0,
  TotalAmount: principal, IsPaid: paid, ActualPaidPrincipal: paid ? principal : 0,
} as RepaymentSchedule);

describe('openLoansForEstimate', () => {
  const schedules = [
    period(1, '2026-02-10', 100_000_000, true),
    period(2, '2026-03-10', 100_000_000, true),
    period(3, '2026-04-10', 100_000_000, false),
  ];

  it('lấy dư nợ gốc còn lại, lãi suất và mốc tính lãi giống tất toán thật', () => {
    const { loans, skipped } = openLoansForEstimate({ contracts: [kunn({})], creditContracts: [], schedules }, '2026-03-25');
    expect(skipped).toEqual([]);
    expect(loans).toHaveLength(1);
    const l = loans[0];
    expect(l).toMatchObject({ contractNumber: 'KUNN-01', loanMethod: 'Cho vay từng lần', principal: 400_000_000,
      disbursementDate: '2026-01-10', interestFromDate: '2026-03-10' });
    const real = calculateEarlySettlementQuote({ contract: kunn({}), schedules, settlementDate: '2026-03-25' });
    const est = estimateSettlementLine({ loanMethod: l.loanMethod, principal: l.principal, rateAnnualPercent: l.rateAnnualPercent,
      disbursementDate: l.disbursementDate, interestFromDate: l.interestFromDate, settlementDate: '2026-03-25', penaltyOverridePercent: 0 });
    expect(est.accruedInterest).toBe(real.accruedInterest);
  });

  it('bỏ khoản đã tất toán và khoản thuộc HĐTD đã đóng; khoản không tính được thì ghi lý do', () => {
    const closed = { Id: 5, CustomerId: 9, HdtdNumber: 'HD-5', IsClosed: true } as CreditContract;
    const { loans, skipped } = openLoansForEstimate({
      contracts: [
        kunn({ Id: 2, ContractNumber: 'KUNN-SETTLED', IsSettled: true }),
        kunn({ Id: 4, ContractNumber: 'KUNN-HDTD-DONG', CreditContractId: 5 }),
        kunn({ Id: 3, ContractNumber: 'KUNN-PAID', LoanAmount: 100_000_000 }),
      ],
      creditContracts: [closed],
      schedules: [{ ...period(1, '2026-02-10', 100_000_000, true), ContractId: 3 }],
    }, '2026-03-25');
    expect(loans).toEqual([]);
    expect(skipped.map(s => s.contractNumber)).toEqual(['KUNN-PAID']);
    expect(skipped[0].reason).toContain('đã được thu đủ');
  });
});
