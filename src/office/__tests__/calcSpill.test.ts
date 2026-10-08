import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { Workbook, mayReturnBlock } from '../calc/model/workbook';
import { ERRORS } from '../calc/engine/values';
import { exportXlsx, importXlsx } from '../calc/services/xlsxService';

/** A workbook from rows of text laid from A1. */
function book(rows: string[][]): Workbook {
  const wb = new Workbook();
  rows.forEach((row, r) => row.forEach((raw, c) => raw !== '' && wb.putCell(0, r, c, { raw, style: 0 })));
  return wb;
}
const show = (wb: Workbook, rows: number, cols: number, row0 = 0, col0 = 0) =>
  Array.from({ length: rows }, (_r, r) => Array.from({ length: cols }, (_c, c) => wb.displayAt(0, row0 + r, col0 + c)));

describe('array functions', () => {
  it('SEQUENCE fills a block from the cell with the formula', () => {
    const wb = book([['=SEQUENCE(3,2,10,5)']]);
    expect(show(wb, 3, 3)).toEqual([['10', '15', ''], ['20', '25', ''], ['30', '35', '']]);
    expect(wb.valueAt(0, 2, 1)).toBe(35);
  });

  it('UNIQUE keeps the first of each row, whatever the case, or only those seen once', () => {
    const data = [['Hà Nội'], ['Đà Nẵng'], ['hà nội'], ['Huế']];
    const wb = book(data.map((row, i) => (i === 0 ? [row[0], '', '=UNIQUE(A1:A4)'] : [row[0]])));
    expect(show(wb, 4, 1, 0, 2)).toEqual([['Hà Nội'], ['Đà Nẵng'], ['Huế'], ['']]);
    const once = book(data.map((row, i) => (i === 0 ? [row[0], '', '=UNIQUE(A1:A4,FALSE,TRUE)'] : [row[0]])));
    expect(show(once, 3, 1, 0, 2)).toEqual([['Đà Nẵng'], ['Huế'], ['']]);
  });

  it('SORT orders by a column, either way, blanks last, and SORTBY by another range', () => {
    const wb = book([['b', '2', '=SORT(A1:B4,2,-1)'], ['a', '3'], ['c', ''], ['d', '1']]);
    expect(show(wb, 4, 2, 0, 2)).toEqual([['a', '3'], ['b', '2'], ['d', '1'], ['c', '']]);
    const by = book([['x', '3', '=SORTBY(A1:A3,B1:B3)'], ['y', '1'], ['z', '2']]);
    expect(show(by, 3, 1, 0, 2)).toEqual([['y'], ['z'], ['x']]);
  });

  it('FILTER keeps the rows a test allows, or says what to show when none do', () => {
    const wb = book([['a', '1', '=FILTER(A1:A4,B1:B4>=2)'], ['b', '2'], ['c', '3'], ['d', '0']]);
    expect(show(wb, 3, 1, 0, 2)).toEqual([['b'], ['c'], ['']]);
    const flags = book([['a', '0', '=FILTER(A1:A3,B1:B3)'], ['b', '1'], ['c', '1']]);
    expect(show(flags, 3, 1, 0, 2)).toEqual([['b'], ['c'], ['']]);
    const none = book([['a', '0', '=FILTER(A1:A2,B1:B2,"không có")'], ['b', '0']]);
    expect(none.displayAt(0, 0, 2)).toBe('không có');
    expect(book([['a', '0', '=FILTER(A1:A2,B1:B2)'], ['b', '0']]).valueAt(0, 0, 2)).toBe(ERRORS.na);
  });

  it('FILTER combines tests: both (*) or either (+)', () => {
    const rows = [['a', '1', 'x'], ['b', '5', 'x'], ['c', '5', 'y'], ['d', '0', 'y']];
    const both = book(rows.map((r, i) => (i === 0 ? [...r, '', '=FILTER(A1:A4,(B1:B4>=1)*(C1:C4="x"))'] : r)));
    expect(show(both, 2, 1, 0, 4)).toEqual([['a'], ['b']]);
    const either = book(rows.map((r, i) => (i === 0 ? [...r, '', '=FILTER(A1:A4,(B1:B4>=5)+(C1:C4="x"))'] : r)));
    expect(show(either, 4, 1, 0, 4)).toEqual([['a'], ['b'], ['c'], ['']]);
  });

  it('TRANSPOSE turns rows into columns', () => {
    const wb = book([['1', '2', '3', '=TRANSPOSE(A1:C1)']]);
    expect(show(wb, 3, 1, 0, 3)).toEqual([['1'], ['2'], ['3']]);
  });

  it('works inside other functions without spilling', () => {
    const wb = book([['a'], ['b'], ['a'], ['=COUNTA(UNIQUE(A1:A3))'], ['=SUM(SEQUENCE(4))'], ['=INDEX(SORT(A1:A3),3)']]);
    expect(wb.valueAt(0, 3, 0)).toBe(2);
    expect(wb.valueAt(0, 4, 0)).toBe(10);
    expect(wb.valueAt(0, 5, 0)).toBe('b');
  });

  it('is blocked by something in the way, and spills again once it is clear', () => {
    const wb = book([['=SEQUENCE(3)'], [''], ['blocker']]);
    expect(wb.valueAt(0, 0, 0)).toBe(ERRORS.spill);
    expect(wb.displayAt(0, 1, 0)).toBe('');
    wb.putCell(0, 2, 0, undefined);
    expect(wb.valueAt(0, 0, 0)).toBe(1);
    expect(show(wb, 3, 1)).toEqual([['1'], ['2'], ['3']]);
  });

  it('follows the data: a changed source changes the block, and cells that read the block see it', () => {
    const wb = book([['3', '', '=SORT(A1:A3)', '=SUM(C1:C3)'], ['1'], ['2']]);
    expect(show(wb, 3, 1, 0, 2)).toEqual([['1'], ['2'], ['3']]);
    wb.putCell(0, 1, 0, { raw: '10', style: 0 });
    expect(show(wb, 3, 1, 0, 2)).toEqual([['2'], ['3'], ['10']]);
    // A formula next to the origin reads the spilled cells below it.
    expect(wb.valueAt(0, 0, 3)).toBe(15);
  });

  it('a formula that reads the cell it sits in is circular, not a spill', () => {
    const wb = book([['=SORT(A1:A3)'], ['2'], ['1']]);
    expect(wb.valueAt(0, 0, 0)).toBe(ERRORS.circular);
  });

  it('counts a spilled block in the used range, and in an undo step of its own', () => {
    const c = new CalcController(new Workbook());
    c.select(0, 0);
    c.startEdit('=SEQUENCE(5)');
    c.commitEdit(null);
    expect(c.wb.usedRange(0)).toEqual({ r1: 0, c1: 0, r2: 4, c2: 0 });
    c.undo();
    expect(c.wb.usedRange(0)).toBeNull();
  });

  it('a bare range spills as in Excel 365', () => {
    const wb = book([['1', '2', '', '=A1:B1']]);
    expect(show(wb, 1, 3, 0, 3)).toEqual([['1', '2', '']]);
  });
});

describe('saving a spill', () => {
  it('writes the block as plain values and reads it back as cells', async () => {
    const wb = book([['=SEQUENCE(3)']]);
    const back = new Workbook();
    back.loadData(await importXlsx(await (await exportXlsx(wb)).arrayBuffer()));
    expect(back.sheets[0].cells.get(0)?.raw).toBe('1');
    expect(show(back, 3, 1)).toEqual([['1'], ['2'], ['3']]);
  });
});

describe('arithmetic on blocks', () => {
  const data = [['1', '10'], ['2', '20'], ['3', '30']];

  it('works element by element and spills when it is the whole formula', () => {
    const wb = book(data.map((r, i) => (i === 0 ? [...r, '=A1:A3*2'] : r)));
    expect(show(wb, 3, 1, 0, 2)).toEqual([['2'], ['4'], ['6']]);
    const two = book(data.map((r, i) => (i === 0 ? [...r, '=A1:A3+B1:B3'] : r)));
    expect(show(two, 3, 1, 0, 2)).toEqual([['11'], ['22'], ['33']]);
    const negated = book(data.map((r, i) => (i === 0 ? [...r, '=-A1:A3'] : r)));
    expect(show(negated, 3, 1, 0, 2)).toEqual([['-1'], ['-2'], ['-3']]);
    const percent = book(data.map((r, i) => (i === 0 ? [...r, '=B1:B3%'] : r)));
    expect(show(percent, 3, 1, 0, 2)).toEqual([['0.1'], ['0.2'], ['0.3']]);
  });

  it('stretches a row against a column into a table', () => {
    const wb = book([['1', '2', '3', '=A1:C1*A2:A3'], ['10'], ['100']]);
    expect(show(wb, 2, 3, 0, 3)).toEqual([['10', '20', '30'], ['100', '200', '300']]);
  });

  it('feeds the functions that add up or count a condition', () => {
    const wb = book([...data.slice(0, 1).map((r) => [...r, '=SUM(A1:A3*B1:B3)', '=SUMPRODUCT((A1:A3>1)*B1:B3)', '=SUM((A1:A3>1)*1)']), data[1], data[2]]);
    expect(wb.valueAt(0, 0, 2)).toBe(140);
    expect(wb.valueAt(0, 0, 3)).toBe(50);
    expect(wb.valueAt(0, 0, 4)).toBe(2);
  });

  it('keeps an error in the cell it came from', () => {
    const wb = book([['1', '=A1:A3/B1:B3'], ['2', '0'], ['3', '3']]);
    // B1 holds the formula itself, so give the divisor its own column.
    const fixed = book([['1', '1', '=A1:A3/B1:B3'], ['2', '0'], ['3', '3']]);
    expect(show(fixed, 3, 1, 0, 2)).toEqual([['1'], ['#DIV/0!'], ['1']]);
    expect(wb.valueAt(0, 0, 1)).toBeDefined();
  });

  it('refuses blocks that do not fit each other', () => {
    const wb = book([['1', '2', '3'], ['4', '5', '6'], ['=A1:A2+A1:A3']]);
    expect(wb.valueAt(0, 2, 0)).toBe(ERRORS.na);
  });

  it('a formula that only totals a range is not a spill candidate, so many of them stay cheap', () => {
    expect(mayReturnBlock('=SUM(A1:A9)')).toBe(false);
    expect(mayReturnBlock('=SUM(A1:A9)*2')).toBe(false);
    expect(mayReturnBlock('=A1:A9*2')).toBe(true);
    expect(mayReturnBlock('=IF(TRUE,A1:A3,0)')).toBe(true);
    expect(mayReturnBlock('=SORT(A1:A9)')).toBe(true);
    expect(mayReturnBlock('=1+')).toBe(false);
    expect(mayReturnBlock('text')).toBe(false);
  });
});

describe('the formula behind a spilled cell', () => {
  it('is what the formula bar shows, greyed, when the active cell has none of its own', () => {
    const c = new CalcController(new Workbook());
    c.select(0, 0);
    c.startEdit('=SEQUENCE(3)');
    c.commitEdit(null);
    c.select(2, 0);
    expect(c.spillFormulaOfActive()).toBe('=SEQUENCE(3)');
    c.select(0, 0);
    expect(c.spillFormulaOfActive()).toBeNull();
    c.select(5, 5);
    expect(c.spillFormulaOfActive()).toBeNull();
  });
});

describe('functions on blocks', () => {
  const data = [['1', 'ab'], ['2', 'cd'], ['3', 'ef']];
  const withFormula = (formula: string) => book(data.map((r, i) => (i === 0 ? [...r, formula] : r)));

  it('IF with a block of tests picks element by element', () => {
    expect(show(withFormula('=IF(A1:A3>1,"lớn","nhỏ")'), 3, 1, 0, 2)).toEqual([['nhỏ'], ['lớn'], ['lớn']]);
    expect(show(withFormula('=IF(A1:A3>1,A1:A3*10,0)'), 3, 1, 0, 2)).toEqual([['0'], ['20'], ['30']]);
  });

  it('IFERROR replaces only the cells that failed', () => {
    const wb = book([['1', '1', '=IFERROR(A1:A3/B1:B3,0)'], ['4', '0'], ['9', '3']]);
    expect(show(wb, 3, 1, 0, 2)).toEqual([['1'], ['0'], ['3']]);
  });

  it('applies one-value functions to every element', () => {
    expect(show(withFormula('=UPPER(B1:B3)'), 3, 1, 0, 2)).toEqual([['AB'], ['CD'], ['EF']]);
    expect(show(withFormula('=LEN(B1:B3)+A1:A3'), 3, 1, 0, 2)).toEqual([['3'], ['4'], ['5']]);
    expect(show(withFormula('=ROUND(A1:A3/3,1)'), 3, 1, 0, 2)).toEqual([['0.3'], ['0.7'], ['1']]);
    expect(show(withFormula('=LEFT(B1:B3,1)'), 3, 1, 0, 2)).toEqual([['a'], ['c'], ['e']]);
  });

  it('counts how many cells pass a test, the classic way', () => {
    const wb = book([...data.map((r) => r), ['=SUMPRODUCT(--(A1:A3>1))'], ['=SUM(IF(A1:A3>1,1,0))'], ['=COUNTA(FILTER(B1:B3,A1:A3<>2))']]);
    expect(wb.valueAt(0, 3, 0)).toBe(2);
    expect(wb.valueAt(0, 4, 0)).toBe(2);
    expect(wb.valueAt(0, 5, 0)).toBe(2);
  });
});
