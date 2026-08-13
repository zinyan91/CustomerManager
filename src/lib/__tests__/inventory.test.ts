import { describe, it, expect } from 'vitest';
import {
  computeItemRow, computeInventorySummary, parseInventoryText,
  type InventoryItem,
} from '../inventory';
import { INVENTORY_TEMPLATES } from '../../data/inventoryTemplates';

describe('Inventory Calculation & Logic', () => {
  it('tự động tính giá trị đầu kỳ, nhập, xuất và số lượng/giá trị cuối kỳ', () => {
    const item: InventoryItem = {
      id: 'test-1',
      code: 'RICE001',
      name: 'Gạo ST25',
      unit: 'Kg',
      unitPrice: 32000,
      beginningQty: 4000,
      importQty: 1000,
      exportQty: 500,
    };

    const computed = computeItemRow(item);

    expect(computed.beginningValue).toBe(4000 * 32000); // 128,000,000
    expect(computed.importValue).toBe(1000 * 32000); // 32,000,000
    expect(computed.exportValue).toBe(500 * 32000); // 16,000,000
    expect(computed.endingQty).toBe(4500); // 4000 + 1000 - 500
    expect(computed.endingValue).toBe(4500 * 32000); // 144,000,000
  });

  it('tính tổng cộng chính xác cho toàn bộ bảng tồn kho', () => {
    const items: InventoryItem[] = [
      {
        id: '1', code: 'A', name: 'SP A', unit: 'Cái', unitPrice: 10000,
        beginningQty: 10, importQty: 5, exportQty: 2,
      },
      {
        id: '2', code: 'B', name: 'SP B', unit: 'Bộ', unitPrice: 50000,
        beginningQty: 4, importQty: 1, exportQty: 0,
      },
    ];

    const summary = computeInventorySummary(items);

    expect(summary.totalItems).toBe(2);
    expect(summary.totalBeginningQty).toBe(14);
    expect(summary.totalBeginningValue).toBe(10 * 10000 + 4 * 50000); // 300,000
    expect(summary.totalEndingQty).toBe(13 + 5); // A: 13, B: 5 => 18
    expect(summary.totalEndingValue).toBe(13 * 10000 + 5 * 50000); // 380,000
  });

  it('bộ mẫu chuẩn 8 ngành hàng nạp đầy đủ và chính xác', () => {
    expect(INVENTORY_TEMPLATES.length).toBe(8);

    const luaGao = INVENTORY_TEMPLATES.find(t => t.id === 'htk-lua-gao' || t.id === 'htk-lúa-gạo');
    expect(luaGao).toBeDefined();
    expect(luaGao?.items.length).toBeGreaterThan(50);
    expect(luaGao?.items[0].code).toBe('RICE001');

    const laptop = INVENTORY_TEMPLATES.find(t => t.id === 'htk-laptop');
    expect(laptop).toBeDefined();
    expect(laptop?.items[0].code).toBe('LT001');
  });

  it('đọc dữ liệu văn bản/CSV phân tách tab hoặc phẩy thành công', () => {
    const rawText = `Mã hàng\tTên sản phẩm\tĐVT\tĐầu kỳ Qty\tĐầu kỳ Val\tNhập Qty\tNhập Val\tXuất Qty\tXuất Val\tĐơn giá\nSP001\tBánh quy OREO\tHộp\t100\t1000000\t20\t200000\t10\t100000\t10000`;
    const parsed = parseInventoryText(rawText);

    expect(parsed.length).toBe(1);
    expect(parsed[0].code).toBe('SP001');
    expect(parsed[0].name).toBe('Bánh quy OREO');
    expect(parsed[0].unitPrice).toBe(10000);
    expect(parsed[0].beginningQty).toBe(100);
  });
});
