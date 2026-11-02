import { describe, expect, it } from 'vitest';
import { insertReference, pointSlot, referenceText, referencesIn } from '../calc/engine/pointMode';

describe('pointing at cells while a formula is typed', () => {
  it('has a slot where a value is expected, and nowhere else', () => {
    expect(pointSlot('=', 1, null)).toEqual({ from: 1, to: 1 });
    expect(pointSlot('=SUM(', 5, null)).toEqual({ from: 5, to: 5 });
    expect(pointSlot('=A1+', 4, null)).toEqual({ from: 4, to: 4 });
    expect(pointSlot('=IF(A1>1, ', 10, null)).toEqual({ from: 10, to: 10 });
    expect(pointSlot('=A1', 3, null)).toBeNull();
    expect(pointSlot('=SUM(A1)', 8, null)).toBeNull();
    expect(pointSlot('=SUM("a,', 8, null)).toBeNull();
    expect(pointSlot('text', 4, null)).toBeNull();
    expect(pointSlot('=A1+B', 4, null)).toBeNull();
    expect(pointSlot('=+SUM', 2, null)).toBeNull();
  });

  it('keeps replacing the same span while the pointing goes on', () => {
    expect(pointSlot('=A1', 3, { from: 1, to: 3 })).toEqual({ from: 1, to: 3 });
  });

  it('writes a cell, a block and another sheet\'s block as a formula would', () => {
    expect(referenceText({ r1: 0, c1: 0, r2: 0, c2: 0 }, null)).toBe('A1');
    expect(referenceText({ r1: 1, c1: 2, r2: 3, c2: 3 }, null)).toBe('C2:D4');
    expect(referenceText({ r1: 0, c1: 0, r2: 1, c2: 0 }, 'Data')).toBe('Data!A1:A2');
    expect(referenceText({ r1: 0, c1: 0, r2: 0, c2: 0 }, "Sheet 2")).toBe("'Sheet 2'!A1");
  });

  it('puts a reference in the slot and moves the slot to cover it', () => {
    expect(insertReference('=SUM()', { from: 5, to: 5 }, 'B2')).toEqual({ text: '=SUM(B2)', slot: { from: 5, to: 7 } });
    expect(insertReference('=SUM(B2)', { from: 5, to: 7 }, 'B2:B4')).toEqual({ text: '=SUM(B2:B4)', slot: { from: 5, to: 10 } });
  });
});

describe('the references of a formula', () => {
  it('finds each one with its place and block, numbering them in order', () => {
    const refs = referencesIn('=SUM(A1:B2)+C3*$D$4');
    expect(refs.map((r) => [r.from, r.to, r.color])).toEqual([[5, 10, 0], [12, 14, 1], [15, 19, 2]]);
    expect(refs[0].range).toEqual({ r1: 0, c1: 0, r2: 1, c2: 1 });
    expect(refs[2].range).toEqual({ r1: 3, c1: 3, r2: 3, c2: 3 });
  });

  it('leaves out text, function names that look like cells, and names with a dot', () => {
    expect(referencesIn('=LOG10(A1)&"B2"').map((r) => r.range.r1)).toEqual([0]);
    expect(referencesIn('=Sales.Q1+A1').length).toBe(1);
    expect(referencesIn('A1')).toEqual([]);
  });

  it('knows the sheet of a reference', () => {
    const refs = referencesIn("=Data!A1+'My Sheet'!B2");
    expect(refs.map((r) => r.sheet)).toEqual(['Data', 'My Sheet']);
  });
});
