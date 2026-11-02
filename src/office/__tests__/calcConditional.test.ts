import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { blend, shiftRange } from '../calc/engine/conditional';
import { Workbook } from '../calc/model/workbook';

/** A controller whose A1:A6 hold 5, 1, 9, 5, "x", and 3. */
function withData() {
  const c = new CalcController(new Workbook());
  ['5', '1', '9', '5', 'x', '3'].forEach((raw, r) => c.wb.putCell(0, r, 0, { raw, style: 0 }));
  c.selectRange({ r1: 0, c1: 0, r2: 5, c2: 0 });
  return c;
}
const cf = (c: CalcController, row: number) => c.wb.cfAt(0, row, 0);

describe('conditional formatting rules', () => {
  it('highlights cells greater than, less than, equal to and between', () => {
    const c = withData();
    c.addConditionalRule({ kind: 'cell', op: 'gt', a: 4, style: { fill: '#ff0000' } });
    expect([0, 1, 2, 3, 4, 5].map((r) => cf(c, r)?.fill)).toEqual(['#ff0000', undefined, '#ff0000', '#ff0000', undefined, undefined]);
    c.clearConditional('sheet');
    c.addConditionalRule({ kind: 'cell', op: 'between', a: 3, b: 5, style: { color: '#00f' } });
    expect([0, 1, 2, 3, 5].map((r) => cf(c, r)?.color)).toEqual(['#00f', undefined, undefined, '#00f', '#00f']);
  });

  it('matches text, duplicates, and the top and bottom N', () => {
    const c = withData();
    c.addConditionalRule({ kind: 'text', op: 'contains', text: 'X', style: { bold: true } });
    expect(cf(c, 4)?.bold).toBe(true);
    expect(cf(c, 0)).toBeNull();
    c.clearConditional('sheet');
    c.addConditionalRule({ kind: 'duplicate', style: { fill: '#aaa' } });
    expect([0, 1, 2, 3].map((r) => !!cf(c, r))).toEqual([true, false, false, true]);
    c.clearConditional('sheet');
    c.addConditionalRule({ kind: 'top', n: 2, bottom: false, style: { fill: '#0f0' } });
    expect([0, 1, 2, 3, 5].map((r) => !!cf(c, r))).toEqual([true, false, true, true, false]);
    c.clearConditional('sheet');
    c.addConditionalRule({ kind: 'top', n: 1, bottom: true, style: { fill: '#0f0' } });
    expect([0, 1, 2].map((r) => !!cf(c, r))).toEqual([false, true, false]);
  });

  it('blends colour scales and sizes data bars by where a value sits in the range', () => {
    expect(blend('#000000', '#ffffff', 0.5)).toBe('#808080');
    const c = withData();
    c.addConditionalRule({ kind: 'scale', low: '#000000', high: '#ffffff' });
    expect(cf(c, 1)?.fill).toBe('#000000');
    expect(cf(c, 2)?.fill).toBe('#ffffff');
    expect(cf(c, 4)).toBeNull();
    c.clearConditional('sheet');
    c.addConditionalRule({ kind: 'bar', color: '#00f' });
    expect(cf(c, 2)?.bar?.fraction).toBe(1);
    expect(cf(c, 1)?.bar?.fraction).toBeCloseTo(0.04, 2);
    expect(cf(c, 5)?.bar?.fraction).toBeCloseTo(0.25, 2);
  });

  it('lets the newest rule win a property and follows the cells', () => {
    const c = withData();
    c.addConditionalRule({ kind: 'cell', op: 'gt', a: 0, style: { fill: '#111' } });
    c.addConditionalRule({ kind: 'cell', op: 'gt', a: 4, style: { fill: '#222' } });
    expect(cf(c, 0)?.fill).toBe('#222');
    expect(cf(c, 1)?.fill).toBe('#111');
    c.select(0, 0);
    c.insertRows();
    expect(c.wb.sheets[0].cf[0].range).toEqual({ r1: 1, c1: 0, r2: 6, c2: 0 });
    expect(c.wb.cfAt(0, 1, 0)?.fill).toBe('#222');
  });

  it('is undoable, recalculates with the data, and clears by scope', () => {
    const c = withData();
    c.addConditionalRule({ kind: 'cell', op: 'gt', a: 8, style: { fill: '#f00' } });
    expect(cf(c, 2)).not.toBeNull();
    c.undo();
    expect(c.wb.sheets[0].cf).toHaveLength(0);
    c.redo();
    c.wb.putCell(0, 2, 0, { raw: '1', style: 0 });
    expect(cf(c, 2)).toBeNull();
    c.select(10, 5);
    c.clearConditional('selection');
    expect(c.wb.sheets[0].cf).toHaveLength(1);
    c.clearConditional('sheet');
    expect(c.wb.sheets[0].cf).toHaveLength(0);
  });

  it('survives a save and load of the workbook', () => {
    const c = withData();
    c.addConditionalRule({ kind: 'bar', color: '#00f' });
    const copy = new Workbook();
    copy.loadData(JSON.parse(JSON.stringify(c.wb.toData())));
    expect(copy.cfAt(0, 2, 0)?.bar?.fraction).toBe(1);
    const old = c.wb.toData();
    delete (old.sheets[0] as { cf?: unknown }).cf;
    copy.loadData(old);
    expect(copy.sheets[0].cf).toEqual([]);
  });

  it('moves and trims a rule range on insert and delete', () => {
    const range = { r1: 2, c1: 0, r2: 5, c2: 1 };
    expect(shiftRange(range, 'row', 0, 2, 'insert')).toEqual({ r1: 4, c1: 0, r2: 7, c2: 1 });
    expect(shiftRange(range, 'row', 3, 1, 'delete')).toEqual({ r1: 2, c1: 0, r2: 4, c2: 1 });
    expect(shiftRange(range, 'row', 2, 4, 'delete')).toBeNull();
    expect(shiftRange(range, 'col', 0, 1, 'delete')).toEqual({ r1: 2, c1: 0, r2: 5, c2: 0 });
  });

  it('matches above and below average, top percent, and gradient data bars', () => {
    // Data: 5, 1, 9, 5, "x", 3 -> Numbers are [5, 1, 9, 5, 3], sum = 23, avg = 4.6
    const c = withData();
    // Above average (avg = 4.6): 5, 9, 5 are above; 1, 3 are below
    c.addConditionalRule({ kind: 'aboveAverage', below: false, style: { fill: '#ffc7ce' } });
    expect([0, 1, 2, 3, 5].map((r) => cf(c, r)?.fill)).toEqual(['#ffc7ce', undefined, '#ffc7ce', '#ffc7ce', undefined]);
    c.clearConditional('sheet');

    // Below average: 1, 3 are below average
    c.addConditionalRule({ kind: 'aboveAverage', below: true, style: { fill: '#c6efce' } });
    expect([0, 1, 2, 3, 5].map((r) => cf(c, r)?.fill)).toEqual([undefined, '#c6efce', undefined, undefined, '#c6efce']);
    c.clearConditional('sheet');

    // Top 30% (5 numbers * 30% = 1.5 -> 2 items): 9 and 5
    c.addConditionalRule({ kind: 'top', n: 30, bottom: false, percent: true, style: { fill: '#ff0' } });
    expect([0, 1, 2, 3, 5].map((r) => !!cf(c, r))).toEqual([true, false, true, true, false]);
    c.clearConditional('sheet');

    // Gradient bar rule
    c.addConditionalRule({ kind: 'bar', color: '#0078d4', gradient: true });
    expect(cf(c, 2)?.bar?.gradient).toBe(true);
    expect(cf(c, 2)?.bar?.color).toBe('#0078d4');
  });
});

