import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { interpretEntry, parseTsv } from '../calc/engine/entry';
import { cellKey } from '../calc/engine/cellRef';
import { Workbook } from '../calc/model/workbook';
import { workbookStats } from '../calc/model/workbookStats';

/** A controller on a fresh workbook; `type('B2', 'x')` enters text the way a user would. */
function sheet() {
  const c = new CalcController();
  const at = (ref: string) => {
    const m = /^([A-Z]+)(\d+)$/.exec(ref)!;
    let col = 0;
    for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
    return { row: Number(m[2]) - 1, col: col - 1 };
  };
  return {
    c,
    type(ref: string, text: string) {
      const { row, col } = at(ref);
      c.select(row, col);
      c.startEdit(text);
      c.commitEdit(null);
    },
    shown(ref: string) {
      const { row, col } = at(ref);
      return c.wb.displayAt(0, row, col);
    },
    raw(ref: string) {
      const { row, col } = at(ref);
      return c.wb.getCell(0, row, col)?.raw;
    },
    pick(from: string, to = from) {
      const a = at(from);
      const b = at(to);
      c.select(a.row, a.col);
      c.extendTo(b.row, b.col);
    },
  };
}

describe('entering values', () => {
  it('turns what is typed into numbers, dates, percentages and text', () => {
    expect(interpretEntry('42', undefined)).toEqual({ raw: '42' });
    expect(interpretEntry('5/3/2024', undefined)).toEqual({ raw: '45356', numFmt: 'dd/mm/yyyy' });
    expect(interpretEntry('5/3/2024', '0.00')).toEqual({ raw: '45356', numFmt: undefined });
    expect(interpretEntry('12.5%', undefined)).toEqual({ raw: '0.125', numFmt: '0.0%' });
    expect(interpretEntry('true', undefined)).toEqual({ raw: 'TRUE' });
    expect(interpretEntry("'007", undefined)).toEqual({ raw: "'007" });
    expect(interpretEntry('=A1+1', undefined)).toEqual({ raw: '=A1+1' });
    expect(interpretEntry('xin chào', undefined)).toEqual({ raw: 'xin chào' });
    expect(parseTsv('a\tb\r\nc\td\r\n')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('shows typed values, formulas and dates in the grid', () => {
    const s = sheet();
    s.type('A1', '10');
    s.type('A2', '5');
    s.type('A3', '=A1*A2');
    s.type('B1', '5/3/2024');
    s.type('B2', "'007");
    expect(s.shown('A3')).toBe('50');
    expect(s.shown('B1')).toBe('05/03/2024');
    expect(s.shown('B2')).toBe('007');
  });

  it('moves after Enter and Tab, and Escape drops the edit', () => {
    const s = sheet();
    s.c.select(0, 0);
    s.c.startEdit('x');
    s.c.commitEdit('down');
    expect(s.c.activeCell).toEqual({ row: 1, col: 0 });
    s.c.startEdit('y');
    s.c.commitEdit('right');
    expect(s.c.activeCell).toEqual({ row: 1, col: 1 });
    s.c.startEdit('never');
    s.c.cancelEdit();
    expect(s.raw('B2')).toBeUndefined();
  });
});

describe('undo and redo', () => {
  it('steps back and forward through edits, formats and row changes', () => {
    const s = sheet();
    s.type('A1', '1');
    s.type('A1', '2');
    s.c.undo();
    expect(s.raw('A1')).toBe('1');
    s.c.redo();
    expect(s.raw('A1')).toBe('2');

    s.pick('A1');
    s.c.applyStyle({ bold: true });
    expect(s.c.activeStyle().bold).toBe(true);
    s.c.undo();
    expect(s.c.activeStyle().bold).toBeUndefined();

    s.c.insertRows();
    expect(s.raw('A2')).toBe('2');
    s.c.undo();
    expect(s.raw('A1')).toBe('2');
    expect(s.c.canRedo).toBe(true);
  });
});

describe('formatting', () => {
  it('toggles by the active cell and formats ranges', () => {
    const s = sheet();
    s.type('A1', '1234.5');
    s.pick('A1', 'B2');
    s.c.toggleStyle('bold');
    expect(s.c.wb.styleOf(s.c.wb.getCell(0, 1, 1)!.style).bold).toBe(true);
    s.c.toggleStyle('bold');
    expect(s.c.activeStyle().bold).toBeUndefined();
    s.pick('A1');
    s.c.setNumFmt('#,##0.00');
    expect(s.shown('A1')).toBe('1,234.50');
    s.c.setNumFmt('General');
    expect(s.shown('A1')).toBe('1234.5');
  });

  it('draws borders around a selection', () => {
    const s = sheet();
    s.pick('A1', 'B2');
    s.c.setBorders('outside');
    const style = (row: number, col: number) => s.c.wb.styleOf(s.c.wb.getCell(0, row, col)?.style ?? 0);
    expect(style(0, 0).borders).toEqual({ top: true, left: true });
    expect(style(1, 1).borders).toEqual({ bottom: true, right: true });
    s.c.setBorders('none');
    expect(style(0, 0).borders).toBeUndefined();
  });

  it('merges and splits cells, keeping the top-left value', () => {
    const s = sheet();
    s.type('A1', 'keep');
    s.type('B1', 'drop');
    s.pick('A1', 'B1');
    s.c.mergeSelection();
    expect(s.c.wb.sheets[0].merges).toHaveLength(1);
    expect(s.raw('B1')).toBeUndefined();
    s.c.select(0, 1);
    expect(s.c.selection).toEqual({ r1: 0, c1: 0, r2: 0, c2: 1 });
    s.c.mergeSelection();
    expect(s.c.wb.sheets[0].merges).toHaveLength(0);
    expect(s.raw('A1')).toBe('keep');
  });

  it('paints a copied format once', () => {
    const s = sheet();
    s.type('A1', 'x');
    s.pick('A1');
    s.c.applyStyle({ bold: true, fill: '#ffff00' });
    s.c.togglePainter();
    s.pick('C3');
    s.c.paintSelection();
    expect(s.c.activeStyle()).toMatchObject({ bold: true, fill: '#ffff00' });
    expect(s.c.painter).toBeNull();
  });
});

describe('copy, cut and paste', () => {
  it('pastes formulas with their references moved, and values with their formats', () => {
    const s = sheet();
    s.type('A1', '2');
    s.type('B1', '=A1*10');
    s.pick('A1', 'B1');
    s.c.applyStyle({ italic: true });
    const text = s.c.copy();
    expect(text).toBe('2\t20');
    s.pick('A3');
    s.c.paste(text);
    expect(s.raw('B3')).toBe('=A3*10');
    expect(s.shown('B3')).toBe('20');
    expect(s.c.wb.styleOf(s.c.wb.getCell(0, 2, 1)!.style).italic).toBe(true);
  });

  it('fills a larger selection from one copied cell and clears the source on cut', () => {
    const s = sheet();
    s.type('A1', '7');
    s.pick('A1');
    const text = s.c.copy(true);
    s.pick('C1', 'C3');
    s.c.paste(text);
    expect(['C1', 'C2', 'C3'].map((r) => s.raw(r))).toEqual(['7', '7', '7']);
    expect(s.raw('A1')).toBeUndefined();
  });

  it('pastes outside text split into cells', () => {
    const s = sheet();
    s.pick('B2');
    s.c.paste('a\t1\nb\t2');
    expect(s.raw('B2')).toBe('a');
    expect(s.raw('C3')).toBe('2');
  });
});

describe('fill, sum and sort', () => {
  it('fills down with moving formulas and continues number series', () => {
    const s = sheet();
    s.type('A1', '1');
    s.type('A2', '=A1+1');
    s.pick('A2', 'A4');
    s.c.fillDown();
    expect(s.shown('A4')).toBe('4');

    s.type('C1', '10');
    s.type('C2', '20');
    s.c.fillSeries({ r1: 0, c1: 2, r2: 1, c2: 2 }, { r1: 0, c1: 2, r2: 4, c2: 2 });
    expect(['C3', 'C4', 'C5'].map((r) => s.raw(r))).toEqual(['30', '40', '50']);
  });

  it('adds up a column or row with AutoSum', () => {
    const s = sheet();
    s.type('A1', '1');
    s.type('A2', '2');
    s.type('A3', '3');
    s.pick('A4');
    s.c.autoSum();
    expect(s.raw('A4')).toBe('=SUM(A1:A3)');
    s.type('B1', '4');
    s.type('C1', '5');
    s.pick('D1');
    s.c.autoSum();
    expect(s.raw('D1')).toBe('=SUM(A1:C1)');
    s.pick('A1', 'A3');
    s.c.autoSum();
    expect(s.raw('A4')).toBe('=SUM(A1:A3)');
  });

  it('sorts rows by a column, text and numbers, blanks last', () => {
    const s = sheet();
    ['pear', 'apple', '', 'fig'].forEach((v, i) => v && s.type(`A${i + 1}`, v));
    ['3', '1', '2', '9'].forEach((v, i) => s.type(`B${i + 1}`, v));
    s.pick('A1', 'B4');
    s.c.sortSelection(0, true);
    expect(['A1', 'A2', 'A3', 'A4'].map((r) => s.raw(r))).toEqual(['apple', 'fig', 'pear', undefined]);
    expect(['B1', 'B2', 'B3', 'B4'].map((r) => s.raw(r))).toEqual(['1', '9', '3', '2']);
    s.c.sortSelection(1, false);
    expect(s.raw('B1')).toBe('9');
  });
});

describe('find, rows and sheets', () => {
  it('finds and replaces text across the sheet', () => {
    const s = sheet();
    s.type('A1', 'Hà Nội');
    s.type('A2', 'hà giang');
    s.type('A3', '=A1&"!"');
    expect(s.c.findAll('hà', false)).toHaveLength(3);
    expect(s.c.findAll('hà', true)).toHaveLength(1);
    expect(s.c.replaceAll('hà', 'HÀ', false)).toBe(2);
    expect(s.shown('A3')).toBe('HÀ Nội!');
    expect(s.raw('A2')).toBe('HÀ giang');
  });

  it('inserts and deletes rows and columns, keeping formulas right', () => {
    const s = sheet();
    s.type('A1', '1');
    s.type('A2', '2');
    s.type('A3', '=A1+A2');
    s.pick('A2');
    s.c.insertRows();
    expect(s.raw('A4')).toBe('=A1+A3');
    s.c.deleteRows();
    expect(s.raw('A3')).toBe('=A1+A2');
    s.pick('A1');
    s.c.insertColumns();
    expect(s.raw('B3')).toBe('=B1+B2');
  });

  it('adds, renames and deletes sheets, and formulas follow a rename', () => {
    const s = sheet();
    s.type('A1', '5');
    s.c.addSheet();
    expect(s.c.wb.sheets.map((x) => x.name)).toEqual(['Sheet1', 'Sheet2']);
    s.c.select(0, 0);
    s.c.startEdit('=Sheet1!A1*2');
    s.c.commitEdit(null);
    expect(s.c.wb.displayAt(1, 0, 0)).toBe('10');
    expect(s.c.renameSheet(0, 'Data')).toBe(true);
    expect(s.c.wb.getCell(1, 0, 0)?.raw).toBe('=Data!A1*2');
    expect(s.c.renameSheet(1, 'data')).toBe(false);
    expect(s.c.renameSheet(1, 'a/b')).toBe(false);
    s.c.deleteSheet(0);
    expect(s.c.wb.sheets).toHaveLength(1);
    s.c.undo();
    expect(s.c.wb.sheets).toHaveLength(2);
  });
});

describe('freeze panes', () => {
  it('freezes above and left of the cursor, unfreezes, and undoes', () => {
    const { c } = sheet();
    expect(c.frozen).toEqual({ rows: 0, cols: 0 });
    c.select(1, 2);
    c.freezeAtCursor();
    expect(c.frozen).toEqual({ rows: 1, cols: 2 });
    c.setFreeze(1, 0);
    expect(c.frozen).toEqual({ rows: 1, cols: 0 });
    c.setFreeze(0, 0);
    expect(c.wb.sheets[0].freeze).toBeUndefined();
    c.undo();
    expect(c.frozen).toEqual({ rows: 1, cols: 0 });
    c.undo();
    expect(c.frozen).toEqual({ rows: 1, cols: 2 });
  });

  it('keeps the freeze in drafts, per sheet, and ignores bad numbers', () => {
    const { c } = sheet();
    c.setFreeze(2, 1);
    const data = c.wb.toData();
    expect(data.sheets[0].freeze).toEqual({ rows: 2, cols: 1 });
    const other = new CalcController();
    other.load(data);
    expect(other.frozen).toEqual({ rows: 2, cols: 1 });
    other.load({ ...data, sheets: [{ ...data.sheets[0], freeze: { rows: -3, cols: Number.NaN } }] });
    expect(other.frozen).toEqual({ rows: 0, cols: 0 });
  });
});

describe('pictures', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  it('adds at the cursor cell, scaled to 480 wide, and moves, resizes, deletes and undoes', () => {
    const { c } = sheet();
    c.select(3, 2);
    const id = c.addImage(PNG, 960, 480, 'Một điểm');
    const [image] = c.wb.sheets[0].images ?? [];
    expect(image).toMatchObject({ id, row: 3, col: 2, width: 480, height: 240, alt: 'Một điểm' });
    expect(c.selectedChart).toBe(id);
    c.moveChart(id, { row: 5, col: 1, dx: 4, dy: 6 });
    expect(c.wb.sheets[0].images?.[0]).toMatchObject({ row: 5, col: 1, dx: 4, dy: 6 });
    c.resizeChart(id, 2, 2);
    expect(c.wb.sheets[0].images?.[0]).toMatchObject({ width: 16, height: 16 });
    c.deleteChart(id);
    expect(c.wb.sheets[0].images).toEqual([]);
    expect(c.selectedChart).toBeNull();
    c.undo();
    expect(c.wb.sheets[0].images).toHaveLength(1);
    c.undo();
    c.undo();
    c.undo();
    expect(c.wb.sheets[0].images ?? []).toHaveLength(0);
  });

  it('shares the data URL between snapshots instead of copying it', () => {
    const { c } = sheet();
    c.addImage(PNG, 10, 10);
    const first = c.wb.toData().sheets[0].images?.[0];
    const second = c.wb.toData().sheets[0].images?.[0];
    expect(first).not.toBe(second);
    expect(first?.src).toBe(second?.src);
  });
});

describe('filter', () => {
  function table() {
    const s = sheet();
    const rows = [['Tên', 'Nhóm', 'Số'], ['An', 'A', '3'], ['Bình', 'B', '1'], ['Chi', 'A', '2'], ['Dũng', '', '5']];
    rows.forEach((row, r) => row.forEach((text, c) => s.type(`${'ABC'[c]}${r + 1}`, text)));
    s.c.select(1, 1);
    return s;
  }

  it('puts the filter on the data around the cursor, and takes it off again', () => {
    const { c } = table();
    expect(c.toggleFilter()).toBe(true);
    expect(c.filter?.range).toEqual({ r1: 0, c1: 0, r2: 4, c2: 2 });
    expect(c.wb.hiddenRows(0).size).toBe(0);
    c.toggleFilter();
    expect(c.filter).toBeUndefined();
    c.undo();
    expect(c.filter).toBeDefined();
  });

  it('lists the distinct texts of a column with counts, and hides the rows of excluded ones', () => {
    const { c } = table();
    c.toggleFilter();
    expect(c.filterValues(1)).toEqual([
      { value: 'A', count: 2, hidden: false },
      { value: 'B', count: 1, hidden: false },
      { value: '', count: 1, hidden: false },
    ]);
    c.setFilterExcluded(1, ['A', '']);
    expect([...c.wb.hiddenRows(0)].sort()).toEqual([1, 3, 4]);
    expect(c.filterValues(1).filter((v) => v.hidden).map((v) => v.value)).toEqual(['A', '']);
    // Filters on two columns hide a row that either excludes.
    c.setFilterExcluded(1, []);
    c.setFilterExcluded(2, ['5']);
    expect([...c.wb.hiddenRows(0)]).toEqual([4]);
    c.clearFilterCriteria();
    expect(c.wb.hiddenRows(0).size).toBe(0);
    expect(c.filter).toBeDefined();
  });

  it('follows edits to the data and steps the cursor over hidden rows', () => {
    const { c, type } = table();
    c.toggleFilter();
    c.setFilterExcluded(1, ['A']);
    type('B4', 'B'); // Chi was in group A, now B: no longer hidden
    expect([...c.wb.hiddenRows(0)]).toEqual([1]);
    c.select(0, 0);
    c.move(1, 0);
    expect(c.focus.row).toBe(2);
    c.move(-1, 0);
    expect(c.focus.row).toBe(0);
  });

  it('sorts only the records, leaving the header row, and keeps the filter across a row insert', () => {
    const { c } = table();
    c.toggleFilter();
    c.sortFilterColumn(2, false);
    expect(c.wb.displayAt(0, 0, 0)).toBe('Tên');
    expect(c.wb.displayAt(0, 1, 0)).toBe('Dũng');
    expect(c.wb.displayAt(0, 4, 0)).toBe('Bình');
    c.setFilterExcluded(1, ['B']);
    c.select(0, 0);
    c.insertRows();
    expect(c.filter?.range).toEqual({ r1: 1, c1: 0, r2: 5, c2: 2 });
    expect([...c.wb.hiddenRows(0)]).toEqual([5]);
  });
});

describe('filter conditions', () => {
  it('matches text by contains, begins, ends and equals without regard to case', async () => {
    const { matchesCondition } = await import('../calc/engine/filterCondition');
    expect(matchesCondition({ op: 'contains', a: 'HÀ' }, 'Hà Nội', 'Hà Nội')).toBe(true);
    expect(matchesCondition({ op: 'notContains', a: 'nội' }, 'Hà Nội', 'Hà Nội')).toBe(false);
    expect(matchesCondition({ op: 'beginsWith', a: 'hà' }, 'Hà Nội', 'Hà Nội')).toBe(true);
    expect(matchesCondition({ op: 'endsWith', a: 'hà' }, 'Hà Nội', 'Hà Nội')).toBe(false);
    expect(matchesCondition({ op: 'equals', a: 'hà nội' }, 'Hà Nội', 'Hà Nội')).toBe(true);
    expect(matchesCondition({ op: 'notEquals', a: 'x' }, 'Hà Nội', 'Hà Nội')).toBe(true);
    expect(matchesCondition({ op: 'contains', a: '' }, null, '')).toBe(true);
  });

  it('compares numbers, rejects text and blanks, and lets a missing operand through', async () => {
    const { matchesCondition } = await import('../calc/engine/filterCondition');
    expect(matchesCondition({ op: 'gt', a: '10' }, 11, '11')).toBe(true);
    expect(matchesCondition({ op: 'gt', a: '10' }, 10, '10')).toBe(false);
    expect(matchesCondition({ op: 'gte', a: '10' }, 10, '10')).toBe(true);
    expect(matchesCondition({ op: 'lt', a: '2,5' }, 2.4, '2.4')).toBe(true);
    expect(matchesCondition({ op: 'between', a: '5', b: '1' }, 3, '3')).toBe(true);
    expect(matchesCondition({ op: 'between', a: '1', b: '5' }, 6, '6')).toBe(false);
    expect(matchesCondition({ op: 'gt', a: '1' }, 'abc', 'abc')).toBe(false);
    expect(matchesCondition({ op: 'gt', a: '1' }, null, '')).toBe(false);
    expect(matchesCondition({ op: 'gt', a: 'abc' }, 5, '5')).toBe(true);
  });

  it('hides records that fail a column condition, together with the checklist, and follows column inserts', () => {
    const s = sheet();
    [['Tên', 'Nhóm', 'Số'], ['An', 'A', '3'], ['Bình', 'B', '1'], ['Chi', 'A', '2'], ['Dũng', 'B', '5']].forEach((row, r) =>
      row.forEach((text, c) => s.type(`${'ABC'[c]}${r + 1}`, text)),
    );
    const { c } = s;
    c.select(1, 1);
    c.toggleFilter();
    c.setFilterCondition(2, { op: 'gte', a: '3' });
    expect([...c.wb.hiddenRows(0)]).toEqual([2, 3]);
    expect(c.filterActive).toBe(true);
    c.setFilterExcluded(1, ['B']);
    expect([...c.wb.hiddenRows(0)].sort()).toEqual([2, 3, 4]);
    c.select(0, 0);
    c.insertColumns();
    expect(c.filter?.conditions).toEqual({ 3: { op: 'gte', a: '3' } });
    expect(c.filter?.excluded).toEqual({ 2: ['B'] });
    c.setFilterCondition(3, null);
    expect(c.filter?.conditions).toBeUndefined();
    c.clearFilterCriteria();
    expect(c.filterActive).toBe(false);
    expect(c.wb.hiddenRows(0).size).toBe(0);
  });
});

describe('summary (PivotTable-style)', () => {
  const labels = { corner: 'Tổng Số', total: 'Tổng cộng', sheetName: 'Tóm tắt' };

  function sales() {
    const s = sheet();
    const rows = [
      ['Vùng', 'Quý', 'Số'],
      ['Bắc', 'Q1', '10'],
      ['Nam', 'Q1', '20'],
      ['Bắc', 'Q2', '5'],
      ['Nam', 'Q2', '15'],
      ['Bắc', 'Q1', '7'],
      ['', 'Q2', '99'],
    ];
    rows.forEach((row, r) => row.forEach((text, c) => text && s.type(`${'ABC'[c]}${r + 1}`, text)));
    s.c.select(1, 1);
    return s;
  }
  const make = (c: CalcController, fn: 'sum' | 'count' | 'average' | 'max' | 'min', columnColumn: number | null) =>
    c.insertSummary({ source: c.summarySource()!.range, rowColumn: 0, columnColumn, valueColumn: 2, fn }, labels);
  const grid = (c: CalcController) => {
    const out: string[][] = [];
    for (let r = 0; r < 6; r += 1) out.push(Array.from({ length: 5 }, (_, col) => c.wb.displayAt(c.active, r, col)));
    return out;
  };

  it('finds the table around the cursor with its headers', () => {
    const { c } = sales();
    expect(c.summarySource()).toEqual({ range: { r1: 0, c1: 0, r2: 6, c2: 2 }, headers: ['Vùng', 'Quý', 'Số'] });
    c.select(20, 20);
    expect(c.summarySource()).toBeNull();
  });

  it('sums by one field on a new sheet, with totals, and leaves the data alone', () => {
    const { c } = sales();
    make(c, 'sum', null);
    expect(c.wb.sheets.map((s) => s.name)).toEqual(['Sheet1', 'Tóm tắt']);
    expect(c.active).toBe(1);
    const g = grid(c);
    expect(g[0].slice(0, 2)).toEqual(['Vùng', 'Tổng Số']);
    // Bắc: 10 + 5 + 7, Nam: 20 + 15; a row with no region is not in the table, nor in its total.
    expect(g[1].slice(0, 2)).toEqual(['Bắc', '22']);
    expect(g[2].slice(0, 2)).toEqual(['Nam', '35']);
    expect(g[3].slice(0, 2)).toEqual(['Tổng cộng', '57']);
    expect(c.wb.displayAt(0, 6, 2)).toBe('99');
  });

  it('refreshes from the data as it is now: new rows, new categories, gone ones', () => {
    const { c, type } = sales();
    make(c, 'sum', null);
    expect(c.summaryConfig?.source).toEqual({ r1: 0, c1: 0, r2: 6, c2: 2 });
    // The category list is fixed until a refresh, even when a row with a new region is added.
    c.active = 0;
    type('A8', 'Trung');
    type('B8', 'Q1');
    type('C8', '8');
    c.active = 1;
    expect(grid(c).map((row) => row[0])).not.toContain('Trung');
    expect(c.refreshSummary()).toBe(true);
    const g = grid(c);
    expect(g.slice(0, 4).map((row) => row.slice(0, 2))).toEqual([
      ['Vùng', 'Tổng Số'],
      ['Bắc', '22'],
      ['Nam', '35'],
      ['Trung', '8'],
    ]);
    expect(g[4].slice(0, 2)).toEqual(['Tổng cộng', '65']);
    expect(c.summaryConfig?.source.r2).toBe(7);
    // A category that is gone from the data is gone from the summary.
    c.active = 0;
    for (const ref of ['A2', 'A4']) type(ref, 'Nam');
    type('A3', 'Nam');
    type('A6', 'Nam');
    c.active = 1;
    c.refreshSummary();
    expect(grid(c).map((row) => row[0]).slice(0, 4)).toEqual(['Vùng', 'Nam', 'Trung', 'Tổng cộng']);
    c.undo();
    expect(grid(c).map((row) => row[0]).slice(0, 5)).toEqual(['Vùng', 'Bắc', 'Nam', 'Trung', 'Tổng cộng']);
  });

  it('keeps the formats the user gave summary cells, follows a rename of the data sheet, and survives a draft', () => {
    const { c } = sales();
    make(c, 'sum', null);
    const bold = c.wb.styleId({ bold: true });
    c.wb.sheets[1].cells.set(cellKey(1, 1), { raw: c.wb.sheets[1].cells.get(cellKey(1, 1))!.raw, style: bold });
    expect(c.renameSheet(0, 'Dữ liệu')).toBe(true);
    expect(c.summaryConfig?.sheet).toBe('Dữ liệu');
    const copy = new Workbook();
    copy.loadData(c.wb.toData());
    expect(copy.sheets[1].summary?.sheet).toBe('Dữ liệu');
    expect(c.refreshSummary()).toBe(true);
    expect(c.wb.sheets[1].cells.get(cellKey(1, 1))?.style).toBe(bold);
    expect(grid(c)[1].slice(0, 2)).toEqual(['Bắc', '22']);
  });

  it('refuses to refresh a sheet that is not a summary, or whose data sheet is gone', () => {
    const { c } = sales();
    expect(c.refreshSummary()).toBe(false);
    make(c, 'sum', null);
    c.deleteSheet(0);
    expect(c.refreshSummary()).toBe(false);
  });

  it('crosses two fields, with row and column totals, and follows a change in the data', () => {
    const { c } = sales();
    make(c, 'sum', 1);
    const g = grid(c);
    expect(g[0].slice(0, 4)).toEqual(['Tổng Số', 'Q1', 'Q2', 'Tổng cộng']);
    expect(g[1].slice(0, 4)).toEqual(['Bắc', '17', '5', '22']);
    expect(g[2].slice(0, 4)).toEqual(['Nam', '20', '15', '35']);
    expect(g[3].slice(0, 4)).toEqual(['Tổng cộng', '37', '20', '57']);
    c.active = 0;
    c.select(1, 2);
    c.startEdit('100');
    c.commitEdit(null);
    expect(c.wb.displayAt(1, 1, 1)).toBe('107');
  });

  it('counts, averages and finds the largest and smallest, leaving empty combinations blank', () => {
    const { c } = sales();
    make(c, 'count', null);
    expect(grid(c)[1].slice(0, 2)).toEqual(['Bắc', '3']);
    expect(grid(c)[3].slice(0, 2)).toEqual(['Tổng cộng', '5']);
    c.active = 0;
    make(c, 'average', 1);
    expect(c.wb.sheets[2].name).toBe('Tóm tắt 2');
    expect(grid(c)[1].slice(0, 3)).toEqual(['Bắc', '8.5', '5']);
    expect(Number(grid(c)[1][3])).toBeCloseTo(7.3333, 3);
    c.active = 0;
    make(c, 'max', 1);
    expect(grid(c)[2].slice(0, 4)).toEqual(['Nam', '20', '15', '20']);
    c.active = 0;
    make(c, 'min', 1);
    expect(grid(c)[1].slice(0, 4)).toEqual(['Bắc', '7', '5', '5']);
  });

  it('refuses a source with too many categories, and one undo takes the sheet away', async () => {
    const { MAX_SUMMARY_ROWS, SummaryTooLargeError } = await import('../calc/engine/summary');
    const { c } = sales();
    make(c, 'sum', null);
    c.undo();
    expect(c.wb.sheets.map((s) => s.name)).toEqual(['Sheet1']);
    const big = sheet();
    for (let r = 0; r < MAX_SUMMARY_ROWS + 5; r += 1) {
      big.type(`A${r + 2}`, `k${r}`);
      big.type(`B${r + 2}`, '1');
    }
    big.type('A1', 'Khoá');
    big.type('B1', 'Số');
    big.c.select(1, 0);
    expect(() => big.c.insertSummary({ source: big.c.summarySource()!.range, rowColumn: 0, columnColumn: null, valueColumn: 1, fn: 'sum' }, labels)).toThrow(SummaryTooLargeError);
    expect(big.c.wb.sheets).toHaveLength(1);
  });

  it('writes labels that look like numbers or formulas as text, and MAXIFS/MINIFS give 0 when nothing matches', () => {
    const s = sheet();
    ['Mã', "'007", "'=1+1", '12'].forEach((text, r) => s.type(`A${r + 1}`, text));
    ['Số', '1', '2', '3'].forEach((text, r) => s.type(`B${r + 1}`, text));
    s.c.select(1, 0);
    s.c.insertSummary({ source: s.c.summarySource()!.range, rowColumn: 0, columnColumn: null, valueColumn: 1, fn: 'sum' }, labels);
    const col = [1, 2, 3].map((r) => [s.c.wb.displayAt(1, r, 0), s.c.wb.displayAt(1, r, 1)]);
    // Numbers first, then text in order.
    expect(col).toEqual([['12', '3'], ['007', '1'], ['=1+1', '2']]);
    s.c.active = 0;
    s.c.select(0, 3);
    s.c.startEdit('=MAXIFS(B2:B4,A2:A4,"zzz")');
    s.c.commitEdit(null);
    expect(s.c.wb.displayAt(0, 0, 3)).toBe('0');
  });
});

describe('row heights', () => {
  const heights = (s: ReturnType<typeof sheet>) => [...s.c.wb.sheets[0].rowHeights].sort(([a], [b]) => a - b);

  it('sets a height, clamps it, and returns to the default without leaving an entry', () => {
    const s = sheet();
    s.c.setRowHeight(2, 60);
    expect(heights(s)).toEqual([[2, 60]]);
    s.c.setRowHeight(3, 5000);
    s.c.setRowHeight(4, 1);
    expect(heights(s)).toEqual([[2, 60], [3, 400], [4, 8]]);
    s.c.setRowHeight(2, 24);
    expect(heights(s)).toEqual([[3, 400], [4, 8]]);
  });

  it('is one undo step and redoes', () => {
    const s = sheet();
    s.c.setRowHeight(1, 50);
    s.c.undo();
    expect(heights(s)).toEqual([]);
    s.c.redo();
    expect(heights(s)).toEqual([[1, 50]]);
  });

  it('does nothing, not even an undo step, when the height does not change', () => {
    const s = sheet();
    s.c.setRowHeight(1, 24);
    expect(s.c.canUndo).toBe(false);
  });

  it('follows rows that are inserted or deleted above it', () => {
    const s = sheet();
    s.c.setRowHeight(3, 70);
    s.c.select(0, 0);
    s.c.insertRows();
    expect(heights(s)).toEqual([[4, 70]]);
    s.c.deleteRows();
    expect(heights(s)).toEqual([[3, 70]]);
    // A row that is itself deleted takes its height with it
    s.c.select(3, 0);
    s.c.deleteRows();
    expect(heights(s)).toEqual([]);
  });

  it('survives a draft round trip and an old draft without heights loads as default', () => {
    const s = sheet();
    s.c.setRowHeight(5, 90);
    const data = s.c.wb.toData();
    const again = new Workbook();
    again.loadData(data);
    expect(again.sheets[0].rowHeights.get(5)).toBe(90);

    const old = JSON.parse(JSON.stringify(data));
    delete old.sheets[0].rowHeights;
    const legacy = new Workbook();
    legacy.loadData(old);
    expect(legacy.sheets[0].rowHeights.size).toBe(0);
  });
});

describe('protection, page setup, comments, stacking order', () => {
  it('bảo vệ trang tính chặn sửa ô nhưng vẫn đổi tên, thêm trang và gỡ bảo vệ', () => {
    const s = sheet();
    s.type('A1', '5');
    let warned = 0;
    s.c.onProtected = () => { warned++; };
    s.c.toggleProtection();
    expect(s.c.sheetProtected).toBe(true);

    s.type('A1', '9');
    expect(s.raw('A1')).toBe('5');
    expect(warned).toBeGreaterThan(0);

    s.c.addSheet();
    s.c.switchSheet(0);
    expect(s.c.wb.sheets.length).toBe(2);
    s.c.toggleProtection();
    s.type('A1', '9');
    expect(s.raw('A1')).toBe('9');
  });

  it('bảo vệ chặn chèn xóa hàng cột và dán', () => {
    const s = sheet();
    s.type('A1', '5');
    s.c.toggleProtection();
    s.c.select(0, 0);
    s.c.insertRows();
    expect(s.raw('A1')).toBe('5');
    expect(s.c.wb.getCell(0, 1, 0)).toBeUndefined();
  });

  it('thiết lập trang: giá trị mặc định không để lại gì, hoàn tác được, giới hạn tỉ lệ', () => {
    const s = sheet();
    expect(s.c.pageSetup.orientation).toBe('portrait');
    s.c.setPageSetup({ orientation: 'landscape', scale: 5000 });
    expect(s.c.pageSetup.orientation).toBe('landscape');
    expect(s.c.pageSetup.scale).toBe(400);
    s.c.setPageSetup({ orientation: 'portrait', scale: 100 });
    expect(s.c.wb.sheets[0].pageSetup).toBeUndefined();
    s.c.undo();
    expect(s.c.pageSetup.orientation).toBe('landscape');
  });

  it('vùng in được đặt và bỏ, đi theo bản lưu', () => {
    const s = sheet();
    s.c.setPrintArea({ r1: 0, c1: 0, r2: 4, c2: 2 });
    const back = new Workbook();
    back.loadData(s.c.wb.toData());
    expect(back.sheets[0].pageSetup?.printArea).toEqual({ r1: 0, c1: 0, r2: 4, c2: 2 });
    s.c.setPrintArea(null);
    expect(s.c.pageSetup.printArea).toBeUndefined();
  });

  it('ghi chú: thêm, sửa giữ người tạo, xóa khi rỗng, dịch theo khi chèn hàng, đi theo bản lưu', () => {
    const s = sheet();
    s.c.setComment(1, 1, ' xem lại ', 'An');
    expect(s.c.commentAt(1, 1)?.text).toBe('xem lại');
    s.c.setComment(1, 1, 'đã xem', 'Bình');
    expect(s.c.commentAt(1, 1)).toMatchObject({ text: 'đã xem', author: 'An' });

    s.c.select(0, 0);
    s.c.insertRows();
    expect(s.c.commentAt(1, 1)).toBeUndefined();
    expect(s.c.commentAt(2, 1)?.text).toBe('đã xem');
    expect(s.c.commentCells().map((x) => [x.row, x.col])).toEqual([[2, 1]]);

    const back = new Workbook();
    back.loadData(s.c.wb.toData());
    expect(back.sheets[0].comments?.get(cellKey(2, 1))?.text).toBe('đã xem');

    s.c.setComment(2, 1, '', 'An');
    expect(s.c.commentAt(2, 1)).toBeUndefined();
    expect(s.c.wb.sheets[0].comments).toBeUndefined();
  });

  it('xếp lớp ảnh: đưa lên trước, ra sau, không đổi khi đã ở đầu', () => {
    const s = sheet();
    const a = s.c.addImage('data:image/png;base64,AA', 10, 10);
    const b = s.c.addImage('data:image/png;base64,BB', 10, 10);
    const order = () => s.c.wb.sheets[0].images!.map((i) => i.id);
    expect(order()).toEqual([a, b]);
    s.c.arrangeObject(a, 'front');
    expect(order()).toEqual([b, a]);
    s.c.arrangeObject(a, 'backward');
    expect(order()).toEqual([a, b]);
    s.c.arrangeObject(a, 'back');
    expect(order()).toEqual([a, b]);
    s.c.arrangeObject(a, 'forward');
    expect(order()).toEqual([b, a]);
  });
});

describe('insert function and workbook statistics', () => {
  it('chèn hàm: mở ô với công thức mới, nối vào công thức đang gõ, hàm không đối số có ngoặc đóng', () => {
    const s = sheet();
    s.c.select(0, 0);
    s.c.insertFunction('SUM');
    expect(s.c.editing?.text).toBe('=SUM(');
    s.c.insertFunction('PI');
    expect(s.c.editing?.text).toBe('=SUM(PI()');
    s.c.cancelEdit();
    s.type('B1', 'abc');
    s.c.select(0, 1);
    s.c.insertFunction('LEN');
    expect(s.c.editing?.text).toBe('=LEN(');
  });

  it('chèn hàm bị chặn khi trang tính được bảo vệ', () => {
    const s = sheet();
    s.c.toggleProtection();
    s.c.insertFunction('SUM');
    expect(s.c.editing).toBeNull();
  });

  it('thống kê sổ tính đếm ô, công thức, ghi chú và ảnh trên mọi trang', () => {
    const s = sheet();
    s.type('A1', '1');
    s.type('A2', '=A1+1');
    s.c.setComment(0, 0, 'x', 'An');
    s.c.addImage('data:image/png;base64,AA', 10, 10);
    s.c.addSheet();
    s.type('A1', 'hi');
    expect(workbookStats(s.c.wb)).toEqual({ sheets: 2, cells: 3, formulas: 1, charts: 0, pictures: 1, comments: 1 });
  });
});
