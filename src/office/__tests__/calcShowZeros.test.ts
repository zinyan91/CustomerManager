import { describe, expect, it } from 'vitest';
import { Workbook } from '../calc/model/workbook';
import { exportXlsx, importXlsx } from '../calc/services/xlsxService';

function book(): Workbook {
  const wb = new Workbook();
  wb.putCell(0, 0, 0, { raw: '0', style: 0 });
  wb.putCell(0, 0, 1, { raw: '=A1*5', style: 0 });
  wb.putCell(0, 0, 2, { raw: '3', style: 0 });
  return wb;
}

describe('showing zeros', () => {
  it('shows a zero unless the sheet hides zeros, and keeps the value either way', () => {
    const wb = book();
    expect(wb.displayAt(0, 0, 0)).toBe('0');
    wb.sheets[0].hideZeros = true;
    expect(wb.displayAt(0, 0, 0)).toBe('');
    expect(wb.displayAt(0, 0, 1)).toBe('');
    expect(wb.displayAt(0, 0, 2)).toBe('3');
    expect(wb.valueAt(0, 0, 1)).toBe(0);
  });

  it('survives saving the workbook data and an xlsx round trip', async () => {
    const wb = book();
    wb.sheets[0].hideZeros = true;
    const again = new Workbook();
    again.loadData(wb.toData());
    expect(again.sheets[0].hideZeros).toBe(true);
    const back = new Workbook();
    back.loadData(await importXlsx(await (await exportXlsx(wb)).arrayBuffer()));
    expect(back.sheets[0].hideZeros).toBe(true);
    const plain = new Workbook();
    plain.loadData(await importXlsx(await (await exportXlsx(book())).arrayBuffer()));
    expect(plain.sheets[0].hideZeros).toBeUndefined();
  });
});

describe('a format with a section for zero', () => {
  it('still shows what that section says on a sheet that hides zeros', () => {
    const wb = new Workbook();
    wb.sheets[0].hideZeros = true;
    wb.putCell(0, 0, 0, { raw: '0', style: wb.styleId({ numFmt: '#,##0;-#,##0;"-"' }) });
    wb.putCell(0, 1, 0, { raw: '0', style: wb.styleId({ numFmt: '#,##0;-#,##0' }) });
    expect(wb.displayAt(0, 0, 0)).toBe('-');
    expect(wb.displayAt(0, 1, 0)).toBe('');
  });
});
