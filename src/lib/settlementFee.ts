import type { CreditContract, LoanContract } from '../types';
import { isRevolvingCredit } from './loanProductRules';
import { penaltyPercentForLoanYear, PREPAYMENT_FEE_YEARS } from './prepaymentAnalysis';
import { toIsoDate } from './utils';

/** Hình thức vay của KUNN: theo HĐTD liên kết, không có thì theo KUNN, không có nữa thì suy từ loại hợp đồng. */
export function loanMethodOfKunn(
  kunn: Pick<LoanContract, 'CreditContractId' | 'LoanMethod' | 'ContractType'>,
  creditContracts: Pick<CreditContract, 'Id' | 'LoanMethod'>[]
): string {
  const fromHdtd = kunn.CreditContractId ? creditContracts.find(c => c.Id === kunn.CreditContractId)?.LoanMethod : null;
  return fromHdtd || kunn.LoanMethod || (kunn.ContractType === 0 ? 'Hạn mức tín dụng' : 'Cho vay từng lần');
}

/** Khoản vay đang ở năm thứ mấy tại ngày tất toán (năm 1 bắt đầu từ ngày giải ngân). */
export function loanYearAt(disbursementDate: string | null | undefined, onDate: string | null | undefined): number | null {
  const start = toIsoDate(disbursementDate);
  const end = toIsoDate(onDate);
  if (!start || !end || end < start) return null;
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  let years = ey - sy;
  if (em < sm || (em === sm && ed < sd)) years -= 1;
  return years + 1;
}

export interface SettlementFeeSuggestion {
  percent: number;
  revolving: boolean;
  loanYear: number | null;
  reason: string;
}

const pct = (n: number) => `${String(n).replace('.', ',')}%`;

/** Hạn mức tín dụng quay vòng miễn phí trả nợ trước hạn; các hình thức khác theo biểu phí năm. */
export function suggestSettlementFee(input: {
  loanMethod: string;
  disbursementDate: string | null | undefined;
  settlementDate: string;
  penaltyByYear?: readonly number[];
}): SettlementFeeSuggestion {
  const revolving = isRevolvingCredit(input.loanMethod);
  const loanYear = loanYearAt(input.disbursementDate, input.settlementDate);
  if (revolving) {
    return { percent: 0, revolving, loanYear, reason: 'Miễn phí (hạn mức)' };
  }
  if (loanYear === null) {
    return { percent: 0, revolving, loanYear, reason: 'Thiếu ngày giải ngân, nhập tay' };
  }
  const percent = penaltyPercentForLoanYear(input.penaltyByYear, loanYear);
  const reason = loanYear > PREPAYMENT_FEE_YEARS
    ? `Từ năm thứ ${PREPAYMENT_FEE_YEARS + 1}: miễn phí`
    : `Năm thứ ${loanYear}: ${pct(percent)}`;
  return { percent, revolving, loanYear, reason };
}
