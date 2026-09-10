// --- 1. BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ ---
export interface StatementSellerInfo {
  sellerName: string;
  sellerAddress: string;
  sellerBankAcc: string;
  sellerIdCard: string;
  buyerName: string;
  buyerIdCard: string;
  buyerAddress?: string;
  statementDateStr: string;
  paymentMethod?: 'transfer' | 'cash';
  bankAccNo?: string;
  bankName?: string;
  bankOwner?: string;
  bankBranch?: string;
  customStkText?: string;
}

export function getComputedBankAccText(info: StatementSellerInfo): string {
  if (info.customStkText) return info.customStkText;
  if (info.paymentMethod === 'cash') {
    return info.sellerIdCard && info.sellerIdCard.trim()
      ? `CCCD: ${info.sellerIdCard.trim()}`
      : 'Tiền mặt';
  }
  const acc = info.bankAccNo || '';
  const bank = info.bankName || '';
  const branch = info.bankBranch || '';

  if (acc || bank) {
    const parts = [];
    if (acc) parts.push(`STK: ${acc}`);
    if (bank) parts.push(`Ngân hàng ${bank}${branch ? ` CN ${branch}` : ''}`);
    return parts.join(' - ');
  }

  return info.sellerBankAcc || 'STK: .....';
}

export interface StatementItem {
  id: string;
  dateStr: string;
  itemName: string;
  unit: string;
  qty: number;
  unitPrice: number;
  note?: string;
}

export interface ComputedStatementItem extends StatementItem {
  amount: number;
}

export interface StatementSummary {
  totalItems: number;
  totalQty: number;
  totalAmount: number;
}

export interface StatementTemplate {
  id: string;
  name: string;
  sellerInfo: Partial<StatementSellerInfo>;
  items: Omit<StatementItem, 'id'>[];
}

export function computeStatementItem(item: StatementItem): ComputedStatementItem {
  const qty = Math.max(0, item.qty || 0);
  const price = Math.max(0, item.unitPrice || 0);
  return {
    ...item,
    qty,
    unitPrice: price,
    amount: qty * price,
  };
}

export function computeStatementSummary(items: StatementItem[]): StatementSummary {
  let totalQty = 0;
  let totalAmount = 0;

  items.forEach(it => {
    const c = computeStatementItem(it);
    totalQty += c.qty;
    totalAmount += c.amount;
  });

  return {
    totalItems: items.length,
    totalQty,
    totalAmount,
  };
}

// --- 2. HÓA ĐƠN BÁN LẺ ---
export interface RetailInvoiceHeader {
  buyerName: string;
  buyerAddress: string;
  shopName: string;
  invoiceDateStr: string;
}

export interface RetailInvoiceItem {
  id: string;
  itemName: string;
  unit: string;
  qty: number;
  unitPrice: number;
}

export interface ComputedRetailInvoiceItem extends RetailInvoiceItem {
  amount: number;
}

export interface RetailInvoiceSummary {
  totalItems: number;
  totalQty: number;
  totalAmount: number;
}

export interface RetailInvoiceTemplate {
  id: string;
  name: string;
  headerInfo: Partial<RetailInvoiceHeader>;
  items: Omit<RetailInvoiceItem, 'id'>[];
}

export function computeRetailInvoiceItem(item: RetailInvoiceItem): ComputedRetailInvoiceItem {
  const qty = Math.max(0, item.qty || 0);
  const price = Math.max(0, item.unitPrice || 0);
  return {
    ...item,
    qty,
    unitPrice: price,
    amount: qty * price,
  };
}

export function computeRetailInvoiceSummary(items: RetailInvoiceItem[]): RetailInvoiceSummary {
  let totalQty = 0;
  let totalAmount = 0;

  items.forEach(it => {
    const c = computeRetailInvoiceItem(it);
    totalQty += c.qty;
    totalAmount += c.amount;
  });

  return {
    totalItems: items.length,
    totalQty,
    totalAmount,
  };
}

let seqId = 0;
export function nextStatementId(): string {
  seqId += 1;
  return `stmt_${Date.now()}_${seqId}`;
}

export function nextInvoiceId(): string {
  seqId += 1;
  return `inv_ret_${Date.now()}_${seqId}`;
}
