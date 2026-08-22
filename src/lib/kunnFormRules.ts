export const REVOLVING_CREDIT_METHOD = 'Hạn mức tín dụng';

export function isRevolvingCredit(loanMethod?: string | null): boolean {
  return loanMethod === REVOLVING_CREDIT_METHOD;
}

export function isPrincipalRepaymentLocked(loanMethod?: string | null): boolean {
  return isRevolvingCredit(loanMethod);
}

export function isInterestRepaymentLocked(loanMethod?: string | null): boolean {
  return isRevolvingCredit(loanMethod);
}

export function getLoanAmountFieldLabel(loanMethod?: string | null): string {
  return isRevolvingCredit(loanMethod)
    ? 'Số tiền nhận nợ lần này (KUNN) *'
    : 'Số tiền giải ngân thực tế (KUNN) *';
}

export function isRevolvingTenorSelect(loanMethod?: string | null): boolean {
  return isRevolvingCredit(loanMethod);
}
