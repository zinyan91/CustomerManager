// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildDocumentHtml } from '../documentHtml';
import { buildPurchaseStatementDocHtml } from '../inventoryExport';
import { resetFormatSettingsCache, STORAGE_KEYS } from '../formatSettings';

// Số nhóm bằng dấu chấm kiểu vi (vd 8.500.000) — không được xuất hiện khi app đang dùng kiểu en.
const VI_GROUPED = /\d{1,3}(\.\d{3})+(?!\d)/;

const items = [
  { id: '1', name: 'Lúa Jasmine', unit: 'Tấn', quantity: 25, price: 8500000 },
  { id: '2', name: 'Gạo ST25', unit: 'Kg', quantity: 12.5, price: 22000 },
];

describe('văn bản hồ sơ giải ngân dùng một kiểu định dạng số', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEYS.numberStyle, 'en');
    resetFormatSettingsCache();
  });
  afterEach(() => {
    localStorage.clear();
    resetFormatSettingsCache();
  });

  it('HĐ mua bán: bảng hàng, tổng và Lần 1 cùng kiểu, kể cả khi đợt 1 lưu bằng dấu chấm', () => {
    const html = buildDocumentHtml('sale_contract', {
      saleContractDate: '2026-04-09', saleBuyerName: 'A', saleSellerName: 'B',
      salePayMethod: 'transfer', salePaymentStage1: '100.000.000', saleItems: items,
    } as any);
    expect(html).toContain('8,500,000');
    expect(html).toContain('212,775,000');
    expect(html).toContain('<strong>100,000,000 đồng</strong>');
    expect(html).toContain('12.5');
    expect(html).not.toMatch(VI_GROUPED);
  });

  it('Đề nghị thanh toán: giá trị và từng đợt cùng kiểu', () => {
    const html = buildDocumentHtml('payment_request_sale', {
      saleContractDate: '2026-04-09', saleBuyerName: 'NGÔ NHỊ ĐẠT', saleSellerName: 'B', saleItems: items,
      payMethodType: 'transfer',
      payStages: [
        { id: '1', stageName: 'Đợt 1', amount: '100.000.000', status: 'current', note: '' },
        { id: '2', stageName: 'Đợt 2', amount: '112775000', status: 'future', note: '' },
      ],
    } as any);
    expect(html).toContain('212,775,000');
    expect(html).toContain('<strong>100,000,000 đồng</strong>');
    expect(html).toContain('<strong>112,775,000 đồng</strong>');
    expect(html).not.toMatch(VI_GROUPED);
  });

  it('Bảng kê: đơn giá, thành tiền, tổng cùng kiểu', () => {
    const html = buildPurchaseStatementDocHtml(
      items.map(it => ({ id: it.id, dateStr: '2026-04-09', itemName: it.name, unit: it.unit, qty: it.quantity, unitPrice: it.price, note: '' })),
      { sellerName: 'B', sellerAddress: '', sellerBankAcc: '', sellerIdCard: '', buyerName: 'A', buyerIdCard: '',
        buyerAddress: '', statementDateStr: '2026-04-09', paymentMethod: 'cash',
        bankAccNo: '', bankName: '', bankOwner: '', bankBranch: '' },
    );
    expect(html).toContain('8,500,000');
    expect(html).toContain('212,775,000');
    expect(html).not.toMatch(VI_GROUPED);
  });
});
