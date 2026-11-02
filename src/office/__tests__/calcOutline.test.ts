import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { gridShortcut } from '../calc/shortcuts';
import { exportXlsx, importXlsx } from '../calc/services/xlsxService';

describe('outline groups', () => {
  const book = () => {
    const c = new CalcController();
    for (let r = 0; r < 6; r += 1) c.wb.putCell(0, r, 0, { raw: String(r), style: 0 });
    return c;
  };

  it('groups and ungroups the selected rows and columns, to at most seven levels', () => {
    const c = book();
    c.selectRange({ r1: 1, c1: 0, r2: 3, c2: 0 });
    c.groupLines('row', 1);
    c.selectRange({ r1: 2, c1: 0, r2: 2, c2: 0 });
    c.groupLines('row', 1);
    expect([...c.wb.sheets[0].rowLevels!]).toEqual([[1, 1], [2, 2], [3, 1]]);
    c.groupLines('row', -1);
    c.groupLines('row', -1);
    expect(c.wb.sheets[0].rowLevels!.has(2)).toBe(false);
    c.selectRange({ r1: 0, c1: 2, r2: 0, c2: 3 });
    c.groupLines('col', 1);
    expect([...c.wb.sheets[0].colLevels!]).toEqual([[2, 1], [3, 1]]);
  });

  it('hides and shows all the detail, and moves with inserted rows', () => {
    const c = book();
    c.selectRange({ r1: 1, c1: 0, r2: 3, c2: 0 });
    c.groupLines('row', 1);
    c.showLevel(1);
    expect([...c.wb.sheets[0].rowsHidden!]).toEqual([1, 2, 3]);
    c.showLevel(8);
    expect(c.wb.sheets[0].rowsHidden).toBeUndefined();
    c.select(0, 0);
    c.insertRows();
    expect([...c.wb.sheets[0].rowLevels!.keys()]).toEqual([2, 3, 4]);
  });

  it('keeps the levels through an .xlsx, and answers Alt+Shift+Right and Left', async () => {
    const c = book();
    c.selectRange({ r1: 1, c1: 0, r2: 2, c2: 0 });
    c.groupLines('row', 1);
    c.selectRange({ r1: 0, c1: 4, r2: 0, c2: 4 });
    c.groupLines('col', 1);
    const back = new CalcController();
    back.load(await importXlsx(await (await exportXlsx(c.wb)).arrayBuffer()));
    expect([...back.wb.sheets[0].rowLevels!]).toEqual([[1, 1], [2, 1]]);
    expect([...back.wb.sheets[0].colLevels!]).toEqual([[4, 1]]);
    expect(gridShortcut({ key: 'ArrowRight', code: 'ArrowRight', ctrl: false, shift: true, alt: true })).toEqual({ type: 'group', delta: 1 });
    expect(gridShortcut({ key: 'ArrowLeft', code: 'ArrowLeft', ctrl: false, shift: true, alt: true })).toEqual({ type: 'group', delta: -1 });
  });

  it('finds the group that ends above a row, and the + and - button folds it', () => {
    const c = book();
    c.selectRange({ r1: 1, c1: 0, r2: 2, c2: 0 });
    c.groupLines('row', 1);
    expect(c.groupAbove(3)).toEqual({ from: 1, to: 2, collapsed: false });
    expect(c.groupAbove(2)).toBeNull();
    c.toggleGroupAbove(3);
    expect([...c.wb.sheets[0].rowsHidden!]).toEqual([1, 2]);
    expect(c.groupAbove(3)?.collapsed).toBe(true);
    c.toggleGroupAbove(3);
    expect(c.wb.sheets[0].rowsHidden).toBeUndefined();
    c.selectRange({ r1: 0, c1: 1, r2: 0, c2: 2 });
    c.groupLines('col', 1);
    expect(c.groupAbove(3, 'col')).toEqual({ from: 1, to: 2, collapsed: false });
    c.toggleGroupAbove(3, 'col');
    expect([...c.wb.sheets[0].colsHidden!]).toEqual([1, 2]);
  });
});
