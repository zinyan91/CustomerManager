import { CASE_TYPES, LOAN_TERMS, PROGRESS_STAGES, type LoanProgressInput } from '../types/loanProgress';
import { formatMoneyTextWith, loadFormatSettings, NUMBER_SEPARATORS } from './formatSettings';

export function formatProgressInput(value: string): string {
  const group = NUMBER_SEPARATORS[loadFormatSettings().numberStyle].group;
  const digits = value.split(group).join('');
  return /^\d*$/.test(digits) ? formatMoneyTextWith(digits) : value;
}

export function parseProgressNumber(value: string): number | null {
  if (!value.trim()) return null;
  const group = NUMBER_SEPARATORS[loadFormatSettings().numberStyle].group;
  const parts = value.trim().split(group);
  const valid = /^\d+$/.test(value.trim()) || /^\d{1,3}$/.test(parts[0]) && parts.length>1 && parts.slice(1).every(part=>/^\d{3}$/.test(part));
  const number = Number(parts.join(''));
  if (!valid || !Number.isSafeInteger(number) || number < 0 || number > 999999999999999)
    throw new Error('Chỉ tiêu phải là số nguyên không âm, tối đa 999.999.999.999.999.');
  return number;
}
export function validateProgress(input: LoanProgressInput): string | null {
  if (!input.TeamId) return 'Chọn team báo cáo.';
  if (!input.AssigneeId) return 'Chọn nhân sự phụ trách.';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.Month)) return 'Tháng báo cáo không hợp lệ.';
  if (!['new','existing'].includes(input.CustomerKind)) return 'Loại khách hàng không hợp lệ.';
  if (input.CustomerKind === 'existing' && (!Number.isSafeInteger(input.CustomerId) || (input.CustomerId ?? 0) <= 0))
    return 'Chọn khách hàng hiện hữu.';
  if (input.CustomerKind === 'new' && (!input.CustomerName.trim() || input.CustomerName.trim().length > 200))
    return 'Họ tên khách hàng phải có từ 1 đến 200 ký tự.';
  if (!CASE_TYPES.includes(input.CaseType) || !LOAN_TERMS.includes(input.LoanTerm) || !PROGRESS_STAGES.includes(input.Stage))
    return 'Loại hồ sơ, khoản vay hoặc tiến độ không hợp lệ.';
  for (const key of ['Amount','Cards','Fees','Insurance'] as const) {
    const value = input[key];
    if (value !== null && (!Number.isSafeInteger(value) || value < 0 || value > (key === 'Cards' ? 2147483647 : 999999999999999)))
      return 'Chỉ tiêu phải là số nguyên không âm trong giới hạn cho phép.';
  }
  return null;
}
export function summarizeProgress(rows: LoanProgressInput[]) {
  const sum = (key: 'Amount'|'Cards'|'Fees'|'Insurance') => {
    const entered = rows.flatMap(row => row[key] === null ? [] : [row[key]]);
    return entered.length ? entered.reduce((total,value) => total+value,0) : null;
  };
  return { count:rows.length,disbursed:rows.filter(row => row.Stage === 'Đã giải ngân').length,
    Amount:sum('Amount'),Cards:sum('Cards'),Fees:sum('Fees'),Insurance:sum('Insurance') };
}
export function progressNumber(value: number | null) {
  return value === null ? '—' : value.toLocaleString('vi-VN');
}
