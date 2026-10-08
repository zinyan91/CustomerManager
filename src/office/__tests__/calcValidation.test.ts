import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { Workbook } from '../calc/model/workbook';
import { acceptsEntry, entryNumber, mergeValidations, parseListItems, validationAt, type ValidationRule } from '../calc/engine/validation';

describe('validation rules', () => {
  it('reads a typed list at commas and semicolons, without blanks or repeats', () => {
    expect(parseListItems('Hà Nội, Đà Nẵng;hà nội ,, TP.HCM\n')).toEqual(['Hà Nội', 'Đà Nẵng', 'TP.HCM']);
    expect(parseListItems('  ')).toEqual([]);
  });

  it('reads numbers with a comma or a point', () => {
    expect(entryNumber('3,5')).toBe(3.5);
    expect(entryNumber(' -2.25 ')).toBe(-2.25);
    expect(entryNumber('1 000')).toBe(1000);
    expect(entryNumber('abc')).toBeNull();
    expect(entryNumber('1.2.3')).toBeNull();
  });

  it('accepts a list entry whatever its case, and refuses what is not on the list', () => {
    const rule: ValidationRule = { kind: 'items', items: ['Đạt', 'Không đạt'] };
    expect(acceptsEntry(rule, 'đạt')).toBe(true);
    expect(acceptsEntry(rule, 'Có')).toBe(false);
    expect(acceptsEntry({ kind: 'range', ref: 'A1:A3' }, 'b', ['A', 'B'])).toBe(true);
    expect(acceptsEntry({ kind: 'range', ref: 'A1:A3' }, 'c', ['A', 'B'])).toBe(false);
  });

  it('lets a blank entry and a formula through', () => {
    const rule: ValidationRule = { kind: 'items', items: ['x'] };
    expect(acceptsEntry(rule, '')).toBe(true);
    expect(acceptsEntry(rule, '=A1')).toBe(true);
  });

  it('checks whole numbers and decimals against their limits', () => {
    const between = { kind: 'number', integer: true, op: 'between', a: 1, b: 10 } as const;
    expect(acceptsEntry(between, '5')).toBe(true);
    expect(acceptsEntry(between, '10')).toBe(true);
    expect(acceptsEntry(between, '11')).toBe(false);
    expect(acceptsEntry(between, '2,5')).toBe(false);
    expect(acceptsEntry(between, 'năm')).toBe(false);
    const decimal = { kind: 'number', integer: false, op: 'gte', a: 0.5 } as const;
    expect(acceptsEntry(decimal, '0,5')).toBe(true);
    expect(acceptsEntry(decimal, '0.4')).toBe(false);
    for (const [op, ok, bad] of [['eq', '3', '4'], ['neq', '4', '3'], ['gt', '4', '3'], ['lt', '2', '3'], ['lte', '3', '4']] as const) {
      const rule = { kind: 'number', integer: false, op, a: 3 } as const;
      expect([op, acceptsEntry(rule, ok), acceptsEntry(rule, bad)]).toEqual([op, true, false]);
    }
  });

  it('finds the last rule that holds a cell', () => {
    const list = [
      { range: { r1: 0, c1: 0, r2: 9, c2: 0 }, rule: { kind: 'items', items: ['a'] } },
      { range: { r1: 2, c1: 0, r2: 3, c2: 0 }, rule: { kind: 'items', items: ['b'] } },
    ] as const;
    expect(validationAt(list as never, 3, 0)?.rule).toEqual({ kind: 'items', items: ['b'] });
    expect(validationAt(list as never, 5, 0)?.rule).toEqual({ kind: 'items', items: ['a'] });
    expect(validationAt(list as never, 5, 1)).toBeUndefined();
  });

  it('joins single cells of one rule into the fewest rectangles', () => {
    const rule: ValidationRule = { kind: 'items', items: ['a'] };
    const cell = (r: number, c: number) => ({ range: { r1: r, c1: c, r2: r, c2: c }, rule });
    const merged = mergeValidations([cell(0, 0), cell(1, 0), cell(2, 0), cell(0, 1), cell(1, 1), cell(2, 1), cell(5, 0)]);
    expect(merged.map((v) => v.range)).toEqual([
      { r1: 0, c1: 0, r2: 2, c2: 1 },
      { r1: 5, c1: 0, r2: 5, c2: 0 },
    ]);
    const other = { range: { r1: 0, c1: 2, r2: 2, c2: 2 }, rule: { kind: 'items', items: ['b'] } } as const;
    expect(mergeValidations([...merged, other as never])).toHaveLength(3);
  });
});

function sheet() {
  const c = new CalcController(new Workbook());
  return {
    c,
    type(ref: string, text: string) {
      const col = ref.charCodeAt(0) - 65;
      const row = Number(ref.slice(1)) - 1;
      c.select(row, col);
      c.startEdit(text);
      c.commitEdit(null);
    },
  };
}

describe('validation in the controller', () => {
  it('refuses an entry the rule does not allow, says why, and keeps the old content', () => {
    const { c, type } = sheet();
    const told: Array<string | undefined> = [];
    c.onReject = (message) => told.push(message);
    c.setValidation({ r1: 0, c1: 0, r2: 4, c2: 0 }, { kind: 'items', items: ['Đạt', 'Không đạt'] }, 'Chọn Đạt hoặc Không đạt');
    type('A1', 'Đạt');
    type('A2', 'Có');
    expect(c.wb.displayAt(0, 0, 0)).toBe('Đạt');
    expect(c.wb.displayAt(0, 1, 0)).toBe('');
    expect(told).toEqual(['Chọn Đạt hoặc Không đạt']);
    type('A1', 'Không đạt');
    expect(c.wb.displayAt(0, 0, 0)).toBe('Không đạt');
    // Outside the block anything goes.
    type('B1', 'tùy ý');
    expect(c.wb.displayAt(0, 0, 1)).toBe('tùy ý');
  });

  it('picks an item from the list without asking the rule', () => {
    const { c } = sheet();
    c.setValidation({ r1: 0, c1: 0, r2: 0, c2: 0 }, { kind: 'items', items: ['3', 'x'] });
    c.pickListItem(0, 0, '3');
    expect(c.wb.getCell(0, 0, 0)?.raw).toBe('3');
  });

  it('reads a list from cells, on this sheet or another', () => {
    const { c, type } = sheet();
    type('C1', 'Hà Nội');
    type('C2', 'Đà Nẵng');
    type('C3', 'Hà Nội');
    c.setValidation({ r1: 0, c1: 0, r2: 0, c2: 0 }, { kind: 'range', ref: '$C$1:$C$5' });
    expect(c.validationItems(c.validationOf(0, 0)!)).toEqual(['Hà Nội', 'Đà Nẵng']);
    type('A1', 'Huế');
    expect(c.wb.displayAt(0, 0, 0)).toBe('');
    type('A1', 'đà nẵng');
    expect(c.wb.displayAt(0, 0, 0)).toBe('đà nẵng');
    c.addSheet();
    c.active = 1;
    c.setValidation({ r1: 0, c1: 0, r2: 0, c2: 0 }, { kind: 'range', ref: "'Sheet1'!C1:C2" });
    expect(c.validationItems(c.validationOf(0, 0)!)).toEqual(['Hà Nội', 'Đà Nẵng']);
  });

  it('removes a rule, undoes, survives a draft and follows inserted rows', () => {
    const { c } = sheet();
    c.setValidation({ r1: 2, c1: 0, r2: 3, c2: 0 }, { kind: 'number', integer: true, op: 'gt', a: 0 });
    const copy = new Workbook();
    copy.loadData(c.wb.toData());
    expect(copy.sheets[0].validations).toHaveLength(1);
    c.select(0, 0);
    c.insertRows();
    expect(c.validations[0].range).toMatchObject({ r1: 3, r2: 4 });
    c.setValidation({ r1: 0, c1: 0, r2: 20, c2: 5 }, null);
    expect(c.validations).toHaveLength(0);
    c.undo();
    expect(c.validations).toHaveLength(1);
  });
});
