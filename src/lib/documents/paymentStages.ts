import type { PaymentStageItem } from '../../types/documents';
import { diffDays } from '../calcMath';
import { formatMoneyInput, parseMoneyInput, toIsoDate } from '../utils';

const money = (n: number) => formatMoneyInput(String(Math.max(0, Math.round(n))));

export function newStage(existing: PaymentStageItem[], id: string): PaymentStageItem {
  const status: PaymentStageItem['status'] = existing.length === 0
    ? 'paid'
    : existing.some(s => s.status === 'current') ? 'future' : 'current';
  return { id, stageName: `Đợt ${existing.length + 1}`, amount: '0', status, note: '' };
}

export function firstStageAmount(totalAmount: string, disbursementAmount: string): number {
  return Math.max(0, parseMoneyInput(totalAmount) - parseMoneyInput(disbursementAmount));
}

/**
 * Có số tiền giải ngân thì Đợt 1 là phần khách tự trả (tổng − giải ngân), đã thanh toán; giải ngân trả từ Đợt 2.
 * Chỉ có một đợt sau Đợt 1 thì đợt đó bằng đúng số tiền giải ngân; nhiều đợt thì giữ số người dùng chia.
 */
export function stagesWithDisbursement(
  stages: PaymentStageItem[],
  totalAmount: string,
  disbursementAmount: string,
  makeId: () => string,
): PaymentStageItem[] {
  const disbursed = parseMoneyInput(disbursementAmount);
  if (disbursed <= 0) return stages;
  const first: PaymentStageItem = {
    ...(stages[0] ?? { id: makeId(), note: '' }),
    stageName: stages[0]?.stageName || 'Đợt 1',
    amount: money(firstStageAmount(totalAmount, disbursementAmount)),
    status: 'paid',
  };
  const rest = stages.slice(1);
  if (rest.length === 0) {
    return [first, { id: makeId(), stageName: 'Đợt 2', amount: money(disbursed), status: 'current', note: '' }];
  }
  if (rest.length === 1) return [first, { ...rest[0], amount: money(disbursed) }];
  return [first, ...rest];
}

export function sameStages(a: PaymentStageItem[], b: PaymentStageItem[]): boolean {
  return a.length === b.length && a.every((s, i) =>
    s.id === b[i].id && s.amount === b[i].amount && s.status === b[i].status && s.stageName === b[i].stageName);
}

export function deliveryDays(contractDate: string, endDate: string): number | null {
  const start = toIsoDate(contractDate);
  const end = toIsoDate(endDate);
  if (!start || !end || end < start) return null;
  return diffDays(start, end);
}
