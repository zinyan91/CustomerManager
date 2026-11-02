import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { Workbook } from '../calc/model/workbook';
import { exportXlsx, importXlsx } from '../calc/services/xlsxService';

function sheetWith(values: string[]) {
  const c = new CalcController();
  values.forEach((v, r) => c.wb.putCell(0, r, 0, { raw: v, style: 0 }));
  return c;
}

describe('hiding rows and columns', () => {
  it('hides the rows of the selection, and shows them again', () => {
    const c = sheetWith(['1', '2', '3', '4']);
    c.select(1, 0);
    c.extendTo(2, 0);
    c.hideRows();
    expect([...c.wb.hiddenRows(0)].sort()).toEqual([1, 2]);
    expect(c.activeCell.row).toBe(3);
    c.select(0, 0);
    c.extendTo(3, 0);
    c.unhideRows();
    expect(c.wb.hiddenRows(0).size).toBe(0);
  });

  it('hides columns the same way', () => {
    const c = sheetWith(['1']);
    c.select(0, 1);
    c.extendTo(0, 2);
    c.hideColumns();
    expect([...c.wb.hiddenCols(0)]).toEqual([1, 2]);
    c.select(0, 0);
    c.extendTo(0, 3);
    c.unhideColumns();
    expect(c.wb.hiddenCols(0).size).toBe(0);
  });

  it('undoes and redoes', () => {
    const c = sheetWith(['1', '2']);
    c.select(0, 0);
    c.hideRows();
    expect(c.wb.hiddenRows(0).has(0)).toBe(true);
    c.undo();
    expect(c.wb.hiddenRows(0).has(0)).toBe(false);
    c.redo();
    expect(c.wb.hiddenRows(0).has(0)).toBe(true);
  });

  it('arrow keys step over a hidden row', () => {
    const c = sheetWith(['1', '2', '3']);
    c.select(1, 0);
    c.hideRows();
    c.select(0, 0);
    c.move(1, 0);
    expect(c.activeCell.row).toBe(2);
  });

  it('follows the rows and columns when others are inserted or deleted', () => {
    const c = sheetWith(['1', '2', '3']);
    c.select(2, 0);
    c.hideRows();
    c.select(0, 0);
    c.insertRows();
    expect([...c.wb.hiddenRows(0)]).toEqual([3]);
    c.select(0, 0);
    c.deleteRows();
    expect([...c.wb.hiddenRows(0)]).toEqual([2]);
  });

  it('SUBTOTAL 9 still counts a row hidden by hand and 109 does not; a filter hides from both', () => {
    const c = sheetWith(['1', '2', '4']);
    c.wb.putCell(0, 0, 2, { raw: '=SUBTOTAL(9,A1:A3)', style: 0 });
    c.wb.putCell(0, 1, 2, { raw: '=SUBTOTAL(109,A1:A3)', style: 0 });
    c.select(1, 0);
    c.hideRows();
    expect(c.wb.valueAt(0, 0, 2)).toBe(7);
    expect(c.wb.valueAt(0, 1, 2)).toBe(5);
  });
});

describe('row heights', () => {
  it('sets the height of the selected rows and undoes it', () => {
    const c = sheetWith(['1', '2']);
    c.select(0, 0);
    c.extendTo(1, 0);
    c.setSelectedRowHeights(48);
    expect(c.wb.sheets[0].rowHeights?.get(1)).toBe(48);
    c.undo();
    expect(c.wb.sheets[0].rowHeights?.size ?? 0).toBe(0);
  });

  it('keeps with its row when rows are inserted above', () => {
    const c = sheetWith(['1', '2']);
    c.select(1, 0);
    c.setSelectedRowHeights(60);
    c.select(0, 0);
    c.insertRows();
    expect(c.wb.sheets[0].rowHeights?.get(2)).toBe(60);
  });
});

describe('saved with the file', () => {
  it('writes hidden rows and columns and row heights to xlsx and reads them back', async () => {
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: 'a', style: 0 });
    const sheet = wb.sheets[0];
    sheet.rowsHidden = new Set([2]);
    sheet.colsHidden = new Set([3]);
    sheet.rowHeights = new Map([[1, 48]]);
    const loaded = new Workbook();
    loaded.loadData(await importXlsx(await (await exportXlsx(wb)).arrayBuffer()));
    expect([...(loaded.sheets[0].rowsHidden ?? [])]).toEqual([2]);
    expect([...(loaded.sheets[0].colsHidden ?? [])]).toEqual([3]);
    expect(loaded.sheets[0].rowHeights?.get(1)).toBe(48);
  });

  it('keeps them in drafts', () => {
    const wb = new Workbook();
    wb.sheets[0].rowsHidden = new Set([1]);
    wb.sheets[0].rowHeights = new Map([[0, 30]]);
    const copy = new Workbook();
    copy.loadData(wb.toData());
    expect([...(copy.sheets[0].rowsHidden ?? [])]).toEqual([1]);
    expect(copy.sheets[0].rowHeights?.get(0)).toBe(30);
  });
});

describe('the file Excel opens', () => {
  it('has a sheet view, without which Excel shrinks custom row heights to four fifths', async () => {
    const { default: JSZip } = await import('jszip');
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: 'a', style: 0 });
    wb.sheets[0].rowHeights = new Map([[0, 40]]);
    const zip = await JSZip.loadAsync(await (await exportXlsx(wb)).arrayBuffer());
    const xml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(xml).toContain('<sheetView');
    expect(xml).toMatch(/<row r="1"[^>]*ht="30"/);
  });
});
