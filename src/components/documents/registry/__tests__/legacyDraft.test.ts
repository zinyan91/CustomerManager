import { describe, it, expect } from 'vitest';
import { baseDraft } from '../legacyDraft';

describe('baseDraft', () => {
  it('provides every required DocumentDraft scalar as empty string', () => {
    const d = baseDraft();
    expect(d.saleBuyerName).toBe('');
    expect(d.mbPartyAName).toBe('');
    expect(d.constPartyAName).toBe('');
    expect(d.payBankOwner).toBe('');
  });

  it('provides empty arrays and neutral enums', () => {
    const d = baseDraft();
    expect(d.saleItems).toEqual([]);
    expect(d.constItems).toEqual([]);
    expect(d.payStages).toEqual([]);
    expect(d.salePayMethod).toBe('cash');
    expect(d.payMethodType).toBe('transfer');
    expect(d.recipientTitle).toBe('Ông');
  });

  it('returns a fresh object (arrays not shared)', () => {
    const a = baseDraft();
    a.saleItems.push({ id: '1', name: 'x', unit: 'u', quantity: 1, price: 1 });
    expect(baseDraft().saleItems).toEqual([]);
  });
});
