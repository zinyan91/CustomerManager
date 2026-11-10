import { describe, it, expect } from 'vitest';
import { ST, headerRow, textCell, moneyCell, numCell, totalMerges, reportRowHeights } from '../sheetStyles';

describe('sheetStyles', () => {
  it('headerRow dung style tieu de va dung so cot', () => {
    const row = headerRow(['STT', 'Ho ten', 'So tien']);
    expect(row).toHaveLength(3);
    expect(row[0].value).toBe('STT');
    expect(row[0].style?.bold).toBe(true);
  });

  it('moneyCell giu so 0 la so that, khong bien thanh rong', () => {
    const o = moneyCell(0);
    expect(o.value).toBe(0);
    expect(o.numeric).toBe(true);
  });

  it('moneyCell voi null tra o rong, khong phai so 0', () => {
    const o = moneyCell(null);
    expect(o.value).toBe('');
    expect(o.numeric).toBeUndefined();
  });

  it('numCell giu so 0 va xu ly null giong moneyCell', () => {
    expect(numCell(0).value).toBe(0);
    expect(numCell(null).value).toBe('');
  });

  it('textCell voi null tra chuoi rong', () => {
    expect(textCell(null).value).toBe('');
    expect(textCell('ABC').value).toBe('ABC');
  });

  it('bo style co du cac bien the can dung', () => {
    expect(ST.headerCenter.bold).toBe(true);
    expect(ST.headerCenter.fill).toBe('E2E8F0');
    expect(ST.money.numFmt).toBe('#,##0;(#,##0);"-"');
  });

  it('totalMerges gop cac cot dau truoc cot tien dau tien', () => {
    expect(totalMerges(10, { 8: 100, 9: 200 })).toEqual(['A10:H10']);
    expect(totalMerges(5, { 1: 100 })).toEqual([]);
  });

  it('reportRowHeights dat chieu cao dong tieu de, du lieu va tong cong', () => {
    expect(reportRowHeights(3)).toEqual({ 1: 28, 2: 21, 3: 24 });
    expect(reportRowHeights(2, false)).toEqual({ 1: 28, 2: 21 });
  });
});
