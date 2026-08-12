import { parseDecimalNumber } from './utils';

export interface ReceivableItem {
  id: string;
  code: string;
  name: string;
  beginningDebit: number;
  beginningCredit: number;
  occurredDebit: number;
  occurredCredit: number;
}

export interface ComputedReceivableItem extends ReceivableItem {
  endingDebit: number;
  endingCredit: number;
}

export interface ReceivableSummary {
  totalItems: number;
  totalBeginningDebit: number;
  totalBeginningCredit: number;
  totalOccurredDebit: number;
  totalOccurredCredit: number;
  totalEndingDebit: number;
  totalEndingCredit: number;
  netReceivableBalance: number;
}

export function computeReceivableItemRow(item: ReceivableItem): ComputedReceivableItem {
  const begDeb = Math.max(0, item.beginningDebit || 0);
  const begCred = Math.max(0, item.beginningCredit || 0);
  const occDeb = Math.max(0, item.occurredDebit || 0);
  const occCred = Math.max(0, item.occurredCredit || 0);

  const net = (begDeb - begCred) + (occDeb - occCred);
  const endingDebit = net > 0 ? net : 0;
  const endingCredit = net < 0 ? Math.abs(net) : 0;

  return {
    ...item,
    beginningDebit: begDeb,
    beginningCredit: begCred,
    occurredDebit: occDeb,
    occurredCredit: occCred,
    endingDebit,
    endingCredit,
  };
}

export function computeReceivableSummary(items: ReceivableItem[]): ReceivableSummary {
  let totalBeginningDebit = 0;
  let totalBeginningCredit = 0;
  let totalOccurredDebit = 0;
  let totalOccurredCredit = 0;
  let totalEndingDebit = 0;
  let totalEndingCredit = 0;

  items.forEach(it => {
    const c = computeReceivableItemRow(it);
    totalBeginningDebit += c.beginningDebit;
    totalBeginningCredit += c.beginningCredit;
    totalOccurredDebit += c.occurredDebit;
    totalOccurredCredit += c.occurredCredit;
    totalEndingDebit += c.endingDebit;
    totalEndingCredit += c.endingCredit;
  });

  return {
    totalItems: items.length,
    totalBeginningDebit,
    totalBeginningCredit,
    totalOccurredDebit,
    totalOccurredCredit,
    totalEndingDebit,
    totalEndingCredit,
    netReceivableBalance: totalEndingDebit - totalEndingCredit,
  };
}

let debtSeq = 0;
export function nextDebtItemId(): string {
  debtSeq += 1;
  return `debt_${Date.now()}_${debtSeq}`;
}

export function parseReceivableText(text: string): ReceivableItem[] {
  const lines = text.split(/\r?\n/);
  const results: ReceivableItem[] = [];

  lines.forEach(line => {
    if (!line.trim()) return;
    const parts = line.includes('\t') ? line.split('\t') : line.split(/,|;/);
    if (parts.length < 2) return;

    const code = parts[0]?.trim() || '';
    const name = parts[1]?.trim() || '';

    // Ignore headers
    if (
      code.toLowerCase().includes('mã') ||
      name.toLowerCase().includes('tên') ||
      code.toLowerCase().includes('tài khoản')
    ) {
      return;
    }

    const begDeb = parseDecimalNumber(parts[2] || '0');
    const begCred = parseDecimalNumber(parts[3] || '0');
    const occDeb = parseDecimalNumber(parts[4] || '0');
    const occCred = parseDecimalNumber(parts[5] || '0');

    results.push({
      id: nextDebtItemId(),
      code,
      name,
      beginningDebit: begDeb,
      beginningCredit: begCred,
      occurredDebit: occDeb,
      occurredCredit: occCred,
    });
  });

  return results;
}

export const SAMPLE_RECEIVABLES: ReceivableItem[] = [
  {
    id: 'rec-1',
    code: 'BẰNG THANH - LD',
    name: 'CÔNG TY TNHH XÂY DỰNG THƯƠNG MẠI BĂNG THANH',
    beginningDebit: 59405376,
    beginningCredit: 0,
    occurredDebit: 0,
    occurredCredit: 0,
  },
  {
    id: 'rec-2',
    code: 'CHÍ THÀNH ( mới)',
    name: 'CÔNG TY TNHH TRANG TRÍ NỘI THẤT CHÍ THÀNH',
    beginningDebit: 22000000,
    beginningCredit: 0,
    occurredDebit: 10354483,
    occurredCredit: 10354483,
  },
  {
    id: 'rec-3',
    code: 'Công Danh - CMT8',
    name: 'CÔNG TY TNHH XÂY DỰNG THƯƠNG MẠI CÔNG DANH THẾ GIỚI NỘI THẤT',
    beginningDebit: 17794581,
    beginningCredit: 0,
    occurredDebit: 0,
    occurredCredit: 0,
  },
  {
    id: 'rec-4',
    code: 'Cty Luxxa Home',
    name: 'CÔNG TY TNHH LUXXA HOME',
    beginningDebit: 7625600,
    beginningCredit: 0,
    occurredDebit: 17276160,
    occurredCredit: 24901200,
  },
  {
    id: 'rec-5',
    code: 'HOÀNG NAM 1',
    name: 'CÔNG TY TNHH THƯƠNG MẠI HOÀNG NAM',
    beginningDebit: 150152429,
    beginningCredit: 0,
    occurredDebit: 0,
    occurredCredit: 0,
  },
  {
    id: 'rec-6',
    code: 'HAI HUỆ',
    name: 'VẬT LIỆU XÂY DỰNG HAI HUỆ',
    beginningDebit: 0,
    beginningCredit: 0,
    occurredDebit: 290449152,
    occurredCredit: 290449152,
  },
];
