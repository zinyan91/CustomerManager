import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { currentRegion, formatTick, niceScale, readChartData } from '../calc/engine/chartData';
import { Workbook } from '../calc/model/workbook';

function book(rows: string[][]): Workbook {
  const wb = new Workbook();
  rows.forEach((row, r) => row.forEach((raw, c) => raw !== '' && wb.putCell(0, r, c, { raw, style: 0 })));
  return wb;
}
const read = (wb: Workbook, range: { r1: number; c1: number; r2: number; c2: number }) =>
  readChartData(range, (r, c) => wb.valueAt(0, r, c), (r, c) => wb.displayAt(0, r, c));

describe('chart data', () => {
  it('takes a header row for series names and a text column for categories', () => {
    const wb = book([
      ['', 'Q1', 'Q2'],
      ['Táo', '10', '30'],
      ['Cam', '20', '5'],
    ]);
    const data = read(wb, { r1: 0, c1: 0, r2: 2, c2: 2 });
    expect(data.categories).toEqual(['Táo', 'Cam']);
    expect(data.series).toEqual([
      { name: 'Q1', values: [10, 20] },
      { name: 'Q2', values: [30, 5] },
    ]);
  });

  it('numbers the categories and names the series when there are no labels', () => {
    const wb = book([['1', '2'], ['3', '4'], ['5', '6']]);
    const data = read(wb, { r1: 0, c1: 0, r2: 2, c2: 1 });
    expect(data.categories).toEqual(['1', '2', '3']);
    expect(data.series.map((s) => s.name)).toEqual(['Series 1', 'Series 2']);
  });

  it('reads formula results, leaves text out of a series and skips empty columns', () => {
    const wb = book([['n', 'v', 'note'], ['a', '=1+1', 'x'], ['b', '4', 'y']]);
    const data = read(wb, { r1: 0, c1: 0, r2: 2, c2: 2 });
    expect(data.series).toEqual([{ name: 'v', values: [2, 4] }]);
  });

  it('finds the block of data around a cell', () => {
    const filled = (r: number, c: number) => r >= 1 && r <= 3 && c >= 1 && c <= 2;
    expect(currentRegion(2, 1, filled)).toEqual({ r1: 1, c1: 1, r2: 3, c2: 2 });
    expect(currentRegion(8, 8, filled)).toEqual({ r1: 8, c1: 8, r2: 8, c2: 8 });
  });
});

describe('chart scales', () => {
  it('picks round limits that include zero for bars', () => {
    expect(niceScale(0, 97)).toMatchObject({ min: 0, max: 100, step: 20 });
    expect(niceScale(12, 87).min).toBe(0);
    expect(niceScale(-30, 40)).toMatchObject({ min: -40, max: 40 });
    expect(niceScale(112, 187, 5, false).min).toBe(100);
    expect(niceScale(0, 0).max).toBeGreaterThan(0);
    expect(niceScale(5, 5)).toMatchObject({ min: 0, max: 5 });
  });

  it('shortens big numbers', () => {
    expect(formatTick(1500000)).toBe('1.5M');
    expect(formatTick(25000)).toBe('25K');
    expect(formatTick(250)).toBe('250');
    expect(formatTick(0.5)).toBe('0.5');
  });
});

describe('charts in the controller', () => {
  function sheet() {
    const c = new CalcController(book([['', 'A', 'B'], ['x', '1', '2'], ['y', '3', '4']]));
    return c;
  }

  it('adds a chart over the selection, or the data around a cell, and selects it', () => {
    const c = sheet();
    c.select(1, 1);
    expect(c.addChart('column')).toBe(true);
    const chart = c.wb.sheets[0].charts[0];
    expect(chart.range).toEqual({ r1: 0, c1: 0, r2: 2, c2: 2 });
    expect(chart.col).toBe(4);
    expect(c.selectedChart).toBe(chart.id);
    c.select(30, 30);
    expect(c.selectedChart).toBeNull();
    expect(c.addChart('pie')).toBe(false);
  });

  it('moves, resizes, titles and deletes, all undoable', () => {
    const c = sheet();
    c.select(1, 1);
    c.addChart('line');
    const id = c.wb.sheets[0].charts[0].id;
    c.moveChart(id, { row: 5, col: 2, dx: 10, dy: 4 });
    expect(c.wb.sheets[0].charts[0]).toMatchObject({ row: 5, col: 2, dx: 10, dy: 4 });
    c.resizeChart(id, 10, 10);
    expect(c.wb.sheets[0].charts[0]).toMatchObject({ width: 160, height: 120 });
    c.setChartTitle(id, 'Doanh thu');
    c.setChartType(id, 'bar');
    expect(c.wb.sheets[0].charts[0]).toMatchObject({ title: 'Doanh thu', type: 'bar' });
    c.deleteChart(id);
    expect(c.wb.sheets[0].charts).toHaveLength(0);
    c.undo();
    expect(c.wb.sheets[0].charts).toHaveLength(1);
    c.undo();
    c.undo();
    c.undo();
    expect(c.wb.sheets[0].charts[0]).toMatchObject({ row: 5, col: 2, type: 'line' });
  });

  it('follows rows and columns inserted or deleted, and is dropped when its data is deleted', () => {
    const c = sheet();
    c.select(1, 1);
    c.addChart('column');
    c.select(0, 0);
    c.insertRows();
    expect(c.wb.sheets[0].charts[0]).toMatchObject({ row: 1, range: { r1: 1, r2: 3 } });
    c.selectRange({ r1: 1, c1: 0, r2: 3, c2: 0 });
    c.deleteRows();
    expect(c.wb.sheets[0].charts).toHaveLength(0);
  });

  it('survives a save and load of the workbook, and old drafts have none', () => {
    const c = sheet();
    c.select(1, 1);
    c.addChart('pie');
    const copy = new Workbook();
    copy.loadData(JSON.parse(JSON.stringify(c.wb.toData())));
    expect(copy.sheets[0].charts).toHaveLength(1);
    const old = c.wb.toData();
    delete (old.sheets[0] as { charts?: unknown }).charts;
    copy.loadData(old);
    expect(copy.sheets[0].charts).toEqual([]);
  });
});
