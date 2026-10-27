import type { CreditContract, LoanContract, PledgeBundle, RepaymentSchedule } from '../types';
import { isKunnOfClosedHdtd, summarizeCreditContracts, totalsOfCreditContracts } from './creditContract';
import { getAutoDebtGroupInfo, outstandingOf } from './loanMath';
import { overdueDays, pledgeLoanDebtGroup } from './pledgeLoan';
import { summarizePledgePortfolio } from './pledgePortfolio';

export interface CustomerContextSummary {
  granted: number;
  outstanding: number;
  available: number;
  debtGroup: number;
  maxOverdueDays: number;
  activeKunnCount: number;
}

export interface BuildCustomerContextInput {
  creditContracts: CreditContract[];
  kunns: LoanContract[];
  paidPrincipal: Record<number, number>;
  overdueSchedules: RepaymentSchedule[];
  today: string;
  pledge?: PledgeBundle;
}

export function buildCustomerContext(
  { creditContracts, kunns, paidPrincipal, overdueSchedules, today, pledge }: BuildCustomerContextInput
): CustomerContextSummary {
  const summaries = summarizeCreditContracts(creditContracts, kunns, {
    getOutstanding: (k) => outstandingOf(k, paidPrincipal[k.Id] ?? null),
    today,
  });

  const { granted, outstanding, available } = totalsOfCreditContracts(summaries);
  const activeKunnCount = summaries.reduce((s, x) => s + x.activeKunnCount, 0);

  // Chỉ xét các kỳ quá hạn của KUNN còn đang hoạt động (chưa tất toán và thuộc HĐTD còn hiệu lực)
  const activeKunnIds = new Set(
    kunns
      .filter(k => !k.IsSettled && !isKunnOfClosedHdtd(k, creditContracts))
      .map(k => k.Id)
  );
  const activeOverdueSchedules = overdueSchedules.filter(s =>
    activeKunnIds.has(s.ContractId)
  );

  // Nếu khách hàng không còn dư nợ hoặc không có KUNN nào đang lưu nợ, khách hàng chuẩn nhóm 1 và không có nợ quá hạn
  const { debtGroup, maxOverdueDays } = (outstanding <= 0 || activeKunnCount === 0)
    ? { debtGroup: 1, maxOverdueDays: 0 }
    : getAutoDebtGroupInfo(activeOverdueSchedules, today);

  if (!pledge) return { granted, outstanding, available, debtGroup, maxOverdueDays, activeKunnCount };

  const camCo = summarizePledgePortfolio(pledge, today);
  const openPledge = pledge.loans.filter((l) => !l.IsClosed);
  return {
    granted: granted + camCo.granted,
    outstanding: outstanding + camCo.outstanding,
    available,
    debtGroup: Math.max(debtGroup, ...openPledge.map((l) => pledgeLoanDebtGroup(l, pledge.repayments, today))),
    maxOverdueDays: Math.max(maxOverdueDays, ...openPledge.map((l) => overdueDays(l, pledge.repayments, today))),
    activeKunnCount: activeKunnCount + camCo.count,
  };
}
