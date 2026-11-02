import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';

describe('subtotals', () => {
  it('puts a subtotal row under each run, a grand total at the end, and groups the detail rows', () => {
    const c = new CalcController();
    [['Nhóm', 'Số'], ['A', '1'], ['A', '2'], ['B', '10'], ['C', '5'], ['C', '6']].forEach((row, r) => row.forEach((raw, col) => c.wb.putCell(0, r, col, { raw, style: 0 })));
    c.selectRange({ r1: 0, c1: 0, r2: 5, c2: 1 });
    expect(c.addSubtotals(0, 1, 'sum', { total: 'Total', grand: 'Grand Total' })).toBe(4);
    const text = (r: number) => [c.wb.displayAt(0, r, 0), c.wb.displayAt(0, r, 1)].join('|');
    expect(Array.from({ length: 10 }, (_, r) => text(r))).toEqual(['Nhóm|Số', 'A|1', 'A|2', 'A Total|3', 'B|10', 'B Total|10', 'C|5', 'C|6', 'C Total|11', 'Grand Total|24']);
    expect(c.wb.getCell(0, 3, 1)?.raw).toBe('=SUBTOTAL(9,B2:B3)');
    expect([...c.wb.sheets[0].rowLevels!.keys()]).toEqual([1, 2, 4, 6, 7]);
    c.showLevel(1);
    expect([...c.wb.sheets[0].rowsHidden!]).toEqual([1, 2, 4, 6, 7]);
  });

  it('refuses a column outside the table', () => {
    const c = new CalcController();
    c.wb.putCell(0, 0, 0, { raw: 'x', style: 0 });
    c.wb.putCell(0, 1, 0, { raw: 'y', style: 0 });
    c.selectRange({ r1: 0, c1: 0, r2: 1, c2: 0 });
    expect(c.addSubtotals(0, 3, 'sum', { total: 'T', grand: 'G' })).toBe(0);
  });
});
