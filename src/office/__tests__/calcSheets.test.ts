import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { Workbook } from '../calc/model/workbook';
import { exportXlsx, importXlsx } from '../calc/services/xlsxService';

function book() {
  const c = new CalcController();
  c.wb.putCell(0, 0, 0, { raw: '7', style: 0 });
  c.wb.putCell(0, 0, 1, { raw: '=A1*2', style: 0 });
  return c;
}

describe('duplicating a sheet', () => {
  it('copies its cells right after it and makes the copy the active one', () => {
    const c = book();
    c.duplicateSheet(0);
    expect(c.wb.sheets.map((s) => s.name)).toEqual(['Sheet1', 'Sheet1 (2)']);
    expect(c.active).toBe(1);
    expect(c.wb.valueAt(1, 0, 1)).toBe(14);
    c.wb.putCell(1, 0, 0, { raw: '1', style: 0 });
    expect(c.wb.valueAt(0, 0, 1)).toBe(14);
    expect(c.wb.valueAt(1, 0, 1)).toBe(2);
  });

  it('numbers the copies and can be undone', () => {
    const c = book();
    c.duplicateSheet(0);
    c.duplicateSheet(0);
    expect(c.wb.sheets.map((s) => s.name)).toEqual(['Sheet1', 'Sheet1 (3)', 'Sheet1 (2)']);
    c.undo();
    expect(c.wb.sheets).toHaveLength(2);
  });
});

describe('moving a sheet', () => {
  it('swaps it with its neighbour and keeps the active sheet the same one', () => {
    const c = book();
    c.addSheet();
    c.wb.putCell(1, 0, 0, { raw: 'two', style: 0 });
    c.switchSheet(0);
    c.moveSheet(0, 1);
    expect(c.wb.sheets.map((s) => s.name)).toEqual(['Sheet2', 'Sheet1']);
    expect(c.active).toBe(1);
    expect(c.wb.getCell(1, 0, 0)?.raw).toBe('7');
    c.moveSheet(1, 1);
    expect(c.wb.sheets.map((s) => s.name)).toEqual(['Sheet2', 'Sheet1']);
  });
});

describe('tab colour', () => {
  it('is set, cleared, kept in drafts and written to xlsx', async () => {
    const c = book();
    c.setTabColor(0, '#e74c3c');
    expect(c.wb.sheets[0].tabColor).toBe('#e74c3c');
    const copy = new Workbook();
    copy.loadData(c.wb.toData());
    expect(copy.sheets[0].tabColor).toBe('#e74c3c');
    const loaded = new Workbook();
    loaded.loadData(await importXlsx(await (await exportXlsx(c.wb)).arrayBuffer()));
    expect(loaded.sheets[0].tabColor).toBe('#e74c3c');
    c.setTabColor(0, null);
    expect(c.wb.sheets[0].tabColor).toBeUndefined();
  });
});

describe('protecting a sheet', () => {
  it('refuses changes to locked cells and lets unlocked ones through', () => {
    const c = new CalcController();
    let told = 0;
    c.onProtected = () => (told += 1);
    c.wb.putCell(0, 0, 0, { raw: '1', style: 0 });
    c.select(0, 1);
    c.setLocked(false);
    c.setProtected(true);
    c.select(0, 0);
    c.startEdit('9');
    c.commitEdit(null);
    expect(c.wb.getCell(0, 0, 0)?.raw).toBe('1');
    expect(told).toBeGreaterThan(0);
    c.select(0, 1);
    c.startEdit('5');
    c.commitEdit(null);
    expect(c.wb.getCell(0, 0, 1)?.raw).toBe('5');
  });

  it('refuses structural changes, and lifts everything when unprotected', () => {
    const c = new CalcController();
    c.wb.putCell(0, 0, 0, { raw: '1', style: 0 });
    c.setProtected(true);
    c.insertRows();
    expect(c.wb.getCell(0, 0, 0)?.raw).toBe('1');
    c.select(1, 0);
    c.insertRows();
    expect(c.wb.getCell(0, 2, 0)).toBeUndefined();
    c.setProtected(false);
    c.select(0, 0);
    c.insertRows();
    expect(c.wb.getCell(0, 1, 0)?.raw).toBe('1');
  });

  it('is saved in drafts and in xlsx, with the unlocked cells', async () => {
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: 'a', style: wb.styleId({ unlocked: true }) });
    wb.sheets[0].protected = true;
    const copy = new Workbook();
    copy.loadData(wb.toData());
    expect(copy.sheets[0].protected).toBe(true);
    const loaded = new Workbook();
    loaded.loadData(await importXlsx(await (await exportXlsx(wb)).arrayBuffer()));
    expect(loaded.sheets[0].protected).toBe(true);
    expect(loaded.styleOf(loaded.getCell(0, 0, 0)!.style).unlocked).toBe(true);
  });
});

describe('cross-sheet formula pointing and calculation modes', () => {
  it('points to a cell on another sheet while typing a formula', () => {
    const c = new CalcController();
    c.addSheet(); // Sheet2 created, c.active is 1
    c.wb.putCell(1, 0, 0, { raw: '42', style: 0 }); // Sheet2!A1 = 42

    c.switchSheet(0); // active is Sheet1
    c.startEdit('=');
    expect(c.editing?.sourceSheet).toBe(0);

    // Click to Sheet2 tab: should NOT commit or cancel edit!
    c.switchSheet(1);
    expect(c.active).toBe(1);
    expect(c.editing).not.toBeNull();
    expect(c.editing?.sourceSheet).toBe(0);

    // Point to A1 on Sheet2
    c.pointTo({ row: 0, col: 0 }, { row: 0, col: 0 });
    expect(c.editing?.text).toBe('=Sheet2!A1');

    // Commit edit with Enter: should return to Sheet1 and save formula in Sheet1
    c.commitEdit('down');
    expect(c.active).toBe(0);
    expect(c.wb.getCell(0, 0, 0)?.raw).toBe('=Sheet2!A1');
    expect(c.wb.valueAt(0, 0, 0)).toBe(42);
  });

  it('cancels cross-sheet formula edit and returns to source sheet', () => {
    const c = new CalcController();
    c.addSheet();
    c.switchSheet(0);
    c.startEdit('=');
    c.switchSheet(1);
    expect(c.active).toBe(1);

    c.cancelEdit();
    expect(c.active).toBe(0);
    expect(c.editing).toBeNull();
  });

  it('handles manual calculation mode and F9 recalculation', () => {
    const c = new CalcController();
    c.calcMode = 'manual';
    expect(c.needsRecalc).toBe(false);

    c.wb.putCell(0, 0, 0, { raw: '10', style: 0 });
    c.wb.putCell(0, 1, 0, { raw: '=A1*2', style: 0 });
    expect(c.wb.valueAt(0, 1, 0)).toBe(20);

    // Edit cell in manual mode: triggers needsRecalc flag
    c.apply([{ row: 0, col: 0, after: { raw: '50', style: 0 } }]);
    expect(c.needsRecalc).toBe(true);

    // F9 recalculate resets flag and updates cached value
    c.recalculate();
    expect(c.needsRecalc).toBe(false);
    expect(c.wb.valueAt(0, 1, 0)).toBe(100);
  });
});

