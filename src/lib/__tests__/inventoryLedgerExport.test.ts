import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildInventoryLedgerDocHtml,
  buildInventoryLedgerTabXlsx,
  buildInventoryLedgerWorkbookXlsx,
  inventoryLedgerFileName,
  type InventoryLedgerData,
} from '../inventoryLedgerExport';

const data: InventoryLedgerData = {
  items: [
    { id: 'a', code: 'G01', name: 'Gạo ST25', unit: 'Kg', unitPrice: 32_000, beginningQty: 4_000, importQty: 1_000, exportQty: 500 },
    { id: 'b', code: 'G02', name: 'Gạo <Nàng Hoa>', unit: 'Kg', unitPrice: 20_000, beginningQty: 100, importQty: 0, exportQty: 0 },
  ],
  receivables: [
    { id: 'r1', code: 'KH01', name: 'Đại lý A', beginningDebit: 100, beginningCredit: 0, occurredDebit: 50, occurredCredit: 30 },
  ],
  payables: [
    { id: 'p1', code: 'NCC01', name: 'Xi măng B', beginningDebit: 0, beginningCredit: 150, occurredDebit: 50, occurredCredit: 80 },
    { id: 'p2', code: 'NCC02', name: 'Thép C', beginningDebit: 0, beginningCredit: 20, occurredDebit: 70, occurredCredit: 0 },
  ],
};
const ctx = { categoryName: 'HTK Lúa Gạo', customerName: 'HKD Nguyễn Văn A', recordDate: '2026-11-09' };

function readSheets(bytes: Uint8Array) {
  const wb = XLSX.read(bytes, { type: 'array', cellFormula: true });
  return wb.SheetNames.map(name => ({ name, ws: wb.Sheets[name] }));
}

describe('xuất Excel Hàng tồn kho & Công nợ', () => {
  it('bảng tồn kho có công thức giá trị, tồn cuối kỳ và dòng TỔNG CỘNG cuối bảng', () => {
    const [{ name, ws }] = readSheets(buildInventoryLedgerTabXlsx('inventory', data, ctx));
    expect(name).toBe('HÀNG TỒN KHO');
    expect(ws.F6.f).toBe('E6*D6');
    expect(ws.K6.f).toBe('E6+G6-I6');
    expect(ws.K6.v).toBe(4_500);
    expect(ws.L6.f).toBe('K6*D6');
    expect(ws.L6.v).toBe(144_000_000);
    expect(ws.A8.v).toBe('TỔNG CỘNG');
    expect(ws.L8.f).toBe('SUM(L6:L7)');
    expect(ws.L8.v).toBe(146_000_000);
    expect(XLSX.utils.decode_range(ws['!ref']!).e.r + 1).toBe(8);
  });

  it('bảng công nợ phải trả có công thức số dư cuối kỳ Nợ/Có', () => {
    const [{ name, ws }] = readSheets(buildInventoryLedgerTabXlsx('payables', data, ctx));
    expect(name).toBe('CÔNG NỢ PHẢI TRẢ');
    expect(ws.A4.v).toBe('Mã nhà cung cấp');
    expect(ws.G6.f).toBe('MAX(0,C6-D6+E6-F6)');
    expect(ws.H6.f).toBe('MAX(0,D6-C6+F6-E6)');
    expect([ws.G6.v, ws.H6.v]).toEqual([0, 180]);
    expect([ws.G7.v, ws.H7.v]).toEqual([50, 0]);
    expect(ws.A8.v).toBe('TỔNG CỘNG');
    expect(ws.H8.f).toBe('SUM(H6:H7)');
  });

  it('bảng rỗng vẫn có dòng TỔNG CỘNG không lỗi tham chiếu', () => {
    const [{ ws }] = readSheets(buildInventoryLedgerTabXlsx('receivables', { ...data, receivables: [] }, ctx));
    expect(ws.A6.v).toBe('TỔNG CỘNG');
    expect(ws.C6.f).toBe('0');
  });

  it('xuất cả 3 bảng thành 3 sheet trong một tệp', () => {
    const sheets = readSheets(buildInventoryLedgerWorkbookXlsx(data, ctx));
    expect(sheets.map(s => s.name)).toEqual(['HÀNG TỒN KHO', 'CÔNG NỢ PHẢI THU', 'CÔNG NỢ PHẢI TRẢ']);
  });

  it('tên tệp theo từng bảng', () => {
    expect(inventoryLedgerFileName('payables', ctx, 'xlsx')).toBe('Cong_No_Phai_Tra_2026-11-09.xlsx');
    expect(inventoryLedgerFileName('inventory', ctx, 'xlsx')).toBe('Kiem_Ke_HTK_HTK_Lúa_Gạo_2026-11-09.xlsx');
  });
});

describe('bản in Hàng tồn kho & Công nợ', () => {
  it('mỗi bản in chỉ một bảng, lặp tiêu đề cột, không ngắt trang cưỡng bức', () => {
    const html = buildInventoryLedgerDocHtml('receivables', data, ctx);
    expect(html.match(/<table/g)).toHaveLength(1);
    expect(html).toContain('BẢNG TỔNG HỢP CÔNG NỢ PHẢI THU');
    expect(html).not.toContain('HÀNG TỒN KHO');
    expect(html).toContain('thead { display: table-header-group; }');
    expect(html).not.toContain('page-break-before');
    expect(html).toContain('size: A4 portrait');
  });

  it('bảng tồn kho in khổ ngang, TỔNG CỘNG là dòng cuối, tên hàng được thoát ký tự HTML', () => {
    const html = buildInventoryLedgerDocHtml('inventory', data, ctx);
    expect(html).toContain('size: A4 landscape');
    expect(html).toContain('Gạo &lt;Nàng Hoa&gt;');
    const body = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'));
    expect(body.lastIndexOf('<tr')).toBe(body.indexOf('<tr class="total">'));
  });
});
