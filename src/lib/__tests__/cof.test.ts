import { describe, it, expect } from 'vitest';
import {
  findActiveCofProgram, groupRateItems, lookupCofRate, calcMarginOverCof,
  COF_RATE_COLUMNS,
} from '../cof';
import type { CofProgram, CofRateItem, CofStandardRate } from '../cof';

const prog2294: CofProgram = {
  Id: 1, Name: 'COF 2294', DocumentNumber: '2294/2026/TB-BĐH',
  DocumentDate: '2026-07-17', EffectiveFrom: '2026-07-28', EffectiveTo: '2026-08-20',
  SourceVerified: true,
};
const prog1299: CofProgram = {
  ...prog2294, Id: 2, DocumentNumber: '1299/2026/TB-TGĐ',
  EffectiveFrom: '2026-05-11', EffectiveTo: '2026-07-27',
};
const prog2523: CofProgram = {
  ...prog2294, Id: 3, DocumentNumber: '2523/2026/TB-BĐH',
  DocumentDate: '2026-08-18', EffectiveFrom: '2026-08-21', EffectiveTo: null,
};

const rates: CofStandardRate[] = [
  { Id: 1, ProgramId: 1, Section: 'vnd_thong_thuong', TenorLabel: '6 tháng',
    FixedRate: 0.094, Reset3M: 0.092, Reset6M: 0.094, SortOrder: 10 },
  { Id: 2, ProgramId: 1, Section: 'vnd_thong_thuong', TenorLabel: '12 tháng',
    FixedRate: 0.1055, Reset3M: 0.1005, Reset6M: 0.1025, Reset9M: 0.1035, Reset12M: 0.1055, SortOrder: 16 },
];

describe('findActiveCofProgram', () => {
  it('picks the notice in force on the date', () => {
    expect(findActiveCofProgram([prog1299, prog2294, prog2523], '2026-08-04')?.DocumentNumber)
      .toBe('2294/2026/TB-BĐH');
  });

  it('falls back to the earlier notice before the new one starts', () => {
    expect(findActiveCofProgram([prog1299, prog2294, prog2523], '2026-07-20')?.DocumentNumber)
      .toBe('1299/2026/TB-TGĐ');
  });

  it('picks the newest 2523 notice from 2026-08-21', () => {
    expect(findActiveCofProgram([prog1299, prog2294, prog2523], '2026-08-21')?.DocumentNumber)
      .toBe('2523/2026/TB-BĐH');
    expect(findActiveCofProgram([prog1299, prog2294, prog2523], '2026-09-01')?.DocumentNumber)
      .toBe('2523/2026/TB-BĐH');
  });

  it('returns null before any notice applies', () => {
    expect(findActiveCofProgram([prog1299, prog2294, prog2523], '2026-01-01')).toBeNull();
    expect(findActiveCofProgram([], '2026-08-04')).toBeNull();
  });
});

describe('lookupCofRate', () => {
  it('reads a published cell', () => {
    expect(lookupCofRate(rates, '6 tháng', 'FixedRate')).toBe(0.094);
    expect(lookupCofRate(rates, '12 tháng', 'Reset12M')).toBe(0.1055);
  });

  it('returns null for a blank cell rather than zero', () => {
    expect(lookupCofRate(rates, '6 tháng', 'Reset12M')).toBeNull();
    expect(lookupCofRate(rates, '6 tháng', 'Reset36M')).toBeNull();
  });

  it('returns null for an unknown tenor', () => {
    expect(lookupCofRate(rates, '99 tháng', 'FixedRate')).toBeNull();
  });
});

describe('groupRateItems', () => {
  const items: CofRateItem[] = [
    { Id: 1, ProgramId: 1, Section: 's', GroupLabel: 'Nhóm A', Label: 'A1', RateAnnual: 0.01, SortOrder: 1 },
    { Id: 2, ProgramId: 1, Section: 's', GroupLabel: null, Label: 'A2', RateAnnual: 0.02, SortOrder: 2 },
    { Id: 3, ProgramId: 1, Section: 's', GroupLabel: 'Nhóm B', Label: 'B1', RateAnnual: 0.03, SortOrder: 3 },
  ];

  it('starts a new group only where the notice names one', () => {
    const g = groupRateItems(items);
    expect(g).toHaveLength(2);
    expect(g[0].group).toBe('Nhóm A');
    expect(g[0].items.map(i => i.Label)).toEqual(['A1', 'A2']);
    expect(g[1].items.map(i => i.Label)).toEqual(['B1']);
  });

  it('sorts by the published order, not the array order', () => {
    const g = groupRateItems([items[2], items[0], items[1]]);
    expect(g[0].group).toBe('Nhóm A');
    expect(g[0].items.map(i => i.Label)).toEqual(['A1', 'A2']);
  });

  it('is safe on empty input', () => {
    expect(groupRateItems([])).toEqual([]);
  });
});

describe('calcMarginOverCof', () => {
  it('subtracts COF from the lending rate', () => {
    expect(calcMarginOverCof(0.1325, 0.094)).toBeCloseTo(0.0385, 10);
  });

  it('reports a negative margin rather than hiding it', () => {
    expect(calcMarginOverCof(0.08, 0.094)).toBeCloseTo(-0.014, 10);
  });

  it('returns null when either side is unknown', () => {
    expect(calcMarginOverCof(null, 0.094)).toBeNull();
    expect(calcMarginOverCof(0.1325, null)).toBeNull();
  });

  it('keeps a zero COF meaningful', () => {
    expect(calcMarginOverCof(0.1, 0)).toBeCloseTo(0.1, 10);
  });
});

describe('COF_RATE_COLUMNS', () => {
  it('lists the fixed column first, then each reset frequency', () => {
    expect(COF_RATE_COLUMNS[0].key).toBe('FixedRate');
    expect(COF_RATE_COLUMNS.map(c => c.key)).toEqual([
      'FixedRate', 'Reset3M', 'Reset6M', 'Reset9M', 'Reset12M', 'Reset24M', 'Reset36M',
    ]);
  });
});
