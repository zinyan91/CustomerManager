import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { exportXlsx, importXlsx } from '../calc/services/xlsxService';

describe('sparklines', () => {
  const book = () => {
    const c = new CalcController();
    [[1, 3, 2], [4, 1, 5]].forEach((row, r) => row.forEach((v, col) => c.wb.putCell(0, r, col, { raw: String(v), style: 0 })));
    return c;
  };

  it('makes one per row of the selection, in the cell to its right, and clears them', () => {
    const c = book();
    c.selectRange({ r1: 0, c1: 0, r2: 1, c2: 2 });
    expect(c.addSparklines('line')).toBe(true);
    expect(c.wb.sheets[0].sparklines).toEqual([
      { type: 'line', source: { r1: 0, c1: 0, r2: 0, c2: 2 }, row: 0, col: 3 },
      { type: 'line', source: { r1: 1, c1: 0, r2: 1, c2: 2 }, row: 1, col: 3 },
    ]);
    c.selectRange({ r1: 0, c1: 3, r2: 0, c2: 3 });
    c.clearSparklines();
    expect(c.wb.sheets[0].sparklines).toHaveLength(1);
  });

  it('follows inserted columns and goes when its data does', () => {
    const c = book();
    c.selectRange({ r1: 0, c1: 0, r2: 0, c2: 2 });
    c.addSparklines('column');
    c.select(0, 0);
    c.insertColumns();
    expect(c.wb.sheets[0].sparklines).toEqual([{ type: 'column', source: { r1: 0, c1: 1, r2: 0, c2: 3 }, row: 0, col: 4 }]);
    c.selectRange({ r1: 0, c1: 1, r2: 0, c2: 3 });
    c.deleteColumns();
    expect(c.wb.sheets[0].sparklines ?? []).toHaveLength(0);
  });

  it('survives an .xlsx round trip, and is written as an x14 extension', async () => {
    const c = book();
    c.selectRange({ r1: 0, c1: 0, r2: 1, c2: 2 });
    c.addSparklines('column');
    const buffer = await (await exportXlsx(c.wb)).arrayBuffer();
    const { default: JSZip } = await import('jszip');
    const sheetXml = await (await JSZip.loadAsync(buffer)).file('xl/worksheets/sheet1.xml')!.async('string');
    expect(sheetXml).toContain('<x14:sparklineGroup type="column"');
    expect(sheetXml).toContain('<xm:f>Sheet1!$A$1:$C$1</xm:f>');
    const back = new CalcController();
    back.load(await importXlsx(buffer));
    expect(back.wb.sheets[0].sparklines).toEqual(c.wb.sheets[0].sparklines);
  });
});
