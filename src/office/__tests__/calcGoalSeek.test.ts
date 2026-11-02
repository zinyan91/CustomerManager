import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { goalSeek } from '../calc/engine/goalSeek';

describe('goal seek', () => {
  it('finds the input of a linear and a curved function', () => {
    expect(goalSeek((x) => 3 * x + 2, 17, 0)?.input).toBeCloseTo(5, 6);
    expect(goalSeek((x) => x * x, 49, 1)?.input).toBeCloseTo(7, 6);
    expect(goalSeek((x) => Math.exp(x), 10, 0)?.input).toBeCloseTo(Math.log(10), 6);
  });

  it('says so when no input gives the target', () => {
    expect(goalSeek((x) => x * x + 1, 0, 3)).toBeNull();
    expect(goalSeek(() => null, 1, 0)).toBeNull();
  });

  it('sets the changing cell of a sheet in one undoable step, and leaves it alone when it fails', () => {
    const c = new CalcController();
    c.wb.putCell(0, 0, 0, { raw: '100', style: 0 });
    c.wb.putCell(0, 1, 0, { raw: '=A1*1.08+50', style: 0 });
    expect(c.goalSeek('A2', 500, 'A1')).toBeCloseTo(416.666667, 4);
    expect(c.wb.valueAt(0, 1, 0)).toBeCloseTo(500, 6);
    c.undo();
    expect(c.wb.getCell(0, 0, 0)?.raw).toBe('100');
    c.wb.putCell(0, 1, 0, { raw: '=A1*A1+1', style: 0 });
    expect(c.goalSeek('A2', 0, 'A1')).toBeNull();
    expect(c.wb.getCell(0, 0, 0)?.raw).toBe('100');
  });
});
