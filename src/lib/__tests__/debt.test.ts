import { describe, it, expect } from 'vitest';
import {
  computeReceivableItemRow, computeReceivableSummary, parseReceivableText,
  type ReceivableItem,
} from '../debt';
import {
  loadInventoryTemplates, addInventoryTemplate, deleteInventoryTemplate,
} from '../templateStore';

describe('Accounts Receivable TK 131 & Template Store Tests', () => {
  it('tính số dư cuối kỳ Nợ/Có công nợ phải thu TK 131 chính xác', () => {
    const item: ReceivableItem = {
      id: 'test-rec-1',
      code: 'KH001',
      name: 'Công ty Luxxa Home',
      beginningDebit: 7625600,
      beginningCredit: 0,
      occurredDebit: 17276160,
      occurredCredit: 24901200,
    };

    // Net = (7,625,600 - 0) + (17,276,160 - 24,901,200) = 560
    const computed = computeReceivableItemRow(item);

    expect(computed.endingDebit).toBe(560);
    expect(computed.endingCredit).toBe(0);
  });

  it('tính tổng cộng bảng Công nợ Phải thu TK 131 chính xác', () => {
    const items: ReceivableItem[] = [
      {
        id: '1', code: 'A', name: 'Công ty A',
        beginningDebit: 100000, beginningCredit: 0,
        occurredDebit: 50000, occurredCredit: 20000,
      }, // Net = 130,000 Nợ
      {
        id: '2', code: 'B', name: 'Công ty B',
        beginningDebit: 0, beginningCredit: 40000,
        occurredDebit: 10000, occurredCredit: 0,
      }, // Net = -30,000 => 30,000 Có
    ];

    const summary = computeReceivableSummary(items);

    expect(summary.totalItems).toBe(2);
    expect(summary.totalBeginningDebit).toBe(100000);
    expect(summary.totalBeginningCredit).toBe(40000);
    expect(summary.totalEndingDebit).toBe(130000);
    expect(summary.totalEndingCredit).toBe(30000);
    expect(summary.netReceivableBalance).toBe(100000);
  });

  it('đọc văn bản/CSV công nợ phải thu thành công', () => {
    const rawText = `Mã KH\tTên KH\tĐầu kỳ Nợ\tĐầu kỳ Có\tPhát sinh Nợ\tPhát sinh Có\nKH001\tCông ty An Nam\t5000000\t0\t2000000\t1000000`;
    const parsed = parseReceivableText(rawText);

    expect(parsed.length).toBe(1);
    expect(parsed[0].code).toBe('KH001');
    expect(parsed[0].beginningDebit).toBe(5000000);
    expect(parsed[0].occurredDebit).toBe(2000000);
  });

  it('thao tác thêm và xóa Mẫu Ngành hàng chuẩn thành công', () => {
    const initialTemplates = loadInventoryTemplates();
    expect(initialTemplates.length).toBeGreaterThan(0);

    const { templates, newTemplate } = addInventoryTemplate('Ngành hàng kiểm thử', []);
    expect(templates.some(t => t.id === newTemplate.id)).toBe(true);

    const afterDelete = deleteInventoryTemplate(newTemplate.id);
    expect(afterDelete.some(t => t.id === newTemplate.id)).toBe(false);
  });
});
