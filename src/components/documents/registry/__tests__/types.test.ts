import { describe, it, expect } from 'vitest';
import { emptyParty, emptyCommon } from '../types';

describe('registry factories', () => {
  it('emptyParty has all string fields blank', () => {
    expect(emptyParty()).toEqual({
      name: '', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '',
    });
  });

  it('emptyCommon has two parties, empty collections and blank scalars', () => {
    const c = emptyCommon();
    expect(c.partyA).toEqual(emptyParty());
    expect(c.partyB).toEqual(emptyParty());
    expect(c.stages).toEqual([]);
    expect(c.items).toEqual([]);
    expect(c.bank).toEqual({ owner: '', accNo: '', name: '', branch: '' });
    expect(c.totalAmount).toBe('');
    expect(c.contractDate).toBe('');
  });

  it('emptyCommon returns a fresh object each call (no shared refs)', () => {
    const a = emptyCommon();
    const b = emptyCommon();
    a.items.push({ id: 'x', name: 'n', unit: 'u', quantity: 1, price: 1 });
    expect(b.items).toEqual([]);
  });
});
