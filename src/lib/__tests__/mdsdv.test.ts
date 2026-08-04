import { describe, it, expect } from 'vitest';
import {
  normalizeVi,
  searchMdsdv,
  findMdsdvByCode,
  getLevel1Options,
  countMdsdvEntries,
  MDSDV_VERSION,
} from '../mdsdv';

describe('normalizeVi', () => {
  it('strips diacritics so an unaccented query still matches', () => {
    expect(normalizeVi('Trồng lúa')).toBe('trong lua');
    expect(normalizeVi('NÔNG NGHIỆP, LÂM NGHIỆP VÀ THUỶ SẢN')).toBe('nong nghiep, lam nghiep va thuy san');
  });

  it('maps the Vietnamese d-stroke', () => {
    expect(normalizeVi('Đầu tư')).toBe('dau tu');
  });

  it('is safe on empty input', () => {
    expect(normalizeVi('')).toBe('');
    expect(normalizeVi(null)).toBe('');
  });
});

describe('dataset shape', () => {
  it('carries the published FBE list version', () => {
    expect(MDSDV_VERSION).toBe('19032025');
  });

  it('expands to the full 9.133-row lookup table', () => {
    expect(countMdsdvEntries()).toBe(9133);
  });

  it('exposes all 21 level-1 industry codes', () => {
    const options = getLevel1Options();
    expect(options).toHaveLength(21);
    expect(options[0]).toEqual({ code: 'CEA', name: 'NÔNG NGHIỆP, LÂM NGHIỆP VÀ THUỶ SẢN' });
  });
});

describe('findMdsdvByCode', () => {
  it('rebuilds a level-6 code exactly as the FBE file publishes it', () => {
    const entry = findMdsdvByCode('CEA0111001');
    expect(entry).not.toBeNull();
    expect(entry!.fbeName).toBe('A0111001-Bo sung von luu dong');
    expect(entry!.purposeName).toBe('Bo sung von luu dong');
    expect(entry!.detailCode).toBe('01');
    expect(entry!.level5Code).toBe('CEA01110');
    expect(entry!.level5Name).toBe('Trồng lúa');
    expect(entry!.level1Code).toBe('CEA');
    expect(entry!.allowsOverdraft).toBe(true);
  });

  it('reads a code whose detail suffix is not in the common set', () => {
    const entry = findMdsdvByCode('CEA0111099');
    expect(entry!.fbeName).toBe('A0111099-Khac');
  });

  it('accepts lowercase and surrounding whitespace', () => {
    expect(findMdsdvByCode('  cea0111001  ')!.code).toBe('CEA0111001');
  });

  it('returns null for an unknown or blank code', () => {
    expect(findMdsdvByCode('CEA0111777')).toBeNull();
    expect(findMdsdvByCode('KHONG-TON-TAI')).toBeNull();
    expect(findMdsdvByCode('')).toBeNull();
    expect(findMdsdvByCode(null)).toBeNull();
  });
});

describe('searchMdsdv', () => {
  it('finds an entry by its exact level-6 code', () => {
    const res = searchMdsdv({ query: 'CEA0111001' });
    expect(res.total).toBe(1);
    expect(res.items[0].fbeName).toBe('A0111001-Bo sung von luu dong');
  });

  it('finds entries by an unaccented industry name', () => {
    const res = searchMdsdv({ query: 'trong lua', limit: 10_000 });
    expect(res.items.some(i => i.code === 'CEA0111001')).toBe(true);
    expect(res.items.every(i => {
      const haystack = normalizeVi([
        i.code, i.level1Name, i.level2Name, i.level3Name,
        i.level4Name, i.level5Name, i.purposeName,
      ].filter(Boolean).join(' '));
      return haystack.includes('trong') && haystack.includes('lua');
    })).toBe(true);
  });

  it('finds entries by an accented industry name', () => {
    expect(searchMdsdv({ query: 'Trồng lúa' }).total).toBe(searchMdsdv({ query: 'trong lua' }).total);
  });

  it('requires every term to match, in any order', () => {
    const a = searchMdsdv({ query: 'trong lua von luu dong' });
    const b = searchMdsdv({ query: 'von luu dong trong lua' });
    expect(a.total).toBe(b.total);
    expect(a.total).toBe(1);
  });

  it('filters by level-1 industry', () => {
    const res = searchMdsdv({ level1Code: 'CEU', limit: 1000 });
    expect(res.total).toBeGreaterThan(0);
    expect(res.items.every(i => i.level1Code === 'CEU')).toBe(true);
  });

  it('filters to codes available for overdraft accounts', () => {
    const res = searchMdsdv({ overdraftOnly: true, limit: 10_000 });
    expect(res.total).toBe(760);
    expect(res.items.every(i => i.allowsOverdraft)).toBe(true);
  });

  it('returns the whole table when no filter is given', () => {
    expect(searchMdsdv({ limit: 10_000 }).total).toBe(9133);
  });

  it('caps the returned rows but still reports the true total', () => {
    const res = searchMdsdv({ limit: 5 });
    expect(res.items).toHaveLength(5);
    expect(res.total).toBe(9133);
    expect(res.truncated).toBe(true);
  });

  it('reports no truncation when everything fits', () => {
    const res = searchMdsdv({ query: 'CEA0111001', limit: 200 });
    expect(res.truncated).toBe(false);
  });

  it('returns nothing for a query that matches nothing', () => {
    const res = searchMdsdv({ query: 'khong-he-ton-tai-xyz' });
    expect(res.total).toBe(0);
    expect(res.items).toEqual([]);
  });
});
