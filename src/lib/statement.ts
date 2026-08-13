// --- 1. BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ ---
export interface StatementSellerInfo {
  sellerName: string;
  sellerAddress: string;
  sellerBankAcc: string;
  sellerIdCard: string;
  buyerName: string;
  buyerIdCard: string;
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
    return info.sellerIdCard || 'Tiền mặt';
  }
  const acc = info.bankAccNo || '';
  const bank = info.bankName || '';
  const branch = info.bankBranch || '';
  const owner = info.bankOwner !== undefined ? info.bankOwner : info.sellerName;

  if (acc || bank || owner) {
    const parts = [];
    if (acc) parts.push(`STK: ${acc}`);
    if (bank) parts.push(`Ngân hàng ${bank}${branch ? ` CN ${branch}` : ''}`);
    if (owner) parts.push(`(Chủ TK: ${owner})`);
    return parts.join(' - ');
  }

  return info.sellerBankAcc || info.sellerIdCard || 'STK: .....';
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

// Default Templates for Bảng kê Mua bán (Statement)
export const DEFAULT_STATEMENT_TEMPLATES: StatementTemplate[] = [
  {
    id: 'stmt-nuoc-hoa',
    name: 'Mẫu Bảng kê Nước hoa & Mỹ phẩm',
    sellerInfo: {
      sellerName: 'LÊ THỊ HOÀNG ÂN',
      sellerAddress: 'TP.HCM',
      sellerBankAcc: 'STK: 9975639612 - Ngân hàng Techcombank CN HCM',
      sellerIdCard: '080166012861',
      buyerName: 'NGUYỄN THÙY DUNG',
      buyerIdCard: '051188004003',
    },
    items: [
      { dateStr: '…../…../2024', itemName: 'Nước hoa SYL', unit: 'Chai', qty: 15, unitPrice: 2500000, note: '' },
      { dateStr: '…../…../2024', itemName: 'Nước hoa CK all', unit: 'Chai', qty: 25, unitPrice: 2500000, note: '' },
      { dateStr: '…../…../2024', itemName: 'Etemity Clvim Klein', unit: 'Chai', qty: 25, unitPrice: 2500000, note: '' },
      { dateStr: '…../…../2024', itemName: 'Nước hoa Minion 1', unit: 'Chai', qty: 35, unitPrice: 2100000, note: '' },
    ],
  },
  {
    id: 'stmt-gach-vlxd',
    name: 'Mẫu Bảng kê Gạch & VLXD',
    sellerInfo: {
      sellerName: 'CÔNG TY TNHH VLXD VĨNH PHÁT',
      sellerAddress: '124 QL1A, P. Tân Thới Hiệp, Q.12, TP.HCM',
      sellerBankAcc: 'STK: 19038472619012 - Techcombank',
      sellerIdCard: '0314892019',
      buyerName: 'NGUYỄN VĂN THÀNH',
      buyerIdCard: '079188002910',
    },
    items: [
      { dateStr: '…../…../2024', itemName: 'Gạch ốp lát (300x600)mm', unit: 'm2', qty: 250, unitPrice: 155000, note: '' },
      { dateStr: '…../…../2024', itemName: 'Gạch lát sàn 60x60 cm', unit: 'm2', qty: 180, unitPrice: 185000, note: '' },
      { dateStr: '…../…../2024', itemName: 'Gạch gốm 60x120 cm', unit: 'm2', qty: 90, unitPrice: 320000, note: '' },
    ],
  },
];

// Default Templates for Hóa đơn Bán lẻ (Retail Invoice)
export const DEFAULT_RETAIL_INVOICE_TEMPLATES: RetailInvoiceTemplate[] = [
  {
    id: 'ret-hair-spa',
    name: 'Mẫu Hóa đơn Tiệm Tóc & Spa',
    headerInfo: {
      buyerName: 'Chị Tâm',
      buyerAddress: 'Phường 1, Tây Ninh',
      shopName: 'SALON & SPA MINH THƯ',
    },
    items: [
      { itemName: 'Thuốc nhuộm tóc Osaka', unit: 'Chai', qty: 10, unitPrice: 155000 },
      { itemName: 'Thuốc nhuộm tóc Lavox', unit: 'Chai', qty: 10, unitPrice: 80000 },
      { itemName: 'Thuốc nhuộm tóc Berina', unit: 'Chai', qty: 5, unitPrice: 145000 },
      { itemName: 'Phủ bạc Loreal', unit: 'Chai', qty: 7, unitPrice: 110000 },
      { itemName: 'Hấp dầu Colena', unit: 'Chai', qty: 8, unitPrice: 85000 },
      { itemName: 'Uốn duỗi Collagen Nice', unit: 'Chai', qty: 9, unitPrice: 225000 },
    ],
  },
  {
    id: 'ret-tap-hoa',
    name: 'Mẫu Hóa đơn Cửa hàng Tạp hóa',
    headerInfo: {
      buyerName: 'Anh Hoàng',
      buyerAddress: 'Quận 3, TP.HCM',
      shopName: 'TẠP HÓA PHÚ CƯỜNG',
    },
    items: [
      { itemName: 'Bánh quy OREO 300g', unit: 'Hộp', qty: 24, unitPrice: 45000 },
      { itemName: 'Sữa tươi Vinamilk 1L', unit: 'Thùng', qty: 5, unitPrice: 340000 },
      { itemName: 'Nước ngọt Coca-Cola 330ml', unit: 'Thùng', qty: 10, unitPrice: 195000 },
      { itemName: 'Dầu ăn Simply 5L', unit: 'Can', qty: 4, unitPrice: 260000 },
    ],
  },
];
