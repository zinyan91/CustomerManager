export interface ToiLoanMonthInput {
  month: number;
  days: number;
  shortTermBal: number;
  shortTermRate: number;
  shortTermFtp: number;
  longTermBal: number;
  longTermRate: number;
  longTermFtp: number;
}

export interface ToiLoanMonthResult {
  month: number;
  days: number;
  shortTermMargin: number;
  shortTermIncome: number;
  longTermMargin: number;
  longTermIncome: number;
  totalIncome: number;
  totalBal: number;
}

export interface ToiLoanSummaryResult {
  monthlyResults: ToiLoanMonthResult[];
  totalShortTermIncome: number;
  totalLongTermIncome: number;
  totalIncomeAnnual: number;
  avgBalanceAnnual: number;
  toiOverAvgBalance: number;
}

export const DAYS_IN_MONTHS_DEFAULT = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function computeToiLoanMonth(input: ToiLoanMonthInput): ToiLoanMonthResult {
  const days = input.days || 30;
  const shortBal = Math.max(0, input.shortTermBal || 0);
  const shortMargin = (input.shortTermRate || 0) - (input.shortTermFtp || 0); // in % e.g. 1.0 means 1%
  const shortIncome = (shortBal * (shortMargin / 100) * days) / 360;

  const longBal = Math.max(0, input.longTermBal || 0);
  const longMargin = (input.longTermRate || 0) - (input.longTermFtp || 0);
  const longIncome = (longBal * (longMargin / 100) * days) / 360;

  return {
    month: input.month,
    days,
    shortTermMargin: shortMargin,
    shortTermIncome: shortIncome,
    longTermMargin: longMargin,
    longTermIncome: longIncome,
    totalIncome: shortIncome + longIncome,
    totalBal: shortBal + longBal,
  };
}

export function computeToiLoanSummary(inputs: ToiLoanMonthInput[]): ToiLoanSummaryResult {
  const monthlyResults = inputs.map(computeToiLoanMonth);

  let totalShortTermIncome = 0;
  let totalLongTermIncome = 0;
  let totalIncomeAnnual = 0;
  let totalBalSum = 0;

  monthlyResults.forEach(r => {
    totalShortTermIncome += r.shortTermIncome;
    totalLongTermIncome += r.longTermIncome;
    totalIncomeAnnual += r.totalIncome;
    totalBalSum += r.totalBal;
  });

  const avgBalanceAnnual = inputs.length > 0 ? totalBalSum / inputs.length : 0;
  const toiOverAvgBalance = avgBalanceAnnual > 0 ? totalIncomeAnnual / avgBalanceAnnual : 0;

  return {
    monthlyResults,
    totalShortTermIncome,
    totalLongTermIncome,
    totalIncomeAnnual,
    avgBalanceAnnual,
    toiOverAvgBalance,
  };
}

export function defaultToiLoanInputs(): ToiLoanMonthInput[] {
  return DAYS_IN_MONTHS_DEFAULT.map((days, idx) => ({
    month: idx + 1,
    days,
    shortTermBal: 1250, // default sample 1,250 triệu VNĐ
    shortTermRate: 9.0, // 9.0% / năm
    shortTermFtp: 8.0,  // 8.0% / năm (Margin 1.0%)
    longTermBal: 0,
    longTermRate: 10.5,
    longTermFtp: 8.5,
  }));
}
