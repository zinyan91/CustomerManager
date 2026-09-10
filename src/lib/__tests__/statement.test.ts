import { describe, it, expect } from 'vitest';
import {
  computeStatementItem, computeStatementSummary,
  computeRetailInvoiceItem, computeRetailInvoiceSummary,
  getComputedBankAccText,
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

  it('getComputedBankAccText định dạng STK gọn gàng, không hiển thị Chủ TK', () => {
    const text = getComputedBankAccText({
      sellerName: 'LÊ THỊ HOÀNG ÂN',
      sellerAddress: 'TP.HCM',
      sellerBankAcc: '',
      sellerIdCard: '080166012861',
      buyerName: 'NGUYỄN THÙY DUNG',
      buyerIdCard: '051188004003',
      statementDateStr: '2026-09-08',
      bankAccNo: '9975639612',
      bankName: 'Techcombank',
      bankBranch: 'HCM',
      bankOwner: 'LÊ THỊ HOÀNG ÂN',
      paymentMethod: 'transfer',
    });

    expect(text).toBe('STK: 9975639612 - Ngân hàng Techcombank CN HCM');
    expect(text).not.toContain('Chủ TK');
  });

  it('getComputedBankAccText cho tiền mặt thể hiện số CCCD người bán tại cột thanh toán', () => {
    const text = getComputedBankAccText({
      sellerName: 'LÊ THỊ HOÀNG ÂN',
      sellerAddress: 'TP.HCM',
      sellerBankAcc: '',
      sellerIdCard: '080166012861',
      buyerName: 'NGUYỄN THÙY DUNG',
      buyerIdCard: '051188004003',
      statementDateStr: '2026-09-08',
      paymentMethod: 'cash',
    });
    expect(text).toBe('CCCD: 080166012861');
  });

  it('getComputedBankAccText cho tiền mặt nếu không có số CCCD thì hiển thị Tiền mặt', () => {
    const text = getComputedBankAccText({
      sellerName: 'LÊ THỊ HOÀNG ÂN',
      sellerAddress: 'TP.HCM',
      sellerBankAcc: '',
      sellerIdCard: '',
      buyerName: 'NGUYỄN THÙY DUNG',
      buyerIdCard: '051188004003',
      statementDateStr: '2026-09-08',
      paymentMethod: 'cash',
    });
    expect(text).toBe('Tiền mặt');
  });
});
