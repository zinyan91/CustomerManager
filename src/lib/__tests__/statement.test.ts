import { describe, it, expect } from 'vitest';
import {
  computeStatementItem, computeStatementSummary,
  computeRetailInvoiceItem, computeRetailInvoiceSummary,
  type StatementItem, type RetailInvoiceItem,
} from '../statement';

describe('Purchase Statement & Retail Invoice Tests', () => {
  it('tính thành tiền và tổng cộng Bảng kê mua bán chính xác', () => {
    const items: StatementItem[] = [
      { id: '1', dateStr: '01/08/2024', itemName: 'Nước hoa SYL', unit: 'Chai', qty: 15, unitPrice: 2500000 },
      { id: '2', dateStr: '01/08/2024', itemName: 'Nước hoa CK all', unit: 'Chai', qty: 25, unitPrice: 2500000 },
    ];

    const c1 = computeStatementItem(items[0]);
    expect(c1.amount).toBe(37500000);

    const c2 = computeStatementItem(items[1]);
    expect(c2.amount).toBe(62500000);

    const summary = computeStatementSummary(items);
    expect(summary.totalItems).toBe(2);
    expect(summary.totalQty).toBe(40);
    expect(summary.totalAmount).toBe(100000000);
  });

  it('tính thành tiền và tổng cộng Hóa đơn bán lẻ chính xác', () => {
    const items: RetailInvoiceItem[] = [
      { id: '1', itemName: 'Thuốc nhuộm tóc Osaka', unit: 'Chai', qty: 10, unitPrice: 155000 },
      { id: '2', itemName: 'Thuốc nhuộm tóc Lavox', unit: 'Chai', qty: 10, unitPrice: 80000 },
    ];

    const c1 = computeRetailInvoiceItem(items[0]);
    expect(c1.amount).toBe(1550000);

    const summary = computeRetailInvoiceSummary(items);
    expect(summary.totalItems).toBe(2);
    expect(summary.totalQty).toBe(20);
    expect(summary.totalAmount).toBe(2350000);
  });
});
