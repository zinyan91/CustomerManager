import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { openLink, safeAddress } from '../calc/components/linkPrompts';
import { Workbook } from '../calc/model/workbook';
import { exportXlsx, importXlsx } from '../calc/services/xlsxService';

describe('links on cells', () => {
  it('links the selected cells, shows the address in an empty one, and removes it', () => {
    const c = new CalcController();
    c.select(0, 0);
    c.extendTo(1, 0);
    c.setLink('https://example.com');
    expect(c.linkAt(0, 0)).toBe('https://example.com');
    expect(c.linkAt(1, 0)).toBe('https://example.com');
    expect(c.wb.getCell(0, 0, 0)?.raw).toBe('https://example.com');
    c.setLink('');
    expect(c.linkAt(0, 0)).toBeUndefined();
  });

  it('keeps the text of a cell that has some', () => {
    const c = new CalcController();
    c.wb.putCell(0, 0, 0, { raw: 'Trang chủ', style: 0 });
    c.select(0, 0);
    c.setLink('https://example.com');
    expect(c.wb.getCell(0, 0, 0)?.raw).toBe('Trang chủ');
  });

  it('only follows web and mail addresses', () => {
    expect(safeAddress('https://a.com/x')).toBe('https://a.com/x');
    expect(safeAddress('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(safeAddress('example.com/page')).toBe('https://example.com/page');
    expect(safeAddress('javascript:alert(1)')).toBeNull();
    expect(safeAddress('file:///c:/x')).toBeNull();
    expect(typeof openLink).toBe('function');
  });
});

describe('notes on cells', () => {
  it('writes, edits and removes a note on the active cell, with undo', () => {
    const c = new CalcController();
    c.select(2, 1);
    c.setNote('xem lại');
    expect(c.noteAt(2, 1)).toBe('xem lại');
    c.setNote('');
    expect(c.noteAt(2, 1)).toBeUndefined();
    c.undo();
    expect(c.noteAt(2, 1)).toBe('xem lại');
  });
});

describe('links and notes follow their cells', () => {
  it('move with inserted rows and go with deleted ones', () => {
    const c = new CalcController();
    c.select(1, 0);
    c.setLink('https://a.com');
    c.setNote('n');
    c.select(0, 0);
    c.insertRows();
    expect(c.linkAt(2, 0)).toBe('https://a.com');
    expect(c.noteAt(2, 0)).toBe('n');
    c.select(2, 0);
    c.deleteRows();
    expect(c.linkAt(2, 0)).toBeUndefined();
    expect(c.wb.sheets[0].comments?.size ?? 0).toBe(0);
  });
});

describe('saved with the file', () => {
  it('writes links and notes to xlsx and reads them back', async () => {
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: 'site', style: 0 });
    wb.putCell(0, 1, 0, { raw: '5', style: 0 });
    wb.sheets[0].links = new Map([[0, 'https://example.com/']]);
    wb.sheets[0].comments = new Map([[16384, { text: 'ghi chú', author: '', at: 0 }]]);
    const loaded = new Workbook();
    loaded.loadData(await importXlsx(await (await exportXlsx(wb)).arrayBuffer()));
    expect(loaded.sheets[0].links?.get(0)).toBe('https://example.com/');
    expect(loaded.getCell(0, 0, 0)?.raw).toBe('site');
    expect(loaded.sheets[0].comments?.get(16384)?.text).toBe('ghi chú');
  });

  it('keeps them in drafts', () => {
    const wb = new Workbook();
    wb.sheets[0].links = new Map([[3, 'https://a.com']]);
    wb.sheets[0].comments = new Map([[3, { text: 'n', author: '', at: 0 }]]);
    const copy = new Workbook();
    copy.loadData(wb.toData());
    expect(copy.sheets[0].links?.get(3)).toBe('https://a.com');
    expect(copy.sheets[0].comments?.get(3)?.text).toBe('n');
  });
});
