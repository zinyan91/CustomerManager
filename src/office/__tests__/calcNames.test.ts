import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { absoluteAddress, isValidName } from '../calc/engine/definedNames';
import { Workbook } from '../calc/model/workbook';
import { exportXlsx, importXlsx } from '../calc/services/xlsxService';

function book(rows: string[][]) {
  const c = new CalcController();
  rows.forEach((row, r) => row.forEach((raw, col) => raw !== '' && c.wb.putCell(0, r, col, { raw, style: 0 })));
  return c;
}

describe('which names are allowed', () => {
  it('follows Excel', () => {
    for (const ok of ['Rate', '_tax', 'Tong.so', 'a1b', 'Q1_total']) expect(isValidName(ok), ok).toBe(true);
    for (const bad of ['', '1abc', 'A1', 'ab12', 'R1C1', 'R', 'C', 'TRUE', 'a b', 'x-y']) expect(isValidName(bad), bad).toBe(false);
  });

  it('writes an address with its sheet', () => {
    expect(absoluteAddress('Sheet1', { r1: 0, c1: 0, r2: 4, c2: 1 })).toBe('Sheet1!$A$1:$B$5');
    expect(absoluteAddress('Data sheet', { r1: 2, c1: 2, r2: 2, c2: 2 })).toBe("'Data sheet'!$C$3");
  });
});

describe('using a name in a formula', () => {
  it('stands for the cell or block it was given to', () => {
    const c = book([['2', '3', '=SUM(Block)'], ['4', '5', '=Rate*10'], ['0.1']]);
    c.select(0, 0);
    c.extendTo(1, 1);
    expect(c.defineName('Block')).toBe(true);
    c.select(2, 0);
    expect(c.defineName('Rate')).toBe(true);
    expect(c.wb.valueAt(0, 0, 2)).toBe(14);
    expect(c.wb.valueAt(0, 1, 2)).toBe(1);
  });

  it('is #NAME? for a name nobody defined, until it is', () => {
    const c = book([['=Nothing+1']]);
    expect(c.wb.displayAt(0, 0, 0)).toBe('#NAME?');
    c.wb.setName('Nothing', '41');
    expect(c.wb.valueAt(0, 0, 0)).toBe(42);
  });

  it('can refer to a calculation or to another name, and stops at a loop', () => {
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: '=Double', style: 0 });
    wb.putCell(0, 1, 0, { raw: '=A', style: 0 });
    wb.setName('Base', '21');
    wb.setName('Double', 'Base*2');
    expect(wb.valueAt(0, 0, 0)).toBe(42);
    wb.setName('A', 'B');
    wb.setName('B', 'A');
    expect(wb.displayAt(0, 1, 0)).toBe('#NAME?');
  });

  it('works as the range of a lookup and spills nothing when it is one value', () => {
    const c = book([['a', '1'], ['b', '2'], ['', '', '=VLOOKUP("b",Table,2,FALSE)']]);
    c.select(0, 0);
    c.extendTo(1, 1);
    c.defineName('Table');
    expect(c.wb.valueAt(0, 2, 2)).toBe(2);
  });

  it('is refused when it is not a valid name or refers to nothing sensible', () => {
    const c = book([['1']]);
    expect(c.defineName('A1')).toBe(false);
    expect(c.defineName('Fine', '((')).toBe(false);
    expect(c.wb.names.size).toBe(0);
  });
});

describe('names follow the sheet', () => {
  it('moves with inserted rows and with a renamed sheet', () => {
    const c = book([['1'], ['2'], ['3']]);
    c.select(1, 0);
    c.defineName('Second');
    c.select(0, 0);
    c.insertRows();
    expect(c.wb.names.get('SECOND')?.refersTo).toBe('Sheet1!$A$3');
    c.renameSheet(0, 'Numbers');
    expect(c.wb.names.get('SECOND')?.refersTo).toBe('Numbers!$A$3');
    expect(c.goToName('Second')).toBe(true);
    expect([c.activeCell.row, c.activeCell.col]).toEqual([2, 0]);
  });

  it('can be undone and redone', () => {
    const c = book([['1']]);
    c.select(0, 0);
    c.defineName('One');
    c.undo();
    expect(c.wb.names.size).toBe(0);
    c.redo();
    expect(c.wb.names.has('ONE')).toBe(true);
    c.deleteName('One');
    expect(c.wb.names.size).toBe(0);
  });

  it('is given to the selection when typed into the name box, and goes there when typed again', () => {
    const c = book([['1', '2'], ['3', '4']]);
    c.select(0, 0);
    c.extendTo(1, 1);
    expect(c.goToName('Grid')).toBe(false);
    c.defineName('Grid');
    c.select(5, 5);
    expect(c.goToName('grid')).toBe(true);
    expect(c.selection).toEqual({ r1: 0, c1: 0, r2: 1, c2: 1 });
  });
});

describe('saved with the file', () => {
  it('writes the names that refer to cells to xlsx and reads them back', async () => {
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: '5', style: 0 });
    wb.putCell(0, 0, 1, { raw: '=Five*2', style: 0 });
    wb.setName('Five', 'Sheet1!$A$1');
    wb.setName('Calc', 'Five*3');
    const loaded = new Workbook();
    loaded.loadData(await importXlsx(await (await exportXlsx(wb)).arrayBuffer()));
    expect(loaded.names.get('FIVE')?.refersTo).toBe('Sheet1!$A$1');
    expect(loaded.valueAt(0, 0, 1)).toBe(10);
    expect(loaded.names.has('CALC')).toBe(false);
  });

  it('keeps all of them in drafts', () => {
    const wb = new Workbook();
    wb.setName('Calc', 'Five*3');
    const copy = new Workbook();
    copy.loadData(wb.toData());
    expect(copy.names.get('CALC')?.refersTo).toBe('Five*3');
  });
});
