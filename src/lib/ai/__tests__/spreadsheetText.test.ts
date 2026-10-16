// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { MAX_SHEET_CHARS, fileToSpreadsheetAttachment, isSpreadsheetFile, spreadsheetToText } from '../spreadsheetText';

function workbookBuffer(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return out;
}

describe('isSpreadsheetFile', () => {
  it('nhận Excel và CSV theo đuôi, không phân biệt hoa thường', () => {
    for (const n of ['bctc.xlsx', 'BCTC.XLS', 'a.xlsm', 'b.csv']) expect(isSpreadsheetFile({ name: n }), n).toBe(true);
  });
  it('không nhận tệp khác', () => {
    for (const n of ['a.docx', 'a.pdf', 'xlsx', 'a.xlsx.zip']) expect(isSpreadsheetFile({ name: n }), n).toBe(false);
  });
});

describe('spreadsheetToText', () => {
  it('mỗi sheet thành một khối CSV có tiêu đề, giữ đúng số và chữ', async () => {
    const out = await spreadsheetToText(
      workbookBuffer({
        B01a: [['Mã số', 'Chỉ tiêu', 'Số cuối năm'], ['100', 'Tài sản ngắn hạn', 1500000000]],
        B02: [['Mã số', 'Chỉ tiêu', 'Năm nay'], ['10', 'Doanh thu thuần', 9000000000]],
      })
    );
    expect(out.sheetCount).toBe(2);
    expect(out.truncated).toBe(false);
    expect(out.text).toContain('### Sheet "B01a"');
    expect(out.text).toContain('100,Tài sản ngắn hạn,1500000000');
    expect(out.text).toContain('### Sheet "B02"');
    expect(out.text).toContain('10,Doanh thu thuần,9000000000');
  });

  it('bỏ sheet trống và dòng trống', async () => {
    const out = await spreadsheetToText(workbookBuffer({ Trong: [[]], Co: [['a'], [], ['b']] }));
    expect(out.sheetCount).toBe(1);
    expect(out.text).not.toContain('Trong');
    expect(out.text).toContain('a\nb');
  });

  it('quá dài thì cắt và báo đã cắt', async () => {
    const rows = Array.from({ length: 400 }, (_, i) => [`dong ${i}`, i]);
    const out = await spreadsheetToText(workbookBuffer({ S: rows }), 500);
    expect(out.truncated).toBe(true);
    expect(out.text.length).toBeLessThanOrEqual(500);
  });

  it('bảng tính không có dữ liệu thì báo lỗi rõ', async () => {
    await expect(spreadsheetToText(workbookBuffer({ S: [[]] }))).rejects.toThrow(/không có dữ liệu/);
  });
});

describe('fileToSpreadsheetAttachment', () => {
  const asFile = (buf: ArrayBuffer, name = 'bctc.xlsx') => new File([buf], name);

  it('thành tệp đính kèm dạng chữ, không có base64', async () => {
    const att = await fileToSpreadsheetAttachment(asFile(workbookBuffer({ S: [['x', 1]] })));
    expect(att.name).toBe('bctc.xlsx');
    expect(att.base64Data).toBe('');
    expect(att.textData).toContain('x,1');
    expect(att.id).toMatch(/^sheet_/);
  });

  it('tệp rỗng thì báo lỗi nêu tên tệp, không trả rỗng', async () => {
    await expect(fileToSpreadsheetAttachment(new File([], 'hong.xlsx'))).rejects.toThrow(/Không đọc được bảng tính "hong.xlsx"/);
  });

  it('tệp dung lượng lớn vẫn đọc nội dung bình thường không bị chặn', async () => {
    const file = asFile(workbookBuffer({ S: [['A', 'B'], ['1', '2']] }), 'to.xlsx');
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 });
    const att = await fileToSpreadsheetAttachment(file);
    expect(att.name).toBe('to.xlsx');
    expect(att.textData).toContain('### Sheet "S"');
  });

  it('có ghi chú cho AI khi bị cắt', async () => {
    const rows = Array.from({ length: 20000 }, (_, i) => [`dong so ${i} co nhieu chu de vuot gioi han`, i]);
    const att = await fileToSpreadsheetAttachment(asFile(workbookBuffer({ S: rows })));
    expect(att.textData).toContain('Đã cắt bớt');
    expect((att.textData ?? '').length).toBeLessThan(MAX_SHEET_CHARS + 300);
  });
});
