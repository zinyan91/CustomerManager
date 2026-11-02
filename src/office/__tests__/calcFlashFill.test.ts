import { describe, expect, it } from 'vitest';
import { applyFlashFill, learnFlashFill } from '../calc/engine/flashFill';

const learn = (pairs: Array<[string[], string]>) => learnFlashFill(pairs.map(([inputs, output]) => ({ inputs, output })));

import { CalcController } from '../calc/controller';

describe('flash fill', () => {
  it('takes a word out of a value', () => {
    const program = learn([[['Nguyen Van An'], 'An']])!;
    expect(applyFlashFill(program, ['Tran Thi Binh'])).toBe('Binh');
  });

  it('joins parts of two columns with fixed text', () => {
    const program = learn([[['An', 'Nguyen'], 'Nguyen, An']])!;
    expect(applyFlashFill(program, ['Binh', 'Tran'])).toBe('Tran, Binh');
  });

  it('makes initials and changes case', () => {
    const initials = learn([[['Nguyen Van An'], 'NVA']])!;
    expect(applyFlashFill(initials, ['Tran Thi Binh'])).toBe('TTB');
    const upper = learn([[['abc 12'], 'ABC-12']])!;
    expect(applyFlashFill(upper, ['xyz 99'])).toBe('XYZ-99');
  });

  it('Ctrl+E fills the column down from the examples typed in it', () => {
    const c = new CalcController();
    ['Nguyen Van An', 'Tran Thi Binh', 'Le Hoang Cuong'].forEach((name, r) => c.wb.putCell(0, r, 0, { raw: name, style: 0 }));
    c.wb.putCell(0, 0, 1, { raw: 'An', style: 0 });
    c.select(1, 1);
    expect(c.flashFill()).toBe(true);
    expect([1, 2].map((r) => c.wb.getCell(0, r, 1)?.raw)).toEqual(['Binh', 'Cuong']);
    c.select(0, 5);
    expect(c.flashFill()).toBe(false);
  });

  it('takes the start or end of a value, and settles on what every example agrees with', () => {
    const program = learn([[['0912345678'], '091'], [['0987654321'], '098']])!;
    expect(applyFlashFill(program, ['0123456789'])).toBe('012');
    expect(learn([[['a b'], 'b'], [['c d'], 'c']])).toBeNull();
  });
});
