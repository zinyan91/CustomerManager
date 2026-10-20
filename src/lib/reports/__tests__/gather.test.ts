import { describe, it, expect, vi } from 'vitest';
import { gatherSheets } from '../gather';

const CTX = { todayIso: '2026-09-23' };

describe('gatherSheets — mot bao cao loi khong lam hong ca tep', () => {
  it('bao cao loi bi bo qua, cac sheet con lai van ra', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const defs = [
      { id: 'a', sheetName: 'A', load: async () => ({ rows: [] }), buildSheet: () => ({ name: 'A', rows: [[{ value: 'x' }]] }) },
      { id: 'b', sheetName: 'B', load: async () => { throw new Error('mat ket noi'); }, buildSheet: () => ({ name: 'B', rows: [] }) },
    ] as any[];

    const { sheets, failed, errors } = await gatherSheets(defs, 'all', CTX);

    expect(sheets).toHaveLength(1);
    expect(sheets[0].name).toBe('A');
    expect(failed).toEqual(['b']);
    expect(errors).toEqual(['mat ket noi']);
    expect(spy).toHaveBeenCalled();
  });

  it('moi bao cao deu loi thi khong tra sheet nao', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const defs = [
      { id: 'a', sheetName: 'A', load: async () => { throw new Error('loi'); }, buildSheet: () => ({ name: 'A', rows: [] }) },
    ] as any[];

    const { sheets, failed } = await gatherSheets(defs, 'all', CTX);

    expect(sheets).toHaveLength(0);
    expect(failed).toEqual(['a']);
  });
});
